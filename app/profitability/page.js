"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { projects, projectActualCost, projectMargin, projectProfit } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Projects / Profitability" title="Project Profitability" subtitle="Revenue minus material, supplier, employee effort, visit and expense costs — per project and consolidated." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Total revenue" value={inrShort(projects.reduce((s, p) => s + p.revenue, 0))} tone="success" /><Kpi label="Total cost" value={inrShort(projects.reduce((s, p) => s + projectActualCost(p), 0))} tone="warning" /><Kpi label="Gross profit" value={inrShort(projects.reduce((s, p) => s + projectProfit(p), 0))} tone="success" /><Kpi label="Loss-making projects" value={projects.filter((p) => projectProfit(p) < 0).length} tone="danger" /></div>
      <div className="mt-5">
        <DataTable rows={projects} columns={[
            { header: "Project", cell: (r) => (<Link href="/projects/$id" params={{ id: r.id }} className="font-semibold text-primary hover:underline">{r.name}</Link>) },
            { header: "Customer", cell: (r) => r.customerName },
            { header: "Revenue", cell: (r) => inr(r.revenue) },
            { header: "Estimated cost", cell: (r) => inr(r.estimatedCost) },
            { header: "Actual cost", cell: (r) => inr(projectActualCost(r)) },
            { header: "Gross profit", cell: (r) => <span className={projectProfit(r) > 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>{inr(projectProfit(r))}</span> },
            { header: "Margin", cell: (r) => `${projectMargin(r).toFixed(1)}%` },
            { header: "Suppliers", cell: (r) => `${r.suppliers.length}` },
            { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
          ]} searchKeys={["name", "customerName", "status"]} />
      </div>
    </>
  );
}
