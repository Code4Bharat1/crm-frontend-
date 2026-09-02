"use client";

import Link from "next/link";
import {
  UserPlus, Flame, FileText, ClipboardList, Truck,
  IndianRupee, AlertTriangle, FolderKanban, BellRing,
  Wrench, Boxes, TrendingUp,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { ChainStrip, FilterBar, Kpi, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import {
  customerTimeline, customers, followUps, fmtDate, inrShort,
  invoices, kpis, leadsByArea, leadsBySource, monthlySales,
  productSales, projects, projectMargin, salesByPerson,
  serviceRequests, TOTAL_PRODUCT_MASTER_COUNT,
} from "@/lib/crm-data";
import { AttendanceWidget } from "@/components/AttendanceWidget";

const CHART_COLORS = ["oklch(var(--chart-1))", "oklch(var(--chart-2))", "oklch(var(--chart-3))", "oklch(var(--chart-4))", "oklch(var(--chart-5))"];

const tooltipStyle = {
  background: "oklch(var(--card))",
  border: "1px solid oklch(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function Dashboard() {
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue").slice(0, 5);
  const dueFollowUps = followUps
    .filter((f) => f.status === "Pending")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 6);
  const topProject = projects.slice().sort((a, b) => projectMargin(b) - projectMargin(a))[0];
  const recent = customerTimeline(customers[0].id).slice(0, 6);

  return (
    <>
      <PageHeader
        breadcrumb="CONTECH / Overview"
        title="Executive Dashboard"
        subtitle="Single view of leads, sales, collections, projects, service and inventory health"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/reports">Open reports</Link>
            </Button>
            <Button className="bg-accent font-bold text-accent-foreground hover:bg-accent/90" asChild>
              <Link href="/leads">Lead pipeline</Link>
            </Button>
          </>
        }
      />
      
      <AttendanceWidget />

      <FilterBar items={["This month", "This quarter", "FY 2026-27", "All salespeople", "All areas"]} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Leads" value={kpis.totalLeads} sub={`${kpis.newLeads} new · ${kpis.potentialLeads} potential`} icon={UserPlus} />
        <Kpi label="Hot Leads" value={kpis.hotLeads} sub={`${kpis.lostLeads} lost · ${kpis.wonLeads} won`} tone="danger" icon={Flame} />
        <Kpi label="Open Quotations" value={kpis.openQuotations} sub={`Value ${inrShort(kpis.openQuotationValue)}`} tone="accent" icon={FileText} />
        <Kpi label="Confirmed Sales Orders" value={kpis.confirmedOrders} sub={`Value ${inrShort(kpis.orderValue)}`} icon={ClipboardList} />
        <Kpi label="Pending Deliveries" value={kpis.pendingDeliveries} sub="Partial or not dispatched" tone="warning" icon={Truck} />
        <Kpi label="Outstanding Invoices" value={inrShort(kpis.outstanding)} sub={`Overdue ${inrShort(kpis.overdue)}`} tone="danger" icon={AlertTriangle} />
        <Kpi label="Payments Received" value={inrShort(kpis.paymentsReceived)} sub="Last 90 days" tone="success" icon={IndianRupee} />
        <Kpi label="Active Projects" value={kpis.activeProjects} sub={`Profit ${inrShort(kpis.projectProfit)}`} icon={FolderKanban} />
        <Kpi label="Pending Follow-ups" value={kpis.pendingFollowUps} sub={`${kpis.overdueFollowUps} overdue`} tone="warning" icon={BellRing} />
        <Kpi label="Open Service Requests" value={kpis.openService} sub={`Service revenue ${inrShort(kpis.serviceRevenue)}`} tone="accent" icon={Wrench} />
        <Kpi label="Stock Alerts" value={kpis.stockAlerts} sub={`${TOTAL_PRODUCT_MASTER_COUNT} products in master`} tone="danger" icon={Boxes} />
        <Kpi label="Project Profitability" value={`${((kpis.projectProfit / kpis.projectRevenue) * 100).toFixed(1)}%`} sub={`Revenue ${inrShort(kpis.projectRevenue)}`} tone="success" icon={TrendingUp} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Section title="Monthly sales vs quotation value" description="Quoted, converted and collected" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `${v / 100000}L`} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => inrShort(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="quotations" name="Quotation value" fill="oklch(var(--chart-1))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="sales" name="Sales" fill="oklch(var(--chart-2))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="collections" name="Collections" fill="oklch(var(--chart-3))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Leads by source">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={leadsBySource} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {leadsBySource.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Salesperson performance" description="Target vs achieved (₹ lakh)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesByPerson}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="target" name="Target (L)" fill="oklch(var(--chart-4))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="achieved" name="Achieved (L)" fill="oklch(var(--chart-2))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Leads by area">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={leadsByArea} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="leads" fill="oklch(var(--chart-1))" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Product-wise quotations vs orders" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={productSales}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} height={50} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="quoted" name="Quoted (nos)" stroke="oklch(var(--chart-1))" strokeWidth={2} />
              <Line type="monotone" dataKey="sold" name="Ordered (nos)" stroke="oklch(var(--chart-2))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Order-to-cash health" description="Workflow visibility across every stage">
          <div className="space-y-3">
            <ChainStrip
              steps={[
                { label: "Lead", value: `${kpis.totalLeads}`, state: "done" },
                { label: "Quotation", value: `${kpis.openQuotations}`, state: "done" },
                { label: "Proforma", value: "22", state: "done" },
                { label: "Sales Order", value: `${kpis.confirmedOrders}`, state: "current" },
                { label: "Delivery", value: "16", state: "current" },
                { label: "Invoice", value: "15", state: "current" },
                { label: "Payment", value: inrShort(kpis.paymentsReceived), state: "pending" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Every document links forward and backward — open any record to see its full chain.
            </p>
            <div className="rounded-md border border-border bg-muted/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Best margin project</p>
              <p className="mt-1 text-sm font-semibold">{topProject.name}</p>
              <p className="text-xs text-muted-foreground">
                {topProject.customerName} · margin {projectMargin(topProject).toFixed(1)}% · revenue{" "}
                {inrShort(topProject.revenue)}
              </p>
            </div>
          </div>
        </Section>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Section title="Overdue invoices" description="Accounts action required" actions={<Button size="sm" variant="outline" asChild><Link href="/invoices">All invoices</Link></Button>}>
          <ul className="space-y-2">
            {overdueInvoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{i.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.id} · due {fmtDate(i.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">{inrShort(i.total - i.received)}</p>
                  <StatusBadge value={i.status} />
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Follow-ups due" description="Owned, dated and never lost" actions={<Button size="sm" variant="outline" asChild><Link href="/follow-ups">Follow-up engine</Link></Button>}>
          <ul className="space-y-2">
            {dueFollowUps.map((f) => (
              <li key={f.id} className="rounded-md border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{f.customerName}</p>
                  <StatusBadge value={f.dueDate.getTime() < Date.now() ? "Overdue" : "Pending"} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {f.type} · {f.owner} · due {fmtDate(f.dueDate)}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Open service requests" actions={<Button size="sm" variant="outline" asChild><Link href="/service">Service desk</Link></Button>}>
          <ul className="space-y-2">
            {serviceRequests
              .filter((s) => !["Completed", "Closed"].includes(s.status))
              .slice(0, 5)
              .map((s) => (
                <li key={s.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{s.customerName}</p>
                    <StatusBadge value={s.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.productName} · {s.underWarranty ? "Under warranty" : "Chargeable"} · {s.engineer}
                  </p>
                </li>
              ))}
          </ul>
        </Section>
      </div>

      <div className="mt-5">
        <Section title={`Recent activity — ${customers[0].name}`} description="Every team member's interaction appears on one timeline">
          <Timeline items={recent} />
        </Section>
      </div>
    </>
  );
}
