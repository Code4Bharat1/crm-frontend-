"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { purchaseOrders } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Purchase / Purchase Orders" title="Purchase Orders & Planning" subtitle="Plan material against customer orders and projects, combine requirements, and track receipts supplier-wise." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Purchase orders" value={purchaseOrders.length} /><Kpi label="PO value" value={inrShort(purchaseOrders.reduce((s, p) => s + p.value, 0))} /><Kpi label="Awaiting receipt" value={purchaseOrders.filter((p) => ["Sent", "Acknowledged", "Partially Received"].includes(p.status)).length} tone="warning" /><Kpi label="Project linked" value={purchaseOrders.filter((p) => p.projectId).length} tone="accent" /></div>
      <div className="mt-5">
        <DataTable rows={purchaseOrders} columns={[
            { header: "PO", cell: (r) => <span className="font-semibold">{r.id}</span> },
            { header: "Supplier", cell: (r) => r.supplier },
            { header: "Date", cell: (r) => fmtDate(r.date) },
            { header: "Expected", cell: (r) => fmtDate(r.expected) },
            { header: "Items", cell: (r) => `${r.items} items` },
            { header: "Value", cell: (r) => inr(r.value) },
            { header: "For SO", cell: (r) => r.linkedSO ?? "—" },
            { header: "Project", cell: (r) => r.projectId ?? "—" },
            { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
          ]} searchKeys={["id", "supplier", "status"]} />
      </div>
    </>
  );
}
