"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { employees, expenses } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="People / Attendance" title="Attendance & ESS Integration" subtitle="Attendance, leave, overtime, expenses, approvals and payslips are pulled from the existing ESS system through its API." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="API status" value="Configuration required" tone="warning" /><Kpi label="Last synchronisation" value="Not synced" /><Kpi label="Records synchronised" value={0} /><Kpi label="Failed records" value={0} tone="danger" /></div>
      <div className="mt-4"><NotBuiltNotice>ESS attendance API endpoint is reachable but the API key and employee-code mapping are not configured, so no records have been synchronised.</NotBuiltNotice></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Attendance summary (manual entry)" className="lg:col-span-2">
          <ul className="space-y-2 text-sm">
            {employees.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-md border border-border p-2.5">
                <span>{e.name} <span className="text-xs text-muted-foreground">· {e.role}</span></span>
                <span className="text-muted-foreground">{e.presentDays} present · {e.leaveDays} leave · {e.otHours} hrs OT</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Sync configuration">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Endpoint: https://ess.vendor.example/api/v2/attendance</p>
            <p>Auth: API key (encrypted secret, not configured)</p>
            <p>Mapping: ESS employee code → CONTECH employee code</p>
            <Button variant="outline" className="mt-2 w-full">Run manual sync</Button>
            <Button variant="outline" className="w-full">Test connection</Button>
          </div>
        </Section>
      </div><div className="mt-5">
        <DataTable rows={expenses} columns={[
            { header: "Claim", cell: (r) => r.id },
            { header: "Employee", cell: (r) => r.employee },
            { header: "Date", cell: (r) => fmtDate(r.date) },
            { header: "Category", cell: (r) => r.category },
            { header: "Amount", cell: (r) => inr(r.amount) },
            { header: "Project", cell: (r) => r.projectId ?? "—" },
            { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
          ]} searchKeys={["employee", "category", "status"]} />
      </div>
    </>
  );
}
