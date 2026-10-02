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
  const [filtering, setFiltering] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Dashboard filter state
  const [period, setPeriod] = useState("All time");
  const [salesperson, setSalesperson] = useState("All");
  const [area, setArea] = useState("All");

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

  const fetchDashboard = useCallback(async (customFilters) => {
    const activeFilters = {
      period: customFilters?.period !== undefined ? customFilters.period : period,
      salesperson: customFilters?.salesperson !== undefined ? customFilters.salesperson : salesperson,
      area: customFilters?.area !== undefined ? customFilters.area : area,
    };
    try {
      if (customFilters) {
        setFiltering(true);
      } else {
        setLoadingDashboard(true);
      }

      const [dashRes, notifRes] = await Promise.allSettled([
        getDashboardOverview(activeFilters),
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
      setFiltering(false);
    }
  }, [period, salesperson, area]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    fetchDashboard({ period: newPeriod });
  };

  const handleSalespersonChange = (newSp) => {
    setSalesperson(newSp);
    fetchDashboard({ salesperson: newSp });
  };

  const handleAreaChange = (newArea) => {
    setArea(newArea);
    fetchDashboard({ area: newArea });
  };

  const handleResetFilters = () => {
    setPeriod("All time");
    setSalesperson("All");
    setArea("All");
    fetchDashboard({ period: "All time", salesperson: "All", area: "All" });
  };

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
  const recentActivity = (dashboardData?.recentActivity || [])
    .map(r => ({
      ...r,
      at: new Date(r.at || r.createdAt || Date.now())
    }))
    .sort((a, b) => b.at.getTime() - a.at.getTime());
  const orderToCash = dashboardData?.orderToCash || {
    leads: 0,
    quotations: 0,
    proformas: 0,
    orders: 0,
    deliveries: 0,
    invoices: 0,
    payments: 0
  };

  const rawMargin = kpis.projectRevenue > 0 ? ((kpis.projectProfit / kpis.projectRevenue) * 100) : 0;
  const projectMarginPercent = Math.abs(rawMargin) > 500 
    ? (rawMargin > 0 ? ">100" : "-") 
    : rawMargin.toFixed(1);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Executive Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Live operations, commercial pipeline, and real database metrics.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboard}
          disabled={loadingDashboard}
          className="flex items-center gap-1.5 shadow-2xs h-8 sm:h-9 self-start sm:self-auto text-xs font-semibold cursor-pointer"
        >
          <RotateCw className={`size-3.5 ${loadingDashboard ? "animate-spin text-primary" : ""}`} />
          <span>{loadingDashboard ? "Refreshing..." : "Refresh Live Data"}</span>
        </Button>
      </div>

      {/* ─── COMPACT LATEST NOTIFICATIONS FEED (MAX 4, UNREAD ONLY, NOT CARDS) ─── */}
      {displayedNotifs.length > 0 && (
        <div className="mt-3 sm:mt-4 rounded-xl border border-blue-200/80 bg-white/95 dark:bg-card/95 shadow-xs overflow-hidden">
          {/* Sleek Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-blue-50/80 dark:from-blue-950/30 dark:to-indigo-950/20 border-b border-blue-100/80">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="p-1.5 sm:p-2 bg-blue-600 text-white rounded-lg shadow-2xs shrink-0">
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                    {isAdmin ? "Active Operational Dispatches" : "My Work Assignments"}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] sm:text-[10px] font-bold shrink-0">
                    {unreadNotifications.length} New
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  Showing latest {displayedNotifs.length} unread updates
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllNotifsRead}
                disabled={markingAll}
                className="h-7 sm:h-8 px-2.5 text-[11px] sm:text-xs font-semibold bg-white hover:bg-blue-50 text-blue-700 border-blue-200 shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>{markingAll ? "Marking..." : "Mark all read"}</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                asChild
                className="h-7 sm:h-8 px-2 text-[11px] sm:text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100/50"
              >
                <Link href="/notifications">
                  Centre ➔
                </Link>
              </Button>
            </div>
          </div>

          {/* Compact Horizontal List */}
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
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 transition-colors hover:bg-blue-50/40 dark:hover:bg-accent/40 ${
                    isUrgent ? "bg-red-50/30 dark:bg-red-950/10" : ""
                  }`}
                >
                  {/* Left: Icon + Text Content */}
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={`p-1.5 sm:p-2 rounded-lg shrink-0 border mt-0.5 ${
                        isUrgent
                          ? "bg-red-100 text-red-700 border-red-200"
                          : badgeColor
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                          {notif.title}
                        </span>
                        {isUrgent && (
                          <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-extrabold uppercase animate-pulse">
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
                        <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5">
                          Client: <span className="text-gray-700 dark:text-gray-300 font-semibold">{notif.customerName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Date + Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-border/40 sm:self-center">
                    {formattedDate && (
                      <span className="text-[10px] sm:text-[11px] text-gray-400 font-mono">
                        {formattedDate}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <Link
                        href={defaultLink}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline px-1 py-0.5"
                      >
                        <span>{actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleMarkNotifRead(notif._id || notif.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-neutral-800 border border-gray-200 dark:border-border transition-all cursor-pointer shadow-2xs"
                        title="Mark this notification as read"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Mark read</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FilterBar
        period={period}
        onPeriodChange={handlePeriodChange}
        salespeople={dashboardData?.filterOptions?.salespeople || []}
        selectedSalesperson={salesperson}
        onSalespersonChange={handleSalespersonChange}
        areas={dashboardData?.filterOptions?.areas || []}
        selectedArea={area}
        onAreaChange={handleAreaChange}
        onReset={handleResetFilters}
        loading={filtering}
        className="mt-3 sm:mt-4"
      />

      {/* ─── REAL DATABASE KPIS (2 COLUMNS ON MOBILE, 3 ON TABLET, 4 ON DESKTOP) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 w-full min-w-0">
        <Kpi 
          label="Total Leads" 
          value={kpis.totalLeads} 
          sub={`${kpis.newLeads} new · ${kpis.potentialLeads} pot.`} 
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
          label="Confirmed Orders" 
          value={kpis.confirmedOrders} 
          sub={`Value ${inrShort(kpis.orderValue)}`} 
          icon={ClipboardList} 
        />
        <Kpi 
          label="Pending Deliveries" 
          value={kpis.pendingDeliveries} 
          sub="Pending dispatch" 
          tone={kpis.pendingDeliveries > 0 ? "warning" : "default"} 
          icon={Truck} 
        />
        <Kpi 
          label="Outstanding" 
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
          label="Service Requests" 
          value={kpis.openService} 
          sub={`Revenue ${inrShort(kpis.serviceRevenue)}`} 
          tone="accent" 
          icon={Wrench} 
        />
        <Kpi 
          label="Stock Alerts" 
          value={kpis.stockAlerts} 
          sub={`${kpis.totalProducts} master items`} 
          tone={kpis.stockAlerts > 0 ? "danger" : "default"} 
          icon={Boxes} 
        />
        <Kpi
          label="Project Margin"
          value={projectMarginPercent === "-" ? "-" : `${projectMarginPercent}%`}
          sub={`Rev ${inrShort(kpis.projectRevenue)}`}
          tone={parseFloat(projectMarginPercent) > 0 ? "success" : "default"}
          icon={TrendingUp}
        />
      </div>

      {/* ─── LIVE ATTENDANCE: ADMIN WORKFORCE SUMMARY vs EMPLOYEE PERSONAL PUNCH & HISTORY ─── */}
      <div className="mt-4 sm:mt-5">
        {isAdmin ? <AdminAttendanceSummary /> : <EmployeeAttendanceDashboard />}
      </div>

      {/* ─── CHARTS FROM REAL DATABASE COLLECTIONS ─── */}
      <div className="mt-4 sm:mt-5 grid gap-3 sm:gap-4 lg:grid-cols-3 w-full min-w-0">
        <Section title="Monthly sales vs quotation value" description="Real quoted, converted and collected amounts (₹)" className="lg:col-span-2">
          {monthlySales.length === 0 ? (
            <div className="flex h-[220px] sm:h-[280px] items-center justify-center text-xs text-muted-foreground">
              No transaction history recorded yet.
            </div>
          ) : (
            <div className="w-full min-w-0 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v >= 100000 ? (v / 100000) + 'L' : v}`} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => inrShort(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="quotations" name="Quotation value" fill="oklch(var(--chart-1))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="sales" name="Sales Orders" fill="oklch(var(--chart-2))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="collections" name="Collections" fill="oklch(var(--chart-3))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Leads by source" description="Channel distribution of active leads">
          {leadsBySource.length === 0 ? (
            <div className="flex h-[220px] sm:h-[280px] items-center justify-center text-xs text-muted-foreground">
              No leads currently in system.
            </div>
          ) : (
            <div className="w-full min-w-0 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leadsBySource} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {leadsBySource.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Salesperson performance" description="Target vs achieved (₹ lakh)" className="lg:col-span-2">
          {salesByPerson.length === 0 ? (
            <div className="flex h-[220px] sm:h-[260px] items-center justify-center text-xs text-muted-foreground">
              No sales team members or orders registered.
            </div>
          ) : (
            <div className="w-full min-w-0 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByPerson} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="target" name="Target (L)" fill="oklch(var(--chart-4))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="achieved" name="Achieved (L)" fill="oklch(var(--chart-2))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Leads by area" description="Regional geographical pipeline">
          {leadsByArea.length === 0 ? (
            <div className="flex h-[220px] sm:h-[260px] items-center justify-center text-xs text-muted-foreground">
              No regional lead locations recorded.
            </div>
          ) : (
            <div className="w-full min-w-0 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsByArea} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="leads" fill="oklch(var(--chart-1))" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Product-wise quotations vs orders" className="lg:col-span-2">
          {productSales.length === 0 ? (
            <div className="flex h-[220px] sm:h-[260px] items-center justify-center text-xs text-muted-foreground">
              No product quotation or sales line items yet.
            </div>
          ) : (
            <div className="w-full min-w-0 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={productSales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} height={45} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="quoted" name="Quoted (nos)" stroke="oklch(var(--chart-1))" strokeWidth={2} />
                  <Line type="monotone" dataKey="sold" name="Ordered (nos)" stroke="oklch(var(--chart-2))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
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
              <div className="rounded-md border border-border bg-muted/50 p-2.5 sm:p-3">
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Best margin project</p>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-semibold truncate">{topProject.name}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  {topProject.customerName} · margin {topProject.margin.toFixed(1)}% · revenue{" "}
                  {inrShort(topProject.revenue)}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-2.5 sm:p-3 text-center text-xs text-muted-foreground">
                No active execution projects recorded yet.
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* ─── REAL LISTS & ACTION QUEUES ─── */}
      <div className="mt-4 sm:mt-5 grid gap-3 sm:gap-4 lg:grid-cols-3 w-full min-w-0">
        <Section 
          title="Overdue invoices" 
          description="Real accounts requiring collection" 
          actions={<Button size="sm" variant="outline" asChild><Link href="/invoices">All invoices</Link></Button>}
        >
          {overdueInvoices.length === 0 ? (
            <div className="py-6 sm:py-8 text-center text-xs text-muted-foreground">
              No overdue invoices — all customer accounts are in good standing.
            </div>
          ) : (
            <ul className="space-y-2">
              {overdueInvoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs sm:text-sm font-semibold">{i.customerName}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                      {i.id} · due {i.dueDate ? fmtDate(new Date(i.dueDate)) : "Immediate"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-destructive">{inrShort(i.balance)}</p>
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
            <div className="py-6 sm:py-8 text-center text-xs text-muted-foreground">
              No pending follow-ups required at this moment.
            </div>
          ) : (
            <ul className="space-y-2">
              {dueFollowUps.map((f) => (
                <li key={f.id} className="rounded-md border border-border p-2.5 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs sm:text-sm font-semibold">{f.customerName}</p>
                    <StatusBadge value={f.status} />
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
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
            <div className="py-6 sm:py-8 text-center text-xs text-muted-foreground">
              No open service tickets currently pending.
            </div>
          ) : (
            <ul className="space-y-2">
              {serviceRequests.map((s) => (
                <li key={s.id} className="rounded-md border border-border p-2.5 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs sm:text-sm font-semibold">{s.customerName}</p>
                    <StatusBadge value={s.status} />
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    {s.productName} · {s.underWarranty ? "Under warranty" : "Chargeable"} · {s.engineer}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* ─── RECENT SYSTEM & BUSINESS ACTIVITY (AUDIT TRAIL) ─── */}
      <div className="mt-4 sm:mt-5">
        <Section 
          title="Recent System & Customer Activity" 
          description="Real-time events and user actions recorded in the immutable audit trail"
          actions={
            <Button size="sm" variant="outline" asChild className="gap-1.5 font-semibold text-xs shadow-2xs hover:bg-primary/10 hover:text-primary cursor-pointer">
              <Link href="/audit-logs">
                <span>Audit log trail</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          }
        >
          {recentActivity.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <p className="font-semibold text-sm text-foreground/80 mb-1">No system activity recorded yet</p>
              <p>User logins, data changes, and operational events will appear here in real-time.</p>
            </div>
          ) : (
            <Timeline items={recentActivity} />
          )}
        </Section>
      </div>
    </>
  );
}
