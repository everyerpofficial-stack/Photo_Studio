import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { deleteDocument, getDocumentUrl, uploadDocument } from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDocuments } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALLOWED = ["jpg", "jpeg", "png", "webp", "pdf", "xlsx", "csv"];
const MAX_MB = 10;

export function FileUploader({
  entityType,
  entityId,
  label = "Attachments",
  compact,
}: {
  entityType: string;
  entityId?: string | undefined;
  label?: string | undefined;
  compact?: boolean | undefined;
}) {
  const { data: docs = [], isLoading } = useDocuments(entityType, entityId);
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length || !entityId) return;
    setBusy(true);
    let done = 0;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED.includes(ext)) {
        toast.error(`${file.name}: only ${ALLOWED.join(", ").toUpperCase()} files are allowed.`);
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${file.name}: file must be under ${MAX_MB} MB.`);
        continue;
      }
      const form = new FormData();
      form.set("file", file);
      form.set("entityType", entityType);
      form.set("entityId", entityId);
      try {
        await uploadDocument({ data: form });
      } catch (e) {
        toast.error(`Upload failed: ${e instanceof Error ? e.message : "Unknown error"}`);
        continue;
      }
      done += 1;
      setProgress(Math.round((done / files.length) * 100));
    }
    setBusy(false);
    setProgress(0);
    if (done) toast.success(`${done} file${done > 1 ? "s" : ""} uploaded.`);
    qc.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
  };

  const open = async (id: string) => {
    try {
      const { dataUrl } = await getDocumentUrl({ data: { id } });
      window.open(dataUrl, "_blank");
    } catch {
      toast.error("Could not open file.");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteDocument({ data: { id } });
    } catch {
      toast.error("You do not have permission to delete files.");
      return;
    }
    toast.success("File deleted.");
    qc.invalidateQueries({ queryKey: ["documents", entityType, entityId] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        {docs.length > 0 && (
          <span className="text-xs text-muted-foreground">{docs.length} file(s)</span>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors",
          compact ? "py-4" : "py-7",
          dragging ? "border-primary bg-primary-light/40" : "border-input bg-muted/30",
          !entityId && "opacity-60",
        )}
      >
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin text-primary" />
            <Progress value={progress} className="h-1.5 w-40" />
          </>
        ) : (
          <>
            <Upload className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {entityId ? "Drag & drop, or" : "Save the record first to attach files"}
            </p>
            {entityId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                Choose files
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground">
              JPG, PNG, WEBP, PDF, XLSX, CSV · max {MAX_MB} MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,.xlsx,.csv"
          capture={undefined}
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading attachments…</p>}
      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
            <FileText className="size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{d.file_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {fmtDate(d.created_at)} · {Math.round(Number(d.size_bytes ?? 0) / 1024)} KB
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => void open(d.id)}>
              <Download className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => void remove(d.id)}
              className="text-danger-foreground"
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
