"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getCustomerLedger } from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { inr, inrShort, fmtDate } from "@/lib/crm-data";

export default function Page() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCustomerLedger()
      .then((data) => setLedger(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalOutstanding = ledger.reduce((s, c) => s + (c.outstanding || 0), 0);
  const totalReceived = ledger.reduce((s, c) => s + (c.received || 0), 0);
  const creditCustomers = ledger.filter((c) => {
    const days = parseInt(c.paymentTerms, 10);
    return !Number.isNaN(days) && days >= 45;
  }).length;

  return (
    <>
      <PageHeader
        breadcrumb="Finance / Customer Ledger"
        title="Customer Ledger"
        subtitle="Billed, received and outstanding per customer, computed live from real invoices and recorded payments."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Customers" value={ledger.length} />
        <Kpi label="Total outstanding" value={inrShort(totalOutstanding)} tone="danger" />
        <Kpi label="Collected" value={inrShort(totalReceived)} tone="success" />
        <Kpi label="45+ day credit terms" value={creditCustomers} tone="warning" />
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
            rows={ledger}
            columns={[
              {
                header: "Customer",
                cell: (r) => (
                  <Link href={`/customers/${r.id || r._id}`} className="font-medium text-primary hover:underline">
                    {r.name}
                  </Link>
                ),
              },
              { header: "GSTIN", cell: (r) => <span className="font-mono text-xs">{r.gstNumber || "—"}</span> },
              { header: "Salesperson", cell: (r) => r.salesPerson || "—" },
              { header: "Invoices", cell: (r) => r.invoiceCount },
              { header: "Total billed", cell: (r) => inr(r.totalBilled) },
              { header: "Received", cell: (r) => inr(r.received) },
              {
                header: "Outstanding",
                cell: (r) => (
                  <span className={r.outstanding > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                    {inr(r.outstanding)}
                  </span>
                ),
              },
              { header: "Payment terms", cell: (r) => r.paymentTerms || "—" },
              { header: "Last invoice", cell: (r) => (r.lastInvoiceDate ? fmtDate(r.lastInvoiceDate) : "—") },
              { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
            ]}
            searchKeys={["name", "gstNumber", "salesPerson", "status"]}
            emptyLabel="No customers yet."
          />
        )}
      </div>
    </>
  );
}
