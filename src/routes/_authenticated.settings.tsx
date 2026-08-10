import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { KpiCard, PageHeader, SectionCard, StatusChip } from "@/components/Primitives";
import { Field } from "@/components/forms/ProjectForm";
import {
  useAuditLogs,
  useFinancialYears,
  usePartners,
  useSaveRecord,
  useSettings,
  useStaff,
} from "@/lib/api";
import { fmtDateTime, inr } from "@/lib/format";
import { roleLabel, useCan, type Role } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LEONIS" },
      { name: "description", content: "Company profile, users, roles, financial years and thresholds." },
      { property: "og:title", content: "Settings — LEONIS" },
      { property: "og:description", content: "Manage company settings, users and permissions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function CompanyProfileSection() {
  const { data: settings = {} } = useSettings();
  const save = useSaveRecord("settings", "Company settings");
  const company = (settings["company"] ?? {}) as Record<string, string>;
  const [name, setName] = useState(company["name"] ?? "LEONIS");
  const [tagline, setTagline] = useState(company["tagline"] ?? "Photography & Content Production");
  const [city, setCity] = useState(company["city"] ?? "");
  const [gstin, setGstin] = useState(company["gstin"] ?? "");
  const [phone, setPhone] = useState(company["phone"] ?? "");
  const [email, setEmail] = useState(company["email"] ?? "");

  const handleSave = () => {
    save.mutate(
      {
        id: undefined,
        values: {
          key: "company",
          value: JSON.stringify({ name, tagline, city, gstin, phone, email }),
        },
      },
      {
        onSuccess: () => toast.success("Company profile saved."),
      },
    );
  };

  return (
    <SectionCard title="Company profile">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Studio name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Tagline">
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>
        <Field label="City">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="GSTIN">
          <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={save.isPending}>
        Save profile
      </Button>
    </SectionCard>
  );
}

function ThresholdsSection() {
  const { data: settings = {} } = useSettings();
  const save = useSaveRecord("settings", "Thresholds");
  const th = (settings["thresholds"] ?? {}) as Record<string, number>;
  const [billReq, setBillReq] = useState(String(th["bill_required_above"] ?? 10000));
  const [cashApproval, setCashApproval] = useState(String(th["cash_approval_above"] ?? 50000));
  const [lowMargin, setLowMargin] = useState(String(th["low_margin_percent"] ?? 20));
  const [expSpike, setExpSpike] = useState(String(th["expense_spike_percent"] ?? 40));
  const [overdueDays, setOverdueDays] = useState(String(th["overdue_days"] ?? 30));

  const handleSave = () => {
    save.mutate(
      {
        id: undefined,
        values: {
          key: "thresholds",
          value: JSON.stringify({
            bill_required_above: Number(billReq),
            cash_approval_above: Number(cashApproval),
            low_margin_percent: Number(lowMargin),
            expense_spike_percent: Number(expSpike),
            overdue_days: Number(overdueDays),
          }),
        },
      },
      {
        onSuccess: () => toast.success("Thresholds saved."),
      },
    );
  };

  return (
    <SectionCard title="Alert thresholds">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Bill required above (₹)">
          <Input type="number" value={billReq} onChange={(e) => setBillReq(e.target.value)} />
        </Field>
        <Field label="Cash approval above (₹)">
          <Input type="number" value={cashApproval} onChange={(e) => setCashApproval(e.target.value)} />
        </Field>
        <Field label="Low margin (%)">
          <Input type="number" value={lowMargin} onChange={(e) => setLowMargin(e.target.value)} />
        </Field>
        <Field label="Expense spike (%)">
          <Input type="number" value={expSpike} onChange={(e) => setExpSpike(e.target.value)} />
        </Field>
        <Field label="Overdue days">
          <Input type="number" value={overdueDays} onChange={(e) => setOverdueDays(e.target.value)} />
        </Field>
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={save.isPending}>
        Save thresholds
      </Button>
    </SectionCard>
  );
}

