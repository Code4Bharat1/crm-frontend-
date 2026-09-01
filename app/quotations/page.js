"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/services/api";

import { ChainStrip, DataTable, Kpi, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { inr, inrShort, fmtDate } from "@/lib/crm-data";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/sales/documents?type=Quotation').then(data => {
      setQuotations(data);
      setLoading(false);
    });
  }, []);

  const totalValue = quotations.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

  const columns = [
    { header: "Quotation", cell: (q) => <span className="font-semibold">{q.id}</span> },
    { header: "Customer", cell: (q) => (<Link href={`/customers/${q.customerId || "CUST-1001"}`} className="font-medium text-primary hover:underline">{q.customerName}</Link>) },
    { header: "Salesperson", cell: (q) => q.salesperson },
    { header: "Items", cell: (q) => `${q.items?.length || 0} line items` },
    { header: "Date", cell: (q) => fmtDate(q.date) },
    { header: "Value", cell: (q) => <span className="font-semibold">{inr(q.totalAmount)}</span> },
    { header: "Status", cell: (q) => <StatusBadge value={q.status} /> },
  ];

  return (
    <>
      <PageHeader breadcrumb="Sales / Quotations" title="Quotations" subtitle="Product-based quotations fetched from MongoDB API" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total quotations" value={quotations.length} />
        <Kpi label="Total value" value={inrShort(totalValue)} tone="warning" />
      </div>
      <div className="mt-5">
        {loading ? <p className="text-muted-foreground">Loading quotations from backend...</p> : (
          <DataTable
            rows={quotations}
            columns={columns}
            searchKeys={["id", "customerName", "salesperson", "status"]}
          />
        )}
      </div>
      {!loading && quotations.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Section title="Sample quotation lines" description={quotations[0].id + " — " + quotations[0].customerName}>
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-left text-xs uppercase text-muted-foreground"><th className="p-2">Description</th><th className="p-2">Qty</th><th className="p-2">Rate</th><th className="p-2">Amount</th></tr></thead>
              <tbody>
                {quotations[0].items.map((it, idx) => (
                  <tr key={idx} className="border-t border-border"><td className="p-2">{it.name}</td><td className="p-2">{it.qty}</td><td className="p-2">{inr(it.rate)}</td><td className="p-2">{inr(it.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="Quotation status timeline">
            <ChainStrip steps={[{ label: "Draft", state: "done" }, { label: "Sent", state: "done" }, { label: "Viewed", state: "done" }, { label: "Negotiation", state: "current" }, { label: "Accepted", state: "pending" }, { label: "Proforma / Sales Order", state: "pending" }]} />
          </Section>
        </div>
      )}
    </>
  );
}
