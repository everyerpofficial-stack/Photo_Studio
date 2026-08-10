import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  BadgeIndianRupee,
  Building2,
  CalendarRange,
  Receipt,
  Users2,
} from "lucide-react";
import { useClients, useProjects, usePayments, useExpenses, usePartners } from "@/lib/api";
import { fmtDate, inr } from "@/lib/format";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const { data: partners = [] } = usePartners();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openCustom = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener("open-global-search", openCustom);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-global-search", openCustom);
    };
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  const clientItems = useMemo(
    () =>
      clients.slice(0, 20).map((c) => ({
        id: c.id,
        label: c.name,
        hint: c.company ?? c.phone ?? "",
        to: `/clients/${c.id}`,
      })),
    [clients],
  );

  const projectItems = useMemo(
    () =>
      projects.slice(0, 20).map((p) => ({
        id: p.id,
        label: `${p.clients?.name ?? "—"} — ${p.project_types?.name ?? "Shoot"}`,
        hint: `${fmtDate(p.shoot_date)} · ${inr(p.amount)}`,
        to: "/projects",
      })),
    [projects],
  );

  const paymentItems = useMemo(
    () =>
      payments.slice(0, 15).map((p) => ({
        id: p.id,
        label: `${p.clients?.name ?? "Other income"} — ${inr(p.amount)}`,
        hint: `${fmtDate(p.payment_date)} · ${p.payment_modes?.name ?? ""}`,
        to: "/payments",
      })),
    [payments],
  );

  const expenseItems = useMemo(
    () =>
      expenses.slice(0, 15).map((e) => ({
        id: e.id,
        label: `${e.expense_categories?.name ?? "Expense"} — ${inr(e.amount)}`,
        hint: `${fmtDate(e.expense_date)} · ${e.partners?.name ?? ""}`,
        to: "/expenses",
      })),
    [expenses],
  );

  const partnerItems = useMemo(
    () =>
      partners.map((p) => ({
        id: p.id,
        label: p.name,
        hint: `${Number(p.profit_share)}% share`,
        to: "/partners",
      })),
    [partners],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search clients, shoots, payments, expenses…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {clientItems.length > 0 && (
          <CommandGroup heading="Clients">
            {clientItems.map((c) => (
              <CommandItem key={c.id} onSelect={() => go(c.to)} className="gap-3">
                <Building2 className="size-4 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.label}</p>
                  {c.hint && <p className="truncate text-xs text-muted-foreground">{c.hint}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {projectItems.length > 0 && (
          <CommandGroup heading="Shoots & Projects">
            {projectItems.map((p) => (
              <CommandItem key={p.id} onSelect={() => go(p.to)} className="gap-3">
                <CalendarRange className="size-4 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.label}</p>
                  {p.hint && <p className="truncate text-xs text-muted-foreground">{p.hint}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {paymentItems.length > 0 && (
          <CommandGroup heading="Payments">
            {paymentItems.map((p) => (
              <CommandItem key={p.id} onSelect={() => go(p.to)} className="gap-3">
                <BadgeIndianRupee className="size-4 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.label}</p>
                  {p.hint && <p className="truncate text-xs text-muted-foreground">{p.hint}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {expenseItems.length > 0 && (
          <CommandGroup heading="Expenses">
            {expenseItems.map((e) => (
              <CommandItem key={e.id} onSelect={() => go(e.to)} className="gap-3">
                <Receipt className="size-4 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.label}</p>
                  {e.hint && <p className="truncate text-xs text-muted-foreground">{e.hint}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {partnerItems.length > 0 && (
          <CommandGroup heading="Partners">
            {partnerItems.map((p) => (
              <CommandItem key={p.id} onSelect={() => go(p.to)} className="gap-3">
                <Users2 className="size-4 shrink-0 opacity-60" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.label}</p>
                  {p.hint && <p className="truncate text-xs text-muted-foreground">{p.hint}</p>}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
