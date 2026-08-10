import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeIndianRupee, CalendarRange, PieChart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LEONIS — Studio Business Suite for Photography Teams" },
      {
        name: "description",
        content:
          "LEONIS is the business suite for a Surat photography and content studio: shoots, clients, payments in ₹, expenses, partner capital and April–March reports.",
      },
      { property: "og:title", content: "LEONIS — Studio Business Suite" },
      {
        property: "og:description",
        content: "Run shoots, client billing, expenses and partner accounts from one premium dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: <CalendarRange className="size-5" />,
    title: "Shoots & projects",
    body: "Rate-card driven billing, quantity × rate amounts, editing and production costs per shoot.",
  },
  {
    icon: <BadgeIndianRupee className="size-5" />,
    title: "Money in ₹",
    body: "Client quotes, receipts, dues and other income with modes, references and approval rules.",
  },
  {
    icon: <PieChart className="size-5" />,
    title: "Partner accounts",
    body: "Capital, drawings and configurable profit share between Jayu and Mehulbhai.",
  },
  {
    icon: <ShieldCheck className="size-5" />,
    title: "Controlled access",
    body: "Partner, Accountant, Coordinator and Editor roles with a full audit trail.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div>
          <p className="text-sm font-semibold tracking-[0.3em] text-primary">LEONIS</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Studio Business Suite</p>
        </div>
        <Button asChild size="sm">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:pt-16">
        <p className="inline-flex rounded-full bg-primary-light px-3 py-1 text-[11px] font-medium text-primary">
          Photography & content production · Surat
        </p>
        <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Every shoot, rupee and partner account in one calm control room.
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          LEONIS replaces scattered spreadsheets with a single studio ledger — client dues, expense classes,
          partner capital and April–March financial-year reporting, ready to export.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild className="gap-2">
            <Link to="/dashboard">
              Enter the studio <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/projects">View Projects</Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-xl border bg-card p-5 shadow-card">
              <span className="inline-grid size-10 place-items-center rounded-lg bg-primary-light text-primary">
                {f.icon}
              </span>
              <h2 className="mt-4 text-sm font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t px-5 py-6">
        <p className="mx-auto max-w-6xl text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} LEONIS Studio · Surat, Gujarat
        </p>
      </footer>
    </div>
  );
}
