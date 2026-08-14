import { createServerFn } from "@tanstack/react-start";
import type { SQLInputValue } from "node:sqlite";
import { getDb, uuid, nowIso, DEFAULT_USER_ID } from "./server/db.server";

export type Row = Record<string, unknown>;

/** Tables writable through the generic save/delete server functions. */
const WRITABLE_TABLES = new Set([
  "clients",
  "projects",
  "payments",
  "expenses",
  "partners",
  "project_types",
  "expense_categories",
  "payment_modes",
  "price_lists",
  "financial_years",
  "settings",
  "notifications",
  "alerts",
  "profiles",
  "partner_capital",
  "partner_drawings",
]);

/** Tables that support soft delete (have a deleted_at column). */
const SOFT_DELETE_TABLES = new Set(["clients", "projects", "payments", "expenses"]);

const BOOLEAN_COLUMNS = new Set(["is_active", "is_current", "is_read", "needs_approval"]);
const JSON_COLUMNS = new Set(["old_value", "new_value"]);

function assertTable(table: string, allowed: Set<string>): string {
  if (!allowed.has(table)) throw new Error(`Unknown or unwritable table: ${table}`);
  return table;
}

function tableColumns(db: ReturnType<typeof getDb>, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

/** Convert a raw sqlite row (booleans as 0/1, JSON columns as text) into the JS shape the frontend expects. */
function mapRow<T extends Row>(row: Row | undefined): T | null {
  if (!row) return null;
  const out: Row = { ...row };
  for (const key of Object.keys(out)) {
    if (BOOLEAN_COLUMNS.has(key)) out[key] = !!out[key];
    if (JSON_COLUMNS.has(key) && typeof out[key] === "string") {
      try {
        out[key] = JSON.parse(out[key] as string);
      } catch {
        // leave as-is
      }
    }
  }
  return out as T;
}

function mapRows<T extends Row>(rows: Row[]): T[] {
  return rows.map((r) => mapRow<T>(r) as T);
}

/** Coerce JS values (booleans, undefined, plain objects) into sqlite-bindable values. */
function toBindable(value: unknown): SQLInputValue {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === undefined || value === null) return null;
  if (typeof value === "number" || typeof value === "string" || typeof value === "bigint")
    return value;
  if (value instanceof Uint8Array) return value;
  return JSON.stringify(value);
}

/* ------------------------------------------------------------ generic CRUD */

