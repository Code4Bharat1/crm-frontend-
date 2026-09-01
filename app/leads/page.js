"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, UserPlus, Calendar } from "lucide-react";
import { fetchApi } from "@/services/api";

import { Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate, LEAD_STAGES } from "@/lib/crm-data";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/sales/leads').then(data => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

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
        <Kpi label="New" value={leads.filter(l => l.stage === 'New').length} tone="accent" />
        <Kpi label="Hot" value={leads.filter(l => l.stage === 'Hot').length} tone="danger" icon={Flame} />
        <Kpi label="Potential" value={leads.filter(l => l.stage === 'Potential').length} />
        <Kpi label="Won" value={leads.filter(l => l.stage === 'Won').length} tone="success" />
      </div>

      <Tabs defaultValue="all" className="mt-6">
        <div className="overflow-x-auto pb-2">
          <TabsList>
            <TabsTrigger value="all">All Leads</TabsTrigger>
            {LEAD_STAGES.map(stage => (
              <TabsTrigger key={stage} value={stage}>{stage}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        {["all", ...LEAD_STAGES].map((tab) => {
          const filteredLeads = tab === "all" ? leads : leads.filter((l) => l.stage === tab);
          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              {loading ? (
                <p>Loading leads...</p>
              ) : filteredLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads found in this stage.</p>
              ) : (
                <div className="rounded-md border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Lead Details</th>
                        <th className="px-4 py-3 font-semibold text-right">Activity & Owner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLeads.map((l) => {
                        const initials = (l.salesperson || "AI").split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        const firstName = (l.salesperson || "AI").split(' ')[0];
                        
                        return (
                          <tr key={l.id} className="transition-colors hover:bg-muted/30">
                            <td className="p-4 align-top">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link href={`/customers/${l.customerId || "CUST-1001"}`} className="text-sm font-semibold text-primary hover:underline">
                                    {l.customerName}
                                  </Link>
                                  <StatusBadge value={l.stage} />
                                  <StatusBadge value={l.priority} />
                                </div>
                                <p className="text-xs font-medium text-foreground">
                                  <span className="text-muted-foreground">{l.id}</span> · {l.source || "No subject"}
                                </p>
                                <p className="text-sm leading-relaxed text-foreground/90 max-w-3xl">
                                  {(() => {
                                    if (!l.notes) return "-";
                                    const match = l.notes.match(/Requirement:\s*([\s\S]*?)(?:\n\n|$)/i);
                                    return match ? match[1].trim() : l.notes;
                                  })()}
                                </p>
                              </div>
                            </td>
                            <td className="p-4 align-top text-right">
                              <div className="flex flex-col items-end gap-3">
                                <StatusBadge value={l.source === "Email Inquiry" ? "Pending" : "Active"} />
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Calendar className="size-3.5" />
                                  <span>{fmtDate(l.date)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground/80">{firstName}</span>
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                                    {initials}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </>
  );
}
