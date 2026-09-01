"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { suppliers } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Purchase / Suppliers" title="Suppliers" subtitle="Supplier master with purchase value, outstanding, category and rating — linked to products, receipts and projects supplied." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Suppliers" value={suppliers.length} /><Kpi label="Purchase value" value={inrShort(suppliers.reduce((s, x) => s + x.purchaseValue, 0))} /><Kpi label="Payables" value={inrShort(suppliers.reduce((s, x) => s + x.outstanding, 0))} tone="danger" /><Kpi label="Avg rating" value={(suppliers.reduce((s, x) => s + x.rating, 0) / suppliers.length).toFixed(1)} tone="success" /></div>
      <div className="mt-5">
        <DataTable rows={suppliers} columns={[
            { header: "Supplier", cell: (r) => <span className="font-semibold">{r.name}</span> },
            { header: "Category", cell: (r) => r.category },
            { header: "City", cell: (r) => r.city },
            { header: "Contact", cell: (r) => `${r.contact} · ${r.phone}` },
            { header: "Purchase value", cell: (r) => inr(r.purchaseValue) },
            { header: "Outstanding", cell: (r) => inr(r.outstanding) },
            { header: "Rating", cell: (r) => `${r.rating} / 5` },
          ]} searchKeys={["name", "category", "city"]} />
      </div>
    </>
  );
}
