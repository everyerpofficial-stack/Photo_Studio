import { useState } from "react";
import { BadgeIndianRupee, Building2, CalendarRange, Plus, Receipt, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormDialog } from "@/components/FormDialog";
import { ProjectForm } from "@/components/forms/ProjectForm";
import { PaymentForm } from "@/components/forms/PaymentForm";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { ClientForm } from "@/components/forms/ClientForm";

const ACTIONS = [
  { label: "New shoot", icon: <CalendarRange className="size-4" />, color: "bg-primary" },
  { label: "New payment", icon: <BadgeIndianRupee className="size-4" />, color: "bg-success-foreground" },
  { label: "New expense", icon: <Receipt className="size-4" />, color: "bg-warning-foreground" },
  { label: "New client", icon: <Building2 className="size-4" />, color: "bg-[#6366f1]" },
] as const;

export function QuickAdd() {
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  const handleOpen = (label: string) => {
    setExpanded(false);
    setDialogOpen(label);
  };

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* FAB container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Mini buttons */}
        {expanded &&
          ACTIONS.map((a, i) => (
            <button
              key={a.label}
              onClick={() => handleOpen(a.label)}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-4 py-2.5 text-white shadow-elevated transition-all",
                "animate-in fade-in slide-in-from-bottom-2",
                a.color,
              )}
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
            >
              {a.icon}
              <span className="text-[12px] font-medium">{a.label}</span>
            </button>
          ))}

        {/* Main FAB */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            "grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-transform hover:scale-105 active:scale-95",
            expanded && "rotate-45",
          )}
          aria-label={expanded ? "Close quick add" : "Quick add"}
        >
          <Plus className="size-6" />
        </button>
      </div>

      {/* Dialogs */}
      <FormDialog
        title="New shoot"
        wide
        open={dialogOpen === "New shoot"}
        onOpenChange={(o) => !o && setDialogOpen(null)}
      >
        {(close) => <ProjectForm onDone={close} />}
      </FormDialog>

      <FormDialog
        title="New payment"
        open={dialogOpen === "New payment"}
        onOpenChange={(o) => !o && setDialogOpen(null)}
      >
        {(close) => <PaymentForm onDone={close} />}
      </FormDialog>

      <FormDialog
        title="New expense"
        open={dialogOpen === "New expense"}
        onOpenChange={(o) => !o && setDialogOpen(null)}
      >
        {(close) => <ExpenseForm onDone={close} />}
      </FormDialog>

      <FormDialog
        title="New client"
        open={dialogOpen === "New client"}
        onOpenChange={(o) => !o && setDialogOpen(null)}
      >
        {(close) => <ClientForm onDone={close} />}
      </FormDialog>
    </>
  );
}
