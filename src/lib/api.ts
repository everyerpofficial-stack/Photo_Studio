import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteRecord,
  listAlerts as listAlertsFn,
  listAuditLogs as listAuditLogsFn,
  listClients as listClientsFn,
  listDocuments as listDocumentsFn,
  listExpenseCategories as listExpenseCategoriesFn,
  listExpenses as listExpensesFn,
  listFinancialYears as listFinancialYearsFn,
  listNotifications as listNotificationsFn,
  listPartnerCapital as listPartnerCapitalFn,
  listPartnerDrawings as listPartnerDrawingsFn,
  listPartnerReimbursements as listPartnerReimbursementsFn,
  listPartners as listPartnersFn,
  listPaymentModes as listPaymentModesFn,
  listPayments as listPaymentsFn,
  listPriceLists as listPriceListsFn,
  listProjectTypes as listProjectTypesFn,
  listProjects as listProjectsFn,
  listSettings as listSettingsFn,
  listStaff as listStaffFn,
  saveRecord,
} from "./records";
import { financialYear, margin } from "./format";

export type Row = Record<string, unknown>;

/* ------------------------------------------------------------------ masters */

export type Client = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  final_quote: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type Master = { id: string; name: string; is_active: boolean };

export type Project = {
  id: string;
  client_id: string;
  project_type_id: string;
  partner_id: string | null;
  shoot_date: string;
  quantity: number;
  rate: number;
  amount: number;
  editing_expense: number;
  production_expense: number;
  status: "planned" | "active" | "completed" | "cancelled";
  referred_by: string | null;
  org_name: string | null;
  notes: string | null;
  created_at: string;
  clients?: { name: string } | null;
  project_types?: { name: string } | null;
  partners?: { name: string } | null;
};

export type Payment = {
  id: string;
  client_id: string | null;
  project_id: string | null;
  payment_date: string;
  amount: number;
  payment_type: "client_payment" | "other_income";
  mode_id: string | null;
  reference_no: string | null;
  notes: string | null;
  needs_approval: boolean;
  approved_at: string | null;
  created_at: string;
  clients?: { name: string } | null;
  payment_modes?: { name: string } | null;
};

export type Expense = {
  id: string;
  expense_date: string;
  partner_id: string | null;
  category_id: string;
  expense_class: "operating" | "capital" | "financing";
  client_id: string | null;
  project_id: string | null;
  amount: number;
  bill_no: string | null;
  notes: string | null;
  created_at: string;
  partners?: { name: string } | null;
  expense_categories?: { name: string } | null;
  clients?: { name: string } | null;
};

export type Partner = { id: string; name: string; profit_share: number; is_active: boolean };

export const useClients = () =>
  useQuery({ queryKey: ["clients"], queryFn: () => listClientsFn() as Promise<Client[]> });

export const useProjectTypes = () =>
  useQuery({
    queryKey: ["project_types"],
    queryFn: () => listProjectTypesFn() as Promise<Master[]>,
  });

export const useExpenseCategories = () =>
  useQuery({
    queryKey: ["expense_categories"],
    queryFn: () =>
      listExpenseCategoriesFn() as Promise<
        (Master & { default_class: Expense["expense_class"] })[]
      >,
  });

export const usePaymentModes = () =>
  useQuery({
    queryKey: ["payment_modes"],
    queryFn: () => listPaymentModesFn() as Promise<Master[]>,
  });

export const usePriceLists = () =>
  useQuery({
    queryKey: ["price_lists"],
    queryFn: () =>
      listPriceListsFn() as Promise<
        {
          id: string;
          project_type_id: string;
          rate: number;
          effective_from: string;
          effective_to: string | null;
          is_active: boolean;
          project_types?: { name: string } | null;
        }[]
      >,
  });

export const useFinancialYears = () =>
  useQuery({
    queryKey: ["financial_years"],
    queryFn: () =>
      listFinancialYearsFn() as Promise<
        { id: string; label: string; start_date: string; end_date: string; is_current: boolean }[]
      >,
  });

export const usePartners = () =>
  useQuery({ queryKey: ["partners"], queryFn: () => listPartnersFn() as Promise<Partner[]> });

export const useSettings = () =>
  useQuery({ queryKey: ["settings"], queryFn: () => listSettingsFn() });

/* ------------------------------------------------------------- transactions */

export const useProjects = () =>
  useQuery({ queryKey: ["projects"], queryFn: () => listProjectsFn() as Promise<Project[]> });

export const usePayments = () =>
  useQuery({ queryKey: ["payments"], queryFn: () => listPaymentsFn() as Promise<Payment[]> });

export const useExpenses = () =>
  useQuery({ queryKey: ["expenses"], queryFn: () => listExpensesFn() as Promise<Expense[]> });

export const usePartnerCapital = () =>
  useQuery({
    queryKey: ["partner_capital"],
    queryFn: () =>
      listPartnerCapitalFn() as Promise<
        {
          id: string;
          partner_id: string;
          entry_date: string;
          amount: number;
          notes: string | null;
        }[]
      >,
  });

