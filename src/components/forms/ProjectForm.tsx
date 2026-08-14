import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/FileUploader";
import {
  useClients,
  usePartners,
  usePriceLists,
  useProjectTypes,
  useSaveRecord,
  type Project,
} from "@/lib/api";
import { today } from "@/lib/format";
import { useCan } from "@/lib/auth";

type FormValues = {
  client_id: string;
  project_type_id: string;
  partner_id: string;
  shoot_date: string;
  quantity: number;
  rate: number;
  editing_expense: number;
  production_expense: number;
  status: Project["status"];
  referred_by: string;
  org_name: string;
  notes: string;
};

export function ProjectForm({
  initial,
  onDone,
  compact,
}: {
  initial?: Project;
  onDone?: (id?: string) => void;
  compact?: boolean;
}) {
  const { data: clients = [] } = useClients();
  const { data: types = [] } = useProjectTypes();
  const { data: partners = [] } = usePartners();
  const { data: prices = [] } = usePriceLists();
  const save = useSaveRecord("projects", "Project");
  const can = useCan();

  const form = useForm<FormValues>({
    defaultValues: {
      client_id: initial?.client_id ?? "",
      project_type_id: initial?.project_type_id ?? "",
      partner_id: initial?.partner_id ?? "",
      shoot_date: initial?.shoot_date ?? today(),
      quantity: Number(initial?.quantity ?? 1),
      rate: Number(initial?.rate ?? 0),
      editing_expense: Number(initial?.editing_expense ?? 0),
      production_expense: Number(initial?.production_expense ?? 0),
      status: initial?.status ?? "active",
      referred_by: initial?.referred_by ?? "",
      org_name: initial?.org_name ?? "",
      notes: initial?.notes ?? "",
    },
  });

  const v = form.watch();
  const amount = Number(v.quantity || 0) * Number(v.rate || 0);
  const netProfit = amount - Number(v.editing_expense || 0) - Number(v.production_expense || 0);

  // Auto-load rate from the active price list when the project type changes.
  useEffect(() => {
    if (!v.project_type_id) return;
    if (initial && v.project_type_id === initial.project_type_id) return;
    const price = prices
      .filter((p) => p.project_type_id === v.project_type_id && p.is_active)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
    if (price) form.setValue("rate", Number(price.rate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.project_type_id]);

  const submit = async (values: FormValues, again = false) => {
    if (!values.client_id || !values.project_type_id) {
      toast.error("Client and project type are required.");
      return;
    }
    if (values.status !== "planned" && values.shoot_date > today()) {
      toast.error("A completed/active shoot cannot have a future date. Use status “Planned”.");
      return;
    }
    if (Number(values.quantity) <= 0 || Number(values.rate) < 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }
    const payload = {
      ...values,
      partner_id: values.partner_id || null,
      amount,
    };
    const saved = (await save.mutateAsync({ id: initial?.id, values: payload })) as {
      id?: string;
    } | null;
    if (again) {
      form.reset({ ...values, quantity: 1, editing_expense: 0, production_expense: 0, notes: "" });
      return;
    }
    onDone?.(saved?.id ?? initial?.id);
  };

  const grid = compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2";

  return (
    <form onSubmit={form.handleSubmit((d) => submit(d))} className="space-y-5">
      <div className={grid}>
        <Field label="Client" required>
          <Select value={v.client_id} onValueChange={(val) => form.setValue("client_id", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
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

        <Field
          label="Project type"
          required
          hint="Rate loads from the price list and stays editable"
        >
          <Select
            value={v.project_type_id}
            onValueChange={(val) => form.setValue("project_type_id", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {types
                .filter((t) => t.is_active)
                .map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Shoot date" required>
          <Input type="date" {...form.register("shoot_date")} />
        </Field>

        <Field label="Status">
          <Select
            value={v.status}
            onValueChange={(val) => form.setValue("status", val as Project["status"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["planned", "active", "completed", "cancelled"].map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Quantity" required>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...form.register("quantity", { valueAsNumber: true })}
          />
        </Field>

        <Field label="Rate (₹)" required>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...form.register("rate", { valueAsNumber: true })}
          />
        </Field>

        <Field label="Editing expense (₹)">
          <Input
            type="number"
            step="0.01"
            min="0"
            {...form.register("editing_expense", { valueAsNumber: true })}
          />
        </Field>

        <Field label="Production expense (₹)">
          <Input
            type="number"
            step="0.01"
            min="0"
            {...form.register("production_expense", { valueAsNumber: true })}
          />
        </Field>

        {can("viewPartnerFinance") && (
          <Field label="Partner">
            <Select value={v.partner_id} onValueChange={(val) => form.setValue("partner_id", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Assign partner" />
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

        <Field label="Referred by">
          <Input placeholder="Instagram, reference…" {...form.register("referred_by")} />
        </Field>

        <Field label="Consulting / Hospital / Company">
          <Input placeholder="Organisation name" {...form.register("org_name")} />
        </Field>
      </div>

      <div className="grid gap-3 rounded-xl bg-primary-light/60 p-4 sm:grid-cols-2">
        <Calc label="Amount (Qty × Rate)" value={amount} />
        <Calc label="Net profit (Amount − Expenses)" value={netProfit} />
      </div>

      <Field label="Notes">
        <Textarea rows={3} {...form.register("notes")} />
      </Field>

      <FileUploader entityType="project" entityId={initial?.id} label="Photos & documents" />

      <div className="sticky bottom-0 -mx-1 flex flex-wrap gap-2 border-t bg-card/95 px-1 py-3 backdrop-blur">
        <Button type="submit" disabled={save.isPending} className="flex-1 sm:flex-none">
          Save
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

export function Field({
  label,
  children,
  required,
  hint,
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean | undefined;
  hint?: string | undefined;
  error?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-danger-foreground"> *</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-danger-foreground">{error}</p>}
    </div>
  );
}

function Calc({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-primary/70">{label}</p>
      <p className="kpi-value text-primary">₹{Number(value).toLocaleString("en-IN")}</p>
    </div>
  );
}
