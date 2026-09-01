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
      <PageHeader breadcrumb="People / HR" title="Employees & HR" subtitle="20 employees across management, accounts, sales, engineering, service, purchase and HR — with leave, overtime and expense approvals." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Employees" value={employees.length} /><Kpi label="Directors" value={employees.filter((e) => e.role === "Director").length} /><Kpi label="Field team" value={employees.filter((e) => ["Salesperson", "Engineer", "Service"].includes(e.role)).length} tone="accent" /><Kpi label="Expense claims pending" value={expenses.filter((e) => e.status === "Submitted").length} tone="warning" /></div>
      <div className="mt-5">
        <DataTable rows={employees} columns={[
            { header: "Employee", cell: (r) => (<div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted-foreground">{r.code}</p></div>) },
            { header: "Role", cell: (r) => <StatusBadge value={r.role} /> },
            { header: "Department", cell: (r) => r.department },
            { header: "Phone", cell: (r) => r.phone },
            { header: "Email", cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
            { header: "Present days", cell: (r) => r.presentDays },
            { header: "Leave", cell: (r) => r.leaveDays },
            { header: "Overtime", cell: (r) => `${r.otHours} hrs` },
          ]} searchKeys={["name", "role", "department"]} />
      </div>
    </>
  );
}