export const usePartnerDrawings = () =>
  useQuery({
    queryKey: ["partner_drawings"],
    queryFn: () =>
      listPartnerDrawingsFn() as Promise<
        {
          id: string;
          partner_id: string;
          entry_date: string;
          amount: number;
          notes: string | null;
        }[]
      >,
  });

export type PartnerReimbursement = {
  id: string;
  partner_id: string;
  entry_date: string;
  amount: number;
  mode_id?: string | null;
  notes: string | null;
};

export const usePartnerReimbursements = () =>
  useQuery({
    queryKey: ["partner_reimbursements"],
    queryFn: () =>
      listPartnerReimbursementsFn() as Promise<
        {
          id: string;
          partner_id: string;
          entry_date: string;
          amount: number;
          mode_id?: string | null;
          notes: string | null;
        }[]
      >,
  });

export const useAlerts = () =>
  useQuery({
    queryKey: ["alerts"],
    queryFn: () =>
      listAlertsFn() as Promise<
        {
          id: string;
          type: string;
          title: string;
          description: string | null;
          amount: number | null;
          severity: string;
          entity_type: string | null;
          entity_id: string | null;
          status: string;
          created_at: string;
        }[]
      >,
  });

export const useAuditLogs = () =>
  useQuery({
    queryKey: ["audit_logs"],
    queryFn: () =>
      listAuditLogsFn() as Promise<
        {
          id: string;
          user_email: string | null;
          action: string;
          module: string;
          record_id: string | null;
          old_value: unknown;
          new_value: unknown;
          created_at: string;
        }[]
      >,
  });

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      listNotificationsFn() as Promise<
        {
          id: string;
          title: string;
          body: string | null;
          type: string;
          is_read: boolean;
          link: string | null;
          created_at: string;
        }[]
      >,
  });

export type Document = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export const useDocuments = (entityType: string, entityId?: string) =>
  useQuery({
    queryKey: ["documents", entityType, entityId],
    enabled: !!entityId,
    queryFn: () =>
      listDocumentsFn({ data: { entityType, entityId: entityId! } }) as Promise<Document[]>,
  });

export const useStaff = () =>
  useQuery({
    queryKey: ["staff"],
    queryFn: () => listStaffFn() as Promise<import("./records").StaffRow[]>,
  });

/* ----------------------------------------------------------------- mutations */

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  [
    "projects",
    "payments",
    "expenses",
    "clients",
    "partners",
    "partner_capital",
    "partner_drawings",
    "partner_reimbursements",
    "alerts",
    "audit_logs",
    "notifications",
    "settings",
    "price_lists",
    "project_types",
    "expense_categories",
    "payment_modes",
    "financial_years",
    "staff",
  ].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
};

export function useSaveRecord(table: string, module: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string | undefined; values: Row }) =>
      saveRecord({ data: { table, id, values, module } }).catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        throw e;
      }),
    onSuccess: (_d, vars) => {
      invalidateAll(qc);
      toast.success(`${module} ${vars.id ? "updated" : "added"} successfully.`);
    },
  });
}

export function useDeleteRecord(table: string, module: string, soft = true) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      deleteRecord({ data: { table, id, module, soft } }).catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        throw e;
      }),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success(`${module} deleted successfully.`);
    },
  });
}

/* --------------------------------------------------------------- derivations */

export type Filters = {
  from: string;
  to: string;
  clientId?: string | undefined;
  partnerId?: string | undefined;
  projectTypeId?: string | undefined;
  modeId?: string | undefined;
};

export const defaultFilters = (): Filters => {
  const fy = financialYear();
  return { from: fy.start, to: fy.end };
};

const inRange = (d: string, f: Filters) => d >= f.from && d <= f.to;

export function filterProjects(rows: Project[], f: Filters) {
  return rows.filter(
    (p) =>
      inRange(p.shoot_date, f) &&
      (!f.clientId || p.client_id === f.clientId) &&
      (!f.partnerId || p.partner_id === f.partnerId) &&
      (!f.projectTypeId || p.project_type_id === f.projectTypeId),
  );
}

export function filterPayments(rows: Payment[], f: Filters) {
  return rows.filter(
    (p) =>
      inRange(p.payment_date, f) &&
      (!f.clientId || p.client_id === f.clientId) &&
      (!f.modeId || p.mode_id === f.modeId),
  );
}

export function filterExpenses(rows: Expense[], f: Filters) {
  return rows.filter(
    (e) =>
      inRange(e.expense_date, f) &&
      (!f.clientId || e.client_id === f.clientId) &&
      (!f.partnerId || e.partner_id === f.partnerId),
  );
}

export const projectExpense = (p: Project) =>
  Number(p.editing_expense) + Number(p.production_expense);
export const projectProfit = (p: Project) => Number(p.amount) - projectExpense(p);

export const sum = <T>(rows: T[], get: (r: T) => number) =>
  rows.reduce((t, r) => t + Number(get(r) || 0), 0);

