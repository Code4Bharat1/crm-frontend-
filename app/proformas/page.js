"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, inr, inrShort } from "@/lib/crm-data";
import { proformas } from "@/lib/crm-data";


export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Sales / Proforma Invoices" title="Proforma Invoices" subtitle="Advance tracking against every proforma, with clean conversion into a sales invoice so no PI or invoice stays incorrectly open." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Proformas" value={proformas.length} /><Kpi label="Open / unpaid" value={proformas.filter((p) => p.status === "Open").length} tone="warning" /><Kpi label="Advance received" value={inrShort(proformas.reduce((s, p) => s + p.advanceReceived, 0))} tone="success" /><Kpi label="Converted to invoice" value={proformas.filter((p) => p.status === "Converted to Invoice").length} tone="accent" /></div>
      <div className="mt-5">
        <DataTable
          rows={proformas}
          columns={[
            { header: "Proforma", cell: (p) => <span className="font-semibold">{p.id}</span> },
            { header: "Customer", cell: (p) => (<Link href="/customers/$id" params={{ id: p.customerId }} className="font-medium text-primary hover:underline">{p.customerName}</Link>) },
            { header: "Against quotation", cell: (p) => p.quotationId },
            { header: "Date", cell: (p) => fmtDate(p.date) },
            { header: "Value", cell: (p) => inr(p.value) },
            { header: "Advance", cell: (p) => inr(p.advanceReceived) },
            { header: "Balance", cell: (p) => inr(p.value - p.advanceReceived) },
            { header: "Invoice", cell: (p) => p.invoiceId ?? "—" },
            { header: "Status", cell: (p) => <StatusBadge value={p.status} /> },
          ]}
          searchKeys={["id", "customerName", "status"]}
        />
      </div>
      <div className="mt-4">
        <Section title="Rule: PI payments must not leave a broken financial trail">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Payment received against a PI is held advance until the invoice is raised.</li>
            <li>On conversion, the advance is auto-allocated to the invoice and the PI is closed in the same action.</li>
            <li>A PI can never remain "Open" once its full value has been invoiced and paid.</li>
            <li>Any exception is listed in an accounts review queue with an audit entry.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
