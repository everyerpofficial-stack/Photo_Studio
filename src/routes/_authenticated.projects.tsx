import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Copy } from "lucide-react";
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
import { PageHeader, StatusChip, statusTone } from "@/components/Primitives";
import { ProjectForm } from "@/components/forms/ProjectForm";
import { ProjectDetailDialog } from "@/components/ProjectDetailDialog";
import {
  defaultFilters,
  filterProjects,
  projectExpense,
  projectProfit,
  useClients,
  useDeleteRecord,
  usePartners,
  useProjectTypes,
  useProjects,
  sum,
  type Filters,
  type Project,
} from "@/lib/api";
import { fmtDate, inr, num, pct } from "@/lib/format";
import { margin } from "@/lib/format";
import { useCan } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Shoots & Projects — LEONIS" },
      { name: "description", content: "Schedule shoots, apply rate cards and track per-project profitability." },
      { property: "og:title", content: "Shoots & Projects — LEONIS" },
      { property: "og:description", content: "Schedule shoots and track per-project profitability." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [status, setStatus] = useState<string>("all");
  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: types = [] } = useProjectTypes();
  const { data: partners = [] } = usePartners();
  const del = useDeleteRecord("projects", "Project");
  const can = useCan();

  const rows = useMemo(() => {
    const base = filterProjects(projects, filters);
    return status === "all" ? base : base.filter((p) => p.status === status);
  }, [projects, filters, status]);

  const columns: Column<Project>[] = [
    {
      key: "shoot_date",
      header: "Shoot date",
      cell: (p) => fmtDate(p.shoot_date),
      sortValue: (p) => p.shoot_date,
      exportValue: (p) => fmtDate(p.shoot_date),
    },
    { key: "client", header: "Client", cell: (p) => p.clients?.name ?? "—", sortValue: (p) => p.clients?.name ?? "" },
    { key: "type", header: "Type", cell: (p) => p.project_types?.name ?? "—", sortValue: (p) => p.project_types?.name ?? "" },
    { key: "qty", header: "Qty", align: "right", cell: (p) => num(p.quantity), sortValue: (p) => Number(p.quantity) },
    { key: "rate", header: "Rate", align: "right", cell: (p) => inr(p.rate), sortValue: (p) => Number(p.rate) },
    { key: "amount", header: "Amount", align: "right", cell: (p) => inr(p.amount), sortValue: (p) => Number(p.amount) },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      cell: (p) => inr(projectExpense(p)),
      sortValue: (p) => projectExpense(p),
      defaultHidden: true,
    },
    {
      key: "profit",
      header: "Profit",
      align: "right",
      cell: (p) => <span className={projectProfit(p) < 0 ? "text-danger-foreground" : ""}>{inr(projectProfit(p))}</span>,
      sortValue: (p) => projectProfit(p),
      exportValue: (p) => projectProfit(p),
    },
    {
      key: "marginPct",
      header: "Margin",
      align: "right",
      cell: (p) => pct(margin(projectProfit(p), Number(p.amount))),
      sortValue: (p) => margin(projectProfit(p), Number(p.amount)),
      defaultHidden: true,
    },
    { key: "partner", header: "Partner", cell: (p) => p.partners?.name ?? "—", sortValue: (p) => p.partners?.name ?? "", defaultHidden: true },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusChip label={p.status} tone={statusTone(p.status)} />,
      sortValue: (p) => p.status,
      exportValue: (p) => p.status,
    },
    {
      key: "actions",
      header: "",
      cell: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <ProjectDetailDialog project={p} />
          {can("editProjects") && (
            <FormDialog
              title="Duplicate shoot"
              wide
              trigger={
                <Button variant="ghost" size="icon" aria-label="Duplicate shoot">
                  <Copy className="size-4" />
                </Button>
              }
            >
              {(close) => <ProjectForm initial={duplicate(p) as Project} onDone={close} />}
            </FormDialog>
          )}
          {can("editProjects") && (
            <FormDialog
              title="Edit shoot"
              wide
              trigger={
                <Button variant="ghost" size="icon" aria-label="Edit shoot">
                  <Pencil className="size-4" />
                </Button>
              }
            >
              {(close) => <ProjectForm initial={p} onDone={close} />}
            </FormDialog>
          )}
          {can("deleteRecords") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Delete shoot">
                  <Trash2 className="size-4 text-danger-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this shoot?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {p.clients?.name} · {fmtDate(p.shoot_date)} · {inr(p.amount)}. The record is archived and stays in the audit trail.
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

  // Build a duplicate from an existing project
  const duplicate = (p: Project): Partial<Project> => ({
    ...p,
    id: undefined as unknown as string,
    created_at: undefined as unknown as string,
    status: "planned",
    notes: `Duplicated from ${p.clients?.name ?? ""} · ${fmtDate(p.shoot_date)}`,
  });

  return (
    <div>
      <PageHeader
        title="Shoots & projects"
        description={`${rows.length} shoots · billed ${inr(sum(rows, (p) => Number(p.amount)))}`}
        actions={
          can("editProjects") ? (
            <FormDialog title="New shoot" wide triggerLabel="New shoot">
              {(close) => <ProjectForm onDone={close} />}
            </FormDialog>
          ) : undefined
        }
      />

      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowKey={(p) => p.id}
        exportName="LEONIS-shoots"
        searchPlaceholder="Search client, type, notes…"
        searchFields={(p) =>
          [p.clients?.name, p.project_types?.name, p.org_name, p.referred_by, p.notes].filter(Boolean).join(" ")
        }
        emptyMessage="No shoots in this period."
        emptyHint="Adjust the date range or add a new shoot."
        filters={
          <div className="flex flex-wrap items-end gap-2">
            <DateRangeFilter value={filters} onChange={setFilters} />
            <Select value={filters.clientId ?? "all"} onValueChange={(v) => setFilters({ ...filters, clientId: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-9 w-[160px]">
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
            <Select
              value={filters.projectTypeId ?? "all"}
              onValueChange={(v) => setFilters({ ...filters, projectTypeId: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {["all", "planned", "active", "completed", "cancelled"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.partnerId ?? "all"}
              onValueChange={(v) => setFilters({ ...filters, partnerId: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Partner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All partners</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        footer={(r) => (
          <>
            <span className="font-semibold">Totals</span>
            <span className="tabular-nums">
              {inr(sum(r, (p) => Number(p.amount)))} billed · {inr(sum(r, projectProfit))} profit
            </span>
          </>
        )}
      />
    </div>
  );
}
