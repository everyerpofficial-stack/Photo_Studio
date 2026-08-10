import { useState } from "react";
import { Eye, Calendar, User, DollarSign, ExternalLink, Briefcase, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusChip, statusTone, SectionCard } from "@/components/Primitives";
import { FileUploader } from "@/components/FileUploader";
import { type Project, projectExpense, projectProfit } from "@/lib/api";
import { fmtDate, inr, num, pct, margin } from "@/lib/format";

export function ProjectDetailDialog({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);

  const cost = projectExpense(project);
  const profit = projectProfit(project);
  const profitMargin = Number(project.amount) > 0 ? margin(profit, Number(project.amount)) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="View shoot details">
          <Eye className="size-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Shoot Details</DialogTitle>
            <StatusChip label={project.status} tone={statusTone(project.status)} />
          </div>
          <DialogDescription>
            {project.project_types?.name ?? "Photography Project"} for {project.clients?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* General Information */}
          <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
            <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-1.5">
              <Briefcase className="size-4 text-primary" /> General Info
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium text-right">{project.clients?.name ?? "—"}</span>

              {project.org_name && (
                <>
                  <span className="text-muted-foreground">Organisation:</span>
                  <span className="font-medium text-right">{project.org_name}</span>
                </>
              )}

              <span className="text-muted-foreground">Shoot Date:</span>
              <span className="font-medium text-right flex items-center justify-end gap-1 font-mono">
                <Calendar className="size-3 text-muted-foreground" /> {fmtDate(project.shoot_date)}
              </span>

              <span className="text-muted-foreground">Assigned Partner:</span>
              <span className="font-medium text-right flex items-center justify-end gap-1">
                <User className="size-3 text-muted-foreground" /> {project.partners?.name ?? "Unassigned"}
              </span>

              {project.referred_by && (
                <>
                  <span className="text-muted-foreground">Referred By:</span>
                  <span className="font-medium text-right">{project.referred_by}</span>
                </>
              )}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
            <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-1.5">
              <DollarSign className="size-4 text-success-foreground" /> Financials
            </h3>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <span className="text-muted-foreground">Pricing:</span>
              <span className="font-medium text-right font-mono">
                {num(project.quantity)} × {inr(project.rate)}
              </span>

              <span className="text-muted-foreground font-semibold">Billed Amount:</span>
              <span className="font-bold text-right font-mono text-primary">
                {inr(project.amount)}
              </span>

              <span className="text-muted-foreground">Editing Expense:</span>
              <span className="font-medium text-right font-mono text-warning-foreground">
                {inr(project.editing_expense)}
              </span>

              <span className="text-muted-foreground">Production Expense:</span>
              <span className="font-medium text-right font-mono text-warning-foreground">
                {inr(project.production_expense)}
              </span>

              <span className="text-muted-foreground font-semibold">Total Expenses:</span>
              <span className="font-bold text-right font-mono text-warning-foreground">
                {inr(cost)}
              </span>

              <span className="text-muted-foreground font-semibold">Net Profit:</span>
              <span className={`font-bold text-right font-mono ${profit < 0 ? "text-danger-foreground" : "text-success-foreground"}`}>
                {inr(profit)}
              </span>

              <span className="text-muted-foreground font-semibold">Profit Margin:</span>
              <span className={`font-bold text-right font-mono ${profit < 0 ? "text-danger-foreground" : "text-success-foreground"}`}>
                {pct(profitMargin)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {project.notes && (
          <div className="mt-4 rounded-xl border p-4 bg-muted/10">
            <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-1.5 mb-2">
              <FileText className="size-4 text-muted-foreground" /> Notes
            </h3>
            <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {project.notes}
            </p>
          </div>
        )}

        {/* Attachments Section */}
        <div className="mt-4 border-t pt-4">
          <FileUploader entityType="project" entityId={project.id} label="Photos & Documents Attached to Shoot" compact />
        </div>
      </DialogContent>
    </Dialog>
  );
}
