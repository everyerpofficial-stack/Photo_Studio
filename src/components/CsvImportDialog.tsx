import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useExpenseCategories, usePartners } from "@/lib/api";
import { inr } from "@/lib/format";
import { logAudit } from "@/lib/audit";

type ParsedRow = {
  date: string;
  categoryName: string;
  categoryId?: string | undefined;
  expenseClass: "operating" | "capital" | "financing";
  amount: number;
  partnerName: string;
  partnerId?: string | undefined;
  notes: string;
  billNo: string;
  isValid: boolean;
  error?: string | undefined;
};

export function CsvImportDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: categories = [] } = useExpenseCategories();
  const { data: partners = [] } = usePartners();

  const downloadTemplate = () => {
    const headers = "date,category,amount,partner,notes,bill_no\n";
    const sample = "2026-08-10,Rent,15000,Mehulbhai,Office rent for August,R-1002\n2026-08-10,Salary,12000,Jayu,Staff payment,S-3004\n";
    const blob = new Blob([headers + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leonis_expense_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      parseFile(selected);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        toast.error("CSV file is empty or missing data rows.");
        return;
      }

      // Parse headers
      const firstLine = lines[0];
      if (!firstLine) {
        toast.error("CSV file is empty.");
        return;
      }
      const headers = firstLine.split(",").map((h) => h.trim().toLowerCase());
      const dateIdx = headers.indexOf("date");
      const catIdx = headers.indexOf("category");
      const amtIdx = headers.indexOf("amount");
      const partIdx = headers.indexOf("partner");
      const notesIdx = headers.indexOf("notes");
      const billIdx = headers.indexOf("bill_no");

      if (catIdx === -1 || amtIdx === -1) {
        toast.error("CSV must contain at least 'category' and 'amount' columns.");
        return;
      }

      const parsed: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        // Simple CSV splitter that respects quoted strings
        const cols: string[] = [];
        let cur = "";
        let insideQuote = false;
        for (let charIdx = 0; charIdx < line.length; charIdx++) {
          const char = line[charIdx];
          if (char === '"') {
            insideQuote = !insideQuote;
          } else if (char === "," && !insideQuote) {
            cols.push(cur.trim());
            cur = "";
          } else {
            cur += char;
          }
        }
        cols.push(cur.trim());

        const rawDate = dateIdx !== -1 ? (cols[dateIdx] ?? "") : "";
        const rawCat = cols[catIdx] ?? "";
        const rawAmt = cols[amtIdx] ?? "";
        const rawPart = partIdx !== -1 ? (cols[partIdx] ?? "") : "";
        const rawNotes = notesIdx !== -1 ? (cols[notesIdx] ?? "") : "";
        const rawBill = billIdx !== -1 ? (cols[billIdx] ?? "") : "";

        // Clean amount
        const amount = Number(rawAmt.replace(/[^0-9.]/g, ""));
        const date = rawDate || new Date().toISOString().slice(0, 10);

        // Find Category
        const category = categories.find(
          (c) => c.name.toLowerCase() === rawCat.toLowerCase() && c.is_active
        );

        // Find Partner
        const partner = partners.find(
          (p) => p.name.toLowerCase() === rawPart.toLowerCase()
        );

        let isValid = true;
        let error = "";

        if (!rawCat) {
          isValid = false;
          error = "Category is missing.";
        } else if (!category) {
          isValid = false;
          error = `Category '${rawCat}' not found or inactive.`;
        } else if (isNaN(amount) || amount <= 0) {
          isValid = false;
          error = `Invalid amount '${rawAmt}'.`;
        } else if (amount > 10000 && !rawBill) {
          isValid = false;
          error = "Bill number is required for expenses above ₹10,000.";
        }

        parsed.push({
          date,
          categoryName: rawCat,
          categoryId: category?.id,
          expenseClass: (category?.default_class ?? "operating") as any,
          amount,
          partnerName: rawPart,
          partnerId: partner?.id,
          notes: rawNotes,
          billNo: rawBill,
          isValid,
          error,
        });
      }

      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }

    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const inserts = validRows.map((r) => ({
        expense_date: r.date,
        category_id: r.categoryId!,
        expense_class: r.expenseClass,
        amount: r.amount,
        partner_id: r.partnerId || null,
        notes: r.notes || null,
        bill_no: r.billNo || null,
        created_by: userData.user?.id || null,
      }));

      const { error } = await supabase.from("expenses").insert(inserts);
      if (error) throw error;

      await logAudit("created", "Expenses Bulk CSV Import", null, null, { count: inserts.length });

      toast.success(`Successfully imported ${inserts.length} expenses.`);
      setOpen(false);
      setFile(null);
      setRows([]);
      qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="size-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Expenses via CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing date, category, amount, partner, notes, and bill number.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
            <span className="text-[12px] text-muted-foreground">
              Don't have a template? Download our standard format template.
            </span>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[12px]" onClick={downloadTemplate}>
              <Download className="size-3.5" /> Template
            </Button>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/30 py-6 text-center">
            <Upload className="size-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {file ? `Selected file: ${file.name}` : "Select a CSV file to import"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              Choose CSV File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Preview & Validation</p>
                <p className="text-[12px] text-muted-foreground">
                  {rows.filter((r) => r.isValid).length} of {rows.length} rows valid
                </p>
              </div>

              <div className="max-h-[300px] overflow-auto rounded-lg border">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-muted border-b">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Category</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2">Partner</th>
                      <th className="p-2">Bill No.</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row, i) => (
                      <tr key={i} className={row.isValid ? "hover:bg-muted/40" : "bg-danger/5 text-danger-foreground"}>
                        <td className="p-2 font-mono">{row.date}</td>
                        <td className="p-2">{row.categoryName}</td>
                        <td className="p-2 text-right font-semibold tabular-nums">{inr(row.amount)}</td>
                        <td className="p-2">{row.partnerName || "—"}</td>
                        <td className="p-2 font-mono">{row.billNo || "—"}</td>
                        <td className="p-2">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-success-foreground">
                              <CheckCircle2 className="size-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-start gap-1 text-danger-foreground" title={row.error}>
                              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                              <span className="line-clamp-1">{row.error}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFile(null);
                    setRows([]);
                  }}
                  disabled={busy}
                >
                  Clear
                </Button>
                <Button onClick={handleImport} disabled={busy || rows.filter((r) => r.isValid).length === 0}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Importing…
                    </>
                  ) : (
                    `Import ${rows.filter((r) => r.isValid).length} Expenses`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
