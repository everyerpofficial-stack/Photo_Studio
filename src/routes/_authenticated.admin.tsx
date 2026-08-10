import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { PageHeader, StatusChip, statusTone } from "@/components/Primitives";
import { useAlerts, useAuditLogs, useStaff } from "@/lib/api";
import { fmtDateTime, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin & Audit — LEONIS" },
      { name: "description", content: "Staff roles, alerts and the full audit trail of studio changes." },
      { property: "og:title", content: "Admin & Audit — LEONIS" },
      { property: "og:description", content: "Staff roles, alerts and audit trail." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: staff = [] } = useStaff();
  const { data: logs = [], isLoading } = useAuditLogs();
  const { data: alerts = [] } = useAlerts();

  return (
    <div>
      <PageHeader title="Admin & audit" description="Who has access, what changed and what needs attention." />
      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          <DataTable
            rows={alerts}
            columns={[
              { key: "t", header: "Alert", cell: (a) => a.title, sortValue: (a) => a.title },
              { key: "d", header: "Detail", cell: (a) => a.description ?? "—", sortValue: (a) => a.description ?? "" },
              { key: "a", header: "Amount", align: "right", cell: (a) => (a.amount != null ? inr(a.amount) : "—"), sortValue: (a) => Number(a.amount ?? 0) },
              { key: "s", header: "Severity", cell: (a) => <StatusChip label={a.severity} tone={statusTone(a.severity)} />, sortValue: (a) => a.severity },
              { key: "st", header: "Status", cell: (a) => a.status, sortValue: (a) => a.status },
              { key: "c", header: "Raised", cell: (a) => fmtDateTime(a.created_at), sortValue: (a) => a.created_at },
            ]}
            rowKey={(a) => a.id}
            exportName="LEONIS-alerts"
            searchFields={(a) => [a.title, a.description, a.type].filter(Boolean).join(" ")}
            emptyMessage="No alerts."
          />
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <DataTable
            rows={staff}
            columns={[
              { key: "n", header: "Name", cell: (s) => s.full_name ?? "—", sortValue: (s) => s.full_name ?? "" },
              { key: "e", header: "Email", cell: (s) => s.email ?? "—", sortValue: (s) => s.email ?? "" },
              { key: "r", header: "Role", cell: (s) => s.role ?? "Unassigned", sortValue: (s) => s.role ?? "" },
              {
                key: "a",
                header: "Status",
                cell: (s) => <StatusChip label={s.is_active ? "Active" : "Disabled"} tone={s.is_active ? "success" : "neutral"} />,
                sortValue: (s) => String(s.is_active),
              },
            ]}
            rowKey={(s) => s.id}
            exportName="LEONIS-staff"
            searchFields={(s) => [s.full_name, s.email, s.role].filter(Boolean).join(" ")}
            emptyMessage="No staff accounts."
          />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <DataTable
            rows={logs}
            loading={isLoading}
            columns={[
              { key: "t", header: "When", cell: (l) => fmtDateTime(l.created_at), sortValue: (l) => l.created_at },
              { key: "u", header: "User", cell: (l) => l.user_email ?? "—", sortValue: (l) => l.user_email ?? "" },
              { key: "a", header: "Action", cell: (l) => l.action, sortValue: (l) => l.action },
              { key: "m", header: "Module", cell: (l) => l.module, sortValue: (l) => l.module },
              { key: "r", header: "Record", cell: (l) => l.record_id ?? "—", sortValue: (l) => l.record_id ?? "", defaultHidden: true },
            ]}
            rowKey={(l) => l.id}
            exportName="LEONIS-audit-trail"
            searchFields={(l) => [l.user_email, l.action, l.module].filter(Boolean).join(" ")}
            emptyMessage="No audit entries yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
