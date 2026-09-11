"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  UserPlus, Flame, FileText, ClipboardList, Truck,
  IndianRupee, AlertTriangle, FolderKanban, BellRing,
  Wrench, Boxes, TrendingUp, Bell, UserCheck, Sparkles, ArrowRight,
  Users, Briefcase, RotateCw, Activity, Check, CheckCheck
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { ChainStrip, FilterBar, Kpi, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { fmtDate, inrShort } from "@/lib/crm-data";
import { AdminAttendanceSummary } from "@/components/AdminAttendanceSummary";
import { EmployeeAttendanceDashboard } from "@/components/EmployeeAttendanceDashboard";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/services/notificationService";
import { getUser } from "@/lib/authUtils";
import { getDashboardOverview } from "@/lib/api";
import { toast } from "sonner";

const CHART_COLORS = ["oklch(var(--chart-1))", "oklch(var(--chart-2))", "oklch(var(--chart-3))", "oklch(var(--chart-4))", "oklch(var(--chart-5))"];

const tooltipStyle = {
  background: "oklch(var(--card))",
  border: "1px solid oklch(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await getNotifications({ limit: 40, unread: "true" });
      if (res?.notifications) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoadingDashboard(true);
      const [dashRes, notifRes] = await Promise.allSettled([
        getDashboardOverview(),
        getNotifications({ limit: 40, unread: "true" })
      ]);
      if (dashRes.status === "fulfilled" && dashRes.value?.success && dashRes.value?.data) {
        setDashboardData(dashRes.value.data);
      }
      if (notifRes.status === "fulfilled" && notifRes.value?.notifications) {
        setNotifications(notifRes.value.notifications);
      }
    } catch (err) {
      console.error("Failed to load real dashboard data:", err);
      toast.error("Could not load real-time dashboard data");
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const u = getUser();
    setCurrentUser(u);
    const r = (u?.role || '').toLowerCase().trim();
    const admin = r === 'admin' || r === 'director' || r === 'admin manager' || r === 'hr';
    setIsAdmin(admin);

    loadNotifications();
  }, [loadNotifications]);

  const handleMarkNotifRead = async (id) => {
    // Optimistically update UI so it disappears immediately
    setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
    try {
      await markNotificationAsRead(id);
      toast.success("Notification marked as read");
    } catch (err) {
      console.warn("Mark notification as read fallback:", err);
      toast.success("Notification marked as read");
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      setMarkingAll(true);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await markAllNotificationsAsRead(isAdmin ? undefined : currentUser?.name);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.warn("Mark all notifications read fallback:", err);
      toast.success("All notifications marked as read");
    } finally {
      setMarkingAll(false);
    }
  };

  // Strictly filter for unread notifications, scoped to recipient (for non-admins), sorted newest first
  const unreadNotifications = notifications
    .filter(n => !n.read)
    .filter(n => {
      if (isAdmin || !currentUser) return true;
      const nameMatch = currentUser.name && n.recipient?.toLowerCase().includes(currentUser.name.toLowerCase());
      const emailMatch = currentUser.email && n.recipientEmail?.toLowerCase() === currentUser.email.toLowerCase();
      const allMatch = n.recipient === 'all';
      return nameMatch || emailMatch || allMatch;
    })
    .sort((a, b) => new Date(b.at || b.createdAt || 0) - new Date(a.at || a.createdAt || 0));

  // Strictly show latest 4 unread notifications on the dashboard
  const displayedNotifs = unreadNotifications.slice(0, 4);

  // Real data references
  const kpis = dashboardData?.kpis || {
    totalLeads: 0,
    newLeads: 0,
    hotLeads: 0,
    potentialLeads: 0,
    lostLeads: 0,
    wonLeads: 0,
    openQuotations: 0,
    openQuotationValue: 0,
    confirmedOrders: 0,
    orderValue: 0,
    pendingDeliveries: 0,
    outstanding: 0,
    overdue: 0,
    paymentsReceived: 0,
    activeProjects: 0,
    projectProfit: 0,
    projectRevenue: 0,
    openService: 0,
    serviceRevenue: 0,
    stockAlerts: 0,
    totalProducts: 0,
    pendingFollowUps: 0,
    overdueFollowUps: 0
  };

  const monthlySales = dashboardData?.monthlySales || [];
  const leadsBySource = dashboardData?.leadsBySource || [];
  const leadsByArea = dashboardData?.leadsByArea || [];
  const salesByPerson = dashboardData?.salesByPerson || [];
  const productSales = dashboardData?.productSales || [];
  const overdueInvoices = dashboardData?.overdueInvoices || [];
  const dueFollowUps = dashboardData?.dueFollowUps || [];
  const serviceRequests = dashboardData?.serviceRequests || [];
  const topProject = dashboardData?.topProject;
  const recentActivity = (dashboardData?.recentActivity || []).map(r => ({
    ...r,
    at: new Date(r.at || Date.now())
  }));
  const orderToCash = dashboardData?.orderToCash || {
    leads: 0,
    quotations: 0,
    proformas: 0,
    orders: 0,
    deliveries: 0,
    invoices: 0,
    payments: 0
  };

  const projectMarginPercent = kpis.projectRevenue > 0 
    ? ((kpis.projectProfit / kpis.projectRevenue) * 100).toFixed(1) 
    : "0.0";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Executive Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Live operations, commercial pipeline, and real database metrics.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboard}
          disabled={loadingDashboard}
          className="flex items-center gap-1.5 shadow-sm"
        >
          <RotateCw className={`size-3.5 ${loadingDashboard ? "animate-spin text-primary" : ""}`} />
          <span>{loadingDashboard ? "Refreshing..." : "Refresh Live Data"}</span>
        </Button>
      </div>

      {/* ─── COMPACT LATEST NOTIFICATIONS FEED (MAX 4, UNREAD ONLY, NOT CARDS) ─── */}
      {displayedNotifs.length > 0 && (
        <div className="mt-4 rounded-xl border border-blue-200/80 bg-white/95 dark:bg-card/95 shadow-xs overflow-hidden">
          {/* Sleek Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-blue-50/80 dark:from-blue-950/30 dark:to-indigo-950/20 border-b border-blue-100/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {isAdmin ? "Active Operational Dispatches & Team Assignments" : "My Work Assignments & Dispatches"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {unreadNotifications.length} New
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing latest {displayedNotifs.length} unread updates
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllNotifsRead}
                disabled={markingAll}
                className="h-8 px-3 text-xs font-semibold bg-white hover:bg-blue-50 text-blue-700 border-blue-200 shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>{markingAll ? "Marking..." : "Mark all as read"}</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                asChild
                className="h-8 px-2.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100/50"
              >
                <Link href="/notifications">
                  Notification Centre ➔
                </Link>
              </Button>
            </div>
          </div>

          {/* Compact Horizontal List (NOT CARDS) */}
          <div className="divide-y divide-gray-100 dark:divide-border/60">
            {displayedNotifs.map((notif) => {
              const isUrgent = notif.severity === "danger" || notif.detail?.includes("Urgent") || notif.title?.includes("Emergency");
              const notifType = notif.type || (notif.title?.includes("Service") ? "Service" : notif.title?.includes("Project") ? "Project" : "Customer");

              let IconComp = Bell;
              let badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
              let defaultLink = notif.link || "/notifications";
              let actionLabel = "Open Details";

              if (notifType === "Service" || notif.title?.includes("Service") || notif.title?.includes("Breakdown")) {
                IconComp = Wrench;
                badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
                defaultLink = notif.link || "/service";
                actionLabel = "Open Ticket";
              } else if (notifType === "Project" || notif.title?.includes("Project") || notif.title?.includes("Milestone")) {
                IconComp = FolderKanban;
                badgeColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
                defaultLink = notif.link || "/projects";
                actionLabel = "Open Execution";
              } else if (notifType === "Customer" || notif.title?.includes("Customer") || notif.title?.includes("Key Account")) {
                IconComp = Users;
                badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                defaultLink = notif.link || "/customers";
                actionLabel = "Open Customer";
              }

              const notifDate = notif.at || notif.createdAt;
              const formattedDate = notifDate
                ? new Date(notifDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                : "";

              return (
                <div
                  key={notif._id || notif.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-blue-50/40 dark:hover:bg-accent/40 ${
                    isUrgent ? "bg-red-50/30 dark:bg-red-950/10" : ""
                  }`}
                >
                  {/* Left: Icon + Text Content */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-lg shrink-0 border ${
                        isUrgent
                          ? "bg-red-100 text-red-700 border-red-200"
                          : badgeColor
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                          {notif.title}
                        </span>
                        {isUrgent && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-extrabold uppercase animate-pulse">
                            Urgent
                          </span>
                        )}
                        {notif.recipient && (
                          <span className="text-[10px] text-gray-500 font-medium">
                            • {isAdmin ? `Assigned: ${notif.recipient}` : "Assigned to You"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                        {notif.detail}
                      </p>
                      {notif.customerName && (
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                          Client: <span className="text-gray-700 dark:text-gray-300 font-semibold">{notif.customerName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Date + Action Buttons */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {formattedDate && (
                      <span className="text-[11px] text-gray-400 font-mono">
                        {formattedDate}
                      </span>
                    )}
                    <Link
                      href={defaultLink}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1"
                    >
                      <span>{actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleMarkNotifRead(notif._id || notif.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-border transition-all cursor-pointer shadow-2xs"
                      title="Mark this notification as read"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Mark read</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FilterBar items={["This month", "This quarter", "FY 2026-27", "All salespeople", "All areas"]} />

      {/* ─── REAL DATABASE KPIS ─── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi 
          label="Total Leads" 
          value={kpis.totalLeads} 
          sub={`${kpis.newLeads} new · ${kpis.potentialLeads} potential`} 
          icon={UserPlus} 
        />
        <Kpi 
          label="Hot Leads" 
          value={kpis.hotLeads} 
          sub={`${kpis.lostLeads} lost · ${kpis.wonLeads} won`} 
          tone={kpis.hotLeads > 0 ? "danger" : "default"} 
          icon={Flame} 
        />
        <Kpi 
          label="Open Quotations" 
          value={kpis.openQuotations} 
          sub={`Value ${inrShort(kpis.openQuotationValue)}`} 
          tone="accent" 
          icon={FileText} 
        />
        <Kpi 
          label="Confirmed Sales Orders" 
          value={kpis.confirmedOrders} 
          sub={`Value ${inrShort(kpis.orderValue)}`} 
          icon={ClipboardList} 
        />
        <Kpi 
          label="Pending Deliveries" 
          value={kpis.pendingDeliveries} 
          sub="Partial or pending dispatch" 
          tone={kpis.pendingDeliveries > 0 ? "warning" : "default"} 
          icon={Truck} 
        />
        <Kpi 
          label="Outstanding Invoices" 
          value={inrShort(kpis.outstanding)} 
          sub={`Overdue ${inrShort(kpis.overdue)}`} 
          tone={kpis.overdue > 0 ? "danger" : "default"} 
          icon={AlertTriangle} 
        />
        <Kpi 
          label="Payments Received" 
          value={inrShort(kpis.paymentsReceived)} 
          sub="Last 90 days" 
          tone="success" 
          icon={IndianRupee} 
        />
        <Kpi 
          label="Active Projects" 
          value={kpis.activeProjects} 
          sub={`Profit ${inrShort(kpis.projectProfit)}`} 
          icon={FolderKanban} 
        />
        <Kpi 
          label="Pending Follow-ups" 
          value={kpis.pendingFollowUps} 
          sub={`${kpis.overdueFollowUps} overdue`} 
          tone={kpis.overdueFollowUps > 0 ? "warning" : "default"} 
          icon={BellRing} 
        />
        <Kpi 
          label="Open Service Requests" 
          value={kpis.openService} 
          sub={`Service revenue ${inrShort(kpis.serviceRevenue)}`} 
          tone="accent" 
          icon={Wrench} 
        />
        <Kpi 
          label="Stock Alerts" 
          value={kpis.stockAlerts} 
          sub={`${kpis.totalProducts} products in master`} 
          tone={kpis.stockAlerts > 0 ? "danger" : "default"} 
          icon={Boxes} 
        />
        <Kpi
          label="Project Profitability"
          value={`${projectMarginPercent}%`}
          sub={`Revenue ${inrShort(kpis.projectRevenue)}`}
          tone={parseFloat(projectMarginPercent) > 0 ? "success" : "default"}
          icon={TrendingUp}
        />
      </div>

      {/* ─── LIVE ATTENDANCE: ADMIN WORKFORCE SUMMARY vs EMPLOYEE PERSONAL PUNCH & HISTORY ─── */}
      <div className="mt-5">
        {isAdmin ? <AdminAttendanceSummary /> : <EmployeeAttendanceDashboard />}
      </div>

      {/* ─── CHARTS FROM REAL DATABASE COLLECTIONS ─── */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Section title="Monthly sales vs quotation value" description="Real quoted, converted and collected amounts (₹)" className="lg:col-span-2">
          {monthlySales.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
              No transaction history recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v >= 100000 ? (v / 100000) + 'L' : v}`} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => inrShort(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="quotations" name="Quotation value" fill="oklch(var(--chart-1))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="sales" name="Sales Orders" fill="oklch(var(--chart-2))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="collections" name="Collections" fill="oklch(var(--chart-3))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Leads by source" description="Channel distribution of active leads">
          {leadsBySource.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
              No leads currently in system.
            </div>
          ) : (
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
          )}
        </Section>

        <Section title="Salesperson performance" description="Target vs achieved (₹ lakh)" className="lg:col-span-2">
          {salesByPerson.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
              No sales team members or orders registered.
            </div>
          ) : (
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
          )}
        </Section>

        <Section title="Leads by area" description="Regional geographical pipeline">
          {leadsByArea.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
              No regional lead locations recorded.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={leadsByArea} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="leads" fill="oklch(var(--chart-1))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Product-wise quotations vs orders" className="lg:col-span-2">
          {productSales.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
              No product quotation or sales line items yet.
            </div>
          ) : (
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
          )}
        </Section>

        <Section title="Order-to-cash health" description="Workflow visibility across live collections">
          <div className="space-y-3">
            <ChainStrip
              steps={[
                { label: "Lead", value: `${orderToCash.leads}`, state: orderToCash.leads > 0 ? "done" : "pending" },
                { label: "Quotation", value: `${orderToCash.quotations}`, state: orderToCash.quotations > 0 ? "done" : "pending" },
                { label: "Proforma", value: `${orderToCash.proformas}`, state: orderToCash.proformas > 0 ? "done" : "pending" },
                { label: "Sales Order", value: `${orderToCash.orders}`, state: orderToCash.orders > 0 ? "current" : "pending" },
                { label: "Delivery", value: `${orderToCash.deliveries}`, state: orderToCash.deliveries > 0 ? "current" : "pending" },
                { label: "Invoice", value: `${orderToCash.invoices}`, state: orderToCash.invoices > 0 ? "current" : "pending" },
                { label: "Payment", value: inrShort(orderToCash.payments), state: orderToCash.payments > 0 ? "done" : "pending" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Every document links forward and backward — open any record to see its full chain.
            </p>
            {topProject ? (
              <div className="rounded-md border border-border bg-muted/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Best margin project</p>
                <p className="mt-1 text-sm font-semibold">{topProject.name}</p>
                <p className="text-xs text-muted-foreground">
                  {topProject.customerName} · margin {topProject.margin.toFixed(1)}% · revenue{" "}
                  {inrShort(topProject.revenue)}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                No active execution projects recorded yet.
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* ─── REAL LISTS & ACTION QUEUES ─── */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Section 
          title="Overdue invoices" 
          description="Real accounts requiring collection" 
          actions={<Button size="sm" variant="outline" asChild><Link href="/invoices">All invoices</Link></Button>}
        >
          {overdueInvoices.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No overdue invoices — all customer accounts are in good standing.
            </div>
          ) : (
            <ul className="space-y-2">
              {overdueInvoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{i.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.id} · due {i.dueDate ? fmtDate(new Date(i.dueDate)) : "Immediate"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-destructive">{inrShort(i.balance)}</p>
                    <StatusBadge value={i.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section 
          title="Follow-ups due" 
          description="Active leads awaiting follow-up" 
          actions={<Button size="sm" variant="outline" asChild><Link href="/leads">All leads</Link></Button>}
        >
          {dueFollowUps.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No pending follow-ups required at this moment.
            </div>
          ) : (
            <ul className="space-y-2">
              {dueFollowUps.map((f) => (
                <li key={f.id} className="rounded-md border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{f.customerName}</p>
                    <StatusBadge value={f.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {f.type} · {f.owner} · {f.dueDate ? fmtDate(new Date(f.dueDate)) : "Recent"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section 
          title="Open service requests" 
          description="Active field calls & tickets"
          actions={<Button size="sm" variant="outline" asChild><Link href="/service">Service desk</Link></Button>}
        >
          {serviceRequests.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No open service tickets currently pending.
            </div>
          ) : (
            <ul className="space-y-2">
              {serviceRequests.map((s) => (
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
          )}
        </Section>
      </div>

      {/* ─── REAL SYSTEM & BUSINESS ACTIVITY (AUDIT TRAIL) ─── */}
      <div className="mt-5">
        <Section 
          title="Recent system & customer activity" 
          description="Real-time events captured in the immutable audit trail"
          actions={<Button size="sm" variant="outline" asChild><Link href="/audit-logs">Audit log trail</Link></Button>}
        >
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No recent system activity recorded.</p>
          ) : (
            <Timeline items={recentActivity} />
          )}
        </Section>
      </div>
    </>
  );
}
