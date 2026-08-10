import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "./audit";
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

const err = (e: unknown) => {
  const message =
    (e as { message?: string })?.message ||
    (e instanceof Error ? e.message : "Something went wrong. Please try again.");
  toast.error(message);
  throw e;
};

async function fetchAll<T>(table: string, select: string, order: { col: string; asc?: boolean }) {
  const { data, error } = await supabase
    .from(table as never)
    .select(select)
    .is("deleted_at", null)
    .order(order.col, { ascending: order.asc ?? false });
  if (error) {
    // tables without deleted_at column (e.g. Postgres 42703 or PostgREST PGRST204)
    if (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("deleted_at")) {
      const res = await supabase
        .from(table as never)
        .select(select)
        .order(order.col, { ascending: order.asc ?? false });
      if (res.error) err(res.error);
      return (res.data ?? []) as T[];
    }
    err(error);
  }
  return (data ?? []) as T[];
}

export const useClients = () =>
  useQuery({ queryKey: ["clients"], queryFn: () => fetchAll<Client>("clients", "*", { col: "name", asc: true }) });

export const useProjectTypes = () =>
  useQuery({
    queryKey: ["project_types"],
    queryFn: () => fetchAll<Master>("project_types", "*", { col: "name", asc: true }),
  });

export const useExpenseCategories = () =>
  useQuery({
    queryKey: ["expense_categories"],
    queryFn: () =>
      fetchAll<Master & { default_class: Expense["expense_class"] }>("expense_categories", "*", {
        col: "name",
        asc: true,
      }),
  });

export const usePaymentModes = () =>
  useQuery({
    queryKey: ["payment_modes"],
    queryFn: () => fetchAll<Master>("payment_modes", "*", { col: "name", asc: true }),
  });

export const usePriceLists = () =>
  useQuery({
    queryKey: ["price_lists"],
    queryFn: () =>
      fetchAll<{
        id: string;
        project_type_id: string;
        rate: number;
        effective_from: string;
        effective_to: string | null;
        is_active: boolean;
        project_types?: { name: string } | null;
      }>("price_lists", "*, project_types(name)", { col: "effective_from" }),
  });

export const useFinancialYears = () =>
  useQuery({
    queryKey: ["financial_years"],
    queryFn: () =>
      fetchAll<{ id: string; label: string; start_date: string; end_date: string; is_current: boolean }>(
        "financial_years",
        "*",
        { col: "start_date" },
      ),
  });

export const usePartners = () =>
  useQuery({
    queryKey: ["partners"],
    queryFn: () => fetchAll<Partner>("partners", "*", { col: "name", asc: true }),
  });

export const useSettings = () =>
  useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) err(error);
      const map: Record<string, Record<string, unknown>> = {};
      (data ?? []).forEach((s) => {
        map[s.key] = (s.value ?? {}) as Record<string, unknown>;
      });
      return map;
    },
  });

/* ------------------------------------------------------------- transactions */

export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: () =>
      fetchAll<Project>("projects", "*, clients(name), project_types(name), partners(name)", { col: "shoot_date" }),
  });

export const usePayments = () =>
  useQuery({
    queryKey: ["payments"],
    queryFn: () => fetchAll<Payment>("payments", "*, clients(name), payment_modes(name)", { col: "payment_date" }),
  });

export const useExpenses = () =>
  useQuery({
    queryKey: ["expenses"],
    queryFn: () =>
      fetchAll<Expense>("expenses", "*, partners(name), expense_categories(name), clients(name)", {
        col: "expense_date",
      }),
  });

export const usePartnerCapital = () =>
  useQuery({
    queryKey: ["partner_capital"],
    queryFn: () =>
      fetchAll<{ id: string; partner_id: string; entry_date: string; amount: number; notes: string | null }>(
        "partner_capital",
        "*",
        { col: "entry_date" },
      ),
  });

export const usePartnerDrawings = () =>
  useQuery({
    queryKey: ["partner_drawings"],
    queryFn: () =>
      fetchAll<{ id: string; partner_id: string; entry_date: string; amount: number; notes: string | null }>(
        "partner_drawings",
        "*",
        { col: "entry_date" },
      ),
  });

export const useAlerts = () =>
  useQuery({
    queryKey: ["alerts"],
    queryFn: () =>
      fetchAll<{
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
      }>("alerts", "*", { col: "created_at" }),
  });

export const useAuditLogs = () =>
  useQuery({
    queryKey: ["audit_logs"],
    queryFn: () =>
      fetchAll<{
        id: string;
        user_email: string | null;
        action: string;
        module: string;
        record_id: string | null;
        old_value: unknown;
        new_value: unknown;
        created_at: string;
      }>("audit_logs", "*", { col: "created_at" }),
  });

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      fetchAll<{
        id: string;
        title: string;
        body: string | null;
        type: string;
        is_read: boolean;
        link: string | null;
        created_at: string;
      }>("notifications", "*", { col: "created_at" }),
  });

