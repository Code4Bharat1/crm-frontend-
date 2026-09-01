"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
const BLOCKS = [
  { title: "Environment", items: ["Preview / staging / production", "Configuration per environment", "Zero-downtime releases"] },
  { title: "Database", items: ["PostgreSQL primary", "Daily automated backups", "Point-in-time recovery"] },
  { title: "API layer", items: ["Authenticated application API", "Public webhook endpoints with signature verification", "Rate limiting"] },
  { title: "Storage", items: ["Documents, quotation PDFs, attachments", "Access controlled by role", "Encrypted at rest"] },
  { title: "Backup", items: ["Scheduled database + file backups", "Off-site retention", "Restore drills"] },
  { title: "Monitoring", items: ["Uptime and error monitoring", "Integration heartbeat alerts", "Audit and access logs"] },
];

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Administration / Deployment" title="Deployment & Infrastructure" subtitle="The platform runs on managed cloud, the customer's own server, or fully on-premises — data ownership always stays with CONTECH." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Cloud hosting" value="Supported" tone="success" /><Kpi label="Customer server" value="Supported" tone="success" /><Kpi label="On-premises" value="Supported" tone="success" /><Kpi label="Data ownership" value="CONTECH" tone="accent" /></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {BLOCKS.map((b) => (
          <Section key={b.title} title={b.title}>
            <ul className="space-y-1.5 text-sm text-muted-foreground">{b.items.map((i) => <li key={i}>• {i}</li>)}</ul>
          </Section>
        ))}
      </div>
    </>
  );
}
