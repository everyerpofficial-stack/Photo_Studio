import { insertAuditLog, insertNotification } from "./records";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "approved"
  | "deactivated"
  | "login"
  | "logout"
  | "password_change";

export async function logAudit(
  action: AuditAction,
  module: string,
  recordId?: string | null,
  oldValue?: unknown,
  newValue?: unknown,
) {
  await insertAuditLog({ data: { action, module, recordId, oldValue, newValue } });
}

export async function notify(title: string, body: string, type = "system", link?: string) {
  await insertNotification({ data: { title, body, type, link } });
}
