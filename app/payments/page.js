"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, inr, inrShort } from "@/lib/crm-data";
import { payments, kpis } from "@/lib/crm-data";


export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Finance / Payments" title="Payments Received" subtitle="Receipts allocated to invoices, proformas or the customer account, with partial payment support and full references." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Receipts" value={payments.length} /><Kpi label="Collected" value={inrShort(kpis.paymentsReceived)} tone="success" /><Kpi label="Unallocated" value={payments.filter((p) => !p.allocated).length} tone="warning" /><Kpi label="Against proforma" value={payments.filter((p) => p.proformaId).length} tone="accent" /></div>
      <div className="mt-5">
        <DataTable
          rows={payments}
          columns={[
            { header: "Receipt", cell: (p) => <span className="font-semibold">{p.id}</span> },
            { header: "Customer", cell: (p) => (<Link href="/customers/$id" params={{ id: p.customerId }} className="font-medium text-primary hover:underline">{p.customerName}</Link>) },
            { header: "Date", cell: (p) => fmtDate(p.date) },
            { header: "Amount", cell: (p) => <span className="font-semibold">{inr(p.amount)}</span> },
            { header: "Mode", cell: (p) => p.mode },
            { header: "Reference", cell: (p) => <span className="font-mono text-xs">{p.reference}</span> },
            { header: "Bank", cell: (p) => p.bankAccount },
            { header: "Allocated to", cell: (p) => p.invoiceId ?? p.proformaId ?? "On account" },
            { header: "Status", cell: (p) => <StatusBadge value={p.allocated ? "Reconciled" : "Pending"} /> },
          ]}
          searchKeys={["id", "customerName", "reference", "mode"]}
        />
      </div>
    </>
  );
}
