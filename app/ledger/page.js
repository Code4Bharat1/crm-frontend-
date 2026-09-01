"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { customers } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Finance / Customer Ledger" title="Customer Ledger" subtitle="Opening balance, invoices, receipts and closing outstanding per customer, with ageing and credit terms." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Customers" value={customers.length} /><Kpi label="Total outstanding" value={inrShort(customers.reduce((s, c) => s + c.outstanding, 0))} tone="danger" /><Kpi label="Collected" value={inrShort(customers.reduce((s, c) => s + c.paymentsReceived, 0))} tone="success" /><Kpi label="Credit customers" value={customers.filter((c) => c.creditDays >= 45).length} tone="warning" /></div>
      <div className="mt-5">
        <DataTable rows={customers} columns={[
            { header: "Customer", cell: (r) => (<Link href="/customers/$id" params={{ id: r.id }} className="font-medium text-primary hover:underline">{r.name}</Link>) },
            { header: "GSTIN", cell: (r) => <span className="font-mono text-xs">{r.gstin}</span> },
            { header: "Total billed", cell: (r) => inr(r.totalSales) },
            { header: "Received", cell: (r) => inr(r.paymentsReceived) },
            { header: "Outstanding", cell: (r) => <span className={r.outstanding > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>{inr(r.outstanding)}</span> },
            { header: "Credit days", cell: (r) => `${r.creditDays} days` },
            { header: "Stage", cell: (r) => <StatusBadge value={r.stage} /> },
          ]} searchKeys={["name", "gstin", "stage"]} />
      </div>
    </>
  );
}
