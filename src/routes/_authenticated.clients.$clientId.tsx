import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Mail, MessageSquare, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/DataTable";
import { EmptyState, KpiCard, PageHeader, SectionCard, StatusChip, statusTone } from "@/components/Primitives";
import { FileUploader } from "@/components/FileUploader";
import { FormDialog } from "@/components/FormDialog";
import { ClientForm } from "@/components/forms/ClientForm";
import { PaymentForm } from "@/components/forms/PaymentForm";
import {
  buildLedger,
  computeClientStats,
  projectExpense,
  projectProfit,
  useClients,
  useExpenses,
  usePayments,
  useProjects,
  type LedgerEntry,
} from "@/lib/api";
import { printDocument } from "@/lib/export";
import { fmtDate, inr, num, pct } from "@/lib/format";
import { useCan } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/clients/$clientId")({
  head: () => ({
    meta: [
      { title: "Client statement — LEONIS" },
      { name: "description", content: "Client ledger, shoots, receipts and outstanding balance." },
      { property: "og:title", content: "Client statement — LEONIS" },
      { property: "og:description", content: "Client ledger, shoots and receipts." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { clientId } = Route.useParams();
  const can = useCan();
  const { data: clients = [], isLoading } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  const client = clients.find((c) => c.id === clientId);
  const cp = useMemo(() => projects.filter((p) => p.client_id === clientId), [projects, clientId]);
  const cpay = useMemo(() => payments.filter((p) => p.client_id === clientId), [payments, clientId]);
  const cex = useMemo(() => expenses.filter((e) => e.client_id === clientId), [expenses, clientId]);
  const stat = useMemo(
    () => (client ? computeClientStats([client], projects, payments, expenses)[0] : undefined),
    [client, projects, payments, expenses],
  );
  const ledger = useMemo(
    () => buildLedger(cp, cpay.filter((p) => p.payment_type === "client_payment")),
    [cp, cpay],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading client…</p>;
  if (!client || !stat)
    return (
      <EmptyState message="Client not found." hint="It may have been archived." />
    );

  const ledgerCols: Column<LedgerEntry>[] = [
    { key: "date", header: "Date", cell: (r) => fmtDate(r.date), sortValue: (r) => r.date, exportValue: (r) => fmtDate(r.date) },
    { key: "desc", header: "Particulars", cell: (r) => r.description, sortValue: (r) => r.description },
    { key: "debit", header: "Debit", align: "right", cell: (r) => (r.debit ? inr(r.debit) : "—"), sortValue: (r) => r.debit },
    { key: "credit", header: "Credit", align: "right", cell: (r) => (r.credit ? inr(r.credit) : "—"), sortValue: (r) => r.credit },
    { key: "balance", header: "Balance", align: "right", cell: (r) => inr(r.balance), sortValue: (r) => r.balance },
  ];

  const printStatement = () => {
    const rows = ledger
      .map(
        (l) =>
          `<tr><td>${fmtDate(l.date)}</td><td>${l.description}</td><td class="r">${l.debit ? inr(l.debit) : "—"}</td><td class="r">${
            l.credit ? inr(l.credit) : "—"
          }</td><td class="r">${inr(l.balance)}</td></tr>`,
      )
      .join("");
    printDocument(
      `Statement — ${client.name}`,
      `<h2>Statement of account</h2>
       <p><strong>${client.name}</strong>${client.company ? ` · ${client.company}` : ""}<br/>
       ${client.phone ?? ""} ${client.email ? `· ${client.email}` : ""}</p>
       <table><thead><tr><th>Date</th><th>Particulars</th><th class="r">Debit</th><th class="r">Credit</th><th class="r">Balance</th></tr></thead>
       <tbody>${rows}</tbody></table>
       <p><strong>Billed:</strong> ${inr(stat.billed)} · <strong>Received:</strong> ${inr(stat.received)} · <strong>Due:</strong> ${inr(stat.due)}</p>`,
    );
  };

  return (
    <div>
      <Link to="/clients" className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline">
        <ArrowLeft className="size-3.5" /> All clients
      </Link>

      <PageHeader
        title={client.name}
        description={[client.company, client.phone, client.email].filter(Boolean).join(" · ") || "No contact details"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={printStatement}>
              <Printer className="size-4" /> Print statement
            </Button>
            {client.phone && (
              <Button
                variant="outline"
                className="gap-2"
                asChild
              >
                <a
                  href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Hi ${client.name}, this is a gentle reminder from LEONIS Studio regarding your outstanding balance of ${inr(stat.due)}. Please let us know if you have any questions. Thank you!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquare className="size-4" /> WhatsApp
                </a>
              </Button>
            )}
            {client.email && (
              <Button
                variant="outline"
                className="gap-2"
                asChild
              >
                <a
                  href={`mailto:${client.email}?subject=${encodeURIComponent(
                    `Payment Reminder — LEONIS Studio`
                  )}&body=${encodeURIComponent(
                    `Dear ${client.name},\n\nThis is a friendly reminder regarding your outstanding balance of ${inr(stat.due)} with LEONIS Studio.\n\nBilled: ${inr(stat.billed)}\nReceived: ${inr(stat.received)}\nDue: ${inr(stat.due)}\n\nPlease let us know if you need any clarification.\n\nBest regards,\nLEONIS Studio, Surat`
                  )}`}
                >
                  <Mail className="size-4" /> Email
                </a>
              </Button>
            )}
            {can("viewFinance") && (
              <FormDialog title="Record payment" triggerLabel="Record payment">
                {(close) => <PaymentForm onDone={close} />}
              </FormDialog>
            )}
            {can("editProjects") && (
              <FormDialog title="Edit client" trigger={<Button variant="outline">Edit</Button>}>
                {(close) => <ClientForm initial={client} onDone={close} />}
              </FormDialog>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Final quote" value={inr(stat.quote)} />
        <KpiCard label="Billed" value={inr(stat.billed)} hint={`${stat.projectCount} shoots`} />
        <KpiCard label="Received" value={inr(stat.received)} tone="success" hint={`Last ${fmtDate(stat.lastPayment)}`} />
        <KpiCard label="Outstanding" value={inr(stat.due)} tone="danger" />
        <KpiCard label="Profit" value={inr(stat.profit)} hint={`Margin ${pct(stat.marginPct)}`} tone="success" />
      </div>

      <div className="mt-4">
        <Tabs defaultValue="ledger">
          <TabsList>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="shoots">Shoots</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="ledger" className="mt-4">
            <DataTable
              rows={ledger}
              columns={ledgerCols}
              rowKey={(r) => `${r.date}-${r.description}-${r.balance}`}
              exportName={`LEONIS-ledger-${client.name}`}
              searchFields={(r) => r.description}
              emptyMessage="No transactions yet."
            />
          </TabsContent>

          <TabsContent value="shoots" className="mt-4">
            <DataTable
              rows={cp}
              columns={[
                { key: "d", header: "Date", cell: (p) => fmtDate(p.shoot_date), sortValue: (p) => p.shoot_date },
                { key: "t", header: "Type", cell: (p) => p.project_types?.name ?? "—", sortValue: (p) => p.project_types?.name ?? "" },
                { key: "q", header: "Qty", align: "right", cell: (p) => num(p.quantity), sortValue: (p) => Number(p.quantity) },
                { key: "a", header: "Amount", align: "right", cell: (p) => inr(p.amount), sortValue: (p) => Number(p.amount) },
                { key: "c", header: "Cost", align: "right", cell: (p) => inr(projectExpense(p)), sortValue: (p) => projectExpense(p) },
                { key: "p", header: "Profit", align: "right", cell: (p) => inr(projectProfit(p)), sortValue: (p) => projectProfit(p) },
                { key: "s", header: "Status", cell: (p) => <StatusChip label={p.status} tone={statusTone(p.status)} />, sortValue: (p) => p.status },
              ]}
              rowKey={(p) => p.id}
              exportName={`LEONIS-shoots-${client.name}`}
              searchFields={(p) => [p.project_types?.name, p.notes].filter(Boolean).join(" ")}
              emptyMessage="No shoots for this client."
            />
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <DataTable
              rows={cpay}
              columns={[
                { key: "d", header: "Date", cell: (p) => fmtDate(p.payment_date), sortValue: (p) => p.payment_date },
                { key: "a", header: "Amount", align: "right", cell: (p) => inr(p.amount), sortValue: (p) => Number(p.amount) },
                { key: "m", header: "Mode", cell: (p) => p.payment_modes?.name ?? "—", sortValue: (p) => p.payment_modes?.name ?? "" },
                { key: "r", header: "Reference", cell: (p) => p.reference_no ?? "—", sortValue: (p) => p.reference_no ?? "" },
                { key: "n", header: "Notes", cell: (p) => p.notes ?? "—", sortValue: (p) => p.notes ?? "" },
              ]}
              rowKey={(p) => p.id}
              exportName={`LEONIS-payments-${client.name}`}
              searchFields={(p) => [p.reference_no, p.notes, p.payment_modes?.name].filter(Boolean).join(" ")}
              emptyMessage="No payments recorded."
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <DataTable
              rows={cex}
              columns={[
                { key: "d", header: "Date", cell: (e) => fmtDate(e.expense_date), sortValue: (e) => e.expense_date },
                { key: "c", header: "Category", cell: (e) => e.expense_categories?.name ?? "—", sortValue: (e) => e.expense_categories?.name ?? "" },
                { key: "cl", header: "Class", cell: (e) => e.expense_class, sortValue: (e) => e.expense_class },
                { key: "a", header: "Amount", align: "right", cell: (e) => inr(e.amount), sortValue: (e) => Number(e.amount) },
                { key: "p", header: "Paid by", cell: (e) => e.partners?.name ?? "—", sortValue: (e) => e.partners?.name ?? "" },
              ]}
              rowKey={(e) => e.id}
              exportName={`LEONIS-expenses-${client.name}`}
              searchFields={(e) => [e.expense_categories?.name, e.notes, e.bill_no].filter(Boolean).join(" ")}
              emptyMessage="No client-linked expenses."
            />
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <SectionCard title="Client documents">
              <FileUploader entityType="client" entityId={client.id} label="Quotes, contracts and receipts" />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>

      {client.notes && (
        <div className="mt-4">
          <SectionCard title="Notes">
            <p className="whitespace-pre-wrap text-[13px] text-muted-foreground">{client.notes}</p>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
