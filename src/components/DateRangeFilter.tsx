import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { financialYear, toISODate } from "@/lib/format";
import type { Filters } from "@/lib/api";

export function DateRangeFilter({
  value,
  onChange,
  className,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  className?: string;
}) {
  const setFY = () => {
    const fy = financialYear();
    onChange({ ...value, from: fy.start, to: fy.end });
  };

  const setMonth = () => {
    const now = new Date();
    onChange({
      ...value,
      from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    });
  };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-card p-1 shadow-sm ${className || ""}`}>
      <div className="flex items-center gap-1.5 px-1.5">
        <Calendar className="size-3.5 text-indigo-600 shrink-0" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">From</span>
        <Input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="h-7 w-[125px] text-xs px-1.5 py-0 border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500"
        />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">To</span>
        <Input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="h-7 w-[125px] text-xs px-1.5 py-0 border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500"
        />
      </div>
      <div className="flex items-center gap-1 pl-1 border-l border-border/80">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setMonth}
          className="h-7 px-2 text-[11px] font-medium text-foreground hover:bg-muted"
        >
          This month
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setFY}
          className="h-7 px-2 text-[11px] font-medium text-foreground hover:bg-muted"
        >
          {financialYear().label}
        </Button>
      </div>
    </div>
  );
}
