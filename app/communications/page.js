"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, Kpi, PageHeader, Section } from "@/components/crm-ui";
import { communications, fmtDateTime } from "@/lib/crm-data";


export default function CommunicationsPage() {
  const columns = [
    { header: "Direction", cell: (c) => c.direction },
    { header: "Customer", cell: (c) => (<Link href="/customers/$id" params={{ id: c.customerId }} className="font-medium text-primary hover:underline">{c.customerName}</Link>) },
    { header: "Contact", cell: (c) => c.contact },
    { header: "Subject", cell: (c) => c.subject },
    { header: "Preview", cell: (c) => <span className="text-muted-foreground">{c.preview}</span> },
    { header: "By", cell: (c) => c.employee },
    { header: "Linked to", cell: (c) => c.linkedTo ?? "—" },
    { header: "When", cell: (c) => fmtDateTime(c.date) },
  ];
  const count = (ch) => communications.filter((c) => c.channel === ch).length;
  return (
    <>
      <PageHeader
        breadcrumb="CRM / Communications"
        title="Communication Centre"
        subtitle="Email, WhatsApp, calls, voice notes and notes in one log — always attached to a customer and, where relevant, to a lead, quotation or order."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total records" value={communications.length} />
        <Kpi label="Emails" value={count("Email")} />
        <Kpi label="WhatsApp" value={count("WhatsApp")} tone="success" />
        <Kpi label="Calls" value={count("Call")} tone="accent" />
        <Kpi label="Voice notes" value={count("Voice Note")} tone="warning" />
      </div>
      <div className="mt-5">
        <DataTable rows={communications} columns={columns} searchKeys={["customerName", "subject", "employee", "channel"]} />
      </div>
      <div className="mt-4">
        <Section title="Linkage rules">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Incoming messages are matched to customers by phone number, email domain or GSTIN reference.</li>
            <li>Unmatched conversations land in a review queue instead of being silently dropped.</li>
            <li>Full threads are retained — not just the latest message.</li>
            <li>All authorised users see team-wide communication in Customer 360.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