function UsersSection() {
  const { data: staff = [], isLoading } = useStaff();
  const can = useCan();

  return (
    <SectionCard title="Users & roles">
      <DataTable
        rows={staff}
        loading={isLoading}
        columns={[
          { key: "n", header: "Name", cell: (s) => s.full_name ?? "—", sortValue: (s) => s.full_name ?? "" },
          { key: "e", header: "Email", cell: (s) => s.email ?? "—", sortValue: (s) => s.email ?? "" },
          {
            key: "r",
            header: "Role",
            cell: (s) => (
              <StatusChip
                label={s.role ? roleLabel[s.role as Role] : "Unassigned"}
                tone={s.role === "partner" ? "primary" : s.role === "accountant" ? "success" : "neutral"}
              />
            ),
            sortValue: (s) => s.role ?? "",
          },
          {
            key: "a",
            header: "Status",
            cell: (s) => (
              <StatusChip label={s.is_active ? "Active" : "Disabled"} tone={s.is_active ? "success" : "danger"} />
            ),
            sortValue: (s) => String(s.is_active),
          },
          {
            key: "l",
            header: "Last login",
            cell: (s) => (s.last_login ? fmtDateTime(s.last_login) : "Never"),
            sortValue: (s) => s.last_login ?? "",
            defaultHidden: true,
          },
        ]}
        rowKey={(s) => s.id}
        exportName="LEONIS-users"
        searchFields={(s) => [s.full_name, s.email, s.role].filter(Boolean).join(" ")}
        emptyMessage="No staff accounts yet."
      />
    </SectionCard>
  );
}

function PartnerSharesSection() {
  const { data: partners = [] } = usePartners();
  const save = useSaveRecord("partners", "Partner");
  const shareTotal = partners.reduce((t, p) => t + Number(p.profit_share), 0);

  return (
    <SectionCard title="Partner profit shares">
      {shareTotal !== 100 && partners.length > 0 && (
        <p className="mb-4 rounded-lg border border-warning bg-warning/40 px-3 py-2 text-[12px] text-warning-foreground">
          Shares add up to {shareTotal}% — adjust to total 100%.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {partners.map((p) => (
          <div key={p.id} className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-semibold">{p.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                defaultValue={Number(p.profit_share)}
                className="h-9 w-24"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v !== Number(p.profit_share)) {
                    save.mutate({ id: p.id, values: { profit_share: v } });
                  }
                }}
              />
              <span className="text-xs text-muted-foreground">% share</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function FinancialYearsSection() {
  const { data: years = [] } = useFinancialYears();

  return (
    <SectionCard title="Financial years">
      <DataTable
        rows={years}
        columns={[
          { key: "l", header: "Label", cell: (y) => y.label, sortValue: (y) => y.label },
          { key: "s", header: "Start", cell: (y) => y.start_date, sortValue: (y) => y.start_date },
          { key: "e", header: "End", cell: (y) => y.end_date, sortValue: (y) => y.end_date },
          {
            key: "c",
            header: "Current",
            cell: (y) => <StatusChip label={y.is_current ? "Active" : "Past"} tone={y.is_current ? "success" : "neutral"} />,
            sortValue: (y) => String(y.is_current),
          },
        ]}
        rowKey={(y) => y.id}
        emptyMessage="No financial years configured."
      />
    </SectionCard>
  );
}

function AuditSection() {
  const { data: logs = [], isLoading } = useAuditLogs();

  return (
    <SectionCard title="Recent audit trail">
      <DataTable
        rows={logs.slice(0, 50)}
        loading={isLoading}
        columns={[
          { key: "t", header: "When", cell: (l) => fmtDateTime(l.created_at), sortValue: (l) => l.created_at },
          { key: "u", header: "User", cell: (l) => l.user_email ?? "System", sortValue: (l) => l.user_email ?? "" },
          { key: "a", header: "Action", cell: (l) => l.action, sortValue: (l) => l.action },
          { key: "m", header: "Module", cell: (l) => l.module, sortValue: (l) => l.module },
          {
            key: "r",
            header: "Record",
            cell: (l) => (l.record_id ? l.record_id.slice(0, 8) + "…" : "—"),
            sortValue: (l) => l.record_id ?? "",
            defaultHidden: true,
          },
        ]}
        rowKey={(l) => l.id}
        exportName="LEONIS-audit-log"
        searchFields={(l) => [l.user_email, l.action, l.module].filter(Boolean).join(" ")}
        emptyMessage="No audit entries."
        pageSize={15}
      />
    </SectionCard>
  );
}

function SettingsPage() {
  const can = useCan();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Company profile, users, thresholds, financial years and audit log."
      />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="users">Users & roles</TabsTrigger>
          <TabsTrigger value="partners">Partner shares</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="years">Financial years</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4 space-y-4">
          <CompanyProfileSection />
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-4">
          <UsersSection />
        </TabsContent>

        <TabsContent value="partners" className="mt-4 space-y-4">
          <PartnerSharesSection />
        </TabsContent>

        <TabsContent value="thresholds" className="mt-4 space-y-4">
          <ThresholdsSection />
        </TabsContent>

        <TabsContent value="years" className="mt-4 space-y-4">
          <FinancialYearsSection />
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-4">
          <AuditSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
