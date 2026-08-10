import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  Clock,
  TrendingDown,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard, PageHeader, SectionCard, StatusChip, statusTone } from "@/components/Primitives";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import {
  computeClientStats,
  defaultFilters,
  filterExpenses,
  filterPayments,
  filterProjects,
  operatingPL,
  projectProfit,
  sum,
  useAlerts,
  useClients,
  useExpenses,
  usePayments,
  useProjects,
  useSaveRecord,
  useSettings,
  type Filters,
} from "@/lib/api";
import { fmtDate, fmtDateTime, inr, pct } from "@/lib/format";
import { margin } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights & Alerts — LEONIS" },
      { name: "description", content: "Automated alerts for overdue dues, low margins, expense spikes and more." },
      { property: "og:title", content: "Insights & Alerts — LEONIS" },
      { property: "og:description", content: "Automated alerts for studio finances." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InsightsPage,
});

type AlertCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  amount?: number | undefined;
  severity: "high" | "medium" | "low";
  actionLabel?: string;
  actionTo?: string;
};

function AlertCard({ icon, title, description, amount, severity, actionLabel, actionTo }: AlertCardProps) {
  const sevColors = {
    high: "border-l-danger bg-danger/5",
    medium: "border-l-warning bg-warning/5",
    low: "border-l-primary bg-primary-light/30",
  };
  const sevBadge = {
    high: "danger" as const,
    medium: "warning" as const,
    low: "neutral" as const,
  };

  return (
    <div className={`rounded-xl border border-l-4 p-4 shadow-card transition-all hover:shadow-elevated ${sevColors[severity]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 opacity-70">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[13px] font-semibold">{title}</h3>
            <StatusChip label={severity} tone={sevBadge[severity]} />
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>
          {amount != null && (
            <p className="mt-1.5 text-[14px] font-bold tabular-nums">{inr(amount)}</p>
          )}
          {actionTo && (
            <Link
              to={actionTo}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              {actionLabel ?? "View details"} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [severityFilter, setSeverityFilter] = useState("all");
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const { data: clients = [] } = useClients();
  const { data: alerts = [] } = useAlerts();
  const { data: settings = {} } = useSettings();
  const saveAlert = useSaveRecord("alerts", "Alert");

  const th = (settings["thresholds"] ?? {}) as Record<string, number>;
  const overdueDays = th["overdue_days"] ?? 30;
  const lowMarginPct = th["low_margin_percent"] ?? 20;

  const fp = useMemo(() => filterProjects(projects, filters), [projects, filters]);
  const fpay = useMemo(() => filterPayments(payments, filters), [payments, filters]);
  const fex = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const pl = useMemo(() => operatingPL(fp, fpay, fex), [fp, fpay, fex]);
  const stats = useMemo(() => computeClientStats(clients, projects, payments, expenses), [clients, projects, payments, expenses]);

  // Auto-generated insights
  const autoAlerts = useMemo(() => {
    const result: AlertCardProps[] = [];

    // Overdue clients
    const overdueClients = stats.filter((s) => s.due > 0 && s.lastPayment);
    const today = new Date();
    overdueClients.forEach((s) => {
      if (s.lastPayment) {
        const lastPay = new Date(s.lastPayment);
        const daysSince = Math.floor((today.getTime() - lastPay.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > overdueDays) {
          result.push({
            icon: <CalendarClock className="size-5 text-danger-foreground" />,
            title: `${s.client.name} — overdue ${daysSince} days`,
            description: `Last payment was on ${fmtDate(s.lastPayment)}. Outstanding balance needs follow-up.`,
            amount: s.due,
            severity: daysSince > 60 ? "high" : "medium",
            actionLabel: "View client",
            actionTo: `/clients/${s.client.id}`,
          });
        }
      }
    });

    // Clients with no payments at all
    stats
      .filter((s) => s.billed > 0 && s.received === 0)
      .forEach((s) => {
        result.push({
          icon: <Wallet className="size-5 text-danger-foreground" />,
          title: `${s.client.name} — no payment received`,
          description: `Billed ${inr(s.billed)} but ₹0 collected. Follow up immediately.`,
          amount: s.billed,
          severity: "high",
          actionLabel: "View client",
          actionTo: `/clients/${s.client.id}`,
        });
      });

    // Low margin projects
    fp.forEach((p) => {
      const prof = projectProfit(p);
      const m = margin(prof, Number(p.amount));
      if (Number(p.amount) > 0 && m < lowMarginPct && m >= 0) {
        result.push({
          icon: <TrendingDown className="size-5 text-warning-foreground" />,
          title: `Low margin: ${p.clients?.name ?? "—"} — ${p.project_types?.name ?? "Shoot"}`,
          description: `Margin is only ${pct(m)} (below ${lowMarginPct}% threshold). Review costs.`,
          amount: prof,
          severity: m < 10 ? "high" : "medium",
          actionLabel: "View projects",
          actionTo: "/projects",
        });
      }
    });

    // Negative profit projects
    fp.forEach((p) => {
      const prof = projectProfit(p);
      if (prof < 0) {
        result.push({
          icon: <AlertTriangle className="size-5 text-danger-foreground" />,
          title: `Loss-making: ${p.clients?.name ?? "—"} — ${p.project_types?.name ?? "Shoot"}`,
          description: `Project is running at a loss of ${inr(Math.abs(prof))}. Costs exceed revenue.`,
          amount: prof,
          severity: "high",
          actionLabel: "View projects",
          actionTo: "/projects",
        });
      }
    });

    // High outstanding total
    const totalOutstanding = stats.reduce((t, s) => t + Math.max(0, s.due), 0);
    if (totalOutstanding > 100000) {
      result.push({
        icon: <BadgeIndianRupee className="size-5 text-warning-foreground" />,
        title: "High total outstanding",
        description: `Total outstanding across all clients exceeds ₹1,00,000. Prioritize collections.`,
        amount: totalOutstanding,
        severity: totalOutstanding > 500000 ? "high" : "medium",
        actionLabel: "View clients",
        actionTo: "/clients",
      });
    }

    // Low collection rate
    if (pl.revenue > 0) {
      const collRate = (pl.received / pl.revenue) * 100;
      if (collRate < 60) {
        result.push({
          icon: <Zap className="size-5 text-warning-foreground" />,
          title: "Low collection rate",
          description: `Only ${pct(collRate)} of billed revenue collected this period. Target 80%+.`,
          severity: collRate < 40 ? "high" : "medium",
          actionLabel: "View payments",
          actionTo: "/payments",
        });
      }
    }

    return result;
  }, [stats, fp, pl, overdueDays, lowMarginPct]);

  // Combine auto-alerts with DB alerts
  const dbAlerts: AlertCardProps[] = useMemo(
    () =>
      alerts
        .filter((a) => a.status === "open")
        .map((a) => ({
          icon: <AlertTriangle className="size-5 text-warning-foreground" />,
          title: a.title,
          description: a.description ?? "",
          amount: a.amount ?? undefined,
          severity: (a.severity === "high" ? "high" : a.severity === "low" ? "low" : "medium") as "high" | "medium" | "low",
        })),
    [alerts],
  );

  const allAlerts = [...autoAlerts, ...dbAlerts];
  const filtered =
    severityFilter === "all" ? allAlerts : allAlerts.filter((a) => a.severity === severityFilter);

  const highCount = allAlerts.filter((a) => a.severity === "high").length;
  const medCount = allAlerts.filter((a) => a.severity === "medium").length;
  const lowCount = allAlerts.filter((a) => a.severity === "low").length;

  return (
    <div>
      <PageHeader
        title="Insights & alerts"
        description="Auto-generated alerts for overdue payments, low margins, expense spikes and business health."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <DateRangeFilter value={filters} onChange={setFilters} />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total alerts"
          value={String(allAlerts.length)}
          hint="Auto-generated + manual"
          icon={<AlertTriangle className="size-4" />}
        />
        <KpiCard
          label="High severity"
          value={String(highCount)}
          hint="Needs immediate action"
          tone="danger"
          icon={<Zap className="size-4" />}
        />
        <KpiCard
          label="Medium severity"
          value={String(medCount)}
          hint="Follow up soon"
          tone="warning"
          icon={<Clock className="size-4" />}
        />
        <KpiCard
          label="Resolved (DB)"
          value={String(alerts.filter((a) => a.status === "resolved").length)}
          hint="Previously resolved"
          tone="success"
          icon={<CheckCircle2 className="size-4" />}
        />
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <SectionCard title="All clear">
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 size-10 text-success-foreground" />
              <p className="text-sm font-medium">No active alerts</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All financials are within healthy thresholds for this period.
              </p>
            </div>
          </SectionCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((alert, i) => (
              <AlertCard key={i} {...alert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
