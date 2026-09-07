"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtDateTime } from "@/lib/crm-data";
import { getAuditLogs, getAuditStats, exportAuditLogsAPI } from "@/lib/api";
import { 
  Clock, 
  RotateCw, 
  Download, 
  LogIn, 
  LogOut, 
  ShieldAlert, 
  ShieldCheck, 
  User, 
  Activity, 
  AlertCircle,
  CalendarCheck2,
  Users
} from "lucide-react";
import { toast } from "sonner";

export default function Page() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ entries: 0, critical: 0, warnings: 0, logins: 0, failedLogins: 0, retention: '7 years' });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [currentTimeIST, setCurrentTimeIST] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, logsData] = await Promise.all([
        getAuditStats(),
        getAuditLogs({ limit: 250 }) // fetch recent 250 records
      ]);
      setStats(statsData || {});
      setLogs(logsData.auditLogs || []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError(err.message || "Failed to connect to audit log server");
      toast.error(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTimeIST(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        }).format(new Date())
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const fileUrl = await exportAuditLogsAPI();
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = `contech-audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Audit logs exported to CSV successfully");
    } catch (err) {
      toast.error("Failed to export audit logs: " + (err.message || "Network error"));
    } finally {
      setExporting(false);
    }
  };

  // Filter logs based on active tab
  const filteredLogs = useMemo(() => {
    if (activeTab === "logins") {
      return logs.filter((l) => 
        l.module === "AUTHENTICATION" || 
        l.action?.toUpperCase().includes("LOGIN") || 
        l.action?.toUpperCase().includes("LOGOUT") ||
        l.action?.toUpperCase().includes("PASSWORD")
      );
    }
    if (activeTab === "attendance") {
      return logs.filter((l) => l.module === "ATTENDANCE" || l.action?.toUpperCase().includes("PUNCH") || l.action?.toUpperCase().includes("LEAVE"));
    }
    if (activeTab === "employees") {
      return logs.filter((l) => l.module === "EMPLOYEE");
    }
    if (activeTab === "security") {
      return logs.filter((l) => 
        l.severity === "CRITICAL" || 
        l.severity === "WARNING" || 
        l.action === "LOGIN_FAILED" ||
        l.status === "FAILED"
      );
    }
    return logs;
  }, [logs, activeTab]);

  const loginCount = stats.logins ?? logs.filter(l => l.action === "LOGIN").length;
  const failedLoginCount = stats.failedLogins ?? logs.filter(l => l.action === "LOGIN_FAILED").length;

  return (
    <>
      <PageHeader
        breadcrumb="Administration / Audit Logs"
        title="Audit Logs & Activity Trail"
        subtitle="Full immutable record of user logins, system events, and transactions — logged and displayed in Indian Standard Time (IST / UTC+05:30)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs shadow-sm">
              <Clock className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Live IST:</span>
              <span className="font-mono font-bold text-foreground">{currentTimeIST || "09:15 AM"}</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">UTC+05:30</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || loading || logs.length === 0}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <Download className={`size-3.5 ${exporting ? "animate-bounce" : ""}`} />
              <span>{exporting ? "Exporting..." : "Export CSV"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Unable to fetch audit trail</p>
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={fetchData} className="border-rose-300 bg-white hover:bg-rose-100 dark:bg-rose-900/40">
            Retry
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total Logs" value={stats.entries || logs.length} sub="All system events" />
        <Kpi label="User Logins" value={loginCount} tone="success" sub="Successful sessions" />
        <Kpi label="Failed Logins" value={failedLoginCount} tone="danger" sub="Rejected attempts" />
        <Kpi label="Warnings &amp; Critical" value={(stats.warnings || 0) + (stats.critical || 0)} tone="warning" sub="Security notices" />
        <Kpi label="Timezone" value="IST" sub="Asia/Kolkata (+5:30)" tone="accent" />
      </div>

      {/* Filter Tabs */}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("all")}
          className="gap-1.5"
        >
          <Activity className="size-3.5" />
          <span>All Activity</span>
          <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px] font-bold">
            {logs.length}
          </span>
        </Button>

        <Button
          variant={activeTab === "logins" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("logins")}
          className={`gap-1.5 ${activeTab === "logins" ? "" : "text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"}`}
        >
          <LogIn className="size-3.5" />
          <span>User Logins &amp; Auth</span>
          <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {logs.filter(l => l.module === "AUTHENTICATION" || l.action?.includes("LOGIN")).length}
          </span>
        </Button>

        <Button
          variant={activeTab === "attendance" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("attendance")}
          className="gap-1.5"
        >
          <CalendarCheck2 className="size-3.5" />
          <span>Attendance</span>
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground">
            {logs.filter(l => l.module === "ATTENDANCE").length}
          </span>
        </Button>

        <Button
          variant={activeTab === "employees" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("employees")}
          className="gap-1.5"
        >
          <Users className="size-3.5" />
          <span>Employees</span>
          <span className="ml-1 rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground">
            {logs.filter(l => l.module === "EMPLOYEE").length}
          </span>
        </Button>

        <Button
          variant={activeTab === "security" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("security")}
          className={`gap-1.5 ${activeTab === "security" ? "" : "text-rose-700 hover:text-rose-800 dark:text-rose-400"}`}
        >
          <ShieldAlert className="size-3.5" />
          <span>Security &amp; Failed Attempts</span>
          <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            {logs.filter(l => l.severity === "CRITICAL" || l.severity === "WARNING" || l.action === "LOGIN_FAILED").length}
          </span>
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            <RotateCw className="size-6 animate-spin text-primary" />
            <span>Loading audit log entries in Indian Standard Time (IST)...</span>
          </div>
        ) : (
          <DataTable
            rows={filteredLogs}
            columns={[
              {
                header: "When (IST)",
                cell: (r) => (
                  <div className="flex flex-col whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {fmtDateTime(r.createdAt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      IST (UTC+05:30)
                    </span>
                  </div>
                )
              },
              {
                header: "User / Account",
                cell: (r) => {
                  const isFailedLogin = r.action === "LOGIN_FAILED";
                  const targetEmail = r.metadata?.email || r.userName || (r.description?.match(/email:\s*([^\s]+)/i)?.[1]);

                  return (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-semibold ${isFailedLogin ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                          {isFailedLogin ? (targetEmail || "Unknown Email") : (r.userName || "System")}
                        </span>
                        {r.userRole && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {r.userRole}
                          </span>
                        )}
                        {isFailedLogin && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                            Failed Attempt
                          </span>
                        )}
                      </div>
                      {r.userId && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ID: {String(r.userId).slice(-6)}
                        </span>
                      )}
                    </div>
                  );
                }
              },
              {
                header: "Module",
                cell: (r) => {
                  const m = r.module || "SYSTEM";
                  const isAuth = m === "AUTHENTICATION";
                  return (
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                      isAuth 
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {isAuth && <ShieldCheck className="size-3 text-blue-600" />}
                      {m}
                    </span>
                  );
                }
              },
              {
                header: "Action & Details",
                cell: (r) => {
                  const action = r.action || "";
                  const isLogin = action === "LOGIN";
                  const isFailedLogin = action === "LOGIN_FAILED";
                  const isLogout = action === "LOGOUT" || action === "LOGOUT_ALL";

                  return (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        {isLogin && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            <LogIn className="size-3" /> LOGIN SUCCESS
                          </span>
                        )}
                        {isFailedLogin && (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                            <ShieldAlert className="size-3" /> LOGIN FAILED
                          </span>
                        )}
                        {isLogout && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                            <LogOut className="size-3" /> LOGOUT
                          </span>
                        )}
                        {!isLogin && !isFailedLogin && !isLogout && (
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {action}
                          </span>
                        )}
                        {r.resourceType && (
                          <span className="text-xs text-muted-foreground">
                            ({r.resourceType} {r.resourceId ? `#${r.resourceId}` : ''})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {r.description}
                      </span>
                    </div>
                  );
                }
              },
              {
                header: "IP Address",
                cell: (r) => (
                  <span className="font-mono text-xs text-foreground">
                    {r.ipAddress || "—"}
                  </span>
                )
              },
              {
                header: "Severity",
                cell: (r) => (
                  <StatusBadge 
                    value={
                      r.severity === 'CRITICAL' ? 'Critical' : 
                      r.severity === 'WARNING' ? 'Warning' : 
                      'Info'
                    } 
                  />
                )
              },
              {
                header: "Status",
                cell: (r) => {
                  const isSuccess = r.status === 'SUCCESS';
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isSuccess 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {isSuccess ? 'SUCCESS' : 'FAILED'}
                    </span>
                  );
                }
              }
            ]}
            searchKeys={["userName", "userRole", "action", "description", "module", "ipAddress"]}
            emptyLabel={
              activeTab === "logins" 
                ? "No user login events found." 
                : activeTab === "security" 
                  ? "No security warnings or failed logins recorded." 
                  : "No audit logs found."
            }
          />
        )}
      </div>
    </>
  );
}
