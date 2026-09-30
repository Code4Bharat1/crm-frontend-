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

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
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
        <Tabs defaultValue="products" className="mt-4 sm:mt-5">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <TabsTrigger value="products">Product-wise</TabsTrigger>
            <TabsTrigger value="quotations">Quotation Conversion</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-3 sm:mt-4">
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
              mobileCard={(r) => (
                <div className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-xs text-foreground leading-snug flex-1">
                      {r.name}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold shrink-0 ${
                      r.conversionRate >= 100 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" 
                        : r.conversionRate >= 50 
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {r.conversionRate}% Conv
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-border/50 text-[11px]">
                    <div className="bg-muted/40 rounded p-1.5 border border-border/40">
                      <p className="text-[9px] font-semibold uppercase text-muted-foreground">Quoted</p>
                      <p className="font-bold text-foreground mt-0.5 text-xs">{r.quotedQty} pcs</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{inrShort(r.quotedValue)}</p>
                    </div>
                    <div className="bg-muted/40 rounded p-1.5 border border-border/40">
                      <p className="text-[9px] font-semibold uppercase text-muted-foreground">Ordered</p>
                      <p className="font-bold text-foreground mt-0.5 text-xs">{r.orderedQty} pcs</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{inrShort(r.orderedValue)}</p>
                    </div>
                    <div className="bg-muted/40 rounded p-1.5 border border-border/40">
                      <p className="text-[9px] font-semibold uppercase text-muted-foreground">Invoiced</p>
                      <p className="font-bold text-foreground mt-0.5 text-xs">{r.invoicedQty} pcs</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{inrShort(r.invoicedValue)}</p>
                    </div>
                  </div>
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="quotations" className="mt-3 sm:mt-4 space-y-4">
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
                mobileCard={(r) => (
                  <div className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground">{r.salesperson}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                        {r.conversionRate}% Rate
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/50 text-[11px]">
                      <div>
                        <span className="text-muted-foreground text-[10px]">Quotes / Converted</span>
                        <p className="font-semibold text-foreground text-xs">{r.quotations} / <span className="text-emerald-600 dark:text-emerald-400 font-bold">{r.converted}</span></p>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground text-[10px]">Quoted / Converted</span>
                        <p className="font-semibold text-foreground text-xs">{inrShort(r.quotedValue)} / <span className="text-emerald-600 dark:text-emerald-400 font-bold">{inrShort(r.convertedValue)}</span></p>
                      </div>
                    </div>
                  </div>
                )}
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
                mobileCard={(r) => (
                  <div className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/quotations/${r.quotationNo}`} className="font-bold text-xs text-primary hover:underline">
                        {r.quotationNo}
                      </Link>
                      <StatusBadge value={r.status} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{r.customerName}</span>
                      <span className="font-bold text-foreground">{inr(r.grandTotal)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <span>Rep: {r.salesperson}</span>
                      <span>
                        {r.converted ? (
                          <Link href={`/orders/${r.convertedToSalesOrder}`} className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                            SO: {r.convertedToSalesOrder}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Not converted</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              />
            </Section>
          </TabsContent>
        </Tabs>
      )}

      <div className="mt-4 sm:mt-5 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKED_REPORTS.map((r) => (
          <Link key={r.name} href={r.href} className="block">
            <div className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{r.group}</p>
                <p className="font-semibold text-sm">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs">Open</Button>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