export const useDocuments = (entityType: string, entityId?: string) =>
  useQuery({
    queryKey: ["documents", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("created_at", { ascending: false });
      if (error) err(error);
      return data ?? [];
    },
  });

export const useStaff = () =>
  useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? null,
      }));
    },
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
    mutationFn: async ({ id, values }: { id?: string | undefined; values: Row }) => {
      if (id) {
        const { data: before } = await supabase.from(table as never).select("*").eq("id", id).maybeSingle();
        const { data, error } = await supabase
          .from(table as never)
          .update(values as never)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) err(error);
        await logAudit("updated", module, id, before, data);
        return data;
      }
      const { data, error } = await supabase
        .from(table as never)
        .insert(values as never)
        .select()
        .maybeSingle();
      if (error) err(error);
      const created = data as { id?: string } | null;
      await logAudit("created", module, created?.id ?? null, null, data);
      return data;
    },
    onSuccess: (_d, vars) => {
      invalidateAll(qc);
      toast.success(`${module} ${vars.id ? "updated" : "added"} successfully.`);
    },
  });
}

export function useDeleteRecord(table: string, module: string, soft = true) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: before } = await supabase.from(table as never).select("*").eq("id", id).maybeSingle();
      if (soft) {
        const { error } = await supabase
          .from(table as never)
          .update({ deleted_at: new Date().toISOString() } as never)
          .eq("id", id);
        if (error) err(error);
      } else {
        const { error } = await supabase.from(table as never).delete().eq("id", id);
        if (error) err(error);
      }
      await logAudit("deleted", module, id, before, null);
      return id;
    },
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

export const projectExpense = (p: Project) => Number(p.editing_expense) + Number(p.production_expense);
export const projectProfit = (p: Project) => Number(p.amount) - projectExpense(p);

export const sum = <T>(rows: T[], get: (r: T) => number) => rows.reduce((t, r) => t + Number(get(r) || 0), 0);

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
    const pay = payments.filter((p) => p.client_id === client.id && p.payment_type === "client_payment");
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
    const lastPayment = pay.map((p) => p.payment_date).sort().reverse()[0] ?? null;
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
  drawings: number;
  operating: number;
  financing: number;
  capitalSpend: number;
  totalSpend: number;
  profitShare: number;
  netPosition: number;
  recoveryPct: number;
};

export function computePartnerPositions(
  partners: Partner[],
  expenses: Expense[],
  capital: { partner_id: string; amount: number }[],
  drawings: { partner_id: string; amount: number }[],
  distributableProfit: number,
): PartnerPosition[] {
  return partners.map((partner) => {
    const ex = expenses.filter((e) => e.partner_id === partner.id);
    const operating = sum(ex.filter((e) => e.expense_class === "operating"), (e) => Number(e.amount));
    const financing = sum(ex.filter((e) => e.expense_class === "financing"), (e) => Number(e.amount));
    const capitalSpend = sum(ex.filter((e) => e.expense_class === "capital"), (e) => Number(e.amount));
    const invested = sum(capital.filter((c) => c.partner_id === partner.id), (c) => Number(c.amount));
    const drawn = sum(drawings.filter((d) => d.partner_id === partner.id), (d) => Number(d.amount));
    const profitShare = (distributableProfit * Number(partner.profit_share)) / 100;
    return {
      partner,
      capital: invested,
      drawings: drawn,
      operating,
      financing,
      capitalSpend,
      totalSpend: operating + financing + capitalSpend,
      profitShare,
      netPosition: invested + profitShare - drawn,
      recoveryPct: invested > 0 ? Math.min(100, (profitShare / invested) * 100) : 0,
    };
  });
}

export function operatingPL(projects: Project[], payments: Payment[], expenses: Expense[]) {
  const revenue = sum(projects, (p) => Number(p.amount));
  const received = sum(payments, (p) => Number(p.amount));
  const operating =
    sum(expenses.filter((e) => e.expense_class === "operating"), (e) => Number(e.amount)) +
    sum(projects, projectExpense);
  const capital = sum(expenses.filter((e) => e.expense_class === "capital"), (e) => Number(e.amount));
  const financing = sum(expenses.filter((e) => e.expense_class === "financing"), (e) => Number(e.amount));
  const netProfit = revenue - operating;
  return { revenue, received, operating, capital, financing, netProfit, marginPct: margin(netProfit, revenue) };
}
