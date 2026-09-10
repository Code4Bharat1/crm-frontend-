"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  Calendar,
  RotateCw,
  Search,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LogIn,
  LogOut,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAttendanceStats, punchIn, punchOut } from "@/services/attendanceService";
import { getUser } from "@/lib/authUtils";
import { toast } from "sonner";

export function AdminAttendanceSummary() {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdminPunch, setShowAdminPunch] = useState(false);
  const [adminPunchSubmitting, setAdminPunchSubmitting] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await getAttendanceStats();
      if (res?.success && res?.data) {
        setStatsData(res.data);
      }
    } catch (err) {
      console.error("Failed to load admin attendance stats:", err);
      if (!isSilent) toast.error("Could not refresh live attendance roster");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const u = getUser();
    setCurrentUser(u);
    loadStats();
  }, [loadStats]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadStats(true);
    toast.success("Attendance roster updated");
  };

  const roster = useMemo(() => statsData?.todayRoster || [], [statsData]);

  // Filter roster by tab and search
  const filteredRoster = useMemo(() => {
    return roster.filter((emp) => {
      // Tab filter
      if (statusFilter === "WORKING" && emp.status !== "WORKING") return false;
      if (statusFilter === "COMPLETED" && emp.status !== "COMPLETED") return false;
      if (statusFilter === "NOT_PUNCHED_IN" && emp.status !== "NOT_PUNCHED_IN") return false;
      if (statusFilter === "LEAVE" && emp.status !== "LEAVE") return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nameMatch = emp.fullName?.toLowerCase().includes(q);
        const codeMatch = emp.employeeCode?.toLowerCase().includes(q);
        const roleMatch = emp.role?.toLowerCase().includes(q);
        const deptMatch = emp.department?.toLowerCase().includes(q);
        return nameMatch || codeMatch || roleMatch || deptMatch;
      }
      return true;
    });
  }, [roster, statusFilter, searchTerm]);

  // Find admin's own status in roster
  const adminEmpRecord = useMemo(() => {
    if (!currentUser) return null;
    return roster.find(
      (r) =>
        (currentUser.employeeId && r.employeeId === currentUser.employeeId) ||
        (currentUser.email && r.email?.toLowerCase() === currentUser.email?.toLowerCase())
    );
  }, [roster, currentUser]);

  const handleAdminPunchIn = async () => {
    if (!adminEmpRecord) {
      return toast.error("No linked employee profile found for your admin account");
    }
    setAdminPunchSubmitting(true);
    try {
      const res = await punchIn({
        employeeId: adminEmpRecord.employeeId,
        source: "Admin Terminal (Web)",
        remarks: adminRemarks.trim() || "Admin clocked in from dashboard"
      });
      if (res?.success) {
        toast.success(res.message || "Clocked in successfully!");
        setAdminRemarks("");
        await loadStats(true);
      } else {
        toast.error(res?.message || "Failed to punch in");
      }
    } catch (err) {
      toast.error(err.message || "Network error while punching in");
    } finally {
      setAdminPunchSubmitting(false);
    }
  };

  const handleAdminPunchOut = async () => {
    if (!adminEmpRecord) {
      return toast.error("No linked employee profile found for your admin account");
    }
    setAdminPunchSubmitting(true);
    try {
      const res = await punchOut({
        employeeId: adminEmpRecord.employeeId,
        source: "Admin Terminal (Web)",
        remarks: adminRemarks.trim() || "Admin clocked out from dashboard"
      });
      if (res?.success) {
        toast.success(res.message || "Clocked out successfully!");
        setAdminRemarks("");
        await loadStats(true);
      } else {
        toast.error(res?.message || "Failed to punch out");
      }
    } catch (err) {
      toast.error(err.message || "Network error while punching out");
    } finally {
      setAdminPunchSubmitting(false);
    }
  };

  const fmtTime = (dateStr) => {
    if (!dateStr) return "--:--";
    try {
      return new Date(dateStr).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return "--:--";
    }
  };

  const fmtDuration = (mins) => {
    if (!mins || mins <= 0) return "-";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const totalEmployees = statsData?.totalEmployees || roster.length || 0;
  const presentToday = statsData?.presentToday ?? 0;
  const workingNow = statsData?.workingNow ?? 0;
  const completedToday = statsData?.completedToday ?? 0;
  const absentToday = statsData?.absentToday ?? 0;
  const leaveToday = statsData?.leaveToday ?? 0;
  const attendanceRate = statsData?.attendanceRateToday ?? (totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0);
  const overtimeHours = statsData?.totalOvertimeHours ?? 0;

  return (
    <div className="rounded-2xl border border-blue-200/80 bg-white/95 dark:bg-card/95 shadow-xs overflow-hidden transition-all">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/90 dark:from-blue-950/40 dark:to-indigo-950/30 border-b border-blue-100/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-2xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Staff Attendance & Workforce Overview
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live Today
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentTime.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric"
              })}{" "}
              • Real-time shift status across all departments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAdminPunch(!showAdminPunch)}
            className="h-8 px-2.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/70 hover:bg-blue-200/80 dark:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
            title="Toggle personal punch-in terminal"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>My Punch</span>
            {showAdminPunch ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="h-8 px-2.5 text-xs font-semibold bg-white hover:bg-blue-50 text-gray-700 border-gray-200 shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-8 px-2.5 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100/60"
          >
            <Link href="/attendance">
              Full Ledger <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Optional Collapsible Admin Personal Punch Bar */}
      {showAdminPunch && (
        <div className="p-3.5 bg-blue-50/40 dark:bg-blue-950/20 border-b border-blue-100 dark:border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              Admin Clock-In:
            </span>
            <span className="text-xs font-mono font-bold text-blue-800 bg-white dark:bg-card px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
              {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="text-xs text-muted-foreground">
              Logged in as <strong>{currentUser?.name || "Admin"}</strong>
            </span>
            {adminEmpRecord && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  adminEmpRecord.status === "WORKING"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : adminEmpRecord.status === "COMPLETED"
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {adminEmpRecord.status === "WORKING"
                  ? "Currently Clocked In"
                  : adminEmpRecord.status === "COMPLETED"
                  ? "Shift Completed"
                  : "Not Punched In Today"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Admin shift note / remarks..."
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              className="text-xs border border-gray-300 dark:border-border rounded-lg px-2.5 py-1.5 bg-white dark:bg-card w-48 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            {(!adminEmpRecord || adminEmpRecord.status === "NOT_PUNCHED_IN") && (
              <Button
                size="sm"
                onClick={handleAdminPunchIn}
                disabled={adminPunchSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3.5 rounded-lg shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 mr-1" />
                {adminPunchSubmitting ? "Punching In..." : "Punch In"}
              </Button>
            )}
            {adminEmpRecord?.status === "WORKING" && (
              <Button
                size="sm"
                onClick={handleAdminPunchOut}
                disabled={adminPunchSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-8 px-3.5 rounded-lg shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                {adminPunchSubmitting ? "Punching Out..." : "Punch Out"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Staff */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-muted/40 border border-gray-200/80 dark:border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Staff
            </span>
            <Users className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-foreground">{totalEmployees}</span>
            <span className="text-[11px] text-muted-foreground">Active</span>
          </div>
        </div>

        {/* Present Today */}
        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Present Today
            </span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {presentToday}
            </span>
            <span className="text-[11px] font-bold text-emerald-600">({attendanceRate}%)</span>
          </div>
        </div>

        {/* Working Right Now */}
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              Working Now
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-blue-700 dark:text-blue-400">
              {workingNow}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">Clocked In</span>
          </div>
        </div>

        {/* Shift Completed */}
        <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
              Shift Done
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400">
              {completedToday}
            </span>
            <span className="text-[11px] text-indigo-600 font-medium">Clocked Out</span>
          </div>
        </div>

        {/* Absent / Not Punched In */}
        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Not In Yet
            </span>
            <UserX className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-amber-700 dark:text-amber-400">
              {absentToday}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">Pending</span>
          </div>
        </div>

        {/* Leave & Overtime */}
        <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
              Leave / OT
            </span>
            <Clock className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-purple-700 dark:text-purple-400">
              {leaveToday}
            </span>
            <span className="text-[11px] text-purple-600 font-bold">Leave • {overtimeHours}h OT</span>
          </div>
        </div>
      </div>

      {/* Roster Controls: Search & Tabs */}
      <div className="px-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-gray-100 dark:border-border/60 pt-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
          {[
            { key: "All", label: `All Staff (${roster.length})` },
            { key: "WORKING", label: `Working Now (${workingNow})` },
            { key: "COMPLETED", label: `Completed (${completedToday})` },
            { key: "NOT_PUNCHED_IN", label: `Not In Yet (${absentToday})` },
            { key: "LEAVE", label: `On Leave (${leaveToday})` }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-border bg-white dark:bg-card focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Today's Roster Table */}
      <div className="overflow-x-auto border-t border-gray-100 dark:border-border/60">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-muted/30 text-muted-foreground font-bold uppercase tracking-wider border-b border-gray-200/60 dark:border-border/50 text-[10px]">
              <th className="py-2.5 px-4">Employee</th>
              <th className="py-2.5 px-3">Role / Dept</th>
              <th className="py-2.5 px-3">Today Status</th>
              <th className="py-2.5 px-3">Punch In</th>
              <th className="py-2.5 px-3">Punch Out</th>
              <th className="py-2.5 px-3">Duration</th>
              <th className="py-2.5 px-4">Shift Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-border/40">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Loading workforce attendance roster...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRoster.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No staff members match the selected filter.
                </td>
              </tr>
            ) : (
              filteredRoster.map((emp) => {
                const initials = (emp.fullName || "EMP")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <tr
                    key={emp.employeeId || emp.employeeCode}
                    className="hover:bg-blue-50/40 dark:hover:bg-muted/30 transition-colors"
                  >
                    {/* Employee */}
                    <td className="py-2 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center border border-blue-200 dark:border-blue-800">
                          {initials}
                        </div>
                        <div>
                          <span className="font-bold text-foreground block leading-tight">
                            {emp.fullName}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {emp.employeeCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role & Dept */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="text-[11px] font-medium text-foreground block">
                        {emp.role || "Staff"}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {emp.department || "General"}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {emp.status === "WORKING" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Working Now
                        </span>
                      )}
                      {emp.status === "COMPLETED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-300/80 dark:border-blue-800">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Shift Completed
                        </span>
                      )}
                      {emp.status === "LEAVE" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-300/80 dark:border-purple-800">
                          On Leave
                        </span>
                      )}
                      {emp.status === "NOT_PUNCHED_IN" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400 border border-gray-200 dark:border-border">
                          Not In Yet
                        </span>
                      )}
                    </td>

                    {/* Punch In */}
                    <td className="py-2 px-3 font-mono font-medium text-foreground whitespace-nowrap">
                      {fmtTime(emp.checkIn)}
                    </td>

                    {/* Punch Out */}
                    <td className="py-2 px-3 font-mono font-medium text-foreground whitespace-nowrap">
                      {fmtTime(emp.checkOut)}
                    </td>

                    {/* Duration */}
                    <td className="py-2 px-3 font-medium whitespace-nowrap">
                      {emp.workedMinutes > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          {fmtDuration(emp.workedMinutes)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                      {emp.overtimeHours > 0 && (
                        <span className="ml-1 text-[10px] text-purple-700 dark:text-purple-300 font-bold">
                          (+{emp.overtimeHours}h OT)
                        </span>
                      )}
                    </td>

                    {/* Shift Note */}
                    <td className="py-2 px-4 text-[11px] text-muted-foreground max-w-xs truncate">
                      {emp.remarks || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
