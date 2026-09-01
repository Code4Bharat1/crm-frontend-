"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { projects, projectActualCost, projectMargin } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Projects" title="Projects" subtitle="Project execution with team, engineers, suppliers, materials, visits and expenses — everything costed back to the project." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Projects" value={projects.length} /><Kpi label="In progress" value={projects.filter((p) => p.status === "In Progress").length} tone="accent" /><Kpi label="Revenue" value={inrShort(projects.reduce((s, p) => s + p.revenue, 0))} tone="success" /><Kpi label="Actual cost" value={inrShort(projects.reduce((s, p) => s + projectActualCost(p), 0))} tone="warning" /></div>
      <div className="mt-5">
        <DataTable rows={projects} columns={[
            { header: "Project", cell: (r) => (<Link href="/projects/$id" params={{ id: r.id }} className="font-semibold text-primary hover:underline">{r.name}</Link>) },
            { header: "Customer", cell: (r) => r.customerName },
            { header: "Manager", cell: (r) => r.manager },
            { header: "Team", cell: (r) => `${r.team.length} members · ${r.suppliers.length} suppliers` },
            { header: "Period", cell: (r) => `${fmtDate(r.start)} – ${fmtDate(r.end)}` },
            { header: "Progress", cell: (r) => (<div className="w-28"><Progress value={r.progress} /><span className="text-xs text-muted-foreground">{r.progress}%</span></div>) },
            { header: "Revenue", cell: (r) => inr(r.revenue) },
            { header: "Margin", cell: (r) => <span className={projectMargin(r) < 15 ? "font-semibold text-destructive" : "font-semibold text-success"}>{projectMargin(r).toFixed(1)}%</span> },
            { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
          ]} searchKeys={["name", "customerName", "manager", "status"]} />
      </div>
    </>
  );
}
