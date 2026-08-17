import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BadgeIndianRupee, Receipt, TrendingDown, TrendingUp, Users2, Wallet } from "lucide-react";
import { EmptyState, KpiCard, PageHeader, SectionCard, StatusChip, statusTone } from "@/components/Primitives";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import {
  computeClientStats,
  computePartnerPositions,
  defaultFilters,
  filterExpenses,
  filterPayments,
  filterProjects,
  operatingPL,
  projectExpense,
  projectProfit,
  sum,
  useAlerts,
  useClients,
  useExpenses,
  usePartnerCapital,
  usePartnerReimbursements,
  usePartners,
  usePayments,
  useProjects,
  type Filters,
} from "@/lib/api";
import { fmtDate, inr, margin, monthKey, monthLabel, pct } from "@/lib/format";
import { useCan } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — LEONIS Studio Suite" },
      { name: "description", content: "Live studio position: revenue, receipts, outstanding dues and expenses." },
      { property: "og:title", content: "Dashboard — LEONIS Studio Suite" },
      { property: "og:description", content: "Live studio position for shoots, receipts and expenses." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const PIE_COLORS = ["#1F3864", "#3B5CA8", "#7C93C8", "#B9C6E2", "#6366f1", "#10b981"];
const BAR_COLORS = ["#2F855A", "#C05621"];

function Dashboard() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const can = useCan();
  const { data: projects = [], isLoading: lp } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const { data: clients = [] } = useClients();
  const { data: alerts = [] } = useAlerts();
  const { data: partners = [] } = usePartners();
  const { data: capital = [] } = usePartnerCapital();
  const { data: reimbursements = [] } = usePartnerReimbursements();

  const fp = useMemo(() => filterProjects(projects, filters), [projects, filters]);
  const fpay = useMemo(() => filterPayments(payments, filters), [payments, filters]);
  const fex = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const pl = useMemo(() => operatingPL(fp, fpay, fex), [fp, fpay, fex]);
  const stats = useMemo(() => computeClientStats(clients, projects, payments, expenses), [clients, projects, payments, expenses]);
  const outstanding = stats.reduce((t, s) => t + Math.max(0, s.due), 0);

  const positions = useMemo(
    () => computePartnerPositions(partners, filterExpenses(expenses, filters), capital, reimbursements, pl.netProfit),
    [partners, expenses, filters, capital, reimbursements, pl.netProfit],
  );

  const trend = useMemo(() => {
    const keys = new Set<string>();
    fp.forEach((p) => keys.add(monthKey(p.shoot_date)));
    fpay.forEach((p) => keys.add(monthKey(p.payment_date)));
    fex.forEach((e) => keys.add(monthKey(e.expense_date)));
    return [...keys].sort().map((k) => ({
      month: monthLabel(k),
      revenue: fp.filter((p) => monthKey(p.shoot_date) === k).reduce((t, p) => t + Number(p.amount), 0),
      received: fpay.filter((p) => monthKey(p.payment_date) === k).reduce((t, p) => t + Number(p.amount), 0),
      expense: fex.filter((e) => monthKey(e.expense_date) === k).reduce((t, e) => t + Number(e.amount), 0),
    }));
  }, [fp, fpay, fex]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    fp.forEach((p) => {
      const k = p.project_types?.name ?? "Other";
      map.set(k, (map.get(k) ?? 0) + Number(p.amount));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [fp]);

  const upcoming = useMemo(
    () =>
      [...projects]
        .filter((p) => p.status === "planned" || p.status === "active")
        .sort((a, b) => a.shoot_date.localeCompare(b.shoot_date))
        .slice(0, 6),
    [projects],
  );

  const topDues = useMemo(() => stats.filter((s) => s.due > 0).sort((a, b) => b.due - a.due).slice(0, 6), [stats]);
  const openAlerts = alerts.filter((a) => a.status === "open").slice(0, 5);

  // Recent payments & expenses
  const recentPay = useMemo(() => [...fpay].sort((a, b) => b.payment_date.localeCompare(a.payment_date)).slice(0, 5), [fpay]);
  const recentExp = useMemo(() => [...fex].sort((a, b) => b.expense_date.localeCompare(a.expense_date)).slice(0, 5), [fex]);

  // Expense by category
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    fex.forEach((e) => {
      const k = e.expense_categories?.name ?? "Other";
      map.set(k, (map.get(k) ?? 0) + Number(e.amount));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [fex]);

  // Low margin projects
  const lowMargin = useMemo(
    () => fp.filter((p) => {
      const prof = projectProfit(p);
      const m = Number(p.amount) > 0 ? margin(prof, Number(p.amount)) : 100;
      return m < 20 && Number(p.amount) > 0;
    }).slice(0, 5),
    [fp],
  );

  return (
    <div>
      <PageHeader
        title="Studio dashboard"
        description="Position for the selected period, in Indian Rupees."
        actions={<DateRangeFilter value={filters} onChange={setFilters} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Billed revenue" value={inr(pl.revenue)} hint={`${fp.length} shoots`} icon={<TrendingUp className="size-4" />} />
        <KpiCard
          label="Payments received"
          value={inr(pl.received)}
          hint={`${fpay.length} receipts`}
          tone="success"
          icon={<BadgeIndianRupee className="size-4" />}
          to="/payments"
        />
        <KpiCard
          label="Outstanding dues"
          value={inr(outstanding)}
          hint="All clients, lifetime"
          tone="danger"
          icon={<Wallet className="size-4" />}
          to="/clients"
        />
        <KpiCard
          label="Operating expenses"
          value={inr(pl.operating)}
          hint={`Capital ${inr(pl.capital)} · Financing ${inr(pl.financing)}`}
          tone="warning"
          icon={<Receipt className="size-4" />}
          to="/expenses"
        />
      </div>

      {can("viewFinance") && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <KpiCard label="Net operating profit" value={inr(pl.netProfit)} hint={`Margin ${pct(pl.marginPct)}`} tone="success" />
          <KpiCard label="Collection rate" value={pct(pl.revenue > 0 ? (pl.received / pl.revenue) * 100 : 0)} hint="Received ÷ billed" />
          <KpiCard label="Active clients" value={String(clients.filter((c) => c.is_active).length)} hint={`${clients.length} on record`} to="/clients" />
        </div>
      )}

      {can("viewPartnerFinance") && positions.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {positions.map((p) => (
            <KpiCard
              key={p.partner.id}
              label={`${p.partner.name} — profit share`}
              value={inr(p.profitShare)}
              hint={p.pendingReimbursement > 0 ? `Pending Return ${inr(p.pendingReimbursement)}` : `Capital ${inr(p.capital)}`}
              tone={p.pendingReimbursement > 0 ? "warning" : "success"}
              icon={<Users2 className="size-4" />}
              to="/partners"
            />
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SectionCard title="Revenue, receipts & expenses" className="lg:col-span-2">
          {trend.length === 0 ? (
            <EmptyState message="No activity in this period." hint="Widen the date range or add a shoot." />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -18, right: 6, top: 6 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1F3864" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#1F3864" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,56,100,0.12)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => inr(Number(v), { compact: true })} />
                  <Tooltip formatter={(v) => inr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" name="Billed" stroke="#1F3864" fill="url(#rev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="received" name="Received" stroke="#2F855A" fill="transparent" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="Expenses" stroke="#C05621" fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Revenue by project type">
          {byType.length === 0 ? (
            <EmptyState message="Nothing billed yet." />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {byType.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => inr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Upcoming shoots"
          action={
            <Link to="/projects" className="text-[11px] font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {lp ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : upcoming.length === 0 ? (
            <EmptyState message="No planned shoots." hint="Add a shoot to see it here." />
          ) : (
            <ul className="divide-y">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{p.clients?.name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.project_types?.name ?? "Shoot"} · {fmtDate(p.shoot_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold tabular-nums">{inr(p.amount)}</p>
                    <StatusChip label={p.status} tone={statusTone(p.status)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Top outstanding"
          action={
            <Link to="/clients" className="text-[11px] font-medium text-primary hover:underline">
              Clients
            </Link>
          }
        >
          {topDues.length === 0 ? (
            <EmptyState message="All settled." hint="No pending client dues." />
          ) : (
            <ul className="divide-y">
              {topDues.map((s) => (
                <li key={s.client.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      to="/clients/$clientId"
                      params={{ clientId: s.client.id }}
                      className="truncate text-[13px] font-medium hover:text-primary hover:underline"
                    >
                      {s.client.name}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      Billed {inr(s.billed)} · Received {inr(s.received)}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold tabular-nums text-danger-foreground">{inr(s.due)}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Alerts">
          {openAlerts.length === 0 ? (
            <EmptyState message="No open alerts." />
          ) : (
            <ul className="space-y-2.5">
              {openAlerts.map((a) => (
                <li key={a.id} className="flex gap-2.5 rounded-lg border p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{a.title}</p>
                    {a.description && <p className="text-[11px] text-muted-foreground">{a.description}</p>}
                    {a.amount != null && <p className="mt-0.5 text-[11px] font-semibold tabular-nums">{inr(a.amount)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Row 4: Recent payments, recent expenses, expense breakdown */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Recent payments"
          action={
            <Link to="/payments" className="text-[11px] font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {recentPay.length === 0 ? (
            <EmptyState message="No payments this period." />
          ) : (
            <ul className="divide-y">
              {recentPay.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{p.clients?.name ?? "Other income"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtDate(p.payment_date)} · {p.payment_modes?.name ?? "—"}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold tabular-nums text-success-foreground">{inr(p.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Recent expenses"
          action={
            <Link to="/expenses" className="text-[11px] font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {recentExp.length === 0 ? (
            <EmptyState message="No expenses this period." />
          ) : (
            <ul className="divide-y">
              {recentExp.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{e.expense_categories?.name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtDate(e.expense_date)} · {e.partners?.name ?? "—"}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold tabular-nums text-warning-foreground">{inr(e.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Expenses by category">
          {byCategory.length === 0 ? (
            <EmptyState message="No expenses yet." />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => inr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 5: Low margin warning */}
      {can("viewFinance") && lowMargin.length > 0 && (
        <div className="mt-4">
          <SectionCard
            title="Low margin projects"
            action={
              <Link to="/insights" className="text-[11px] font-medium text-primary hover:underline">
                View insights
              </Link>
            }
          >
            <ul className="divide-y">
              {lowMargin.map((p) => {
                const prof = projectProfit(p);
                const m = margin(prof, Number(p.amount));
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">
                        {p.clients?.name ?? "—"} — {p.project_types?.name ?? "Shoot"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Revenue {inr(p.amount)} · Cost {inr(projectExpense(p))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[13px] font-semibold tabular-nums ${prof < 0 ? "text-danger-foreground" : "text-warning-foreground"}`}>
                        {inr(prof)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{pct(m)} margin</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
