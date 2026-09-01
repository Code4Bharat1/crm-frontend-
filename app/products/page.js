"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { products, TOTAL_PRODUCT_MASTER_COUNT } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Products / Product Master" title="Product Master" subtitle="The live master holds 2,158 products imported from the existing system — item code, brand, price, tax, stock, supplier, serial tracking and warranty." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Products in master" value={TOTAL_PRODUCT_MASTER_COUNT} sub="Imported, not re-created" /><Kpi label="Shown in prototype" value={products.length} /><Kpi label="Serial tracked" value={products.filter((p) => p.serialTracked).length} tone="accent" /><Kpi label="Below minimum stock" value={products.filter((p) => p.stock < p.minStock).length} tone="danger" /></div>
      <div className="mt-5">
        <DataTable rows={products} columns={[
            { header: "Item code", cell: (r) => <span className="font-mono text-xs font-semibold">{r.itemCode}</span> },
            { header: "Product", cell: (r) => r.name },
            { header: "Category", cell: (r) => r.category },
            { header: "Brand", cell: (r) => r.brand },
            { header: "Price", cell: (r) => inr(r.price) },
            { header: "GST", cell: (r) => `${r.taxRate}%` },
            { header: "Stock", cell: (r) => <span className={r.stock < r.minStock ? "font-semibold text-destructive" : ""}>{r.stock}</span> },
            { header: "Supplier", cell: (r) => r.supplier },
            { header: "Warranty", cell: (r) => `${r.warrantyMonths} months` },
            { header: "Serial", cell: (r) => <StatusBadge value={r.serialTracked ? "Tracked" : "Not tracked"} /> },
          ]} searchKeys={["itemCode", "name", "category", "brand", "supplier"]} />
      </div>
      <div className="mt-4">
        <Section title="Product analytics" description="Example: how many customers were quoted an isolator?">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Customers quoted, number of quotations and quoted value per product.</li>
            <li>Orders received, conversion rate and realised sales value.</li>
            <li>Customer-wise view of products quoted vs purchased, with service history.</li>
            <li>Serial-number drill-down from any product line.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
