import { createServerFn } from "@tanstack/react-start";
import { uuid, nowIso, DEFAULT_USER_ID } from "./utils";


export type Row = Record<string, unknown>;

export type StoreData = {
  profiles: Row[];
  user_roles: Row[];
  partners: Row[];
  clients: Row[];
  project_types: Row[];
  expense_categories: Row[];
  payment_modes: Row[];
  price_lists: Row[];
  financial_years: Row[];
  settings: Record<string, unknown>;
  projects: Row[];
  payments: Row[];
  expenses: Row[];
  partner_capital: Row[];
  partner_drawings: Row[];
  partner_reimbursements: Row[];
  documents: Row[];
  audit_logs: Row[];
  notifications: Row[];
  alerts: Row[];
};

const STORE_KEY = "leonis_store_v1";

const WRITABLE_TABLES = new Set<keyof StoreData>([
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
  "partner_reimbursements",
]);

const SOFT_DELETE_TABLES = new Set(["clients", "projects", "payments", "expenses"]);
const BOOLEAN_COLUMNS = new Set(["is_active", "is_current", "is_read", "needs_approval"]);
const JSON_COLUMNS = new Set(["old_value", "new_value"]);

function mapRow<T extends Row>(row: Row | undefined): T | null {
  if (!row) return null;
  const out: Row = { ...row };
  for (const key of Object.keys(out)) {
    if (BOOLEAN_COLUMNS.has(key)) out[key] = Boolean(out[key]);
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

function mapRows<T extends Row>(rows: Row[] | undefined): T[] {
  if (!rows) return [];
  return rows.map((r) => mapRow<T>(r) as T);
}

function getInitialStore(): StoreData {
  const now = nowIso();
  const partner1Id = uuid();
  const partner2Id = uuid();

  const pt1 = uuid();
  const pt2 = uuid();
  const pt3 = uuid();
  const pt4 = uuid();
  const pt5 = uuid();
  const pt6 = uuid();

  return {
    profiles: [
      {
        id: DEFAULT_USER_ID,
        full_name: "Studio Admin",
        email: "admin@leonis.studio",
        phone: null,
        is_active: true,
        last_login: null,
        created_at: now,
        updated_at: now,
      },
    ],
    user_roles: [
      {
        id: uuid(),
        user_id: DEFAULT_USER_ID,
        role: "partner",
        created_at: now,
      },
    ],
    partners: [
      { id: partner1Id, name: "Jayu", profit_share: 50, is_active: true, created_at: now, updated_at: now },
      { id: partner2Id, name: "Mehulbhai", profit_share: 50, is_active: true, created_at: now, updated_at: now },
    ],
    clients: [],
    project_types: [
      { id: pt1, name: "Baby Shoot", description: "Newborn & baby photography", is_active: true, created_at: now, updated_at: now },
      { id: pt2, name: "Maternity Shoot", description: "Maternity portfolio", is_active: true, created_at: now, updated_at: now },
      { id: pt3, name: "Wedding Shoot", description: "Full wedding coverage", is_active: true, created_at: now, updated_at: now },
      { id: pt4, name: "Product Shoot", description: "Catalogue / e-commerce", is_active: true, created_at: now, updated_at: now },
      { id: pt5, name: "Hospital Content", description: "Monthly retainer content", is_active: true, created_at: now, updated_at: now },
      { id: pt6, name: "Corporate Video", description: "Brand films & reels", is_active: true, created_at: now, updated_at: now },
    ],
    price_lists: [
      { id: uuid(), project_type_id: pt1, rate: 12000, effective_from: "2025-04-01", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), project_type_id: pt2, rate: 15000, effective_from: "2025-04-01", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), project_type_id: pt3, rate: 85000, effective_from: "2025-04-01", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), project_type_id: pt4, rate: 6000, effective_from: "2025-04-01", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), project_type_id: pt5, rate: 35000, effective_from: "2025-04-01", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), project_type_id: pt6, rate: 45000, effective_from: "2025-04-01", is_active: true, created_at: now, updated_at: now },
    ],
    expense_categories: [
      { id: uuid(), name: "Editing / Post Production", default_class: "operating", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Travel & Fuel", default_class: "operating", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Props & Set", default_class: "operating", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Studio Rent", default_class: "operating", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Salary & Freelancers", default_class: "operating", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Marketing", default_class: "operating", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Camera & Lens", default_class: "capital", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Lighting Equipment", default_class: "capital", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Loan Interest", default_class: "financing", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Bank Charges", default_class: "financing", is_active: true, created_at: now, updated_at: now },
    ],
    payment_modes: [
      { id: uuid(), name: "Cash", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "UPI", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Bank Transfer", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Cheque", is_active: true, created_at: now, updated_at: now },
      { id: uuid(), name: "Card", is_active: true, created_at: now, updated_at: now },
    ],
    financial_years: [
      { id: uuid(), label: "FY 2025-26", start_date: "2025-04-01", end_date: "2026-03-31", is_current: false, created_at: now, updated_at: now },
      { id: uuid(), label: "FY 2026-27", start_date: "2026-04-01", end_date: "2027-03-31", is_current: true, created_at: now, updated_at: now },
    ],
    settings: {},
    projects: [],
    payments: [],
    expenses: [],
    partner_capital: [],
    partner_drawings: [],
    partner_reimbursements: [],
    documents: [],
    audit_logs: [],
    notifications: [],
    alerts: [],
  };
}

