"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { invoices } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Finance / GST" title="GST" subtitle="Invoice data in a GST-compatible structure — GSTIN, taxable value, CGST, SGST, IGST, invoice number, date and rate — exportable without Excel gymnastics." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Invoices in period" value={invoices.length} /><Kpi label="Taxable value" value={inrShort(invoices.reduce((s, i) => s + i.taxable, 0))} /><Kpi label="CGST + SGST" value={inrShort(invoices.reduce((s, i) => s + i.cgst + i.sgst, 0))} tone="accent" /><Kpi label="IGST" value={inrShort(invoices.reduce((s, i) => s + i.igst, 0))} tone="accent" /></div>
      <div className="mt-5">
        <DataTable rows={invoices} columns={[
            { header: "Invoice", cell: (r) => r.id },
            { header: "Date", cell: (r) => fmtDate(r.date) },
            { header: "Customer", cell: (r) => r.customerName },
            { header: "GSTIN", cell: (r) => <span className="font-mono text-xs">{r.gstin}</span> },
            { header: "Taxable", cell: (r) => inr(r.taxable) },
            { header: "Rate", cell: (r) => "18%" },
            { header: "CGST", cell: (r) => inr(r.cgst) },
            { header: "SGST", cell: (r) => inr(r.sgst) },
            { header: "IGST", cell: (r) => inr(r.igst) },
            { header: "Total", cell: (r) => inr(r.total) },
          ]} searchKeys={["id", "customerName", "gstin"]} />
      </div>
    </>
  );
}
