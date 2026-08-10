import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/DataTable";
import { FormDialog } from "@/components/FormDialog";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { KpiCard, PageHeader, SectionCard } from "@/components/Primitives";
import { Field } from "@/components/forms/ProjectForm";
import {
  computePartnerPositions,
  defaultFilters,
  filterExpenses,
  filterPayments,
  filterProjects,
  operatingPL,
  useExpenses,
  usePartnerCapital,
  usePartnerDrawings,
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
      { title: "Partners — LEONIS" },
      { name: "description", content: "Partner capital, drawings, spend and profit share positions." },
      { property: "og:title", content: "Partners — LEONIS" },
      { property: "og:description", content: "Partner capital, drawings and profit share." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnersPage,
});

function EntryForm({ table, module, onDone }: { table: string; module: string; onDone: () => void }) {
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
          { values: { partner_id: partnerId, entry_date: date, amount: Number(amount), notes: notes || null } },
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
        <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Notes">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional remark" />
      </Field>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        Save {module.toLowerCase()}
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
  const { data: drawings = [] } = usePartnerDrawings();
  const saveShare = useSaveRecord("partners", "Partner");

  const pl = useMemo(
    () => operatingPL(filterProjects(projects, filters), filterPayments(payments, filters), filterExpenses(expenses, filters)),
    [projects, payments, expenses, filters],
  );

  const positions = useMemo(
    () => computePartnerPositions(partners, filterExpenses(expenses, filters), capital, drawings, pl.netProfit),
    [partners, expenses, filters, capital, drawings, pl.netProfit],
  );

  const shareTotal = partners.reduce((t, p) => t + Number(p.profit_share), 0);

  return (
    <div>
      <PageHeader
        title="Partner accounts"
        description="Capital brought in, drawings taken out and profit share for the period."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <DateRangeFilter value={filters} onChange={setFilters} />
            {can("managePartnerFinance") && (
              <>
                <FormDialog title="Add capital" triggerLabel="Add capital">
                  {(close) => <EntryForm table="partner_capital" module="Capital entry" onDone={close} />}
                </FormDialog>
                <FormDialog
                  title="Record drawing"
                  trigger={<Button variant="outline">Record drawing</Button>}
                >
                  {(close) => <EntryForm table="partner_drawings" module="Drawing" onDone={close} />}
                </FormDialog>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Distributable profit" value={inr(pl.netProfit)} hint={`Margin ${pct(pl.marginPct)}`} tone="success" />
        <KpiCard label="Total capital" value={inr(positions.reduce((t, p) => t + p.capital, 0))} />
        <KpiCard label="Total drawings" value={inr(positions.reduce((t, p) => t + p.drawings, 0))} tone="warning" />
        <KpiCard label="Partner spend (period)" value={inr(positions.reduce((t, p) => t + p.totalSpend, 0))} tone="danger" />
      </div>

      {shareTotal !== 100 && partners.length > 0 && (
        <p className="mt-3 rounded-lg border border-warning bg-warning/40 px-3 py-2 text-[12px] text-warning-foreground">
          Profit shares add up to {shareTotal}%. Adjust them to total 100%.
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {positions.map((p) => (
          <SectionCard
            key={p.partner.id}
            title={p.partner.name}
            action={<span className="text-[11px] font-medium text-primary">{Number(p.partner.profit_share)}% share</span>}
          >
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                ["Capital invested", inr(p.capital)],
                ["Drawings", inr(p.drawings)],
                ["Profit share", inr(p.profitShare)],
                ["Net position", inr(p.netPosition)],
                ["Operating spend", inr(p.operating)],
                ["Capital spend", inr(p.capitalSpend)],
                ["Financing spend", inr(p.financing)],
                ["Total spend", inr(p.totalSpend)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/50 px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Capital recovery via profit share</span>
                <span>{pct(p.recoveryPct)}</span>
              </div>
              <Progress value={p.recoveryPct} className="mt-1.5 h-2" />
            </div>
            {can("managePartnerFinance") && (
              <div className="mt-4 flex items-end gap-2">
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
                <span className="pb-2 text-[11px] text-muted-foreground">Saved when you leave the field.</span>
              </div>
            )}
          </SectionCard>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Capital entries">
          <DataTable
            rows={capital}
            columns={[
              { key: "d", header: "Date", cell: (r) => fmtDate(r.entry_date), sortValue: (r) => r.entry_date },
              {
                key: "p",
                header: "Partner",
                cell: (r) => partners.find((x) => x.id === r.partner_id)?.name ?? "—",
                sortValue: (r) => partners.find((x) => x.id === r.partner_id)?.name ?? "",
              },
              { key: "a", header: "Amount", align: "right", cell: (r) => inr(r.amount), sortValue: (r) => Number(r.amount) },
              { key: "n", header: "Notes", cell: (r) => r.notes ?? "—", sortValue: (r) => r.notes ?? "" },
            ]}
            rowKey={(r) => r.id}
            loading={isLoading}
            pageSize={10}
            exportName="LEONIS-partner-capital"
            searchFields={(r) => r.notes ?? ""}
            emptyMessage="No capital entries yet."
          />
        </SectionCard>
        <SectionCard title="Drawings">
          <DataTable
            rows={drawings}
            columns={[
              { key: "d", header: "Date", cell: (r) => fmtDate(r.entry_date), sortValue: (r) => r.entry_date },
              {
                key: "p",
                header: "Partner",
                cell: (r) => partners.find((x) => x.id === r.partner_id)?.name ?? "—",
                sortValue: (r) => partners.find((x) => x.id === r.partner_id)?.name ?? "",
              },
              { key: "a", header: "Amount", align: "right", cell: (r) => inr(r.amount), sortValue: (r) => Number(r.amount) },
              { key: "n", header: "Notes", cell: (r) => r.notes ?? "—", sortValue: (r) => r.notes ?? "" },
            ]}
            rowKey={(r) => r.id}
            pageSize={10}
            exportName="LEONIS-partner-drawings"
            searchFields={(r) => r.notes ?? ""}
            emptyMessage="No drawings recorded."
          />
        </SectionCard>
      </div>
    </div>
  );
}
