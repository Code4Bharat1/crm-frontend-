"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, inr, inrShort } from "@/lib/crm-data";
import { deliveries } from "@/lib/crm-data";


export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Sales / Delivery Notes" title="Delivery Notes" subtitle="Material dispatch against sales orders with serial numbers, transport details and acknowledgement." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Delivery notes" value={deliveries.length} /><Kpi label="In transit" value={deliveries.filter((d) => d.status === "In Transit").length} tone="warning" /><Kpi label="Delivered" value={deliveries.filter((d) => d.status === "Delivered").length} tone="success" /><Kpi label="Returned" value={deliveries.filter((d) => d.status === "Returned").length} tone="danger" /></div>
      <div className="mt-5">
        <DataTable
          rows={deliveries}
          columns={[
            { header: "Delivery note", cell: (d) => <span className="font-semibold">{d.id}</span> },
            { header: "Against SO", cell: (d) => (<Link href="/orders/$id" params={{ id: d.soId }} className="text-primary hover:underline">{d.soId}</Link>) },
            { header: "Customer", cell: (d) => d.customerName },
            { header: "Dispatch date", cell: (d) => fmtDate(d.date) },
            { header: "Items", cell: (d) => `${d.items} items` },
            { header: "Serial numbers", cell: (d) => <span className="font-mono text-xs">{d.serials.join(", ")}</span> },
            { header: "Transport", cell: (d) => `${d.transporter} · ${d.lrNumber}` },
            { header: "Received by", cell: (d) => d.receivedBy },
            { header: "Status", cell: (d) => <StatusBadge value={d.status} /> },
          ]}
          searchKeys={["id", "soId", "customerName", "status"]}
        />
      </div>
    </>
  );
}