let memoryStoreCache: StoreData | null = null;

export function loadStore(): StoreData {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.partner_reimbursements) parsed.partner_reimbursements = [];
        return parsed;
      }
    } catch {
      // Fallback
    }
    const initial = getInitialStore();
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(initial));
    } catch {
      // Ignore
    }
    return initial;
  }
  if (!memoryStoreCache) {
    memoryStoreCache = getInitialStore();
  }
  if (!memoryStoreCache.partner_reimbursements) {
    memoryStoreCache.partner_reimbursements = [];
  }
  return memoryStoreCache;
}

export function saveStore(store: StoreData): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }
  }
  memoryStoreCache = store;
}

function recordAudit(
  action: "created" | "updated" | "deleted",
  module: string,
  recordId: string | null,
  oldValue: unknown,
  newValue: unknown,
) {
  const store = loadStore();
  const entry: Row = {
    id: uuid(),
    user_id: DEFAULT_USER_ID,
    user_email: "admin@leonis.studio",
    action,
    module,
    record_id: recordId,
    old_value: oldValue ? JSON.stringify(oldValue) : null,
    new_value: newValue ? JSON.stringify(newValue) : null,
    created_at: nowIso(),
  };
  store.audit_logs.unshift(entry);
  saveStore(store);
}

/* ------------------------------------------------------------ generic CRUD */

export const saveRecord = async ({ data }: { data: { table: string; id?: string | undefined; values: Row; module: string } }) => {
    const { table, id, values, module } = data;
    const store = loadStore();
    const now = nowIso();

    if (table === "settings") {
      const key = String(values["key"]);
      const val = values["value"];
      const before = store.settings[key];
      store.settings[key] = val;
      saveStore(store);
      recordAudit(before ? "updated" : "created", module, key, before ?? null, val);
      return { key, value: val, updated_at: now };
    }

    if (!WRITABLE_TABLES.has(table as keyof StoreData)) {
      throw new Error(`Unknown or unwritable table: ${table}`);
    }

    const key = table as keyof StoreData;
    const list = (store[key] as Row[]) || [];

    if (id) {
      const index = list.findIndex((r) => r["id"] === id);
      const before = index >= 0 ? { ...list[index] } : null;
      const updatedRow = {
        ...(before || {}),
        ...values,
        id,
        updated_at: now,
      };
      if (index >= 0) {
        list[index] = updatedRow;
      } else {
        list.push(updatedRow);
      }
      store[key] = list as any;
      saveStore(store);
      recordAudit("updated", module, id, before, updatedRow);
      return mapRow(updatedRow);
    }

    const newId = uuid();
    const newRow = {
      ...values,
      id: newId,
      created_at: now,
      updated_at: now,
    };
    list.push(newRow);
    store[key] = list as any;
    saveStore(store);
    recordAudit("created", module, newId, null, newRow);
    return mapRow(newRow);
  };

export const deleteRecord = async ({ data }: { data: { table: string; id: string; module: string; soft?: boolean | undefined } }) => {
    const { table, id, module, soft = true } = data;
    const store = loadStore();

    if (!WRITABLE_TABLES.has(table as keyof StoreData)) {
      throw new Error(`Unknown or unwritable table: ${table}`);
    }

    const key = table as keyof StoreData;
    const list = (store[key] as Row[]) || [];
    const index = list.findIndex((r) => r["id"] === id);
    const before = index >= 0 ? list[index] : null;

    if (soft && SOFT_DELETE_TABLES.has(table) && index >= 0) {
      list[index] = { ...list[index], deleted_at: nowIso() };
    } else if (index >= 0) {
      list.splice(index, 1);
    }

    store[key] = list as any;
    saveStore(store);
    recordAudit("deleted", module, id, before, null);
    return id;
  };

