import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
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
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { KpiCard, PageHeader, StatusChip } from "@/components/Primitives";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import {
  defaultFilters,
  filterExpenses,
  sum,
  useDeleteRecord,
  useExpenseCategories,
  useExpenses,
  usePartners,
  type Expense,
  type Filters,
} from "@/lib/api";
import { fmtDate, inr } from "@/lib/format";
import { useCan } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — LEONIS" },
      { name: "description", content: "Operating, capital and financing expenses with bills and partner attribution." },
      { property: "og:title", content: "Expenses — LEONIS" },
      { property: "og:description", content: "Operating, capital and financing expense register." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExpensesPage,
});

const CLASS_TONE = { operating: "warning", capital: "primary", financing: "neutral" } as const;

function ExpensesPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [cls, setCls] = useState("all");
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const { data: partners = [] } = usePartners();
  const del = useDeleteRecord("expenses", "Expense");
  const can = useCan();

  const rows = useMemo(() => {
    const base = filterExpenses(expenses, filters);
    return cls === "all" ? base : base.filter((e) => e.expense_class === cls);
  }, [expenses, filters, cls]);

  const byClass = (k: Expense["expense_class"]) => sum(rows.filter((e) => e.expense_class === k), (e) => Number(e.amount));

  const columns: Column<Expense>[] = [
    {
      key: "date",
      header: "Date",
      cell: (e) => fmtDate(e.expense_date),
      sortValue: (e) => e.expense_date,
      exportValue: (e) => fmtDate(e.expense_date),
    },
    { key: "category", header: "Category", cell: (e) => e.expense_categories?.name ?? "—", sortValue: (e) => e.expense_categories?.name ?? "" },
    {
      key: "class",
      header: "Class",
      cell: (e) => <StatusChip label={e.expense_class} tone={CLASS_TONE[e.expense_class]} />,
      sortValue: (e) => e.expense_class,
      exportValue: (e) => e.expense_class,
    },
    { key: "amount", header: "Amount", align: "right", cell: (e) => inr(e.amount), sortValue: (e) => Number(e.amount) },
    { key: "partner", header: "Paid by", cell: (e) => e.partners?.name ?? "—", sortValue: (e) => e.partners?.name ?? "" },
    { key: "client", header: "Client", cell: (e) => e.clients?.name ?? "—", sortValue: (e) => e.clients?.name ?? "", defaultHidden: true },
    { key: "bill", header: "Bill no.", cell: (e) => e.bill_no ?? "—", sortValue: (e) => e.bill_no ?? "" },
    { key: "notes", header: "Notes", cell: (e) => e.notes ?? "—", sortValue: (e) => e.notes ?? "", defaultHidden: true },
    {
      key: "actions",
      header: "",
      cell: (e) => (
        <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
          {can("editProjects") && (
            <FormDialog
              title="Edit expense"
              trigger={
                <Button variant="ghost" size="icon" aria-label="Edit expense">
                  <Pencil className="size-4" />
                </Button>
              }
            >
              {(close) => <ExpenseForm initial={e} onDone={close} />}
            </FormDialog>
          )}
          {can("deleteRecords") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Delete expense">
                  <Trash2 className="size-4 text-danger-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {inr(e.amount)} on {fmtDate(e.expense_date)}. The entry is archived and stays audited.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => del.mutate(e.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Every rupee out, classified for clean P&L and balance reporting."
        actions={
          can("editProjects") ? (
            <div className="flex items-center gap-2">
              <CsvImportDialog />
              <FormDialog title="New expense" triggerLabel="New expense">
                {(close) => <ExpenseForm onDone={close} />}
              </FormDialog>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total spend" value={inr(sum(rows, (e) => Number(e.amount)))} hint={`${rows.length} entries`} tone="danger" />
        <KpiCard label="Operating" value={inr(byClass("operating"))} tone="warning" />
        <KpiCard label="Capital" value={inr(byClass("capital"))} />
        <KpiCard label="Financing" value={inr(byClass("financing"))} />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowKey={(e) => e.id}
        exportName="LEONIS-expenses"
        searchPlaceholder="Search category, bill, notes…"
        searchFields={(e) => [e.expense_categories?.name, e.bill_no, e.notes, e.partners?.name, e.clients?.name].filter(Boolean).join(" ")}
        emptyMessage="No expenses in this period."
        filters={
          <div className="flex flex-wrap items-end gap-2">
            <DateRangeFilter value={filters} onChange={setFilters} />
            <Select value={filters.partnerId ?? "all"} onValueChange={(v) => setFilters({ ...filters, partnerId: v === "all" ? undefined : v })}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Paid by" />
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
            <Select value={cls} onValueChange={setCls}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                <SelectItem value="operating">Operating</SelectItem>
                <SelectItem value="capital">Capital</SelectItem>
                <SelectItem value="financing">Financing</SelectItem>
              </SelectContent>
            </Select>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">{categories.length} categories</span>
          </div>
        }
        footer={(r) => (
          <>
            <span className="font-semibold">Total</span>
            <span className="tabular-nums">{inr(sum(r, (e) => Number(e.amount)))}</span>
          </>
        )}
      />
    </div>
  );
}
