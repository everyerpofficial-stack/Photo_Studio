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
  Lightbulb,
  LogOut,
  Menu,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Users2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { roleLabel, useAuth, useCan, type Permission } from "@/lib/auth";
import { useAlerts, useNotifications, useSaveRecord } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { GlobalSearch } from "@/components/GlobalSearch";
import { QuickAdd } from "@/components/QuickAdd";

type NavItem = { to: string; label: string; icon: ReactNode; perm?: Permission };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
  { to: "/projects", label: "Shoots & Projects", icon: <CalendarRange className="size-4" /> },
  { to: "/clients", label: "Clients", icon: <Building2 className="size-4" /> },
  { to: "/payments", label: "Payments", icon: <BadgeIndianRupee className="size-4" />, perm: "viewFinance" },
  { to: "/expenses", label: "Expenses", icon: <Receipt className="size-4" />, perm: "viewFinance" },
  { to: "/partners", label: "Partners", icon: <Wallet className="size-4" />, perm: "viewPartnerFinance" },
  { to: "/reports", label: "Reports", icon: <FileBarChart2 className="size-4" />, perm: "viewFinance" },
  { to: "/insights", label: "Insights & Alerts", icon: <Lightbulb className="size-4" /> },
  { to: "/masters", label: "Masters", icon: <Settings className="size-4" />, perm: "manageMasters" },
  { to: "/admin", label: "Admin & Audit", icon: <ShieldCheck className="size-4" />, perm: "viewAudit" },
  { to: "/settings", label: "Settings", icon: <Settings className="size-4" />, perm: "manageUsers" },
];

function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const { data: alerts = [] } = useAlerts();
  const save = useSaveRecord("notifications", "Notification");
  const unreadNotifs = notifications.filter((n) => !n.is_read);
  const openAlerts = alerts.filter((a) => a.status === "open");
  const totalBadge = unreadNotifs.length + openAlerts.length;

  const markRead = (id: string) => {
    save.mutate({ id, values: { is_read: true } });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-md p-2 hover:bg-muted" aria-label="Notifications">
          <Bell className="size-4" />
          {totalBadge > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-danger text-[9px] font-bold text-danger-foreground">
              {totalBadge > 9 ? "9+" : totalBadge}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadNotifs.length > 0 && (
            <span className="text-[10px] font-normal text-muted-foreground">{unreadNotifs.length} unread</span>
          )}
        </DropdownMenuLabel>

        {openAlerts.slice(0, 5).map((a) => (
          <DropdownMenuItem key={`alert-${a.id}`} asChild>
            <Link to="/insights" className="flex flex-col items-start gap-0.5 py-2">
              <span className="text-[12px] font-medium">{a.title}</span>
              {a.description && <span className="text-[11px] text-muted-foreground line-clamp-1">{a.description}</span>}
            </Link>
          </DropdownMenuItem>
        ))}

        {unreadNotifs.slice(0, 10).map((n) => (
          <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2" onClick={() => markRead(n.id)}>
            <span className="text-[12px] font-medium">{n.title}</span>
            {n.body && <span className="text-[11px] text-muted-foreground line-clamp-1">{n.body}</span>}
            <span className="text-[10px] text-muted-foreground">{fmtDateTime(n.created_at)}</span>
          </DropdownMenuItem>
        ))}

        {totalBadge === 0 && (
          <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
            No new notifications
          </div>
        )}

        {totalBadge > 0 && (
          <DropdownMenuItem asChild>
            <Link to="/insights" className="justify-center text-[11px] font-medium text-primary">
              View all alerts →
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { profile, role, signOut } = useAuth();
  const can = useCan();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((n) => !n.perm || can(n.perm));

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/dashboard", replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
        <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-sm font-bold tracking-wider shadow-sm">
          L
        </span>
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-foreground">LEONIS</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Studio ERP</p>
        </div>
        <button
          className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {items.map((n) => {
          const active = pathname === n.to || pathname.startsWith(`${n.to}/`);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {n.icon}
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-4 py-3.5">
        <p className="truncate text-[13px] font-semibold text-foreground">{profile?.full_name ?? "—"}</p>
        <p className="text-[11px] text-muted-foreground">{role ? roleLabel[role] : "No role assigned"}</p>
        <button
          onClick={handleSignOut}
          className="mt-2.5 inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
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

          {/* Search shortcut */}
          <button
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
              document.dispatchEvent(event);
            }}
            className="ml-auto hidden items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted sm:inline-flex"
          >
            <Search className="size-3.5" />
            Search…
            <kbd className="rounded bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium border">Ctrl+K</kbd>
          </button>

          <div className={cn("flex items-center gap-2", "sm:ml-0 ml-auto")}>
            <NotificationBell />
            <span className="hidden items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-[11px] font-medium text-primary sm:inline-flex">
              <Users2 className="size-3" /> {role ? roleLabel[role] : "Guest"}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">{children}</main>
      </div>

      <GlobalSearch />
      <QuickAdd />
    </div>
  );
}

