"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserPlus, Flame, FileText, ClipboardList, Truck,
  IndianRupee, AlertTriangle, FolderKanban, BellRing,
  Wrench, Boxes, TrendingUp, Bell, UserCheck, Sparkles, ArrowRight
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
import { getNotifications, markNotificationAsRead } from "@/services/notificationService";
import { getProjects, fmtINR } from "@/services/projectService";
import { getUser } from "@/lib/authUtils";
import { toast } from "sonner";

const CHART_COLORS = ["oklch(var(--chart-1))", "oklch(var(--chart-2))", "oklch(var(--chart-3))", "oklch(var(--chart-4))", "oklch(var(--chart-5))"];

const tooltipStyle = {
  background: "oklch(var(--card))",
  border: "1px solid oklch(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function Dashboard() {
  const [liveProjects, setLiveProjects] = useState([]);
  const [liveNotifs, setLiveNotifs] = useState([]);
  const [techNotifs, setTechNotifs] = useState([]);
  const [assignmentTab, setAssignmentTab] = useState("technicians");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    setCurrentUser(u);
    const r = (u?.role || '').toLowerCase().trim();
    const admin = r === 'admin' || r === 'director' || r === 'admin manager';
    const tech = r.includes('technician');
    const pm = r.includes('manager') && !admin;
    setIsAdmin(admin);

    if (tech) setAssignmentTab("technicians");
    else if (pm) setAssignmentTab("managers");

    // Only non-admin employees fetch their own assigned work notifications
    if (!admin && u) {
      if (tech) {
        getNotifications({ type: "Service", limit: 20 })
          .then((res) => {
            if (res?.notifications) {
              const myNotifs = res.notifications.filter(n =>
                (u.name && n.recipient?.toLowerCase().includes(u.name.toLowerCase())) ||
                (u.email && n.recipientEmail?.toLowerCase() === u.email.toLowerCase())
              );
              setTechNotifs(myNotifs);
            }
          })
          .catch(() => {});
      }

      if (pm || !tech) {
        getNotifications({ type: "Project", limit: 20 })
          .then((res) => {
            if (res?.notifications) {
              const myNotifs = res.notifications.filter(n =>
                (u.name && n.recipient?.toLowerCase().includes(u.name.toLowerCase())) ||
                (u.email && n.recipientEmail?.toLowerCase() === u.email.toLowerCase())
              );
              setLiveNotifs(myNotifs);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handleMarkNotifRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setTechNotifs(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
      setLiveNotifs(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
      toast.success("Assignment acknowledged");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const myTechAssignments = techNotifs.filter(n =>
    currentUser && (
      n.recipient?.toLowerCase().includes(currentUser.name?.toLowerCase()) ||
      (currentUser.email && n.recipientEmail?.toLowerCase() === currentUser.email.toLowerCase())
    )
  );

  const myProjectAssignments = liveNotifs.filter(n =>
    currentUser && (
      n.recipient?.toLowerCase().includes(currentUser.name?.toLowerCase()) ||
      (currentUser.email && n.recipientEmail?.toLowerCase() === currentUser.email.toLowerCase())
    )
  );

  const hasAssignedTasks = !isAdmin && (myTechAssignments.length > 0 || myProjectAssignments.length > 0);

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
      
      {!isAdmin && <AttendanceWidget />}

      {/* ─── PERSONAL WORK ASSIGNMENTS & DISPATCH ALERTS (ASSIGNED EMPLOYEE DASHBOARD ONLY) ─── */}
      {hasAssignedTasks && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-blue-50/70 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                {myTechAssignments.length > 0 ? <Wrench className="w-5 h-5" /> : <FolderKanban className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">
                    {myTechAssignments.length > 0
                      ? "My Assigned Service Tickets & Dispatch Alerts"
                      : "My Assigned Projects & Execution Tasks"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1">
                    <Bell className="w-2.5 h-2.5" />
                    {myTechAssignments.filter(n => !n.read).length + myProjectAssignments.filter(n => !n.read).length} New
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {myTechAssignments.length > 0
                    ? "Field service breakdown calls and maintenance visits officially assigned to you."
                    : "Engineering and automation projects officially assigned to you for execution."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs font-semibold bg-white hover:bg-blue-50 border-blue-200 text-blue-700" asChild>
                <Link href="/notifications">Notification Centre</Link>
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold" asChild>
                <Link href={myTechAssignments.length > 0 ? "/service" : "/projects"}>
                  {myTechAssignments.length > 0 ? "My Service Tickets" : "My Projects"}
                </Link>
              </Button>
            </div>
          </div>

          {/* Assigned Items Grid */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {myTechAssignments.map((notif) => {
              const isUrgent = notif.severity === "danger" || notif.detail?.includes("Urgent");
              return (
                <div
                  key={notif._id || notif.id}
                  className={`bg-white rounded-xl p-4 border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                    isUrgent ? "border-red-300 ring-1 ring-red-200" : "border-blue-100"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-blue-600" />
                          Assigned to You
                        </span>
                        {isUrgent && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-extrabold uppercase animate-pulse">
                            Urgent
                          </span>
                        )}
                        {!notif.read && (
                          <span className="size-2 rounded-full bg-blue-600 animate-ping" />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {new Date(notif.at || notif.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">{notif.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.detail}</p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-medium text-gray-500">
                      {notif.customerName ? `Client: ${notif.customerName}` : "Field Service"}
                    </span>
                    <div className="flex items-center gap-2">
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkNotifRead(notif._id || notif.id)}
                          className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                        >
                          Mark as Read
                        </button>
                      )}
                      <Link
                        href={notif.link || "/service"}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                      >
                        Open Ticket ➔
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {myProjectAssignments.map((notif) => (
              <div
                key={notif._id || notif.id}
                className="bg-white rounded-xl p-4 border border-blue-100 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold">
                        Assigned Project Manager: You
                      </span>
                      {!notif.read && (
                        <span className="size-2 rounded-full bg-blue-600 animate-ping" />
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {new Date(notif.at || notif.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">{notif.title}</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.detail}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono font-medium text-gray-500">
                    {notif.customerName ? `Client: ${notif.customerName}` : "Project Delivery"}
                  </span>
                  <div className="flex items-center gap-2">
                    {!notif.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotifRead(notif._id || notif.id)}
                        className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                      >
                        Mark as Read
                      </button>
                    )}
                    <Link
                      href={notif.link || "/projects"}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                    >
                      Open Execution ➔
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <Kpi
          label="Project Profitability"
          value={`${((kpis.projectProfit / kpis.projectRevenue) * 100).toFixed(1)}%`}
          sub={`Revenue ${inrShort(kpis.projectRevenue)}`}
          tone="success"
          icon={TrendingUp}
        />
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