export const saveRecord = createServerFn({ method: "POST", strict: false })
  .validator((d: { table: string; id?: string | undefined; values: Row; module: string }) => d)
  .handler(async ({ data }) => {
    const { table, id, values } = data;
    assertTable(table, WRITABLE_TABLES);
    const db = getDb();
    const now = nowIso();

    if (table === "settings") {
      const key = String(values["key"]);
      const value = values["value"];
      db.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ).run(key, typeof value === "string" ? value : JSON.stringify(value ?? {}), now);
      const row = db.prepare("SELECT * FROM settings WHERE key = ?").get(key) as Row;
      await recordAudit(id ? "updated" : "created", data.module, key, null, row);
      return mapRow(row);
    }

    const cols = tableColumns(db, table);
    const entries = Object.entries(values).filter(([k]) => cols.has(k));

    if (id) {
      const before = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Row | undefined;
      if (cols.has("updated_at")) entries.push(["updated_at", now]);
      const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
      db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`).run(
        ...entries.map(([, v]) => toBindable(v)),
        id,
      );
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Row;
      await recordAudit("updated", data.module, id, before ?? null, row);
      return mapRow(row);
    }

    const newId = uuid();
    const cols2 = ["id", ...entries.map(([k]) => k)];
    if (cols.has("created_at") && !entries.some(([k]) => k === "created_at"))
      cols2.push("created_at");
    if (cols.has("updated_at") && !entries.some(([k]) => k === "updated_at"))
      cols2.push("updated_at");
    const placeholders = cols2.map(() => "?").join(", ");
    const values2 = cols2.map((c) => {
      if (c === "id") return newId;
      if (c === "created_at" || c === "updated_at") return now;
      const found = entries.find(([k]) => k === c);
      return toBindable(found?.[1]);
    });
    db.prepare(`INSERT INTO ${table} (${cols2.join(", ")}) VALUES (${placeholders})`).run(
      ...values2,
    );
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(newId) as Row;
    await recordAudit("created", data.module, newId, null, row);
    return mapRow(row);
  });

export const deleteRecord = createServerFn({ method: "POST", strict: false })
  .validator((d: { table: string; id: string; module: string; soft?: boolean | undefined }) => d)
  .handler(async ({ data }) => {
    const { table, id, soft = true } = data;
    assertTable(table, WRITABLE_TABLES);
    const db = getDb();
    const before = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Row | undefined;

    if (soft && SOFT_DELETE_TABLES.has(table)) {
      db.prepare(`UPDATE ${table} SET deleted_at = ? WHERE id = ?`).run(nowIso(), id);
    } else {
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    }
    await recordAudit("deleted", data.module, id, before ?? null, null);
    return id;
  });

/* ------------------------------------------------------------------- audit */

async function recordAudit(
  action: "created" | "updated" | "deleted",
  module: string,
  recordId: string | null,
  oldValue: unknown,
  newValue: unknown,
) {
  const db = getDb();
  db.prepare(
    "INSERT INTO audit_logs (id, user_id, user_email, action, module, record_id, old_value, new_value, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
  ).run(
    uuid(),
    DEFAULT_USER_ID,
    "admin@leonis.studio",
    action,
    module,
    recordId,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null,
    nowIso(),
  );
}

export const insertAuditLog = createServerFn({ method: "POST", strict: false })
  .validator(
    (d: {
      action: string;
      module: string;
      recordId?: string | null | undefined;
      oldValue?: unknown;
      newValue?: unknown;
    }) => d,
  )
  .handler(async ({ data }) => {
    await recordAudit(
      data.action as "created" | "updated" | "deleted",
      data.module,
      data.recordId ?? null,
      data.oldValue,
      data.newValue,
    );
  });

export const insertNotification = createServerFn({ method: "POST", strict: false })
  .validator((d: { title: string; body: string; type: string; link?: string | undefined }) => d)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare(
      "INSERT INTO notifications (id, title, body, type, is_read, link, created_at) VALUES (?,?,?,?,0,?,?)",
    ).run(uuid(), data.title, data.body, data.type, data.link ?? null, nowIso());
  });

export const setUserRole = createServerFn({ method: "POST", strict: false })
  .validator((d: { userId: string; role: string }) => d)
  .handler(async ({ data }) => {
    const db = getDb();
    db.prepare(
      `INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, role) DO NOTHING`,
    ).run(uuid(), data.userId, data.role, nowIso());
    // A user has at most one role in this app; drop any others after assigning the new one.
    db.prepare("DELETE FROM user_roles WHERE user_id = ? AND role != ?").run(
      data.userId,
      data.role,
    );
  });

export const bulkInsertExpenses = createServerFn({ method: "POST", strict: false })
  .validator((d: { rows: Row[] }) => d)
  .handler(async ({ data }) => {
    const db = getDb();
    const now = nowIso();
    for (const values of data.rows) {
      const id = uuid();
      db.prepare(
        `INSERT INTO expenses (id, expense_date, partner_id, category_id, expense_class, client_id, project_id, amount, bill_no, notes, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        id,
        values["expense_date"] as string,
        (values["partner_id"] as string | null) ?? null,
        values["category_id"] as string,
        values["expense_class"] as string,
        (values["client_id"] as string | null) ?? null,
        (values["project_id"] as string | null) ?? null,
        values["amount"] as number,
        (values["bill_no"] as string | null) ?? null,
        (values["notes"] as string | null) ?? null,
        now,
        now,
      );
    }
    await recordAudit("created", "Expenses Bulk CSV Import", null, null, {
      count: data.rows.length,
    });
    return { count: data.rows.length };
  });

/* --------------------------------------------------------------- list: masters */

export const listClients = createServerFn({ method: "GET", strict: false }).handler(async () => {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM clients WHERE deleted_at IS NULL ORDER BY name ASC")
    .all() as Row[];
  return mapRows(rows);
});

export const listProjectTypes = createServerFn({ method: "GET", strict: false }).handler(
  async () => {
    const db = getDb();
    return mapRows(db.prepare("SELECT * FROM project_types ORDER BY name ASC").all() as Row[]);
  },
);

export const listExpenseCategories = createServerFn({ method: "GET", strict: false }).handler(
  async () => {
    const db = getDb();
    return mapRows(db.prepare("SELECT * FROM expense_categories ORDER BY name ASC").all() as Row[]);
  },
);

export const listPaymentModes = createServerFn({ method: "GET", strict: false }).handler(
  async () => {
    const db = getDb();
    return mapRows(db.prepare("SELECT * FROM payment_modes ORDER BY name ASC").all() as Row[]);
  },
);

