import { supabase } from "@/integrations/supabase/client";

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
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    user_id: data.user?.id ?? null,
    user_email: data.user?.email ?? null,
    action,
    module,
    record_id: recordId ?? null,
    old_value: (oldValue ?? null) as never,
    new_value: (newValue ?? null) as never,
  });
}

export async function notify(title: string, body: string, type = "system", link?: string) {
  await supabase.from("notifications").insert({ title, body, type, link: link ?? null });
}
