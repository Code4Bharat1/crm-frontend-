"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getInvoices } from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { inr, inrShort, fmtDate } from "@/lib/crm-data";

export default function Page() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getInvoices()
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const taxableValue = invoices.reduce((s, i) => s + (i.subtotal || 0), 0);
  const cgstSgst = invoices.reduce((s, i) => s + (i.totalCgst || 0) + (i.totalSgst || 0), 0);
  const igst = invoices.reduce((s, i) => s + (i.totalIgst || 0), 0);

  return (
    <>
      <PageHeader
        breadcrumb="Finance / GST"
        title="GST"
        subtitle="Real invoice data in a GST-compatible structure — GSTIN, taxable value, CGST, SGST, IGST, invoice number and date — pulled live from Sales Invoices."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Invoices" value={invoices.length} />
        <Kpi label="Taxable value" value={inrShort(taxableValue)} />
        <Kpi label="CGST + SGST" value={inrShort(cgstSgst)} tone="accent" />
        <Kpi label="IGST" value={inrShort(igst)} tone="accent" />
      </div>
      <div className="mt-5">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <DataTable
            rows={invoices}
            columns={[
              {
                header: "Invoice",
                cell: (r) => (
                  <Link href={`/invoices/${r.invoiceNo}`} className="font-medium text-primary hover:underline">
                    {r.invoiceNo}
                  </Link>
                ),
              },
              { header: "Date", cell: (r) => fmtDate(r.date) },
              { header: "Customer", cell: (r) => r.customer?.name || "—" },
              { header: "GSTIN", cell: (r) => <span className="font-mono text-xs">{r.customer?.gstNumber || "—"}</span> },
              { header: "Type", cell: (r) => <StatusBadge value={r.isInterState ? "Inter-state (IGST)" : "Intra-state (CGST/SGST)"} /> },
              { header: "Taxable", cell: (r) => inr(r.subtotal) },
              { header: "CGST", cell: (r) => inr(r.totalCgst) },
              { header: "SGST", cell: (r) => inr(r.totalSgst) },
              { header: "IGST", cell: (r) => inr(r.totalIgst) },
              { header: "Total", cell: (r) => <span className="font-semibold">{inr(r.grandTotal)}</span> },
              { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
            ]}
            searchKeys={["invoiceNo", "customer.name", "customer.gstNumber"]}
            emptyLabel="No invoices yet."
          />
        )}
      </div>
    </>
  );
}
