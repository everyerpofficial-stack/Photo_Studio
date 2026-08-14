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
import { useCan } from "@/lib/auth";

type FormValues = {
  expense_date: string;
  partner_id: string;
  category_id: string;
  expense_class: Expense["expense_class"];
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
  const can = useCan();

  const form = useForm<FormValues>({
    defaultValues: {
      expense_date: initial?.expense_date ?? today(),
      partner_id: initial?.partner_id ?? "",
      category_id: initial?.category_id ?? "",
      expense_class: initial?.expense_class ?? "operating",
      client_id: initial?.client_id ?? "",
      project_id: initial?.project_id ?? "",
      amount: Number(initial?.amount ?? 0),
      bill_no: initial?.bill_no ?? "",
      notes: initial?.notes ?? "",
    },
  });
  const v = form.watch();
  const billRequired = Number(v.amount) > 10000;
  const lockedCapital = v.expense_class === "capital" && !can("manageCapitalExpense");

  const submit = async (values: FormValues, again = false) => {
    if (!(Number(values.amount) > 0)) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    if (!values.category_id) {
      toast.error("Category is required.");
      return;
    }
    if (Number(values.amount) > 10000 && !values.bill_no.trim()) {
      toast.error("A bill number and bill attachment are mandatory for expenses above ₹10,000.");
      return;
    }
    if (values.expense_class === "capital" && !can("manageCapitalExpense")) {
      toast.error("Only Partners can record capital expenses.");
      return;
    }
    const saved = (await save.mutateAsync({
      id: initial?.id,
      values: {
        ...values,
        partner_id: values.partner_id || null,
        client_id: values.client_id || null,
        project_id: values.project_id || null,
      },
    })) as { id?: string } | null;
    if (Number(values.amount) > 10000) {
      toast.warning("Remember to attach the bill for this expense.");
    }
    if (again) {
      form.reset({ ...values, amount: 0, bill_no: "", notes: "" });
      return;
    }
    onDone?.(saved?.id ?? initial?.id);
  };

  const grid = compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2";

  return (
    <form onSubmit={form.handleSubmit((d) => submit(d))} className="space-y-5">
      <div className={grid}>
        <Field label="Date" required>
          <Input type="date" max={today()} {...form.register("expense_date")} />
        </Field>

        <Field
          label="Amount (₹)"
          required
          hint={billRequired ? "Bill number + attachment mandatory" : undefined}
        >
          <Input
            type="number"
            step="0.01"
            min="1"
            inputMode="decimal"
            className="text-base"
            {...form.register("amount", { valueAsNumber: true })}
          />
        </Field>

        <Field label="Category" required>
          <Select
            value={v.category_id}
            onValueChange={(val) => {
              form.setValue("category_id", val);
              const cat = categories.find((c) => c.id === val);
              if (cat) form.setValue("expense_class", cat.default_class);
            }}
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

        <Field
          label="Expense class"
          required
          error={lockedCapital ? "Capital expenses can be managed by Partners only." : undefined}
        >
          <Select
            value={v.expense_class}
            onValueChange={(val) => form.setValue("expense_class", val as Expense["expense_class"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operating">Operating</SelectItem>
              <SelectItem value="capital">Capital</SelectItem>
              <SelectItem value="financing">Financing</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {can("viewPartnerFinance") && (
          <Field label="Partner">
            <Select value={v.partner_id} onValueChange={(val) => form.setValue("partner_id", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Paid by partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field label="Bill number" required={billRequired}>
          <Input placeholder="B-1001" {...form.register("bill_no")} />
        </Field>

        <Field label="Client">
          <Select value={v.client_id} onValueChange={(val) => form.setValue("client_id", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Link to client (optional)" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Project">
          <Select value={v.project_id} onValueChange={(val) => form.setValue("project_id", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Link to project (optional)" />
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
      </div>

      <Field label="Notes">
        <Textarea rows={2} {...form.register("notes")} />
      </Field>

      <FileUploader entityType="expense" entityId={initial?.id} label="Bill attachment" compact />

      <div className="sticky bottom-0 -mx-1 flex flex-wrap gap-2 border-t bg-card/95 px-1 py-3 backdrop-blur">
        <Button
          type="submit"
          disabled={save.isPending || lockedCapital}
          className="flex-1 sm:flex-none"
        >
          Save
        </Button>
        {!initial && (
          <Button
            type="button"
            variant="secondary"
            disabled={save.isPending || lockedCapital}
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
