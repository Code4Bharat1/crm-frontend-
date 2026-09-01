"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { salesByPerson, salespeople, visits, leads, quotations } from "@/lib/crm-data";

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="People / Sales Performance" title="Sales Performance" subtitle="Target vs achievement, leads, visits, quotations, conversion and revenue for every salesperson." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Salespeople" value={salespeople.length} /><Kpi label="Total target" value={inrShort(salespeople.reduce((s, p) => s + (p.target ?? 0), 0))} /><Kpi label="Total achieved" value={inrShort(salespeople.reduce((s, p) => s + (p.achieved ?? 0), 0))} tone="success" /><Kpi label="Above target" value={salespeople.filter((p) => (p.achieved ?? 0) >= (p.target ?? 0)).length} tone="accent" /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {salespeople.map((s) => {
          const pct = Math.round(((s.achieved ?? 0) / (s.target ?? 1)) * 100);
          return (
            <Section key={s.id} title={s.name} description={`${s.code} · ${s.department}`}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="Target" value={inrShort(s.target ?? 0)} />
                <Metric label="Achieved" value={inrShort(s.achieved ?? 0)} tone={pct >= 100 ? "good" : "bad"} />
                <Metric label="Leads" value={String(leads.filter((l) => l.salesperson === s.name).length)} />
                <Metric label="Visits" value={String(visits.filter((v) => v.employee === s.name).length)} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={Math.min(pct, 100)} />
                <span className="w-14 text-right text-sm font-bold">{pct}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {quotations.filter((q) => q.salesperson === s.name).length} quotations · variable pay eligible at 85% achievement
              </p>
            </Section>
          );
        })}
      </div>
      <div className="mt-4">
        <Section title="Team comparison">
          <ul className="space-y-2 text-sm">
            {salesByPerson.map((s) => (
              <li key={s.name} className="flex items-center justify-between rounded-md border border-border p-2.5">
                <span className="font-semibold">{s.name}</span>
                <span className="text-muted-foreground">Target ₹{s.target.toFixed(0)}L · Achieved ₹{s.achieved.toFixed(0)}L · {s.leads} leads · {s.visits} visits</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
