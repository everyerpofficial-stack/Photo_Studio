import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard, PageHeader, StatusChip } from "@/components/Primitives";
import { FormDialog } from "@/components/FormDialog";
import { Field } from "@/components/forms/ProjectForm";
import {
  useExpenseCategories,
  useFinancialYears,
  usePaymentModes,
  usePriceLists,
  useProjectTypes,
  usePartners,
  useSaveRecord,
} from "@/lib/api";
import { fmtDate, inr, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/masters")({
  head: () => ({
    meta: [
      { title: "Masters — LEONIS" },
      { name: "description", content: "Project types, expense categories, payment modes, rate cards and financial years." },
      { property: "og:title", content: "Masters — LEONIS" },
      { property: "og:description", content: "Configure studio master data and rate cards." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MastersPage,
});

function NameList({
  table,
  module,
  rows,
}: {
  table: string;
  module: string;
  rows: { id: string; name: string; is_active: boolean }[];
}) {
  const save = useSaveRecord(table, module);
  const [name, setName] = useState("");

  return (
    <SectionCard title={module}>
      <form
        className="mb-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            toast.error("Enter a name.");
            return;
          }
          const values: Record<string, unknown> = { name: name.trim(), is_active: true };
          if (table === "expense_categories") values.default_class = "operating";
          if (table === "partners") values.profit_share = 0;
          save.mutate({ values }, { onSuccess: () => setName("") });
        }}
      >
        <Field label={`Add ${module.toLowerCase()}`}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-9" />
        </Field>
        <Button type="submit" size="sm" disabled={save.isPending}>
          Add
        </Button>
      </form>
      <ul className="divide-y text-[13px]">
        {rows.length === 0 && <li className="py-3 text-muted-foreground">Nothing yet.</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
            <span>{r.name}</span>
            <div className="flex items-center gap-2">
              <StatusChip label={r.is_active ? "Active" : "Inactive"} tone={r.is_active ? "success" : "neutral"} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => save.mutate({ id: r.id, values: { is_active: !r.is_active } })}
              >
                {r.is_active ? "Disable" : "Enable"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function RateCardForm({ onDone }: { onDone: () => void }) {
  const { data: types = [] } = useProjectTypes();
  const save = useSaveRecord("price_lists", "Rate card");
  const [projectTypeId, setProjectTypeId] = useState(types[0]?.id ?? "");
  const [rate, setRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(today());

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!projectTypeId || Number(rate) <= 0) {
          toast.error("Select a project type and enter a rate greater than zero.");
          return;
        }
        save.mutate(
          {
            values: {
              project_type_id: projectTypeId,
              rate: Number(rate),
              effective_from: effectiveFrom,
              is_active: true,
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Project type" required>
        <Select value={projectTypeId} onValueChange={setProjectTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Standard Rate (₹)" required>
        <Input type="number" min="1" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="5000" />
      </Field>
      <Field label="Effective From" required>
        <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
      </Field>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        Save Rate Card
      </Button>
    </form>
  );
}

function FYForm({ onDone }: { onDone: () => void }) {
  const save = useSaveRecord("financial_years", "Financial year");
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!label || !startDate || !endDate) {
          toast.error("Label, start date and end date are required.");
          return;
        }
        save.mutate(
          {
            values: {
              label,
              start_date: startDate,
              end_date: endDate,
              is_current: false,
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <Field label="Label" required hint="e.g. FY 2026-27">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="FY 2026-27" />
      </Field>
      <Field label="Start Date" required>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>
      <Field label="End Date" required>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </Field>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        Save Financial Year
      </Button>
    </form>
  );
}

function MastersPage() {
  const { data: types = [] } = useProjectTypes();
  const { data: categories = [] } = useExpenseCategories();
  const { data: modes = [] } = usePaymentModes();
  const { data: partners = [] } = usePartners();
  const { data: prices = [] } = usePriceLists();
  const { data: years = [] } = useFinancialYears();

  return (
    <div>
      <PageHeader title="Masters" description="The vocabulary behind every entry in LEONIS." />
      <Tabs defaultValue="lists">
        <TabsList>
          <TabsTrigger value="lists">Lists</TabsTrigger>
          <TabsTrigger value="rates">Rate cards</TabsTrigger>
          <TabsTrigger value="fy">Financial years</TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NameList table="project_types" module="Project types" rows={types} />
          <NameList table="expense_categories" module="Expense categories" rows={categories} />
          <NameList table="payment_modes" module="Payment modes" rows={modes} />
          <NameList table="partners" module="Partners" rows={partners} />
        </TabsContent>

        <TabsContent value="rates" className="mt-4">
          <SectionCard
            title="Rate cards"
            action={
              <FormDialog title="New rate card" triggerLabel="New rate card">
                {(close) => <RateCardForm onDone={close} />}
              </FormDialog>
            }
          >
            <ul className="divide-y text-[13px]">
              {prices.length === 0 && <li className="py-3 text-muted-foreground">No rate cards yet.</li>}
              {prices.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span>
                    {p.project_types?.name ?? "—"}
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      from {fmtDate(p.effective_from)}
                      {p.effective_to ? ` to ${fmtDate(p.effective_to)}` : ""}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{inr(p.rate)}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="fy" className="mt-4">
          <SectionCard
            title="Financial years (April–March)"
            action={
              <FormDialog title="New financial year" triggerLabel="New financial year">
                {(close) => <FYForm onDone={close} />}
              </FormDialog>
            }
          >
            <ul className="divide-y text-[13px]">
              {years.length === 0 && <li className="py-3 text-muted-foreground">No financial years defined.</li>}
              {years.map((y) => (
                <li key={y.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span>{y.label}</span>
                  <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {fmtDate(y.start_date)} – {fmtDate(y.end_date)}
                    {y.is_current && <StatusChip label="Current" tone="primary" />}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

