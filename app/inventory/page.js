"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { products } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Products / Inventory" title="Inventory & Stock" subtitle="Stock by location with reserved, available and minimum threshold — alerts fire when a product falls below 10 units." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Stock value" value={inrShort(products.reduce((s, p) => s + p.price * p.stock, 0))} /><Kpi label="Stock alerts" value={products.filter((p) => p.stock < p.minStock).length} tone="danger" /><Kpi label="Out of stock" value={products.filter((p) => p.stock === 0).length} tone="warning" /><Kpi label="Stock locations" value={4} tone="accent" /></div>
      <div className="mt-5">
        <DataTable rows={products} columns={[
            { header: "Item code", cell: (r) => <span className="font-mono text-xs">{r.itemCode}</span> },
            { header: "Product", cell: (r) => r.name },
            { header: "Location", cell: (r) => r.location },
            { header: "On hand", cell: (r) => r.stock },
            { header: "Reserved", cell: (r) => Math.min(r.stock, 4) },
            { header: "Available", cell: (r) => Math.max(0, r.stock - 4) },
            { header: "Minimum", cell: (r) => r.minStock },
            { header: "Alert", cell: (r) => <StatusBadge value={r.stock < r.minStock ? "Below minimum" : "OK"} /> },
          ]} searchKeys={["itemCode", "name", "location"]} />
      </div>
    </>
  );
}
