"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { notifications } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Administration / Notifications" title="Notification Centre" subtitle="Appointments, pending visits, overdue follow-ups, payment dues, stock alerts, service dues, warranty expiry and approvals — nobody needs to call around to find out what is pending." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Unread" value={notifications.filter((n) => !n.read).length} tone="accent" /><Kpi label="Critical" value={notifications.filter((n) => n.severity === "danger").length} tone="danger" /><Kpi label="Warnings" value={notifications.filter((n) => n.severity === "warning").length} tone="warning" /><Kpi label="Total" value={notifications.length} /></div>
      <div className="mt-5 space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className="panel flex flex-wrap items-start justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2"><StatusBadge value={n.type} /><span className="text-sm font-semibold">{n.title}</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{n.detail}</p>
            </div>
            <span className="text-xs text-muted-foreground">{fmtDateTime(n.at)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
