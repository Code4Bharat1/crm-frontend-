"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  UserPlus, Flame, FileText, ClipboardList, Truck,
  IndianRupee, AlertTriangle, FolderKanban, BellRing,
  Wrench, Boxes, TrendingUp, Bell, UserCheck, Sparkles, ArrowRight,
  Users, Briefcase, RotateCw, Activity
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { ChainStrip, FilterBar, Kpi, PageHeader, Section, StatusBadge, Timeline } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { fmtDate, inrShort } from "@/lib/crm-data";
import { AttendanceWidget } from "@/components/AttendanceWidget";
import { getNotifications, markNotificationAsRead } from "@/services/notificationService";
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
  const [liveProjects, setLiveProjects] = useState([]);
  const [liveNotifs, setLiveNotifs] = useState([]);
  const [techNotifs, setTechNotifs] = useState([]);
  const [customerNotifs, setCustomerNotifs] = useState([]);
  const [assignmentTab, setAssignmentTab] = useState("technicians");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoadingDashboard(true);
      const res = await getDashboardOverview();
      if (res?.success && res?.data) {
        setDashboardData(res.data);
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
    const admin = r === 'admin' || r === 'director' || r === 'admin manager';
    const tech = r.includes('technician');
    const pm = r.includes('manager') && !admin;
    setIsAdmin(admin);

    if (tech) setAssignmentTab("technicians");
    else if (pm) setAssignmentTab("managers");

    // Fetch real assignment notifications
    if (admin) {
      // Admins see high-priority active field service, project, and customer dispatches
      getNotifications({ type: "Service", limit: 6 }).then(res => setTechNotifs(res?.notifications || [])).catch(() => {});
      getNotifications({ type: "Project", limit: 6 }).then(res => setLiveNotifs(res?.notifications || [])).catch(() => {});
      getNotifications({ type: "Customer", limit: 6 }).then(res => setCustomerNotifs(res?.notifications || [])).catch(() => {});
    } else if (u) {
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

      // Anyone can be tagged as a Customer's salesperson, regardless of role
      getNotifications({ type: "Customer", limit: 20 })
        .then((res) => {
          if (res?.notifications) {
            const myNotifs = res.notifications.filter(n =>
              (u.name && n.recipient?.toLowerCase().includes(u.name.toLowerCase())) ||
              (u.email && n.recipientEmail?.toLowerCase() === u.email.toLowerCase())
            );
            setCustomerNotifs(myNotifs);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleMarkNotifRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setTechNotifs(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
      setLiveNotifs(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
      setCustomerNotifs(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
      toast.success("Assignment acknowledged");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const myTechAssignments = isAdmin ? techNotifs : techNotifs.filter(n =>
    currentUser && (
      n.recipient?.toLowerCase().includes(currentUser.name?.toLowerCase()) ||
      (currentUser.email && n.recipientEmail?.toLowerCase() === currentUser.email.toLowerCase())
    )
  );

  const myProjectAssignments = isAdmin ? liveNotifs : liveNotifs.filter(n =>
    currentUser && (
      n.recipient?.toLowerCase().includes(currentUser.name?.toLowerCase()) ||
      (currentUser.email && n.recipientEmail?.toLowerCase() === currentUser.email.toLowerCase())
    )
  );

  const myCustomerAssignments = isAdmin ? customerNotifs : customerNotifs.filter(n =>
    currentUser && (
      n.recipient?.toLowerCase().includes(currentUser.name?.toLowerCase()) ||
      (currentUser.email && n.recipientEmail?.toLowerCase() === currentUser.email.toLowerCase())
    )
  );

  const hasAssignedTasks = (myTechAssignments.length > 0 || myProjectAssignments.length > 0 || myCustomerAssignments.length > 0);

  const activeCategories = [
    myTechAssignments.length > 0 && "service",
    myProjectAssignments.length > 0 && "projects",
    myCustomerAssignments.length > 0 && "customers",
  ].filter(Boolean);
  const soleCategory = activeCategories.length === 1 ? activeCategories[0] : null;

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

      {!isAdmin && <AttendanceWidget />}

      {/* ─── PERSONAL WORK ASSIGNMENTS & DISPATCH ALERTS (ASSIGNED EMPLOYEE DASHBOARD ONLY) ─── */}
      {hasAssignedTasks && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-blue-50/70 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                {soleCategory === "service" ? <Wrench className="w-5 h-5" />
                  : soleCategory === "customers" ? <Users className="w-5 h-5" />
                  : soleCategory === "projects" ? <FolderKanban className="w-5 h-5" />
                  : <Briefcase className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">
                    {isAdmin ? "Active Operational Dispatches & Team Assignments"
                      : soleCategory === "service" ? "My Assigned Service Tickets & Dispatch Alerts"
                      : soleCategory === "customers" ? "My Assigned Customers"
                      : soleCategory === "projects" ? "My Assigned Projects & Execution Tasks"
                      : "My Assigned Work"}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1">
                    <Bell className="w-2.5 h-2.5" />
                    {myTechAssignments.filter(n => !n.read).length + myProjectAssignments.filter(n => !n.read).length + myCustomerAssignments.filter(n => !n.read).length} New
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {isAdmin ? "Company-wide active field service breakdown calls, project engineering tasks, and key customer accounts."
                    : soleCategory === "service" ? "Field service breakdown calls and maintenance visits officially assigned to you."
                    : soleCategory === "customers" ? "Customer accounts where you are the assigned salesperson."
                    : soleCategory === "projects" ? "Engineering and automation projects officially assigned to you for execution."
                    : "Projects, service tickets, and customer accounts officially assigned to you."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs font-semibold bg-white hover:bg-blue-50 border-blue-200 text-blue-700" asChild>
                <Link href="/notifications">Notification Centre</Link>
              </Button>
              {soleCategory && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold" asChild>
                  <Link href={soleCategory === "service" ? "/service" : soleCategory === "customers" ? "/customers" : "/projects"}>
                    {soleCategory === "service" ? "My Service Tickets" : soleCategory === "customers" ? "My Customers" : "My Projects"}
                  </Link>
                </Button>
              )}
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
                          {isAdmin ? `Assigned: ${notif.recipient || "Technician"}` : "Assigned to You"}
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
                          className="text-[11px] text-gray-500 hover:text-gray-800 underline cursor-pointer"
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
                        className="text-[11px] text-gray-500 hover:text-gray-800 underline cursor-pointer"
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

            {myCustomerAssignments.map((notif) => (
              <div
                key={notif._id || notif.id}
                className="bg-white rounded-xl p-4 border border-blue-100 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold">
                        Assigned Salesperson: You
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
                    {notif.customerName ? `Client: ${notif.customerName}` : "Customer Account"}
                  </span>
                  <div className="flex items-center gap-2">
                    {!notif.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotifRead(notif._id || notif.id)}
                        className="text-[11px] text-gray-500 hover:text-gray-800 underline cursor-pointer"
                      >
                        Mark as Read
                      </button>
                    )}
                    <Link
                      href={notif.link || "/customers"}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                    >
                      Open Customer ➔
                    </Link>
                  </div>
                </div>
              </div>
            ))}
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
