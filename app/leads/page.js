"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/services/api";

import { DataTable, Kpi, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LEAD_STAGES, fmtDate, inrShort, kpis } from "@/lib/crm-data";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState({});
  const [drag, setDrag] = useState(null);

  useEffect(() => {
    fetchApi('/sales/leads').then(data => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  const stageOf = (l) => stages[l.id] ?? l.stage;

  const columns = [
    { header: "Lead", cell: (l) => (<div><p className="font-semibold">{l.id}</p><p className="text-xs text-muted-foreground">{l.source || "No subject"}</p></div>) },
    { header: "Customer", cell: (l) => (<Link href={`/customers/${l.customerId || "CUST-1001"}`} className="font-medium text-primary hover:underline">{l.customerName}</Link>) },
    { header: "Date", cell: (l) => fmtDate(l.date) },
    { header: "Stage", cell: (l) => <StatusBadge value={stageOf(l)} /> },
    { header: "Priority", cell: (l) => <StatusBadge value={l.priority} /> },
    { header: "Value", cell: (l) => <span className="font-semibold">{inrShort(l.value)}</span> },
    { header: "Message/Notes", cell: (l) => <div className="max-w-[250px] truncate text-xs" title={l.notes}>{l.notes || "-"}</div> },
  ];

  return (
    <>
      <PageHeader
        breadcrumb="CRM / Leads"
        title="Lead Management"
        subtitle="Every lead is bound to a customer record. Data loaded from MongoDB backend."
        actions={<Button className="bg-accent font-bold text-accent-foreground hover:bg-accent/90" onClick={() => window.location.href = '/ai-processing'}>New lead via AI</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total leads" value={leads.length} icon={UserPlus} />
        <Kpi label="New" value={leads.filter(l => stageOf(l) === 'New').length} tone="accent" />
        <Kpi label="Hot" value={leads.filter(l => stageOf(l) === 'Hot').length} tone="danger" icon={Flame} />
        <Kpi label="Potential" value={leads.filter(l => stageOf(l) === 'Potential').length} />
        <Kpi label="Won" value={leads.filter(l => stageOf(l) === 'Won').length} tone="success" />
      </div>

      <Tabs defaultValue="pipeline" className="mt-5">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline (Kanban)</TabsTrigger>
          <TabsTrigger value="list">All leads</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <div className="flex gap-3 overflow-x-auto pb-3">
            {LEAD_STAGES.map((stage) => {
              const items = leads.filter((l) => stageOf(l) === stage);
              return (
                <div
                  key={stage}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (drag) {
                      setStages((s) => ({ ...s, [drag]: stage }));
                      toast.success(`Lead ${drag} moved to ${stage}`);
                      setDrag(null);
                    }
                  }}
                  className="min-h-[420px] w-72 shrink-0 rounded-lg border border-border bg-muted/50 p-2"
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-sm font-bold uppercase tracking-wide">{stage}</span>
                    <span className="rounded bg-card px-2 py-0.5 text-xs font-semibold">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((l) => {
                      return (
                        <article
                          key={l.id}
                          draggable
                          onDragStart={() => setDrag(l.id)}
                          className="cursor-grab rounded-md border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link href={`/customers/${l.customerId || "CUST-1001"}`} className="text-sm font-semibold leading-tight text-primary hover:underline">
                              {l.customerName}
                            </Link>
                            <StatusBadge value={l.priority} />
                          </div>
                          <p className="mt-2 font-display text-base font-bold">{inrShort(l.value)}</p>
                          <div className="mt-2 line-clamp-2 text-[11px] leading-tight text-muted-foreground">
                            {l.notes || "No additional message/notes."}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                            <p>{fmtDate(l.date)}</p>
                            <p>{l.salesperson} · {l.area}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {loading ? <p>Loading leads...</p> : <DataTable rows={leads} columns={columns} searchKeys={["id", "customerName", "salesperson", "stage", "priority"]} />}
        </TabsContent>
      </Tabs>
    </>
  );
}
