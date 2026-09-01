"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { migrationBatches } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Administration / Data Migration" title="Data Migration" subtitle="Upload → map columns → validate → preview → import → migration report. Product master, Tally data up to 2022 and records from 2023 onward." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Batches" value={migrationBatches.length} /><Kpi label="Rows processed" value={migrationBatches.reduce((s, b) => s + b.rows, 0)} /><Kpi label="Imported" value={migrationBatches.reduce((s, b) => s + b.imported, 0)} tone="success" /><Kpi label="Invalid rows" value={migrationBatches.reduce((s, b) => s + b.invalid, 0)} tone="danger" /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Section title="Import wizard" className="lg:col-span-2">
          <ol className="grid gap-2 sm:grid-cols-3">
            {["1. Upload Excel / CSV", "2. Map columns", "3. Validate", "4. Preview", "5. Import", "6. Migration report"].map((s) => (
              <li key={s} className="rounded-md border border-border bg-muted/40 p-3 text-sm font-semibold">{s}</li>
            ))}
          </ol>
          <div className="mt-4 rounded-md border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Drop an Excel or CSV file here — product master, customer master, Tally ledgers, sales register or payments.
          </div>
          <div className="mt-3 flex gap-2"><Button className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">Upload file</Button><Button variant="outline">Download template</Button></div>
        </Section>
        <Section title="Tally migration approach">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Direct Tally connectivity is not assumed.</li>
            <li>Historical customers, ledgers, transactions and product data move through a flexible mapping workflow.</li>
            <li>Financial records are imported-only history where structurally possible.</li>
            <li>Validation runs before import; nothing is written until the preview is approved.</li>
          </ul>
        </Section>
      </div>
      <div className="mt-4">
        <Section title="Migration batches">
          <ul className="space-y-2">
            {migrationBatches.map((b) => (
              <li key={b.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{b.id} — {b.source}</span>
                  <span className="flex items-center gap-2"><StatusBadge value={b.status} /><span className="text-xs text-muted-foreground">{b.at}</span></span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {b.rows} rows · {b.valid} valid · {b.invalid} invalid · {b.duplicates} duplicates · {b.imported} imported
                </p>
                <div className="mt-2"><Button size="sm" variant="outline">Download error report</Button></div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
