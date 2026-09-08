"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { DataTable, Kpi, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inr, inrShort } from "@/lib/crm-data";
import { getProductSalesReport, getQuotationConversionReport } from "@/services/documentService";

// Reports that already exist as real, dedicated pages elsewhere -- no need to
// duplicate them here, just point at the real thing.
const LINKED_REPORTS = [
  { group: "Finance", name: "Customer Ledger", href: "/ledger", desc: "Billed / received / outstanding per customer" },
  { group: "Finance", name: "GST Register", href: "/gst", desc: "GSTIN, taxable value, CGST/SGST/IGST per invoice" },
  { group: "Finance", name: "Bank Reconciliation", href: "/banking", desc: "Recorded receipts matched to invoices" },
  { group: "Salesperson-wise", name: "Sales Performance", href: "/sales-performance", desc: "Targets vs achieved, per salesperson" },
  { group: "Project", name: "Project Profitability", href: "/profitability", desc: "Revenue, cost, margin per project" },
  { group: "Service", name: "Service Requests", href: "/service", desc: "Open tickets, warranty status, engineer load" },
];

export default function ReportsPage() {
  const [productRows, setProductRows] = useState([]);
  const [quotationData, setQuotationData] = useState({ rows: [], summary: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getProductSalesReport(), getQuotationConversionReport()])
      .then(([products, quotations]) => {
        setProductRows(Array.isArray(products) ? products : []);
        setQuotationData(quotations || { rows: [], summary: [] });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalQuotedValue = productRows.reduce((s, r) => s + (r.quotedValue || 0), 0);
  const totalOrderedValue = productRows.reduce((s, r) => s + (r.orderedValue || 0), 0);
  const overallConversion = quotationData.rows.length
    ? Math.round((quotationData.rows.filter((r) => r.converted).length / quotationData.rows.length) * 1000) / 10
    : 0;

  return (
    <>
      <PageHeader
        breadcrumb="Administration / Reports"
        title="Reports"
        subtitle="Product and quotation-conversion analytics computed live below; the other report categories already have real, dedicated pages — linked, not duplicated."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Products tracked" value={productRows.length} />
        <Kpi label="Quoted value" value={inrShort(totalQuotedValue)} />
        <Kpi label="Ordered value" value={inrShort(totalOrderedValue)} tone="success" />
        <Kpi label="Quotation → order rate" value={`${overallConversion}%`} tone="accent" />
      </div>

      {loading ? (
        <div className="mt-6 flex h-40 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      ) : error ? (
        <p className="mt-5 text-sm text-destructive">{error}</p>
      ) : (
        <Tabs defaultValue="products" className="mt-5">
          <TabsList>
            <TabsTrigger value="products">Product-wise</TabsTrigger>
            <TabsTrigger value="quotations">Quotation Conversion</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4">
            <DataTable
              rows={productRows}
              columns={[
                { header: "Product", cell: (r) => <span className="font-medium">{r.name}</span> },
                { header: "Quoted qty", cell: (r) => r.quotedQty },
                { header: "Quoted value", cell: (r) => inr(r.quotedValue) },
                { header: "Ordered qty", cell: (r) => r.orderedQty },
                { header: "Ordered value", cell: (r) => inr(r.orderedValue) },
                { header: "Invoiced qty", cell: (r) => r.invoicedQty },
                { header: "Invoiced value", cell: (r) => inr(r.invoicedValue) },
                {
                  header: "Conversion",
                  cell: (r) => (
                    <span className={r.conversionRate >= 50 ? "font-semibold text-success" : "text-muted-foreground"}>
                      {r.conversionRate}%
                    </span>
                  ),
                },
              ]}
              searchKeys={["name"]}
              emptyLabel="No quotation/order/invoice line items yet."
            />
          </TabsContent>

          <TabsContent value="quotations" className="mt-4 space-y-4">
            <Section title="By salesperson">
              <DataTable
                rows={quotationData.summary}
                columns={[
                  { header: "Salesperson", cell: (r) => <span className="font-medium">{r.salesperson}</span> },
                  { header: "Quotations", cell: (r) => r.quotations },
                  { header: "Converted", cell: (r) => r.converted },
                  { header: "Conversion rate", cell: (r) => `${r.conversionRate}%` },
                  { header: "Quoted value", cell: (r) => inr(r.quotedValue) },
                  { header: "Converted value", cell: (r) => <span className="font-semibold text-success">{inr(r.convertedValue)}</span> },
                ]}
                searchKeys={["salesperson"]}
                emptyLabel="No quotations yet."
              />
            </Section>
            <Section title="Every quotation">
              <DataTable
                rows={quotationData.rows}
                columns={[
                  {
                    header: "Quotation",
                    cell: (r) => (
                      <Link href={`/quotations/${r.quotationNo}`} className="font-medium text-primary hover:underline">
                        {r.quotationNo}
                      </Link>
                    ),
                  },
                  { header: "Customer", cell: (r) => r.customerName },
                  { header: "Salesperson", cell: (r) => r.salesperson },
                  { header: "Value", cell: (r) => inr(r.grandTotal) },
                  { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
                  {
                    header: "Converted",
                    cell: (r) =>
                      r.converted ? (
                        <Link href={`/orders/${r.convertedToSalesOrder}`} className="text-primary hover:underline font-mono text-xs">
                          {r.convertedToSalesOrder}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">Not yet</span>
                      ),
                  },
                ]}
                searchKeys={["quotationNo", "customerName", "salesperson"]}
                emptyLabel="No quotations yet."
              />
            </Section>
          </TabsContent>
        </Tabs>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LINKED_REPORTS.map((r) => (
          <Link key={r.name} href={r.href} className="block">
            <div className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{r.group}</p>
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Button size="sm" variant="outline">Open</Button>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
