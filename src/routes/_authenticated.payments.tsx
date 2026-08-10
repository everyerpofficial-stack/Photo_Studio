import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { KpiCard, PageHeader, StatusChip } from "@/components/Primitives";
import { PaymentForm } from "@/components/forms/PaymentForm";
import {
  defaultFilters,
  filterPayments,
  sum,
  useClients,
  useDeleteRecord,
  usePaymentModes,
  usePayments,
  useSaveRecord,
  type Filters,
  type Payment,
} from "@/lib/api";
import { fmtDate, inr } from "@/lib/format";
import { printDocument } from "@/lib/export";
import { useCan } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — LEONIS" },
      { name: "description", content: "Client receipts and other income with modes, references and approvals." },
      { property: "og:title", content: "Payments — LEONIS" },
      { property: "og:description", content: "Client receipts and other income in one register." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [type, setType] = useState("all");
  const { data: payments = [], isLoading } = usePayments();
  const { data: clients = [] } = useClients();
  const { data: modes = [] } = usePaymentModes();
  const del = useDeleteRecord("payments", "Payment");
  const approve = useSaveRecord("payments", "Payment");
  const can = useCan();

  const rows = useMemo(() => {
    const base = filterPayments(payments, filters);
    return type === "all" ? base : base.filter((p) => p.payment_type === type);
  }, [payments, filters, type]);

  const clientTotal = sum(rows.filter((p) => p.payment_type === "client_payment"), (p) => Number(p.amount));
  const otherTotal = sum(rows.filter((p) => p.payment_type === "other_income"), (p) => Number(p.amount));
  const pending = rows.filter((p) => p.needs_approval && !p.approved_at);

  const columns: Column<Payment>[] = [
    {
      key: "date",
      header: "Date",
      cell: (p) => fmtDate(p.payment_date),
      sortValue: (p) => p.payment_date,
      exportValue: (p) => fmtDate(p.payment_date),
    },
    { key: "client", header: "Client", cell: (p) => p.clients?.name ?? "—", sortValue: (p) => p.clients?.name ?? "" },
    {
      key: "type",
      header: "Type",
      cell: (p) => (p.payment_type === "client_payment" ? "Client payment" : "Other income"),
      sortValue: (p) => p.payment_type,
    },
    { key: "amount", header: "Amount", align: "right", cell: (p) => inr(p.amount), sortValue: (p) => Number(p.amount) },
    { key: "mode", header: "Mode", cell: (p) => p.payment_modes?.name ?? "—", sortValue: (p) => p.payment_modes?.name ?? "" },
    { key: "ref", header: "Reference", cell: (p) => p.reference_no ?? "—", sortValue: (p) => p.reference_no ?? "", defaultHidden: true },
    { key: "notes", header: "Notes", cell: (p) => p.notes ?? "—", sortValue: (p) => p.notes ?? "", defaultHidden: true },
    {
      key: "approval",
      header: "Approval",
      cell: (p) =>
        !p.needs_approval ? (
          <span className="text-muted-foreground">—</span>
        ) : p.approved_at ? (
          <StatusChip label="Approved" tone="success" />
        ) : (
          <StatusChip label="Pending" tone="warning" />
        ),
      sortValue: (p) => (p.needs_approval ? (p.approved_at ? "approved" : "pending") : ""),
      exportValue: (p) => (p.needs_approval ? (p.approved_at ? "Approved" : "Pending") : ""),
    },
    {
      key: "actions",
      header: "",
      cell: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {can("approvePayments") && p.needs_approval && !p.approved_at && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Approve payment"
              onClick={() => approve.mutate({ id: p.id, values: { approved_at: new Date().toISOString() } })}
            >
              <Check className="size-4 text-success-foreground" />
            </Button>
          )}
          {/* Print receipt */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Print receipt"
            onClick={() => {
              const clientName = p.clients?.name ?? "Client";
              const mode = p.payment_modes?.name ?? "—";
              printDocument(
                `Receipt — ${clientName}`,
                `<h2>Payment Receipt</h2>
                 <div class="kv">
                   <div>Date<b>${fmtDate(p.payment_date)}</b></div>
                   <div>Amount<b>${inr(p.amount)}</b></div>
                   <div>Mode<b>${mode}</b></div>
                   <div>Reference<b>${p.reference_no ?? "—"}</b></div>
                 </div>
                 <table><tbody>
                 <tr><td>Client</td><td class="r"><strong>${clientName}</strong></td></tr>
                 <tr><td>Payment type</td><td class="r">${p.payment_type === "client_payment" ? "Client payment" : "Other income"}</td></tr>
                 ${p.notes ? `<tr><td>Notes</td><td class="r">${p.notes}</td></tr>` : ""}
                 </tbody></table>`,
              );
            }}
          >
            <Printer className="size-4" />
          </Button>
          {can("editProjects") && (
            <FormDialog
              title="Edit payment"
              trigger={
                <Button variant="ghost" size="icon" aria-label="Edit payment">
                  <Pencil className="size-4" />
                </Button>
              }
            >
              {(close) => <PaymentForm initial={p} onDone={close} />}
            </FormDialog>
          )}
          {can("deleteRecords") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Delete payment">
                  <Trash2 className="size-4 text-danger-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this receipt?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {inr(p.amount)} on {fmtDate(p.payment_date)}. The entry is archived and stays audited.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => del.mutate(p.id)}>Delete</AlertDialogAction>
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
        title="Payments"
        description="Receipts against shoots plus other studio income."
        actions={
          can("editProjects") ? (
            <FormDialog title="Record payment" triggerLabel="Record payment">
              {(close) => <PaymentForm onDone={close} />}
            </FormDialog>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Client receipts" value={inr(clientTotal)} hint={`${rows.length} entries`} tone="success" />
        <KpiCard label="Other income" value={inr(otherTotal)} />
        <KpiCard label="Awaiting approval" value={String(pending.length)} hint={inr(sum(pending, (p) => Number(p.amount)))} tone="warning" />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowKey={(p) => p.id}
        exportName="LEONIS-payments"
        searchPlaceholder="Search client, reference, notes…"
        searchFields={(p) => [p.clients?.name, p.reference_no, p.notes, p.payment_modes?.name].filter(Boolean).join(" ")}
        emptyMessage="No payments in this period."
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={filters} onChange={setFilters} />
            <Select value={filters.clientId ?? "all"} onValueChange={(v) => setFilters({ ...filters, clientId: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.modeId ?? "all"} onValueChange={(v) => setFilters({ ...filters, modeId: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                {modes.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="client_payment">Client payment</SelectItem>
                <SelectItem value="other_income">Other income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        footer={(r) => (
          <>
            <span className="font-semibold">Total received</span>
            <span className="tabular-nums">{inr(sum(r, (p) => Number(p.amount)))}</span>
          </>
        )}
      />
    </div>
  );
}
