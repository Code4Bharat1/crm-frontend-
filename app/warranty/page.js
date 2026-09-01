"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { serials } from "@/lib/crm-data";
const warranted = serials.filter((s) => s.warrantyEnd);

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Service / Warranty" title="Warranty Management" subtitle="Warranty is bound to the serial number, product, customer, purchase and invoice — with expiry alerts that create AMC opportunities." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Units under warranty" value={warranted.filter((s) => s.warrantyEnd.getTime() > Date.now()).length} tone="success" /><Kpi label="Out of warranty" value={warranted.filter((s) => s.warrantyEnd.getTime() <= Date.now()).length} tone="danger" /><Kpi label="Expiring in 30 days" value={warranted.filter((s) => s.warrantyEnd.getTime() > Date.now() && s.warrantyEnd.getTime() < Date.now() + 30 * 86400000).length} tone="warning" /><Kpi label="Serial records" value={serials.length} /></div>
      <div className="mt-5">
        <DataTable rows={warranted} columns={[
            { header: "Serial", cell: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span> },
            { header: "Product", cell: (r) => r.productName },
            { header: "Customer", cell: (r) => r.customerName ?? "—" },
            { header: "Invoice", cell: (r) => r.invoiceId ?? "—" },
            { header: "Warranty start", cell: (r) => r.warrantyStart ? fmtDate(r.warrantyStart) : "—" },
            { header: "Warranty end", cell: (r) => r.warrantyEnd ? fmtDate(r.warrantyEnd) : "—" },
            { header: "Status", cell: (r) => <StatusBadge value={r.warrantyEnd && r.warrantyEnd.getTime() > Date.now() ? "Under warranty" : "Out of warranty"} /> },
            { header: "Service jobs", cell: (r) => r.serviceCount },
          ]} searchKeys={["id", "productName", "customerName"]} />
      </div>
    </>
  );
}
