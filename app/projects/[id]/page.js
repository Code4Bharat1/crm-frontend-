"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { expenses, projects, projectActualCost, projectMargin, projectProfit, visits } from "@/lib/crm-data";


export default function Page() {
  const { project: p } = Route.useLoaderData();
  const cost = projectActualCost(p);
  const pVisits = visits.filter((v) => v.projectId === p.id);
  const pExp = expenses.filter((e) => e.projectId === p.id);
  return (
    <>
      <PageHeader
        breadcrumb={`Projects / ${p.id}`}
        title={p.name}
        subtitle={`${p.customerName} · ${fmtDate(p.start)} – ${fmtDate(p.end)} · Manager ${p.manager}`}
        actions={<Button variant="outline" asChild><Link href="/customers/$id" params={{ id: p.customerId }}>Customer 360</Link></Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Project revenue" value={inrShort(p.revenue)} tone="success" />
        <Kpi label="Estimated cost" value={inrShort(p.estimatedCost)} />
        <Kpi label="Actual cost" value={inrShort(cost)} tone="warning" />
        <Kpi label="Gross profit" value={inrShort(projectProfit(p))} tone={projectProfit(p) > 0 ? "success" : "danger"} sub={`Margin ${projectMargin(p).toFixed(1)}%`} />
      </div>
      <Tabs defaultValue="overview" className="mt-5">
        <TabsList className="flex-wrap">
          {["overview", "team", "suppliers", "visits", "expenses", "profitability"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Section title="Project overview">
            <KeyValue items={[
              { k: "Customer", v: p.customerName },
              { k: "Status", v: <StatusBadge value={p.status} /> },
              { k: "Progress", v: `${p.progress}%` },
              { k: "Project manager", v: p.manager },
              { k: "Engineers", v: p.team.join(", ") },
              { k: "Suppliers involved", v: `${p.suppliers.length}` },
            ]} />
            <div className="mt-4"><Progress value={p.progress} /></div>
          </Section>
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <Section title="Team & effort"><ul className="space-y-2 text-sm">{p.team.map((t, i) => (<li key={t + i} className="flex justify-between rounded-md border border-border p-2.5"><span>{t}</span><span className="text-muted-foreground">{8 + i * 6} engineer-days booked</span></li>))}</ul></Section>
        </TabsContent>
        <TabsContent value="suppliers" className="mt-4">
          <Section title="Suppliers on this project"><ul className="space-y-2 text-sm">{p.suppliers.map((s, i) => (<li key={s + i} className="flex justify-between rounded-md border border-border p-2.5"><span>{s}</span><span className="text-muted-foreground">{inr(40000 + i * 25000)}</span></li>))}</ul></Section>
        </TabsContent>
        <TabsContent value="visits" className="mt-4">
          <Section title="Site visits">{pVisits.length ? (<ul className="space-y-2 text-sm">{pVisits.map((v) => (<li key={v.id} className="rounded-md border border-border p-2.5"><p className="font-semibold">{v.employee} · {fmtDate(v.date)}</p><p className="text-xs text-muted-foreground">{v.purpose} — {v.outcome}</p></li>))}</ul>) : <p className="text-sm text-muted-foreground">No visits booked to this project yet.</p>}</Section>
        </TabsContent>
        <TabsContent value="expenses" className="mt-4">
          <Section title="Expenses charged to project">{pExp.length ? (<ul className="space-y-2 text-sm">{pExp.map((e) => (<li key={e.id} className="flex justify-between rounded-md border border-border p-2.5"><span>{e.category} · {e.employee}</span><span className="font-semibold">{inr(e.amount)}</span></li>))}</ul>) : <p className="text-sm text-muted-foreground">No expenses charged yet.</p>}</Section>
        </TabsContent>
        <TabsContent value="profitability" className="mt-4">
          <Section title="Cost breakdown" description="Project revenue − project costs = project profit">
            <ul className="space-y-2">
              {p.costs.map((c) => (
                <li key={c.head} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                  <span>{c.head}</span>
                  <span className="flex items-center gap-3"><span className="w-40"><Progress value={(c.amount / cost) * 100} /></span><span className="w-24 text-right font-semibold">{inr(c.amount)}</span></span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <Metric label="Revenue" value={inr(p.revenue)} />
              <Metric label="Estimated cost" value={inr(p.estimatedCost)} />
              <Metric label="Actual cost" value={inr(cost)} tone="bad" />
              <Metric label="Gross profit" value={inr(projectProfit(p))} tone={projectProfit(p) > 0 ? "good" : "bad"} />
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </>
  );
}
