"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { auditLog } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Administration / Audit Logs" title="Audit Logs" subtitle="Who did what, when and from where — for every important business and financial action." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Entries" value={auditLog.length} /><Kpi label="Critical" value={auditLog.filter((a) => a.severity === "Critical").length} tone="danger" /><Kpi label="Warnings" value={auditLog.filter((a) => a.severity === "Warning").length} tone="warning" /><Kpi label="Retention" value="7 years" /></div>
      <div className="mt-5">
        <DataTable
          rows={auditLog}
          columns={[
            { header: "When", cell: (r) => fmtDateTime(r.at) },
            { header: "User", cell: (r) => <span className="font-semibold">{r.user}</span> },
            { header: "Action", cell: (r) => `${r.action} ${r.entity}` },
            { header: "IP address", cell: (r) => <span className="font-mono text-xs">{r.ip}</span> },
            { header: "Severity", cell: (r) => <StatusBadge value={r.severity} /> },
          ]}
          searchKeys={["user", "action", "entity"]}
        />
      </div>
    </>
  );
}