export const listPriceLists = createServerFn({ method: "GET", strict: false }).handler(async () => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pl.*, pt.name AS project_type_name
       FROM price_lists pl JOIN project_types pt ON pt.id = pl.project_type_id
       ORDER BY pl.effective_from ASC`,
    )
    .all() as Row[];
  return rows.map((r) => {
    const mapped = mapRow(r) as Row;
    const name = mapped["project_type_name"];
    delete mapped["project_type_name"];
    mapped["project_types"] = { name };
    return mapped;
  });
});

export const listFinancialYears = createServerFn({ method: "GET", strict: false }).handler(
  async () => {
    const db = getDb();
    return mapRows(
      db.prepare("SELECT * FROM financial_years ORDER BY start_date ASC").all() as Row[],
    );
  },
);

export const listPartners = createServerFn({ method: "GET", strict: false }).handler(async () => {
  const db = getDb();
  return mapRows(db.prepare("SELECT * FROM partners ORDER BY name ASC").all() as Row[]);
});

export const listSettings = createServerFn({ method: "GET", strict: false }).handler(async () => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM settings").all() as { key: string; value: string }[];
  const map: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    try {
      map[r.key] = JSON.parse(r.value) as Record<string, unknown>;
    } catch {
      map[r.key] = {};
    }
  }
  return map;
});

/* ----------------------------------------------------------- list: transactions */

function joinRow(row: Row, joins: Record<string, string[]>): Row {
  const mapped = mapRow(row) as Row;
  for (const [alias, cols] of Object.entries(joins)) {
    const value: Row = {};
    let any = false;
    for (const c of cols) {
      const key = `${alias}__${c}`;
      if (mapped[key] != null) any = true;
      value[c] = mapped[key] ?? null;
      delete mapped[key];
    }
    mapped[alias] = any ? value : null;
  }
  return mapped;
}

export const listProjects = createServerFn({ method: "GET", strict: false }).handler(async () => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS clients__name, pt.name AS project_types__name, pr.name AS partners__name
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN project_types pt ON pt.id = p.project_type_id
       LEFT JOIN partners pr ON pr.id = p.partner_id
       WHERE p.deleted_at IS NULL
       ORDER BY p.shoot_date DESC`,
    )
    .all() as Row[];
  return rows.map((r) =>
    joinRow(r, { clients: ["name"], project_types: ["name"], partners: ["name"] }),
  );
});

export const listPayments = createServerFn({ method: "GET", strict: false }).handler(async () => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pay.*, c.name AS clients__name, pm.name AS payment_modes__name
       FROM payments pay
       LEFT JOIN clients c ON c.id = pay.client_id
       LEFT JOIN payment_modes pm ON pm.id = pay.mode_id
       WHERE pay.deleted_at IS NULL
       ORDER BY pay.payment_date DESC`,
    )
    .all() as Row[];
  return rows.map((r) => joinRow(r, { clients: ["name"], payment_modes: ["name"] }));
});

export const listExpenses = createServerFn({ method: "GET", strict: false }).handler(async () => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT e.*, pr.name AS partners__name, ec.name AS expense_categories__name, c.name AS clients__name
       FROM expenses e
       LEFT JOIN partners pr ON pr.id = e.partner_id
       LEFT JOIN expense_categories ec ON ec.id = e.category_id
       LEFT JOIN clients c ON c.id = e.client_id
       WHERE e.deleted_at IS NULL
       ORDER BY e.expense_date DESC`,
    )
    .all() as Row[];
  return rows.map((r) =>
    joinRow(r, { partners: ["name"], expense_categories: ["name"], clients: ["name"] }),
  );
});

export const listPartnerCapital = createServerFn({ method: "GET", strict: false }).handler(
  async () => {
    const db = getDb();
    return mapRows(
      db.prepare("SELECT * FROM partner_capital ORDER BY entry_date DESC").all() as Row[],
    );
  },
);

export const listPartnerDrawings = createServerFn({ method: "GET", strict: false }).handler(
  async () => {
    const db = getDb();
    return mapRows(
      db.prepare("SELECT * FROM partner_drawings ORDER BY entry_date DESC").all() as Row[],
    );
  },
);

export const listAlerts = createServerFn({ method: "GET", strict: false }).handler(async () => {
  const db = getDb();
  return mapRows(db.prepare("SELECT * FROM alerts ORDER BY created_at DESC").all() as Row[]);
});

export const listAuditLogs = createServerFn({ method: "GET", strict: false }).handler(async () => {
  const db = getDb();
  return mapRows(db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC").all() as Row[]);
});

export const listNotifications = createServerFn({ method: "GET", strict: false }).handler(
  async () => {
    const db = getDb();
    return mapRows(
      db.prepare("SELECT * FROM notifications ORDER BY created_at DESC").all() as Row[],
    );
  },
);

export const listDocuments = createServerFn({ method: "GET", strict: false })
  .validator((d: { entityType: string; entityId: string }) => d)
  .handler(async ({ data }) => {
    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM documents WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC",
      )
      .all(data.entityType, data.entityId) as Row[];
    return mapRows(rows);
  });

export type StaffRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  role: string | null;
};

export const listStaff = createServerFn({ method: "GET", strict: false }).handler(
  async (): Promise<StaffRow[]> => {
    const db = getDb();
    const profiles = db.prepare("SELECT * FROM profiles ORDER BY created_at ASC").all() as Row[];
    const roles = db.prepare("SELECT * FROM user_roles").all() as {
      user_id: string;
      role: string;
    }[];
    return profiles.map((p) => {
      const mapped = mapRow(p) as Row;
      const role = roles.find((r) => r.user_id === p["id"])?.role ?? null;
      return { ...mapped, role } as StaffRow;
    });
  },
);
