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
    success: "bg-success text-success-foreground",
    warning: "bg-warning text-warning-foreground",
    danger: "bg-danger text-danger-foreground",
    neutral: "bg-neutral text-neutral-foreground",
    primary: "bg-primary-light text-primary",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium", tones[tone])}>
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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
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
    primary: "text-primary",
    success: "text-success-foreground",
    danger: "text-danger-foreground",
    warning: "text-warning-foreground",
  } as const;

  const body = (
    <div className="group h-full rounded-xl border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon && <span className={cn("opacity-70", accents[tone])}>{icon}</span>}
      </div>
      <p className={cn("kpi-value mt-2", accents[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
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
    <section className={cn("rounded-xl border bg-card shadow-card", className)}>
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
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