export const insertAuditLog = async ({ data }: { data: { action: string; module: string; recordId?: string | null | undefined; oldValue?: unknown; newValue?: unknown } }) => {
    recordAudit(
      data.action as "created" | "updated" | "deleted",
      data.module,
      data.recordId ?? null,
      data.oldValue,
      data.newValue,
    );
  };

export const insertNotification = async ({ data }: { data: { title: string; body: string; type: string; link?: string | undefined } }) => {
    const store = loadStore();
    store.notifications.unshift({
      id: uuid(),
      title: data.title,
      body: data.body,
      type: data.type,
      is_read: false,
      link: data.link ?? null,
      created_at: nowIso(),
    });
    saveStore(store);
  };

export const setUserRole = async ({ data }: { data: { userId: string; role: string } }) => {
    const store = loadStore();
    store.user_roles = store.user_roles.filter((r) => r["user_id"] !== data.userId);
    store.user_roles.push({
      id: uuid(),
      user_id: data.userId,
      role: data.role,
      created_at: nowIso(),
    });
    saveStore(store);
  };

export const bulkInsertExpenses = async ({ data }: { data: { rows: Row[] } }) => {
    const store = loadStore();
    const now = nowIso();
    for (const values of data.rows) {
      store.expenses.push({
        id: uuid(),
        expense_date: values["expense_date"],
        partner_id: values["partner_id"] ?? null,
        category_id: values["category_id"],
        expense_class: values["expense_class"] ?? "operating",
        client_id: values["client_id"] ?? null,
        project_id: values["project_id"] ?? null,
        amount: values["amount"],
        bill_no: values["bill_no"] ?? null,
        notes: values["notes"] ?? null,
        created_at: now,
        updated_at: now,
      });
    }
    saveStore(store);
    recordAudit("created", "Expenses Bulk CSV Import", null, null, { count: data.rows.length });
    return { count: data.rows.length };
  };

/* --------------------------------------------------------------- list: masters */

export const listClients = async () => {
  const store = loadStore();
  const rows = (store.clients || [])
    .filter((c) => !c["deleted_at"])
    .sort((a, b) => String(a["name"] ?? "").localeCompare(String(b["name"] ?? "")));
  return mapRows(rows);
};

export const listProjectTypes = async () => {
    const store = loadStore();
    const rows = (store.project_types || []).sort((a, b) =>
      String(a["name"] ?? "").localeCompare(String(b["name"] ?? "")),
    );
    return mapRows(rows);
  };

export const listExpenseCategories = async () => {
    const store = loadStore();
    const rows = (store.expense_categories || []).sort((a, b) =>
      String(a["name"] ?? "").localeCompare(String(b["name"] ?? "")),
    );
    return mapRows(rows);
  };

export const listPaymentModes = async () => {
    const store = loadStore();
    const rows = (store.payment_modes || []).sort((a, b) =>
      String(a["name"] ?? "").localeCompare(String(b["name"] ?? "")),
    );
    return mapRows(rows);
  };

export const listPriceLists = async () => {
  const store = loadStore();
  const pts = store.project_types || [];
  const rows = (store.price_lists || []).map((pl) => {
    const pt = pts.find((p) => p["id"] === pl["project_type_id"]);
    const mapped = mapRow(pl) as Row;
    mapped["project_types"] = pt ? { name: String(pt["name"]) } : null;
    return mapped;
  });
  return rows;
};

export const listFinancialYears = async () => {
    const store = loadStore();
    const rows = (store.financial_years || []).sort((a, b) =>
      String(a["start_date"] ?? "").localeCompare(String(b["start_date"] ?? "")),
    );
    return mapRows(rows);
  };

export const listPartners = async () => {
  const store = loadStore();
  const rows = (store.partners || []).sort((a, b) =>
    String(a["name"] ?? "").localeCompare(String(b["name"] ?? "")),
  );
  return mapRows(rows);
};

export const listSettings = async () => {
  const store = loadStore();
  return store.settings || {};
};

/* ----------------------------------------------------------- list: transactions */

export const listProjects = async () => {
  const store = loadStore();
  const clients = store.clients || [];
  const projectTypes = store.project_types || [];
  const partners = store.partners || [];

  const rows = (store.projects || [])
    .filter((p) => !p["deleted_at"])
    .sort((a, b) => String(b["shoot_date"] ?? "").localeCompare(String(a["shoot_date"] ?? "")))
    .map((p) => {
      const client = clients.find((c) => c["id"] === p["client_id"]);
      const pt = projectTypes.find((t) => t["id"] === p["project_type_id"]);
      const partner = partners.find((pr) => pr["id"] === p["partner_id"]);

      const mapped = mapRow(p) as Row;
      mapped["clients"] = client ? { name: String(client["name"]) } : null;
      mapped["project_types"] = pt ? { name: String(pt["name"]) } : null;
      mapped["partners"] = partner ? { name: String(partner["name"]) } : null;
      return mapped;
    });

  return rows;
};

