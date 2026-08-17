import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, DollarSign, Plus, Trash2, UserCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { FormDialog } from "@/components/FormDialog";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { KpiCard, PageHeader, SectionCard, StatusChip } from "@/components/Primitives";
import { Field } from "@/components/forms/ProjectForm";
import { PartnerReimbursementForm } from "@/components/forms/PartnerReimbursementForm";
import {
  computePartnerPositions,
  defaultFilters,
  filterExpenses,
  filterPayments,
  filterProjects,
  operatingPL,
  sum,
  useDeleteRecord,
  useExpenses,
  usePartnerCapital,
  usePartnerReimbursements,
  usePartners,
  usePayments,
  useProjects,
  useSaveRecord,
  type Filters,
} from "@/lib/api";
import { fmtDate, inr, pct, today } from "@/lib/format";
import { useCan } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/partners")({
  head: () => ({
    meta: [
      { title: "Partner Accounts — LEONIS" },
      { name: "description", content: "Partner capital, expenses paid on behalf of company, reimbursements and profit share." },
      { property: "og:title", content: "Partner Accounts — LEONIS" },
      { property: "og:description", content: "Partner capital, reimbursements and profit share." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnersPage,
});

function EntryForm({
  table,
  module,
  title,
  onDone,
}: {
  table: string;
  module: string;
  title: string;
  onDone: () => void;
}) {
  const { data: partners = [] } = usePartners();
  const save = useSaveRecord(table, module);
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!partnerId || Number(amount) <= 0) {
          toast.error("Choose a partner and enter an amount greater than zero.");
          return;
        }
        save.mutate(
          {
            values: {
              partner_id: partnerId,
              entry_date: date,
              amount: Number(amount),
              notes: notes.trim() || null,
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Partner" required>
        <Select value={partnerId} onValueChange={setPartnerId}>
          <SelectTrigger>
            <SelectValue placeholder="Select partner" />
          </SelectTrigger>
          <SelectContent>
            {partners.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Date" required>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Amount (₹)" required>
        <Input
          type="number"
          min="1"
          step="0.01"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="Notes / Remarks">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Bank transfer / Cash reimbursement"
        />
      </Field>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        Save {title}
      </Button>
    </form>
  );
}

function PartnersPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const can = useCan();
  const { data: partners = [], isLoading } = usePartners();
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const { data: capital = [] } = usePartnerCapital();
  const { data: reimbursements = [] } = usePartnerReimbursements();
  const saveShare = useSaveRecord("partners", "Partner");
  const delCapital = useDeleteRecord("partner_capital", "Capital entry", false);
  const delReimbursement = useDeleteRecord("partner_reimbursements", "Reimbursement", false);

  const pl = useMemo(
    () =>
      operatingPL(
        filterProjects(projects, filters),
        filterPayments(payments, filters),
        filterExpenses(expenses, filters),
      ),
    [projects, payments, expenses, filters],
  );

  const positions = useMemo(
    () => computePartnerPositions(partners, filterExpenses(expenses, filters), capital, reimbursements, pl.netProfit),
    [partners, expenses, filters, capital, reimbursements, pl.netProfit],
  );

  const totalCapital = sum(capital, (c) => Number(c.amount));
  const totalPartnerExpenses = sum(positions, (p) => p.partnerExpenses);
  const totalReimbursed = sum(reimbursements, (r) => Number(r.amount));
  const totalPendingReturn = sum(positions, (p) => p.pendingReimbursement);
  const shareTotal = partners.reduce((t, p) => t + Number(p.profit_share), 0);

  return (
    <div>
      <PageHeader
        title="Partner accounts"
        description="Partner capital invested, out-of-pocket expenses to be returned from company, reimbursements and profit share."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <DateRangeFilter value={filters} onChange={setFilters} />
            {can("managePartnerFinance") && (
              <>
                <FormDialog title="Add partner capital" triggerLabel="Add Capital">
                  {(close) => (
                    <EntryForm
                      table="partner_capital"
                      module="Capital entry"
                      title="Capital Entry"
                      onDone={close}
                    />
                  )}
                </FormDialog>
                <FormDialog
                  title="Return to Partner (Company Repayment)"
                  trigger={
                    <Button variant="outline" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10">
                      <ArrowDownLeft className="size-4" /> Return to Partner
                    </Button>
                  }
                >
                  {(close) => <PartnerReimbursementForm onDone={close} />}
                </FormDialog>
              </>
            )}
          </div>
        }
      />

      {/* Top Level KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Distributable profit"
          value={inr(pl.netProfit)}
          hint={`Margin ${pct(pl.marginPct)}`}
          tone="success"
        />
        <KpiCard label="Total capital invested" value={inr(totalCapital)} tone="primary" />
        <KpiCard
          label="Paid by Partners (Period)"
          value={inr(totalPartnerExpenses)}
          hint="Expenses paid out-of-pocket"
          tone="warning"
        />
        <KpiCard
          label="Pending Return to Partners"
          value={inr(totalPendingReturn)}
          hint={totalPendingReturn > 0 ? "Company owes to partners" : "All settled"}
          tone={totalPendingReturn > 0 ? "danger" : "success"}
        />
      </div>

      {shareTotal !== 100 && partners.length > 0 && (
        <p className="mt-3 rounded-lg border border-warning bg-warning/40 px-3 py-2 text-[12px] text-warning-foreground">
          Profit shares add up to {shareTotal}%. Adjust them to total 100%.
        </p>
      )}

      {/* Partner Cards */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {positions.map((p) => (
          <SectionCard
            key={p.partner.id}
            title={p.partner.name}
            action={
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-primary">
                  {Number(p.partner.profit_share)}% profit share
                </span>
                {p.pendingReimbursement > 0 ? (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger-foreground">
                    ₹{p.pendingReimbursement.toLocaleString("en-IN")} Pending Return
                  </span>
                ) : (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success-foreground">
                    ✓ All Reimbursed
                  </span>
                )}
              </div>
            }
          >
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Capital Invested
                </dt>
                <dd className="mt-0.5 font-bold tabular-nums text-foreground">{inr(p.capital)}</dd>
              </div>

              <div className="rounded-lg bg-warning/10 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Paid on Behalf of Company
                </dt>
                <dd className="mt-0.5 font-bold tabular-nums text-warning-foreground">
                  {inr(p.partnerExpenses)}
                </dd>
              </div>

              <div className="rounded-lg bg-success/10 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Returned by Company
                </dt>
                <dd className="mt-0.5 font-bold tabular-nums text-success-foreground">
                  {inr(p.reimbursed)}
                </dd>
              </div>

              <div
                className={`rounded-lg px-3 py-2 ${
                  p.pendingReimbursement > 0 ? "bg-danger/10 text-danger-foreground" : "bg-muted/50"
                }`}
              >
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Pending Return (Company Due)
                </dt>
                <dd className="mt-0.5 font-bold tabular-nums">
                  {inr(p.pendingReimbursement)}
                </dd>
              </div>

              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Profit Share
                </dt>
                <dd className="mt-0.5 font-bold tabular-nums text-foreground">
                  {inr(p.profitShare)}
                </dd>
              </div>

              <div className="rounded-lg bg-primary/10 px-3 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total Partner Position
                </dt>
                <dd className="mt-0.5 font-bold tabular-nums text-primary">
                  {inr(p.netPosition)}
                </dd>
              </div>
            </dl>

            {can("managePartnerFinance") && (
              <div className="mt-4 flex items-end gap-2 border-t pt-3">
                <Field label="Profit share %">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={Number(p.partner.profit_share)}
                    className="h-9 w-24"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== Number(p.partner.profit_share)) {
                        saveShare.mutate({ id: p.partner.id, values: { profit_share: v } });
                      }
                    }}
                  />
                </Field>
                <span className="pb-2 text-[11px] text-muted-foreground">
                  Saved automatically when changed.
                </span>
              </div>
            )}
          </SectionCard>
        ))}
      </div>

      {/* Tables: Capital Entries & Reimbursements Returned to Partner */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Capital Invested">
          <DataTable
            rows={capital}
            columns={[
              {
                key: "d",
                header: "Date",
                cell: (r) => fmtDate(r.entry_date),
                sortValue: (r) => r.entry_date,
              },
              {
                key: "p",
                header: "Partner",
                cell: (r) => partners.find((x) => x.id === r.partner_id)?.name ?? "—",
                sortValue: (r) => partners.find((x) => x.id === r.partner_id)?.name ?? "",
              },
              {
                key: "a",
                header: "Amount",
                align: "right",
                cell: (r) => <span className="font-semibold">{inr(r.amount)}</span>,
                sortValue: (r) => Number(r.amount),
              },
              {
                key: "n",
                header: "Notes",
                cell: (r) => r.notes ?? "—",
                sortValue: (r) => r.notes ?? "",
              },
              {
                key: "act",
                header: "",
                cell: (r) =>
                  can("managePartnerFinance") ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-danger"
                      onClick={() => delCapital.mutate(r.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null,
              },
            ]}
            rowKey={(r) => r.id}
            loading={isLoading}
            pageSize={10}
            exportName="LEONIS-partner-capital"
            searchFields={(r) => r.notes ?? ""}
            emptyMessage="No capital entries recorded yet."
          />
        </SectionCard>

        <SectionCard title="Reimbursements Returned to Partners">
          <DataTable
            rows={reimbursements}
            columns={[
              {
                key: "d",
                header: "Date",
                cell: (r) => fmtDate(r.entry_date),
                sortValue: (r) => r.entry_date,
              },
              {
                key: "p",
                header: "Partner",
                cell: (r) => partners.find((x) => x.id === r.partner_id)?.name ?? "—",
                sortValue: (r) => partners.find((x) => x.id === r.partner_id)?.name ?? "",
              },
              {
                key: "a",
                header: "Amount Returned",
                align: "right",
                cell: (r) => (
                  <span className="font-semibold text-success-foreground">{inr(r.amount)}</span>
                ),
                sortValue: (r) => Number(r.amount),
              },
              {
                key: "n",
                header: "Notes",
                cell: (r) => r.notes ?? "—",
                sortValue: (r) => r.notes ?? "",
              },
              {
                key: "act",
                header: "",
                cell: (r) =>
                  can("managePartnerFinance") ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-danger"
                      onClick={() => delReimbursement.mutate(r.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null,
              },
            ]}
            rowKey={(r) => r.id}
            pageSize={10}
            exportName="LEONIS-partner-reimbursements"
            searchFields={(r) => r.notes ?? ""}
            emptyMessage="No reimbursements recorded yet. Record one when company repays a partner."
          />
        </SectionCard>
      </div>
    </div>
  );
}
