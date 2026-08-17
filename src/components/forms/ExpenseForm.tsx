import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/ProjectForm";
import { FileUploader } from "@/components/FileUploader";
import {
  useClients,
  useExpenseCategories,
  usePartners,
  useProjects,
  useSaveRecord,
  type Expense,
} from "@/lib/api";
import { today } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormValues = {
  expense_date: string;
  payer_type: "company" | string; // "company" or partnerId
  category_id: string;
  expense_for: "company" | "client";
  client_id: string;
  project_id: string;
  amount: number;
  bill_no: string;
  notes: string;
};

export function ExpenseForm({
  initial,
  onDone,
  compact,
}: {
  initial?: Expense;
  onDone?: (id?: string) => void;
  compact?: boolean;
}) {
  const { data: categories = [] } = useExpenseCategories();
  const { data: partners = [] } = usePartners();
  const { data: clients = [] } = useClients();
  const { data: projects = [] } = useProjects();
  const save = useSaveRecord("expenses", "Expense");

  const [expenseFor, setExpenseFor] = useState<"company" | "client">(
    initial?.client_id ? "client" : "company",
  );

  const form = useForm<FormValues>({
    defaultValues: {
      expense_date: initial?.expense_date ?? today(),
      payer_type: initial?.partner_id ? initial.partner_id : "company",
      category_id: initial?.category_id ?? "",
      expense_for: initial?.client_id ? "client" : "company",
      client_id: initial?.client_id ?? "",
      project_id: initial?.project_id ?? "",
      amount: Number(initial?.amount ?? 0),
      bill_no: initial?.bill_no ?? "",
      notes: initial?.notes ?? "",
    },
  });

  const v = form.watch();

  const handleExpenseForChange = (type: "company" | "client") => {
    setExpenseFor(type);
    form.setValue("expense_for", type);
    if (type === "company") {
      form.setValue("client_id", "");
      form.setValue("project_id", "");
    }
  };

  const submit = async (values: FormValues, again = false) => {
    if (!(Number(values.amount) > 0)) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    if (!values.category_id) {
      toast.error("Please select a category.");
      return;
    }
    if (expenseFor === "client" && !values.client_id) {
      toast.error("Please select a client for this shoot expense.");
      return;
    }

    const isPartner = values.payer_type !== "company";
    const partnerId = isPartner ? values.payer_type : null;
    const cat = categories.find((c) => c.id === values.category_id);
    const expenseClass = cat?.default_class ?? "operating";

    const saved = (await save.mutateAsync({
      id: initial?.id,
      values: {
        expense_date: values.expense_date,
        partner_id: partnerId,
        category_id: values.category_id,
        expense_class: expenseClass,
        client_id: expenseFor === "client" ? values.client_id || null : null,
        project_id: expenseFor === "client" ? values.project_id || null : null,
        amount: Number(values.amount),
        bill_no: values.bill_no.trim() || null,
        notes: values.notes.trim() || null,
      },
    })) as { id?: string } | null;

    if (again) {
      form.reset({
        ...values,
        amount: 0,
        bill_no: "",
        notes: "",
      });
      return;
    }
    onDone?.(saved?.id ?? initial?.id);
  };

  const grid = compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2";

  return (
    <form onSubmit={form.handleSubmit((d) => submit(d))} className="space-y-5">
      {/* Scope Selector: Company vs Client */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Expense For
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleExpenseForChange("company")}
            className={cn(
              "flex items-center justify-center rounded-lg border py-2.5 px-3 text-xs font-semibold transition-all",
              expenseFor === "company"
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-muted/40 hover:bg-muted text-foreground",
            )}
          >
            Company Expense
          </button>
          <button
            type="button"
            onClick={() => handleExpenseForChange("client")}
            className={cn(
              "flex items-center justify-center rounded-lg border py-2.5 px-3 text-xs font-semibold transition-all",
              expenseFor === "client"
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-muted/40 hover:bg-muted text-foreground",
            )}
          >
            Client / Shoot
          </button>
        </div>
      </div>

      <div className={grid}>
        {/* Paid By */}
        <Field label="Who is paying?" required>
          <Select
            value={v.payer_type}
            onValueChange={(val) => form.setValue("payer_type", val)}
          >
            <SelectTrigger className="font-medium">
              <SelectValue placeholder="Select who is paying" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company" className="font-medium">
                Company Account
              </SelectItem>
              {partners
                .filter((p) => p.is_active)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Partner: {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Category */}
        <Field label="Category" required>
          <Select
            value={v.category_id}
            onValueChange={(val) => form.setValue("category_id", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter((c) => c.is_active)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>

        {/* Date */}
        <Field label="Date" required>
          <Input type="date" max={today()} {...form.register("expense_date")} />
        </Field>

        {/* Amount */}
        <Field label="Amount (₹)" required>
          <Input
            type="number"
            step="0.01"
            min="1"
            inputMode="decimal"
            placeholder="Enter amount"
            className="text-base font-semibold"
            {...form.register("amount", { valueAsNumber: true })}
          />
        </Field>

        {/* If Client / Shoot Expense */}
        {expenseFor === "client" && (
          <>
            <Field label="Client" required>
              <Select
                value={v.client_id}
                onValueChange={(val) => {
                  form.setValue("client_id", val);
                  form.setValue("project_id", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients
                    .filter((c) => c.is_active)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Project / Shoot (optional)">
              <Select
                value={v.project_id}
                onValueChange={(val) => form.setValue("project_id", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to shoot (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter((p) => !v.client_id || p.client_id === v.client_id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_types?.name} · {p.clients?.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}

        {/* Bill number */}
        <Field label="Bill / Receipt No.">
          <Input placeholder="e.g. B-1001 / INV-42" {...form.register("bill_no")} />
        </Field>
      </div>

      {/* Notes */}
      <Field label="Notes / Remarks">
        <Textarea
          rows={2}
          placeholder="e.g. Purchased new flash lights, paid lunch for shoot crew, etc."
          {...form.register("notes")}
        />
      </Field>

      <FileUploader entityType="expense" entityId={initial?.id} label="Bill / Receipt Attachment" compact />

      <div className="sticky bottom-0 -mx-1 flex flex-wrap gap-2 border-t bg-card/95 px-1 py-3 backdrop-blur">
        <Button
          type="submit"
          disabled={save.isPending}
          className="flex-1 sm:flex-none"
        >
          Save Expense
        </Button>
        {!initial && (
          <Button
            type="button"
            variant="secondary"
            disabled={save.isPending}
            onClick={form.handleSubmit((d) => submit(d, true))}
          >
            Save &amp; New
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => onDone?.()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
