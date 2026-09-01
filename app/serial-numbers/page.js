"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { serials } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Products / Serial Numbers" title="Serial Numbers" subtitle="Every serial-numbered unit carries its full history: supplier, receipt, location, customer, order, delivery, invoice, warranty and service." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Serial records" value={serials.length} /><Kpi label="In stock" value={serials.filter((s) => s.status === "In Stock").length} tone="accent" /><Kpi label="Installed at customer" value={serials.filter((s) => s.status === "Installed").length} tone="success" /><Kpi label="Under repair" value={serials.filter((s) => s.status === "Under Repair").length} tone="warning" /></div>
      <div className="mt-5">
        <DataTable rows={serials} columns={[
            { header: "Serial", cell: (r) => <span className="font-mono text-xs font-semibold">{r.id}</span> },
            { header: "Product", cell: (r) => r.productName },
            { header: "Supplier", cell: (r) => r.supplier },
            { header: "Received", cell: (r) => fmtDate(r.receivedOn) },
            { header: "Location / customer", cell: (r) => r.customerName ?? r.location },
            { header: "SO / DN / Invoice", cell: (r) => [r.soId, r.deliveryId, r.invoiceId].filter(Boolean).join(" · ") || "—" },
            { header: "Warranty till", cell: (r) => r.warrantyEnd ? fmtDate(r.warrantyEnd) : "—" },
            { header: "Service jobs", cell: (r) => r.serviceCount },
            { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
          ]} searchKeys={["id", "productName", "customerName", "status"]} />
      </div>
    </>
  );
}
