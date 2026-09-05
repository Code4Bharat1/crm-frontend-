"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getPaymentsLedger } from "@/services/documentService";
import { DataTable, Kpi, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { inr, inrShort, fmtDate } from "@/lib/crm-data";

export default function Page() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPaymentsLedger()
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const byMode = payments.reduce((acc, p) => {
    acc[p.mode] = (acc[p.mode] || 0) + 1;
    return acc;
  }, {});
  const topMode = Object.entries(byMode).sort((a, b) => b[1] - a[1])[0];

  return (
    <>
      <PageHeader
        breadcrumb="Finance / Banking"
        title="Bank Reconciliation"
        subtitle="Every recorded receipt, already tied to its invoice and customer. Live bank-feed import isn't connected yet, so this reflects payments recorded manually against invoices."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Recorded receipts" value={payments.length} />
        <Kpi label="Total received" value={inrShort(totalReceived)} tone="success" />
        <Kpi label="Most-used mode" value={topMode ? `${topMode[0]} (${topMode[1]})` : "—"} tone="accent" />
        <Kpi label="Unique invoices" value={new Set(payments.map((p) => p.invoiceNo)).size} />
      </div>
      <div className="mt-4">
        <NotBuiltNotice>
          Live bank statement / API import is not connected — see the options discussed for connecting one (virtual accounts, Account
          Aggregator, or a direct bank API) when you're ready to wire it up. Until then, every row below is a real payment recorded
          against a real invoice, not a simulated bank feed.
        </NotBuiltNotice>
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
            rows={payments}
            columns={[
              { header: "Date", cell: (r) => fmtDate(r.date) },
              {
                header: "Invoice",
                cell: (r) => (
                  <Link href={`/invoices/${r.invoiceNo}`} className="font-medium text-primary hover:underline">
                    {r.invoiceNo}
                  </Link>
                ),
              },
              { header: "Customer", cell: (r) => r.customerName },
              { header: "Amount", cell: (r) => <span className="font-semibold text-success">{inr(r.amount)}</span> },
              { header: "Mode", cell: (r) => <StatusBadge value={r.mode} /> },
              { header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.reference || "—"}</span> },
              { header: "Recorded by", cell: (r) => r.recordedBy || "—" },
              { header: "Notes", cell: (r) => r.notes || "—" },
            ]}
            searchKeys={["invoiceNo", "customerName", "reference", "mode"]}
            emptyLabel="No payments recorded yet."
          />
        )}
      </div>
      <div className="mt-4">
        <Section title="Controls on banking operations">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Every receipt here comes from a payment explicitly recorded against a real invoice — nothing is auto-guessed.</li>
            <li>Recording a payment updates that invoice's balance and status immediately (see Sales Invoices).</li>
            <li>Connecting a live bank feed (virtual accounts, Account Aggregator, or direct bank API) would add unmatched incoming
              credits here for review — none of those are wired up yet.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
