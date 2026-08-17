import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, Pencil, Trash2 } from "lucide-react";
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
import { PartnerReimbursementForm } from "@/components/forms/PartnerReimbursementForm";
import {
  defaultFilters,
  filterExpenses,
  sum,
  useDeleteRecord,
  useExpenseCategories,
  useExpenses,
  usePartnerReimbursements,
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
      { name: "description", content: "Company and client expenses with partner payment and reimbursement tracking." },
      { property: "og:title", content: "Expenses — LEONIS" },
      { property: "og:description", content: "Company and client expenses register." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [scopeFilter, setScopeFilter] = useState<"all" | "company" | "client">("all");
  const [payerFilter, setPayerFilter] = useState<string>("all"); // "all" | "company" | partnerId
  const { data: expenses = [], isLoading } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const { data: partners = [] } = usePartners();
  const { data: reimbursements = [] } = usePartnerReimbursements();
  const del = useDeleteRecord("expenses", "Expense");
  const can = useCan();

  const rows = useMemo(() => {
    let base = filterExpenses(expenses, filters);

    // Scope filter (Company vs Client)
    if (scopeFilter === "company") {
      base = base.filter((e) => !e.client_id);
    } else if (scopeFilter === "client") {
      base = base.filter((e) => !!e.client_id);
    }

    // Payer filter (Company vs specific Partner)
    if (payerFilter === "company") {
      base = base.filter((e) => !e.partner_id);
    } else if (payerFilter !== "all") {
      base = base.filter((e) => e.partner_id === payerFilter);
    }

    return base;
  }, [expenses, filters, scopeFilter, payerFilter]);

  // Financial summary calculations
  const totalSpend = sum(rows, (e) => Number(e.amount));
  const companyPaid = sum(rows.filter((e) => !e.partner_id), (e) => Number(e.amount));
  const partnerPaid = sum(rows.filter((e) => !!e.partner_id), (e) => Number(e.amount));

  // Total partner expenses across all time vs total reimbursements
  const allPartnerExpenses = sum(expenses.filter((e) => !!e.partner_id), (e) => Number(e.amount));
  const allReimbursements = sum(reimbursements, (r) => Number(r.amount));
  const totalPendingReimbursement = Math.max(0, allPartnerExpenses - allReimbursements);

  const columns: Column<Expense>[] = [
    {
      key: "date",
      header: "Date",
      cell: (e) => fmtDate(e.expense_date),
      sortValue: (e) => e.expense_date,
      exportValue: (e) => fmtDate(e.expense_date),
    },
    {
      key: "category",
      header: "Category",
      cell: (e) => (
        <span className="font-medium text-foreground">
          {e.expense_categories?.name ?? "—"}
        </span>
      ),
      sortValue: (e) => e.expense_categories?.name ?? "",
    },
    {
      key: "for",
      header: "Expense For",
      cell: (e) =>
        e.client_id ? (
          <span className="font-medium text-primary truncate max-w-[160px]">
            {e.clients?.name ?? "Client Shoot"}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs font-medium">Company</span>
        ),
      sortValue: (e) => e.clients?.name ?? "Company",
      exportValue: (e) => (e.client_id ? `Client: ${e.clients?.name ?? ""}` : "Company"),
    },
    {
      key: "payer",
      header: "Paid By",
      cell: (e) =>
        e.partner_id ? (
          <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning-foreground">
            Partner: {e.partners?.name ?? "Partner"}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            Company Account
          </span>
        ),
      sortValue: (e) => e.partners?.name ?? "Company Account",
      exportValue: (e) => (e.partner_id ? `Partner: ${e.partners?.name ?? ""}` : "Company Account"),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (e) => <span className="font-semibold tabular-nums">{inr(e.amount)}</span>,
      sortValue: (e) => Number(e.amount),
    },
    {
      key: "bill",
      header: "Bill No.",
      cell: (e) => (
        <span className="font-mono text-xs text-muted-foreground">{e.bill_no ?? "—"}</span>
      ),
      sortValue: (e) => e.bill_no ?? "",
    },
    {
      key: "notes",
      header: "Notes",
      cell: (e) => <span className="line-clamp-1 text-xs text-muted-foreground">{e.notes ?? "—"}</span>,
      sortValue: (e) => e.notes ?? "",
      defaultHidden: true,
    },
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
        description="Track company and client expenses, who paid for each expense, and partner repayments."
        actions={
          can("editProjects") ? (
            <div className="flex flex-wrap items-center gap-2">
              <CsvImportDialog />
              <FormDialog
                title="Return to Partner (Company Repayment)"
                trigger={
                  <Button variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                    <ArrowDownLeft className="size-4" /> Return to Partner
                  </Button>
                }
              >
                {(close) => <PartnerReimbursementForm onDone={close} />}
              </FormDialog>
              <FormDialog title="New expense" triggerLabel="New expense">
                {(close) => <ExpenseForm onDone={close} />}
              </FormDialog>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total spend"
          value={inr(totalSpend)}
          hint={`${rows.length} entries in period`}
        />
        <KpiCard
          label="Paid by Company"
          value={inr(companyPaid)}
          hint="From company bank/cash"
          tone="primary"
        />
        <KpiCard
          label="Paid by Partners"
          value={inr(partnerPaid)}
          hint="Paid out-of-pocket"
          tone="warning"
        />
        <KpiCard
          label="Pending Partner Return"
          value={inr(totalPendingReimbursement)}
          hint={totalPendingReimbursement > 0 ? "Company owes to partners" : "All settled"}
          tone={totalPendingReimbursement > 0 ? "danger" : "success"}
          to="/partners"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowKey={(e) => e.id}
        exportName="LEONIS-expenses"
        searchPlaceholder="Search category, bill, notes, partner, client…"
        searchFields={(e) =>
          [
            e.expense_categories?.name,
            e.bill_no,
            e.notes,
            e.partners?.name,
            e.clients?.name,
          ]
            .filter(Boolean)
            .join(" ")
        }
        emptyMessage="No expenses found matching the selected filters."
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={filters} onChange={setFilters} />

            {/* Scope Filter */}
            <Select
              value={scopeFilter}
              onValueChange={(v) => setScopeFilter(v as "all" | "company" | "client")}
            >
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Expense For" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All expenses</SelectItem>
                <SelectItem value="company">Company only</SelectItem>
                <SelectItem value="client">Client shoots</SelectItem>
              </SelectContent>
            </Select>

            {/* Paid By Filter */}
            <Select value={payerFilter} onValueChange={setPayerFilter}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue placeholder="Paid by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payers</SelectItem>
                <SelectItem value="company">Company Account</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Partner: {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              {categories.length} categories
            </span>
          </div>
        }
        footer={(r) => (
          <>
            <span className="font-semibold">Total</span>
            <span className="tabular-nums font-bold">{inr(sum(r, (e) => Number(e.amount)))}</span>
          </>
        )}
      />
    </div>
  );
}
