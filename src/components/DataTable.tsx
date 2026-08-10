import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Inbox, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { exportCSV, exportExcel, type ExportColumn } from "@/lib/export";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  exportValue?: (row: T) => string | number;
  align?: "left" | "right";
  className?: string;
  defaultHidden?: boolean;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchFields?: (row: T) => string;
  emptyMessage?: string;
  emptyHint?: string;
  toolbar?: ReactNode;
  filters?: ReactNode;
  footer?: (rows: T[]) => ReactNode;
  exportName?: string;
  pageSize?: number;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  rows,
  columns,
  loading,
  searchPlaceholder = "Search…",
  searchFields,
  emptyMessage = "No records found.",
  emptyHint,
  toolbar,
  filters,
  footer,
  exportName,
  pageSize = 25,
  rowKey,
  onRowClick,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<string[]>(columns.filter((c) => c.defaultHidden).map((c) => c.key));

  const visible = columns.filter((c) => !hidden.includes(c.key));

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim() && searchFields) {
      const needle = q.trim().toLowerCase();
      out = out.filter((r) => searchFields(r).toLowerCase().includes(needle));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, q, sort, columns, searchFields]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const exportCols: ExportColumn<T>[] = visible.map((c) => ({
    header: c.header,
    value: (r) => c.exportValue?.(r) ?? c.sortValue?.(r) ?? "",
  }));

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card p-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {toolbar}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1.5" aria-label="Column visibility">
                  <Settings2 className="size-3.5" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                {columns.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={!hidden.includes(c.key)}
                    onCheckedChange={(v) =>
                      setHidden((h) => (v ? h.filter((k) => k !== c.key) : [...h, c.key]))
                    }
                  >
                    {c.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {exportName && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1.5">
                    <Download className="size-3.5" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportExcel(filtered, exportCols, exportName)}>
                    Excel (.xls)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportCSV(filtered, exportCols, exportName)}>CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {filters && (
          <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-border/50">
            {filters}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md border-b border-border">
              <tr>
                {visible.map((c) => (
                  <th
                    key={c.key}
                    onClick={() =>
                      c.sortValue &&
                      setSort((s) =>
                        s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" },
                      )
                    }
                    className={cn(
                      "whitespace-nowrap px-3 py-2 font-semibold text-foreground/90 uppercase tracking-wider text-[11px]",
                      c.align === "right" ? "text-right" : "text-left",
                      c.sortValue && "cursor-pointer select-none hover:opacity-80",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.header}
                      {sort?.key === c.key &&
                        (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    {visible.map((c) => (
                      <td key={c.key} className="px-3 py-2.5">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading &&
                pageRows.map((r, i) => (
                  <tr
                    key={rowKey(r)}
                    onClick={() => onRowClick?.(r)}
                    className={cn(
                      "border-t transition-colors",
                      i % 2 === 1 && "bg-muted/40",
                      onRowClick && "cursor-pointer hover:bg-primary-light/50",
                    )}
                  >
                    {visible.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-3 py-2.5 align-middle",
                          c.align === "right" && "text-right tabular-nums",
                          c.className,
                        )}
                      >
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={visible.length} className="px-3 py-16 text-center">
                    <Inbox className="mx-auto mb-3 size-8 text-muted-foreground" />
                    <p className="font-medium">{emptyMessage}</p>
                    {emptyHint && <p className="mt-1 text-muted-foreground">{emptyHint}</p>}
                  </td>
                </tr>
              )}
            </tbody>
            {footer && !loading && filtered.length > 0 && (
              <tfoot className="sticky bottom-0 bg-muted/90 backdrop-blur-md border-t font-semibold">
                <tr>
                  <td colSpan={visible.length} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-4">
                      {footer(filtered)}
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <span>
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
          {filtered.length > pageSize && ` · page ${current} of ${pages}`}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={current === 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={current === pages} onClick={() => setPage(current + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
