import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral" | "primary";
}) {
  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    neutral: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    primary: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  } as const;

  const dots = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    neutral: "bg-slate-400",
    primary: "bg-indigo-500",
  } as const;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight shadow-2xs", tones[tone])}>
      <span className={cn("size-1.5 rounded-full shrink-0", dots[tone])} />
      {label}
    </span>
  );
}

export function statusTone(status: string) {
  const s = status.toLowerCase();
  if (["settled", "completed"].includes(s)) return "success" as const;
  if (["partial", "active", "planned"].includes(s)) return "warning" as const;
  if (["not paid", "cancelled", "overdue"].includes(s)) return "danger" as const;
  return "neutral" as const;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-border/50 pb-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  to,
  tone = "primary",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  to?: string;
  tone?: "primary" | "success" | "danger" | "warning";
  icon?: ReactNode;
}) {
  const accents = {
    primary: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    danger: "text-rose-600 dark:text-rose-400",
    warning: "text-amber-600 dark:text-amber-400",
  } as const;

  const borders = {
    primary: "border-t-indigo-600",
    success: "border-t-emerald-600",
    danger: "border-t-rose-600",
    warning: "border-t-amber-600",
  } as const;

  const body = (
    <div className={cn("group h-full rounded-lg border border-border border-t-2 bg-card p-3.5 shadow-sm transition-all hover:shadow-md", borders[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon && <span className={cn("opacity-80", accents[tone])}>{icon}</span>}
      </div>
      <p className={cn("kpi-value mt-1.5", accents[tone])}>{value}</p>
      {hint && <p className="mt-1 text-[11px] font-medium text-muted-foreground">{hint}</p>}
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card shadow-sm", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-border/80 px-4 py-3 bg-muted/30">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/80">{title}</h2>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm font-medium">{message}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
