export const inr = (n: number | null | undefined, opts?: { compact?: boolean }) => {
  const v = Number(n ?? 0);
  if (opts?.compact) {
    if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
    if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  }
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const num = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const pct = (n: number | null | undefined) => `${Number(n ?? 0).toFixed(1)}%`;

/** DD-MM-YYYY */
export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(date.getDate())}-${p(date.getMonth() + 1)}-${date.getFullYear()}`;
};

export const fmtDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return `${fmtDate(date)} ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
};

export const toISODate = (d: Date) => {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const today = () => toISODate(new Date());

/** Financial year (April–March) containing the given date. */
export function financialYear(date = new Date()) {
  const y = date.getMonth() + 1 >= 4 ? date.getFullYear() : date.getFullYear() - 1;
  return {
    label: `FY ${y}-${String((y + 1) % 100).padStart(2, "0")}`,
    start: `${y}-04-01`,
    end: `${y + 1}-03-31`,
  };
}

export const monthKey = (d: string) => d.slice(0, 7);

export const monthLabel = (key: string) => {
  const [y = "", m = "1"] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
};

export const margin = (profit: number, revenue: number) => (revenue > 0 ? (profit / revenue) * 100 : 0);