export const listPayments = async () => {
  const store = loadStore();
  const clients = store.clients || [];
  const modes = store.payment_modes || [];

  const rows = (store.payments || [])
    .filter((pay) => !pay["deleted_at"])
    .sort((a, b) => String(b["payment_date"] ?? "").localeCompare(String(a["payment_date"] ?? "")))
    .map((pay) => {
      const client = clients.find((c) => c["id"] === pay["client_id"]);
      const mode = modes.find((m) => m["id"] === pay["mode_id"]);

      const mapped = mapRow(pay) as Row;
      mapped["clients"] = client ? { name: String(client["name"]) } : null;
      mapped["payment_modes"] = mode ? { name: String(mode["name"]) } : null;
      return mapped;
    });

  return rows;
};

export const listExpenses = async () => {
  const store = loadStore();
  const partners = store.partners || [];
  const categories = store.expense_categories || [];
  const clients = store.clients || [];

  const rows = (store.expenses || [])
    .filter((e) => !e["deleted_at"])
    .sort((a, b) => String(b["expense_date"] ?? "").localeCompare(String(a["expense_date"] ?? "")))
    .map((e) => {
      const partner = partners.find((pr) => pr["id"] === e["partner_id"]);
      const cat = categories.find((c) => c["id"] === e["category_id"]);
      const client = clients.find((c) => c["id"] === e["client_id"]);

      const mapped = mapRow(e) as Row;
      mapped["partners"] = partner ? { name: String(partner["name"]) } : null;
      mapped["expense_categories"] = cat ? { name: String(cat["name"]) } : null;
      mapped["clients"] = client ? { name: String(client["name"]) } : null;
      return mapped;
    });

  return rows;
};

export const listPartnerCapital = async () => {
    const store = loadStore();
    const rows = (store.partner_capital || []).sort((a, b) =>
      String(b["entry_date"] ?? "").localeCompare(String(a["entry_date"] ?? "")),
    );
    return mapRows(rows);
  };

export const listPartnerDrawings = async () => {
    const store = loadStore();
    const rows = (store.partner_drawings || []).sort((a, b) =>
      String(b["entry_date"] ?? "").localeCompare(String(a["entry_date"] ?? "")),
    );
    return mapRows(rows);
  };

export const listPartnerReimbursements = async () => {
    const store = loadStore();
    const rows = (store.partner_reimbursements || []).sort((a, b) =>
      String(b["entry_date"] ?? "").localeCompare(String(a["entry_date"] ?? "")),
    );
    return mapRows(rows);
  };

export const listAlerts = async () => {
  const store = loadStore();
  const rows = (store.alerts || []).sort((a, b) =>
    String(b["created_at"] ?? "").localeCompare(String(a["created_at"] ?? "")),
  );
  return mapRows(rows);
};

export const listAuditLogs = async () => {
  const store = loadStore();
  const rows = (store.audit_logs || []).sort((a, b) =>
    String(b["created_at"] ?? "").localeCompare(String(a["created_at"] ?? "")),
  );
  return mapRows(rows);
};

export const listNotifications = async () => {
    const store = loadStore();
    const rows = (store.notifications || []).sort((a, b) =>
      String(b["created_at"] ?? "").localeCompare(String(a["created_at"] ?? "")),
    );
    return mapRows(rows);
  };

export const listDocuments = async ({ data }: { data: { entityType: string; entityId: string } }) => {
    const store = loadStore();
    const rows = (store.documents || [])
      .filter((doc) => doc["entity_type"] === data.entityType && doc["entity_id"] === data.entityId)
      .sort((a, b) => String(b["created_at"] ?? "").localeCompare(String(a["created_at"] ?? "")));
    return mapRows(rows);
  };

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

export const listStaff = async (): Promise<StaffRow[]> => {
    const store = loadStore();
    const profiles = store.profiles || [];
    const roles = store.user_roles || [];

    return profiles.map((p) => {
      const mapped = mapRow(p) as Row;
      const roleRow = roles.find((r) => r["user_id"] === p["id"]);
      return {
        ...mapped,
        role: (roleRow?.["role"] as string) ?? null,
      } as StaffRow;
    });
  };


