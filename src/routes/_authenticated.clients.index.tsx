import { useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog } from "@/components/FormDialog";
import { KpiCard, PageHeader, StatusChip, statusTone } from "@/components/Primitives";
import { ClientForm } from "@/components/forms/ClientForm";
import {
  computeClientStats,
  useClients,
  useDeleteRecord,
  useExpenses,
  usePayments,
  useProjects,
  type ClientStat,
} from "@/lib/api";
import { fmtDate, inr, pct } from "@/lib/format";
import { useCan } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — LEONIS" },
      { name: "description", content: "Client directory with quotes, billing, receipts and outstanding dues." },
      { property: "og:title", content: "Clients — LEONIS" },
      { property: "og:description", content: "Client directory with billing and outstanding dues." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const del = useDeleteRecord("clients", "Client");
  const can = useCan();

  const rows = useMemo(
    () => computeClientStats(clients, projects, payments, expenses),
    [clients, projects, payments, expenses],
  );

  const totals = rows.reduce(
    (t, r) => ({
      billed: t.billed + r.billed,
      received: t.received + r.received,
      due: t.due + Math.max(0, r.due),
    }),
    { billed: 0, received: 0, due: 0 },
  );

  const columns: Column<ClientStat>[] = [
    {
      key: "name",
      header: "Client",
      cell: (r) => (
        <Link
          to="/clients/$clientId"
          params={{ clientId: r.client.id }}
          className="font-medium hover:text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {r.client.name}
        </Link>
      ),
      sortValue: (r) => r.client.name,
      exportValue: (r) => r.client.name,
    },
    { key: "company", header: "Company", cell: (r) => r.client.company ?? "—", sortValue: (r) => r.client.company ?? "" },
    { key: "phone", header: "Phone", cell: (r) => r.client.phone ?? "—", sortValue: (r) => r.client.phone ?? "" },
    { key: "projects", header: "Shoots", align: "right", cell: (r) => r.projectCount, sortValue: (r) => r.projectCount },
    { key: "quote", header: "Final quote", align: "right", cell: (r) => inr(r.quote), sortValue: (r) => r.quote },
    { key: "billed", header: "Billed", align: "right", cell: (r) => inr(r.billed), sortValue: (r) => r.billed },
    { key: "received", header: "Received", align: "right", cell: (r) => inr(r.received), sortValue: (r) => r.received },
    {
      key: "due",
      header: "Due",
      align: "right",
      cell: (r) => <span className={r.due > 0 ? "font-semibold text-danger-foreground" : ""}>{inr(r.due)}</span>,
      sortValue: (r) => r.due,
      exportValue: (r) => r.due,
    },
    { key: "margin", header: "Margin", align: "right", cell: (r) => pct(r.marginPct), sortValue: (r) => r.marginPct, defaultHidden: true },
    {
      key: "lastPayment",
      header: "Last payment",
      cell: (r) => fmtDate(r.lastPayment),
      sortValue: (r) => r.lastPayment ?? "",
      defaultHidden: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusChip label={r.status} tone={statusTone(r.status)} />,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
    },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {can("editProjects") && (
            <FormDialog
              title="Edit client"
              trigger={
                <Button variant="ghost" size="icon" aria-label="Edit client">
                  <Pencil className="size-4" />
                </Button>
              }
            >
              {(close) => <ClientForm initial={r.client} onDone={close} />}
            </FormDialog>
          )}
          {can("deleteRecords") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Delete client">
                  <Trash2 className="size-4 text-danger-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {r.client.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The client is archived. Shoots and payments already recorded stay intact.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => del.mutate(r.client.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Quotes, billing and collection status for every client."
        actions={
          can("editProjects") ? (
            <FormDialog title="New client" triggerLabel="New client">
              {(close) => <ClientForm onDone={close} />}
            </FormDialog>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Total billed" value={inr(totals.billed)} hint={`${rows.length} clients`} />
        <KpiCard label="Total received" value={inr(totals.received)} tone="success" />
        <KpiCard label="Outstanding" value={inr(totals.due)} tone="danger" />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowKey={(r) => r.client.id}
        exportName="LEONIS-clients"
        searchPlaceholder="Search name, company, phone…"
        searchFields={(r) => [r.client.name, r.client.company, r.client.phone, r.client.email].filter(Boolean).join(" ")}
        emptyMessage="No clients yet."
        emptyHint="Add your first client to start billing."
        onRowClick={(r) => navigate({ to: "/clients/$clientId", params: { clientId: r.client.id } })}
      />
    </div>
  );
}
