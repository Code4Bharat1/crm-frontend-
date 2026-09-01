"use client";

import Link from "next/link";
import { BellRing } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { DataTable, Kpi, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { fmtDate, followUps, kpis } from "@/lib/crm-data";


const now = Date.now();
const dayMs = 86400000;

export default function FollowUpsPage() {
  const columns = [
    { header: "Follow-up", cell: (f) => f.id },
    { header: "Customer", cell: (f) => (<Link href="/customers/$id" params={{ id: f.customerId }} className="font-medium text-primary hover:underline">{f.customerName}</Link>) },
    { header: "Type", cell: (f) => f.type },
    { header: "Generated from", cell: (f) => <StatusBadge value={f.source} /> },
    { header: "Owner", cell: (f) => f.owner },
    { header: "Due", cell: (f) => fmtDate(f.dueDate) },
    { header: "Priority", cell: (f) => <StatusBadge value={f.priority} /> },
    { header: "Status", cell: (f) => <StatusBadge value={f.dueDate.getTime() < now && f.status === "Pending" ? "Overdue" : f.status} /> },
    { header: "Note", cell: (f) => <span className="text-muted-foreground">{f.note}</span> },
  ];

  const overdue = followUps.filter((f) => f.status === "Pending" && f.dueDate.getTime() < now);
  const today = followUps.filter((f) => Math.abs(f.dueDate.getTime() - now) < dayMs);
  const upcoming = followUps.filter((f) => f.dueDate.getTime() > now + dayMs && f.status === "Pending");
  const completed = followUps.filter((f) => f.status === "Completed");

  return (
    <>
      <PageHeader
        breadcrumb="CRM / Follow-ups"
        title="Follow-up Engine"
        subtitle="Follow-ups are generated automatically from every business event and stay assigned until closed — absence or a missed call never loses them."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending" value={kpis.pendingFollowUps} icon={BellRing} />
        <Kpi label="Overdue" value={overdue.length} tone="danger" />
        <Kpi label="Due today" value={today.length} tone="accent" />
        <Kpi label="Completed" value={completed.length} tone="success" />
      </div>

      <Tabs defaultValue="overdue" className="mt-5">
        <TabsList>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="today">Due today ({today.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overdue" className="mt-4"><DataTable rows={overdue} columns={columns} /></TabsContent>
        <TabsContent value="today" className="mt-4"><DataTable rows={today} columns={columns} /></TabsContent>
        <TabsContent value="upcoming" className="mt-4"><DataTable rows={upcoming} columns={columns} /></TabsContent>
        <TabsContent value="completed" className="mt-4"><DataTable rows={completed} columns={columns} /></TabsContent>
      </Tabs>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Reminder rules" description="Configurable per document type">
          <ul className="space-y-3 text-sm">
            {[
              ["Proforma advance reminder", "Every 8 days until advance received"],
              ["Quotation follow-up", "3 days after sending, then weekly"],
              ["Invoice due reminder", "5 days before due date"],
              ["Overdue invoice escalation", "On due date, then every 8 days to accounts manager"],
              ["Customer revisit", "60 days after last visit"],
              ["Service follow-up", "7 days after job completion"],
            ].map(([rule, cadence]) => (
              <li key={rule} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="font-semibold">{rule}</p>
                  <p className="text-xs text-muted-foreground">{cadence}</p>
                </div>
                <Switch defaultChecked />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Delivery channels" description="Notification routing per rule">
          <ul className="space-y-3 text-sm">
            {[
              ["In-app notification centre", "Active in prototype"],
              ["Email reminder", "Requires email integration"],
              ["WhatsApp reminder", "Requires WhatsApp Business API"],
              ["Mobile push", "Available after mobile app / PWA rollout"],
            ].map(([ch, state]) => (
              <li key={ch} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="font-semibold">{ch}</p>
                  <p className="text-xs text-muted-foreground">{state}</p>
                </div>
                <StatusBadge value={String(state).includes("Requires") ? "Not connected" : "Connected"} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
