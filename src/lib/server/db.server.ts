import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "leonis.db");

export const uploadsDir = () => path.join(DATA_DIR, "uploads");

export const uuid = () => randomUUID();
export const nowIso = () => new Date().toISOString();

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('partner','accountant','coordinator','editor')),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  profit_share REAL NOT NULL DEFAULT 50,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  final_quote REAL NOT NULL DEFAULT 0,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  default_class TEXT NOT NULL DEFAULT 'operating' CHECK (default_class IN ('operating','capital','financing')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_modes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_lists (
  id TEXT PRIMARY KEY,
  project_type_id TEXT NOT NULL REFERENCES project_types(id),
  rate REAL NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_years (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  project_type_id TEXT NOT NULL REFERENCES project_types(id),
  partner_id TEXT REFERENCES partners(id),
  shoot_date TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  rate REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  editing_expense REAL NOT NULL DEFAULT 0,
  production_expense REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','completed','cancelled')),
  referred_by TEXT,
  org_name TEXT,
  notes TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_date ON projects(shoot_date);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  project_id TEXT REFERENCES projects(id),
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  payment_type TEXT NOT NULL DEFAULT 'client_payment' CHECK (payment_type IN ('client_payment','other_income')),
  mode_id TEXT REFERENCES payment_modes(id),
  reference_no TEXT,
  notes TEXT,
  needs_approval INTEGER NOT NULL DEFAULT 0,
  approved_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  expense_date TEXT NOT NULL,
  partner_id TEXT REFERENCES partners(id),
  category_id TEXT NOT NULL REFERENCES expense_categories(id),
  expense_class TEXT NOT NULL DEFAULT 'operating' CHECK (expense_class IN ('operating','capital','financing')),
  client_id TEXT REFERENCES clients(id),
  project_id TEXT REFERENCES projects(id),
  amount REAL NOT NULL CHECK (amount > 0),
  bill_no TEXT,
  notes TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_client ON expenses(client_id);

CREATE TABLE IF NOT EXISTS partner_capital (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES partners(id),
  entry_date TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_drawings (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES partners(id),
  entry_date TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'system',
  is_read INTEGER NOT NULL DEFAULT 0,
  link TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount REAL,
  severity TEXT NOT NULL DEFAULT 'medium',
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  snoozed_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

// Fixed placeholder identity used until a real login flow exists.
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";
const DEFAULT_USER_EMAIL = "admin@leonis.studio";
const DEFAULT_USER_NAME = "Studio Admin";

function seed(db: DatabaseSync) {
  const has = (table: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n > 0;
  const now = nowIso();

  if (!has("profiles")) {
    db.prepare(
      "INSERT INTO profiles (id, full_name, email, is_active, created_at, updated_at) VALUES (?,?,?,1,?,?)",
    ).run(DEFAULT_USER_ID, DEFAULT_USER_NAME, DEFAULT_USER_EMAIL, now, now);
    db.prepare("INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?,?,?,?)").run(
      uuid(),
      DEFAULT_USER_ID,
      "partner",
      now,
    );
  }

  if (!has("partners")) {
    const partners = [
      { name: "Jayu", share: 50 },
      { name: "Mehulbhai", share: 50 },
    ];
    for (const p of partners) {
      db.prepare(
        "INSERT INTO partners (id, name, profit_share, is_active, created_at, updated_at) VALUES (?,?,?,1,?,?)",
      ).run(uuid(), p.name, p.share, now, now);
    }
  }

  if (!has("financial_years")) {
    db.prepare(
      "INSERT INTO financial_years (id, label, start_date, end_date, is_current, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
    ).run(uuid(), "FY 2025-26", "2025-04-01", "2026-03-31", 0, now, now);
    db.prepare(
      "INSERT INTO financial_years (id, label, start_date, end_date, is_current, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
    ).run(uuid(), "FY 2026-27", "2026-04-01", "2027-03-31", 1, now, now);
  }

  if (!has("payment_modes")) {
    for (const name of ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"]) {
      db.prepare(
        "INSERT INTO payment_modes (id, name, is_active, created_at, updated_at) VALUES (?,?,1,?,?)",
      ).run(uuid(), name, now, now);
    }
  }

  if (!has("project_types")) {
    const types: { name: string; description: string; rate: number }[] = [
      { name: "Baby Shoot", description: "Newborn & baby photography", rate: 12000 },
      { name: "Maternity Shoot", description: "Maternity portfolio", rate: 15000 },
      { name: "Wedding Shoot", description: "Full wedding coverage", rate: 85000 },
      { name: "Product Shoot", description: "Catalogue / e-commerce", rate: 6000 },
      { name: "Hospital Content", description: "Monthly retainer content", rate: 35000 },
      { name: "Corporate Video", description: "Brand films & reels", rate: 45000 },
    ];
    for (const t of types) {
      const id = uuid();
      db.prepare(
        "INSERT INTO project_types (id, name, description, is_active, created_at, updated_at) VALUES (?,?,?,1,?,?)",
      ).run(id, t.name, t.description, now, now);
      db.prepare(
        "INSERT INTO price_lists (id, project_type_id, rate, effective_from, is_active, created_at, updated_at) VALUES (?,?,?,?,1,?,?)",
      ).run(uuid(), id, t.rate, "2025-04-01", now, now);
    }
  }

  if (!has("expense_categories")) {
    const cats: { name: string; cls: string }[] = [
      { name: "Editing / Post Production", cls: "operating" },
      { name: "Travel & Fuel", cls: "operating" },
      { name: "Props & Set", cls: "operating" },
      { name: "Studio Rent", cls: "operating" },
      { name: "Salary & Freelancers", cls: "operating" },
      { name: "Marketing", cls: "operating" },
      { name: "Camera & Lens", cls: "capital" },
      { name: "Lighting Equipment", cls: "capital" },
      { name: "Loan Interest", cls: "financing" },
      { name: "Bank Charges", cls: "financing" },
    ];
    for (const c of cats) {
      db.prepare(
        "INSERT INTO expense_categories (id, name, default_class, is_active, created_at, updated_at) VALUES (?,?,?,1,?,?)",
      ).run(uuid(), c.name, c.cls, now, now);
    }
  }
}

let _db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  seed(db);
  _db = db;
  return db;
}
