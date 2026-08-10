import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/ProjectForm";
import { FileUploader } from "@/components/FileUploader";
import { useSaveRecord, type Client } from "@/lib/api";

type FormValues = {
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  final_quote: number;
  notes: string;
};

export function ClientForm({
  initial,
  onDone,
  compact,
}: {
  initial?: Client;
  onDone?: (id?: string) => void;
  compact?: boolean;
}) {
  const save = useSaveRecord("clients", "Client");
  const form = useForm<FormValues>({
    defaultValues: {
      name: initial?.name ?? "",
      company: initial?.company ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      address: initial?.address ?? "",
      final_quote: Number(initial?.final_quote ?? 0),
      notes: initial?.notes ?? "",
    },
  });

  const submit = async (values: FormValues) => {
    if (!values.name.trim()) {
      toast.error("Client name is required.");
      return;
    }
    const saved = (await save.mutateAsync({ id: initial?.id, values })) as { id?: string } | null;
    onDone?.(saved?.id ?? initial?.id);
  };

  const grid = compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2";

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
      <div className={grid}>
        <Field label="Client name" required>
          <Input {...form.register("name")} />
        </Field>
        <Field label="Company">
          <Input {...form.register("company")} />
        </Field>
        <Field label="Phone">
          <Input inputMode="tel" {...form.register("phone")} />
        </Field>
        <Field label="Email">
          <Input type="email" {...form.register("email")} />
        </Field>
        <Field label="Final quote (₹)" hint="Agreed total value; used for dues when no project is billed yet">
          <Input type="number" step="0.01" min="0" {...form.register("final_quote", { valueAsNumber: true })} />
        </Field>
        <Field label="Address">
          <Input {...form.register("address")} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea rows={2} {...form.register("notes")} />
      </Field>

      <FileUploader entityType="client" entityId={initial?.id} label="Client documents" compact />

      <div className="sticky bottom-0 -mx-1 flex flex-wrap gap-2 border-t bg-card/95 px-1 py-3 backdrop-blur">
        <Button type="submit" disabled={save.isPending} className="flex-1 sm:flex-none">
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={() => onDone?.()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
