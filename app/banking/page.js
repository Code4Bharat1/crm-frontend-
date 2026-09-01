"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ChainStrip, DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { bankTxns } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Finance / Banking" title="Bank Reconciliation" subtitle="Incoming credits are matched to customers and invoices with a confidence score. Accounts reviews and confirms — uncertain matches are never auto-finalised." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Credits fetched" value={bankTxns.length} /><Kpi label="Suggested matches" value={bankTxns.filter((b) => b.status === "Suggested").length} tone="success" /><Kpi label="Needs review" value={bankTxns.filter((b) => b.status === "Needs Review").length} tone="warning" /><Kpi label="Unmatched" value={bankTxns.filter((b) => b.status === "Unmatched").length} tone="danger" /></div>
      <div className="mt-4"><NotBuiltNotice>Bank API is not connected. Statement upload is available fallback; corporate API onboarding for HDFC and ICICI is pending.</NotBuiltNotice></div><div className="mt-5">
        <DataTable rows={bankTxns} columns={[
            { header: "Txn", cell: (r) => <span className="font-mono text-xs">{r.id}</span> },
            { header: "Date", cell: (r) => fmtDate(r.date) },
            { header: "Sender name in bank", cell: (r) => <span className="font-medium">{r.senderName}</span> },
            { header: "Amount", cell: (r) => <span className="font-semibold">{inr(r.amount)}</span> },
            { header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
            { header: "Bank account", cell: (r) => r.bankAccount },
            { header: "Suggested customer", cell: (r) => r.suggestedCustomer ?? "—" },
            { header: "Suggested invoice", cell: (r) => r.suggestedInvoice ?? "—" },
            { header: "Confidence", cell: (r) => `${Math.round(r.confidence * 100)}%` },
            { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
            { header: "", cell: (r) => <div className="flex gap-1"><Button size="sm" variant="outline">Review</Button><Button size="sm" className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">Reconcile</Button></div> },
          ]} searchKeys={["id", "senderName", "reference", "status"]} />
      </div>
      <div className="mt-4">
        <Section title="Controls on banking operations">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Sender name mismatch (e.g. "SHAKTI ENGG" vs registered name) is supported through alias mapping.</li>
            <li>Only Accounts Manager and Director roles can finalise a reconciliation.</li>
            <li>Every match, edit and confirmation is written to the audit log with user, time and IP.</li>
            <li>Credentials are encrypted; no uncertain match is ever auto-posted.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
