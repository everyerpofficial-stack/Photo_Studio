import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeIndianRupee,
  Bell,
  Building2,
  CalendarRange,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  Users2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { roleLabel, useAuth, useCan, type Permission } from "@/lib/auth";
import { useAlerts } from "@/lib/api";

type NavItem = { to: string; label: string; icon: ReactNode; perm?: Permission };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
  { to: "/projects", label: "Shoots & Projects", icon: <CalendarRange className="size-4" /> },
  { to: "/clients", label: "Clients", icon: <Building2 className="size-4" /> },
  { to: "/payments", label: "Payments", icon: <BadgeIndianRupee className="size-4" />, perm: "viewFinance" },
  { to: "/expenses", label: "Expenses", icon: <Receipt className="size-4" />, perm: "viewFinance" },
  { to: "/partners", label: "Partners", icon: <Wallet className="size-4" />, perm: "viewPartnerFinance" },
  { to: "/reports", label: "Reports", icon: <FileBarChart2 className="size-4" />, perm: "viewFinance" },
  { to: "/masters", label: "Masters", icon: <Settings className="size-4" />, perm: "manageMasters" },
  { to: "/admin", label: "Admin & Audit", icon: <ShieldCheck className="size-4" />, perm: "viewAudit" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { profile, role, signOut } = useAuth();
  const can = useCan();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: alerts = [] } = useAlerts();
  const openAlerts = alerts.filter((a) => a.status === "open").length;

  const items = NAV.filter((n) => !n.perm || can(n.perm));

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/", replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-primary text-primary-foreground">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-lg bg-primary-foreground/10 text-sm font-bold tracking-widest">
          L
        </span>
        <div>
          <p className="text-sm font-semibold tracking-[0.2em]">LEONIS</p>
          <p className="text-[10px] uppercase tracking-wider opacity-70">Studio ERP · Surat</p>
        </div>
        <button
          className="ml-auto lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((n) => {
          const active = pathname === n.to || pathname.startsWith(`${n.to}/`);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-primary-foreground/15 text-primary-foreground"
                  : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground",
              )}
            >
              {n.icon}
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-primary-foreground/10 px-4 py-4">
        <p className="truncate text-[13px] font-medium">{profile?.full_name ?? "—"}</p>
        <p className="text-[11px] opacity-70">{role ? roleLabel[role] : "No role assigned"}</p>
        <button
          onClick={handleSignOut}
          className="mt-3 inline-flex items-center gap-2 text-[12px] opacity-80 hover:opacity-100"
        >
          <LogOut className="size-3.5" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/90 px-4 py-3 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
          <p className="text-sm font-semibold tracking-[0.18em] lg:hidden">LEONIS</p>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/admin" className="relative rounded-md p-2 hover:bg-muted" aria-label="Alerts">
              <Bell className="size-4" />
              {openAlerts > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-danger text-[9px] font-bold text-danger-foreground">
                  {openAlerts}
                </span>
              )}
            </Link>
            <span className="hidden items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-[11px] font-medium text-primary sm:inline-flex">
              <Users2 className="size-3" /> {role ? roleLabel[role] : "Guest"}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
