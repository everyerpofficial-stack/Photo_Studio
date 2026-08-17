import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/ProjectForm";
import {
  sum,
  useExpenses,
  usePartnerReimbursements,
  usePartners,
  useSaveRecord,
} from "@/lib/api";
import { inr, today } from "@/lib/format";

export function PartnerReimbursementForm({
  initialPartnerId,
  onDone,
}: {
  initialPartnerId?: string;
  onDone?: () => void;
}) {
  const { data: partners = [] } = usePartners();
  const { data: expenses = [] } = useExpenses();
  const { data: reimbursements = [] } = usePartnerReimbursements();
  const save = useSaveRecord("partner_reimbursements", "Reimbursement");

  const activePartners = partners.filter((p) => p.is_active);
  const [partnerId, setPartnerId] = useState(
    initialPartnerId ?? activePartners[0]?.id ?? partners[0]?.id ?? ""
  );

  useEffect(() => {
    if (!partnerId && activePartners.length > 0 && activePartners[0]?.id) {
      setPartnerId(activePartners[0].id);
    }
  }, [activePartners, partnerId]);

  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const selectedPartner = partners.find((p) => p.id === partnerId);

  // Calculate pending return for selected partner
  const partnerExpenses = sum(
    expenses.filter((e) => e.partner_id === partnerId),
    (e) => Number(e.amount)
  );
  const partnerReimbursed = sum(
    reimbursements.filter((r) => r.partner_id === partnerId),
    (r) => Number(r.amount)
  );
  const pendingAmount = Math.max(0, partnerExpenses - partnerReimbursed);

  const numAmount = Number(amount);
  const isExceeding = amount !== "" && numAmount > pendingAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerId) {
      toast.error("Please select a partner.");
      return;
    }
    if (!amount || numAmount <= 0) {
      toast.error("Please enter an amount greater than zero.");
      return;
    }
    if (pendingAmount <= 0) {
      toast.error(
        `${selectedPartner?.name ?? "This partner"} has no pending return (all expenses are settled).`
      );
      return;
    }
    if (numAmount > pendingAmount) {
      toast.error(
        `Amount cannot exceed the pending return of ${inr(pendingAmount)} for ${selectedPartner?.name ?? "this partner"}.`
      );
      return;
    }

    save.mutate(
      {
        values: {
          partner_id: partnerId,
          entry_date: date,
          amount: numAmount,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          onDone?.();
        },
      }
    );
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
        Use this form when the <strong className="text-foreground">company returns/repays money</strong> to a partner for expenses they paid out of pocket.
      </div>

      <Field
        label="Partner (Recipient)"
        required
        hint={
          selectedPartner
            ? `Pending to return: ${inr(pendingAmount)}`
            : undefined
        }
      >
        <Select value={partnerId} onValueChange={setPartnerId}>
          <SelectTrigger>
            <SelectValue placeholder="Select partner" />
          </SelectTrigger>
          <SelectContent>
            {activePartners.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Date of Return" required>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field
        label="Amount Returned (₹)"
        required
        hint={
          selectedPartner && pendingAmount > 0
            ? `Max payable: ${inr(pendingAmount)}`
            : undefined
        }
        error={
          isExceeding
            ? `Amount cannot exceed pending return of ${inr(pendingAmount)}`
            : undefined
        }
      >
        <Input
          type="number"
          min="0.01"
          max={pendingAmount > 0 ? pendingAmount : undefined}
          step="0.01"
          placeholder="Enter amount"
          className="text-base font-semibold"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      <Field label="Notes / Payment Mode">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Bank transfer from HDFC account / Cash"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="ghost" onClick={() => onDone?.()}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={save.isPending || isExceeding || pendingAmount <= 0 || !amount || numAmount <= 0}
        >
          Save Return to Partner
        </Button>
      </div>
    </form>
  );
}