export type ClientStat = {
  client: Client;
  quote: number;
  billed: number;
  received: number;
  due: number;
  expense: number;
  profit: number;
  marginPct: number;
  status: "Settled" | "Partial" | "Not Paid" | "No Billing";
  lastPayment: string | null;
  projectCount: number;
};

export function computeClientStats(
  clients: Client[],
  projects: Project[],
  payments: Payment[],
  expenses: Expense[],
): ClientStat[] {
  return clients.map((client) => {
    const cp = projects.filter((p) => p.client_id === client.id);
    const pay = payments.filter(
      (p) => p.client_id === client.id && p.payment_type === "client_payment",
    );
    const exp = expenses.filter((e) => e.client_id === client.id);
    const billed = sum(cp, (p) => Number(p.amount));
    const received = sum(pay, (p) => Number(p.amount));
    const baseline = Math.max(billed, Number(client.final_quote) || 0);
    const due = baseline - received;
    const expense = sum(exp, (e) => Number(e.amount)) + sum(cp, projectExpense);
    const profit = billed - expense;
    const status: ClientStat["status"] =
      billed === 0 && Number(client.final_quote) === 0
        ? "No Billing"
        : received === 0
          ? "Not Paid"
          : due <= 0
            ? "Settled"
            : "Partial";
    const lastPayment =
      pay
        .map((p) => p.payment_date)
        .sort()
        .reverse()[0] ?? null;
    return {
      client,
      quote: Number(client.final_quote),
      billed,
      received,
      due,
      expense,
      profit,
      marginPct: margin(profit, billed),
      status,
      lastPayment,
      projectCount: cp.length,
    };
  });
}

export type LedgerEntry = {
  date: string;
  description: string;
  project: string;
  debit: number;
  credit: number;
  balance: number;
};

export function buildLedger(projects: Project[], payments: Payment[]): LedgerEntry[] {
  const items = [
    ...projects.map((p) => ({
      date: p.shoot_date,
      description: `${p.project_types?.name ?? "Project"} — ${p.quantity} × ${p.rate}`,
      project: p.project_types?.name ?? "—",
      debit: Number(p.amount),
      credit: 0,
    })),
    ...payments.map((p) => ({
      date: p.payment_date,
      description: `Payment received (${p.payment_modes?.name ?? "—"}${p.reference_no ? ` · ${p.reference_no}` : ""})`,
      project: "—",
      debit: 0,
      credit: Number(p.amount),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  return items.map((i) => {
    balance += i.debit - i.credit;
    return { ...i, balance };
  });
}

export type PartnerPosition = {
  partner: Partner;
  capital: number;
  partnerExpenses: number;
  reimbursed: number;
  pendingReimbursement: number;
  profitShare: number;
  netPosition: number;
  recoveryPct: number;
  totalSpend: number;
  // Backwards compatibility properties
  drawings: number;
  operating: number;
  financing: number;
  capitalSpend: number;
};

export function computePartnerPositions(
  partners: Partner[],
  expenses: Expense[],
  capital: { partner_id: string; amount: number }[],
  reimbursements: { partner_id: string; amount: number }[],
  distributableProfit: number,
): PartnerPosition[] {
  return partners.map((partner) => {
    const ex = expenses.filter((e) => e.partner_id === partner.id);
    const partnerExpenses = sum(ex, (e) => Number(e.amount));
    const invested = sum(
      capital.filter((c) => c.partner_id === partner.id),
      (c) => Number(c.amount),
    );
    const repaid = sum(
      reimbursements.filter((d) => d.partner_id === partner.id),
      (d) => Number(d.amount),
    );
    const pendingReimbursement = Math.max(0, partnerExpenses - repaid);
    const profitShare = (distributableProfit * Number(partner.profit_share)) / 100;
    const netPosition = invested + (partnerExpenses - repaid) + profitShare;

    return {
      partner,
      capital: invested,
      partnerExpenses,
      reimbursed: repaid,
      pendingReimbursement,
      profitShare,
      netPosition,
      totalSpend: partnerExpenses,
      recoveryPct: invested > 0 ? Math.min(100, (profitShare / invested) * 100) : 0,
      drawings: repaid,
      operating: partnerExpenses,
      financing: 0,
      capitalSpend: 0,
    };
  });
}

export function operatingPL(projects: Project[], payments: Payment[], expenses: Expense[]) {
  const revenue = sum(projects, (p) => Number(p.amount));
  const received = sum(payments, (p) => Number(p.amount));
  const operating =
    sum(
      expenses.filter((e) => e.expense_class === "operating"),
      (e) => Number(e.amount),
    ) + sum(projects, projectExpense);
  const capital = sum(
    expenses.filter((e) => e.expense_class === "capital"),
    (e) => Number(e.amount),
  );
  const financing = sum(
    expenses.filter((e) => e.expense_class === "financing"),
    (e) => Number(e.amount),
  );
  const netProfit = revenue - operating;
  return {
    revenue,
    received,
    operating,
    capital,
    financing,
    netProfit,
    marginPct: margin(netProfit, revenue),
  };
}
