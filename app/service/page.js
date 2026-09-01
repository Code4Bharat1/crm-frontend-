"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { kpis, serviceRequests } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Service / Requests" title="Service Requests" subtitle="Service is tracked independently of product sales — engineer effort, parts, travel and charges roll into a separate service P&L." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Service requests" value={serviceRequests.length} /><Kpi label="Open" value={kpis.openService} tone="warning" /><Kpi label="Under warranty" value={serviceRequests.filter((s) => s.underWarranty).length} tone="accent" /><Kpi label="Service revenue" value={inrShort(kpis.serviceRevenue)} tone="success" /></div>
      <div className="mt-5">
        <DataTable rows={serviceRequests} columns={[
            { header: "Request", cell: (r) => <span className="font-semibold">{r.id}</span> },
            { header: "Customer", cell: (r) => (<Link href="/customers/$id" params={{ id: r.customerId }} className="text-primary hover:underline">{r.customerName}</Link>) },
            { header: "Product / serial", cell: (r) => (<div><p>{r.productName}</p><p className="font-mono text-xs text-muted-foreground">{r.serial}</p></div>) },
            { header: "Issue", cell: (r) => <span className="text-muted-foreground">{r.issue}</span> },
            { header: "Warranty", cell: (r) => <StatusBadge value={r.underWarranty ? "Under warranty" : "Out of warranty"} /> },
            { header: "Engineer", cell: (r) => r.engineer },
            { header: "Scheduled", cell: (r) => fmtDate(r.scheduledOn) },
            { header: "Charges", cell: (r) => inr(r.serviceCharges) },
            { header: "Parts", cell: (r) => inr(r.partsCost) },
            { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
          ]} searchKeys={["id", "customerName", "engineer", "status"]} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Service revenue"><Metric label="Chargeable revenue" value={inrShort(serviceRequests.reduce((s, r) => s + r.serviceCharges, 0))} tone="good" /></Section>
        <Section title="Service cost"><Metric label="Parts + travel" value={inrShort(serviceRequests.reduce((s, r) => s + r.partsCost + r.travelCost, 0))} tone="bad" /></Section>
        <Section title="Engineer effort"><Metric label="Hours booked" value={`${serviceRequests.reduce((s, r) => s + r.engineerHours, 0)} hrs`} /></Section>
      </div>
    </>
  );
}
