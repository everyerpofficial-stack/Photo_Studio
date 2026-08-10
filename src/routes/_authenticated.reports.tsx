import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { KpiCard, PageHeader, SectionCard } from "@/components/Primitives";
import {
  computeClientStats,
  defaultFilters,
  filterExpenses,
  filterPayments,
  filterProjects,
  operatingPL,
  projectExpense,
  projectProfit,
  sum,
  useClients,
  useExpenses,
  usePayments,
  useProjects,
  type Filters,
} from "@/lib/api";
import { printDocument } from "@/lib/export";
import { fmtDate, inr, margin, monthKey, monthLabel, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — LEONIS" },
      { name: "description", content: "Profit & loss, outstanding, project profitability and monthly summaries." },
      { property: "og:title", content: "Reports — LEONIS" },
      { property: "og:description", content: "P&L, outstanding and project profitability reports." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const { data: clients = [] } = useClients();

  const fp = useMemo(() => filterProjects(projects, filters), [projects, filters]);
  const fpay = useMemo(() => filterPayments(payments, filters), [payments, filters]);
  const fex = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const pl = useMemo(() => operatingPL(fp, fpay, fex), [fp, fpay, fex]);
  const stats = useMemo(() => computeClientStats(clients, projects, payments, expenses), [clients, projects, payments, expenses]);

  const monthly = useMemo(() => {
    const keys = new Set<string>();
    fp.forEach((p) => keys.add(monthKey(p.shoot_date)));
    fex.forEach((e) => keys.add(monthKey(e.expense_date)));
    return [...keys].sort().map((k) => {
      const revenue = sum(fp.filter((p) => monthKey(p.shoot_date) === k), (p) => Number(p.amount));
      const expense =
        sum(fex.filter((e) => monthKey(e.expense_date) === k && e.expense_class === "operating"), (e) => Number(e.amount)) +
        sum(fp.filter((p) => monthKey(p.shoot_date) === k), projectExpense);
      return { key: k, month: monthLabel(k), revenue, expense, profit: revenue - expense };
    });
  }, [fp, fex]);

  const printPL = () =>
    printDocument(
      "Profit & Loss — LEONIS",
      `<h2>Profit &amp; Loss</h2>
       <p>${fmtDate(filters.from)} to ${fmtDate(filters.to)}</p>
       <table><tbody>
       <tr><td>Billed revenue</td><td class="r">${inr(pl.revenue)}</td></tr>
       <tr><td>Payments received</td><td class="r">${inr(pl.received)}</td></tr>
       <tr><td>Operating expenses</td><td class="r">${inr(pl.operating)}</td></tr>
       <tr><td><strong>Net operating profit</strong></td><td class="r"><strong>${inr(pl.netProfit)}</strong></td></tr>
       <tr><td>Capital expenditure</td><td class="r">${inr(pl.capital)}</td></tr>
       <tr><td>Financing outflow</td><td class="r">${inr(pl.financing)}</td></tr>
       </tbody></table>`,
    );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="April–March financial year by default. Export or print any view."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <DateRangeFilter value={filters} onChange={setFilters} />
            <Button variant="outline" className="gap-2" onClick={printPL}>
              <Printer className="size-4" /> Print P&L
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Billed revenue" value={inr(pl.revenue)} />
        <KpiCard label="Received" value={inr(pl.received)} tone="success" />
        <KpiCard label="Operating expenses" value={inr(pl.operating)} tone="warning" />
        <KpiCard label="Net profit" value={inr(pl.netProfit)} hint={`Margin ${pct(pl.marginPct)}`} tone="success" />
      </div>

      <div className="mt-4">
        <Tabs defaultValue="monthly">
          <TabsList>
            <TabsTrigger value="monthly">Monthly summary</TabsTrigger>
            <TabsTrigger value="clients">Client outstanding</TabsTrigger>
            <TabsTrigger value="projects">Project profitability</TabsTrigger>
            <TabsTrigger value="pl">P&L statement</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-4">
            <DataTable
              rows={monthly}
              columns={[
                { key: "m", header: "Month", cell: (r) => r.month, sortValue: (r) => r.key },
                { key: "r", header: "Revenue", align: "right", cell: (r) => inr(r.revenue), sortValue: (r) => r.revenue },
                { key: "e", header: "Expenses", align: "right", cell: (r) => inr(r.expense), sortValue: (r) => r.expense },
                { key: "p", header: "Profit", align: "right", cell: (r) => inr(r.profit), sortValue: (r) => r.profit },
                { key: "mg", header: "Margin", align: "right", cell: (r) => pct(margin(r.profit, r.revenue)), sortValue: (r) => margin(r.profit, r.revenue) },
              ]}
              rowKey={(r) => r.key}
              exportName="LEONIS-monthly-summary"
              searchFields={(r) => r.month}
              emptyMessage="No activity in this period."
            />
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <DataTable
              rows={stats}
              columns={[
                { key: "c", header: "Client", cell: (r) => r.client.name, sortValue: (r) => r.client.name },
                { key: "q", header: "Quote", align: "right", cell: (r) => inr(r.quote), sortValue: (r) => r.quote },
                { key: "b", header: "Billed", align: "right", cell: (r) => inr(r.billed), sortValue: (r) => r.billed },
                { key: "rc", header: "Received", align: "right", cell: (r) => inr(r.received), sortValue: (r) => r.received },
                { key: "d", header: "Due", align: "right", cell: (r) => inr(r.due), sortValue: (r) => r.due },
                { key: "s", header: "Status", cell: (r) => r.status, sortValue: (r) => r.status },
              ]}
              rowKey={(r) => r.client.id}
              exportName="LEONIS-client-outstanding"
              searchFields={(r) => r.client.name}
              emptyMessage="No clients yet."
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <DataTable
              rows={fp}
              columns={[
                { key: "d", header: "Date", cell: (p) => fmtDate(p.shoot_date), sortValue: (p) => p.shoot_date },
                { key: "c", header: "Client", cell: (p) => p.clients?.name ?? "—", sortValue: (p) => p.clients?.name ?? "" },
                { key: "t", header: "Type", cell: (p) => p.project_types?.name ?? "—", sortValue: (p) => p.project_types?.name ?? "" },
                { key: "a", header: "Amount", align: "right", cell: (p) => inr(p.amount), sortValue: (p) => Number(p.amount) },
                { key: "e", header: "Cost", align: "right", cell: (p) => inr(projectExpense(p)), sortValue: (p) => projectExpense(p) },
                { key: "p", header: "Profit", align: "right", cell: (p) => inr(projectProfit(p)), sortValue: (p) => projectProfit(p) },
                {
                  key: "m",
                  header: "Margin",
                  align: "right",
                  cell: (p) => pct(margin(projectProfit(p), Number(p.amount))),
                  sortValue: (p) => margin(projectProfit(p), Number(p.amount)),
                },
              ]}
              rowKey={(p) => p.id}
              exportName="LEONIS-project-profitability"
              searchFields={(p) => [p.clients?.name, p.project_types?.name].filter(Boolean).join(" ")}
              emptyMessage="No shoots in this period."
            />
          </TabsContent>

          <TabsContent value="pl" className="mt-4">
            <SectionCard title={`Profit & Loss · ${fmtDate(filters.from)} – ${fmtDate(filters.to)}`}>
              <dl className="divide-y text-[13px]">
                {[
                  ["Billed revenue", inr(pl.revenue)],
                  ["Payments received", inr(pl.received)],
                  ["Operating expenses (incl. shoot costs)", inr(pl.operating)],
                  ["Net operating profit", inr(pl.netProfit)],
                  ["Operating margin", pct(pl.marginPct)],
                  ["Capital expenditure", inr(pl.capital)],
                  ["Financing outflow", inr(pl.financing)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
