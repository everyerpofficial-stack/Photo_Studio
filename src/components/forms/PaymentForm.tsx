import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/forms/ProjectForm";
import { FileUploader } from "@/components/FileUploader";
import {
  computeClientStats,
  useClients,
  useExpenses,
  usePaymentModes,
  useProjects,
  usePayments,
  useSaveRecord,
  type Payment,
} from "@/lib/api";
import { inr, today } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { notify } from "@/lib/audit";

type FormValues = {
  client_id: string;
  payment_date: string;
  amount: number;
  payment_type: Payment["payment_type"];
  mode_id: string;
  reference_no: string;
  notes: string;
};

export function PaymentForm({
  initial,
  onDone,
  compact,
}: {
  initial?: Payment;
  onDone?: (id?: string) => void;
  compact?: boolean;
}) {
  const { data: clients = [] } = useClients();
  const { data: modes = [] } = usePaymentModes();
  const { data: projects = [] } = useProjects();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();
  const save = useSaveRecord("payments", "Payment");
  const { user } = useAuth();

  const form = useForm<FormValues>({
    defaultValues: {
      client_id: initial?.client_id ?? "",
      payment_date: initial?.payment_date ?? today(),
      amount: Number(initial?.amount ?? 0),
      payment_type: initial?.payment_type ?? "client_payment",
      mode_id: initial?.mode_id ?? "",
      reference_no: initial?.reference_no ?? "",
      notes: initial?.notes ?? "",
    },
  });
  const v = form.watch();

  const stats = computeClientStats(clients, projects, payments, expenses);
  const outstanding = stats.find((s) => s.client.id === v.client_id)?.due ?? 0;
  const modeName = modes.find((m) => m.id === v.mode_id)?.name ?? "";
  const needsApproval = modeName === "Cash" && Number(v.amount) > 50000;

  const submit = async (values: FormValues, again = false) => {
    if (!(Number(values.amount) > 0)) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    if (values.payment_type === "client_payment" && !values.client_id) {
      toast.error("Client is required for a client payment.");
      return;
    }
    if (values.payment_type === "client_payment" && Number(values.amount) > outstanding && outstanding > 0) {
      toast.warning(`Amount exceeds outstanding due of ${inr(outstanding)} — recorded as advance.`);
    }
    const saved = (await save.mutateAsync({
      id: initial?.id,
      values: {
        ...values,
        client_id: values.client_id || null,
        mode_id: values.mode_id || null,
        needs_approval: needsApproval,
        received_by: user?.id ?? null,
        created_by: initial ? undefined : user?.id,
      },
    })) as { id?: string } | null;

    if (needsApproval) {
      await notify(
        "Partner approval required",
        `Cash receipt of ${inr(Number(values.amount))} needs partner approval.`,
        "approval_required",
        "/payments",
      );
      toast.warning("Cash receipt above ₹50,000 — partner approval requested.");
    } else {
      await notify("Payment received", `${inr(Number(values.amount))} received.`, "payment_received", "/payments");
    }

    if (again) {
      form.reset({ ...values, amount: 0, reference_no: "", notes: "" });
      return;
    }
    onDone?.(saved?.id ?? initial?.id);
  };

  const grid = compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2";

  return (
    <form onSubmit={form.handleSubmit((d) => submit(d))} className="space-y-5">
      <div className={grid}>
        <Field label="Payment type" required>
          <Select
            value={v.payment_type}
            onValueChange={(val) => form.setValue("payment_type", val as Payment["payment_type"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client_payment">Client Payment</SelectItem>
              <SelectItem value="other_income">Other Income</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Client"
          required={v.payment_type === "client_payment"}
          hint={v.client_id ? `Outstanding due: ${inr(outstanding)}` : undefined}
        >
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

        <Field label="Date" required>
          <Input type="date" max={today()} {...form.register("payment_date")} />
        </Field>

        <Field label="Amount (₹)" required>
          <Input
            type="number"
            step="0.01"
            min="1"
            inputMode="decimal"
            className="text-base"
            {...form.register("amount", { valueAsNumber: true })}
          />
        </Field>

        <Field label="Payment mode" required>
          <Select value={v.mode_id} onValueChange={(val) => form.setValue("mode_id", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {modes.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Reference number">
          <Input placeholder="UTR / cheque / UPI ref" {...form.register("reference_no")} />
        </Field>
      </div>

      {needsApproval && (
        <p className="rounded-lg bg-warning px-3 py-2 text-xs font-medium text-warning-foreground">
          Cash receipts above ₹50,000 require partner approval before they are treated as final.
        </p>
      )}

      <Field label="Notes">
        <Textarea rows={2} {...form.register("notes")} />
      </Field>

      <FileUploader entityType="payment" entityId={initial?.id} label="Receipt photo / PDF" compact />

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
