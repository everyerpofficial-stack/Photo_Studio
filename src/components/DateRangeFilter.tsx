import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { financialYear, toISODate } from "@/lib/format";
import type { Filters } from "@/lib/api";

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
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
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">From</label>
        <Input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="h-9 w-[140px]"
        />
      </div>
      <div>
        <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">To</label>
        <Input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="h-9 w-[140px]"
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={setMonth}>
        This month
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={setFY}>
        {financialYear().label}
      </Button>
    </div>
  );
}
