"use client";

import Link from "next/link";
import { MapPin, CheckCircle2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { DataTable, Kpi, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { fmtDate, kpis, visits } from "@/lib/crm-data";


export default function VisitsPage() {
  const columns = [
    { header: "Visit", cell: (v) => v.id },
    { header: "Customer", cell: (v) => (<Link href="/customers/$id" params={{ id: v.customerId }} className="font-medium text-primary hover:underline">{v.customerName}</Link>) },
    { header: "Employee", cell: (v) => v.employee },
    { header: "Date", cell: (v) => fmtDate(v.date) },
    { header: "In / Out", cell: (v) => `${v.checkIn} – ${v.checkOut}` },
    { header: "Purpose", cell: (v) => v.purpose },
    { header: "GPS", cell: (v) => <StatusBadge value={v.gpsVerified ? "Verified" : "Not verified"} /> },
    { header: "Outcome", cell: (v) => <span className="text-muted-foreground">{v.outcome}</span> },
    { header: "Follow-up", cell: (v) => fmtDate(v.followUpDate) },
  ];
  const verified = visits.filter((v) => v.gpsVerified).length;
  return (
    <>
      <PageHeader
        breadcrumb="CRM / Visits"
        title="Visit Management"
        subtitle="Mobile-first check-in for field sales and engineers, with site verification against the customer's registered location."
        actions={<Button className="gap-2 bg-accent font-bold text-accent-foreground hover:bg-accent/90"><MapPin className="size-4" /> GPS check-in</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Visits (30 days)" value={kpis.visitsThisMonth} icon={MapPin} />
        <Kpi label="GPS verified" value={`${Math.round((verified / visits.length) * 100)}%`} tone="success" icon={CheckCircle2} />
        <Kpi label="Total visit records" value={visits.length} />
        <Kpi label="Visits pending follow-up" value={visits.filter((v) => v.followUpDate.getTime() > Date.now()).length} tone="warning" />
      </div>
      <div className="mt-5">
        <DataTable rows={visits} columns={columns} searchKeys={["id", "customerName", "employee", "purpose"]} />
      </div>
      <div className="mt-4">
        <Section title="Site verification logic" description="How the system decides whether the employee actually reached the customer">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Check-in captures device GPS and compares it with the customer&apos;s registered site coordinates.</li>
            <li>Distance beyond the configured radius is flagged as &quot;Not verified&quot; for manager review.</li>
            <li>Check-out duration is used for effort costing against projects and service cases.</li>
            <li>Every visit can be linked to a lead, project or service request.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
