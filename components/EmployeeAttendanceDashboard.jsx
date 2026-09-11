"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  UserCheck,
  LogOut,
  LogIn,
  CheckCircle2,
  Calendar,
  Sparkles,
  MapPin,
  RefreshCw,
  User,
  ArrowRight,
  TrendingUp,
  Award,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUser } from "@/lib/authUtils";
import {
  punchIn,
  punchOut,
  getTodayStatus,
  getAttendanceStats,
  getAttendance
} from "@/services/attendanceService";
import { getEmployees } from "@/services/employeeService";

export function EmployeeAttendanceDashboard() {
  const [user, setUser] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [status, setStatus] = useState("LOADING"); // 'LOADING' | 'NOT_PUNCHED_IN' | 'WORKING' | 'COMPLETED'
  const [punchData, setPunchData] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendanceData = useCallback(async (empId) => {
    setLoadingStats(true);
    try {
      const [todayRes, statsRes, recentRes] = await Promise.allSettled([
        getTodayStatus(empId),
        getAttendanceStats(),
        getAttendance({ employeeId: empId, limit: 10 })
      ]);

      // Today status
      if (todayRes.status === "fulfilled" && todayRes.value?.success && todayRes.value?.data) {
        setStatus(todayRes.value.data.status);
        setPunchData(todayRes.value.data);
      } else {
        setStatus("NOT_PUNCHED_IN");
        setPunchData(null);
      }

      // Personal stats
      if (statsRes.status === "fulfilled" && statsRes.value?.success && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }

      // Recent records
      if (recentRes.status === "fulfilled") {
        const val = recentRes.value;
        const recordsList = Array.isArray(val?.data?.records)
          ? val.data.records
          : Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val)
          ? val
          : [];
        setRecentRecords(recordsList);
      }
    } catch (err) {
      console.error("Failed to load employee attendance data:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Determine user & employee profile
  useEffect(() => {
    const u = getUser();
    setUser(u);

    async function loadProfileAndData() {
      try {
        const empRes = await getEmployees({ limit: 100 });
        const list = empRes?.data?.employees || empRes?.employees || [];
        let matched = null;
        if (u) {
          matched = list.find(
            (e) =>
              (u.employeeId && e._id === u.employeeId) ||
              (u.email && e.email?.toLowerCase() === u.email?.toLowerCase())
          );
        }
        if (!matched && list.length > 0) {
          matched = list[0];
        }
        setEmployeeProfile(matched);

        if (matched) {
          await loadAttendanceData(matched._id);
        }
      } catch (err) {
        console.error("Failed to load employee profile:", err);
      }
    }
    loadProfileAndData();
  }, [loadAttendanceData]);

  const handlePunchIn = async () => {
    const empId = employeeProfile?._id || user?.employeeId;
    if (!empId) return toast.error("Employee profile not linked");
    setSubmitting(true);
    try {
      const res = await punchIn({
        employeeId: empId,
        source: "Employee Dashboard (Web)",
        remarks: remarks.trim() || "Clocked in via Employee Dashboard"
      });
      if (res?.success) {
        toast.success(res.message || "Punched in successfully!");
        setRemarks("");
        await loadAttendanceData(empId);
      } else {
        toast.error(res?.message || "Failed to punch in");
      }
    } catch (err) {
      toast.error(err.message || "Network error while punching in");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePunchOut = async () => {
    const empId = employeeProfile?._id || user?.employeeId;
    if (!empId) return toast.error("Employee profile not linked");
    setSubmitting(true);
    try {
      const res = await punchOut({
        employeeId: empId,
        source: "Employee Dashboard (Web)",
        remarks: remarks.trim() || "Clocked out via Employee Dashboard"
      });
      if (res?.success) {
        toast.success(res.message || "Punched out successfully!");
        setRemarks("");
        await loadAttendanceData(empId);
      } else {
        toast.error(res?.message || "Failed to punch out");
      }
    } catch (err) {
      toast.error(err.message || "Network error while punching out");
    } finally {
      setSubmitting(false);
    }
  };

  // Compute live worked duration when WORKING
  const getLiveWorkedDuration = () => {
    if (!punchData?.checkIn) return "0h 0m";
    const start = new Date(punchData.checkIn);
    const diffMs = Math.max(0, currentTime - start);
    const diffMins = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    const s = Math.floor((diffMs % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
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

  const presentDays = stats?.personalPresentDays ?? employeeProfile?.presentDays ?? 0;
  const leaveDays = stats?.personalLeaveDays ?? employeeProfile?.leaveDays ?? 0;
  const overtimeHours = stats?.totalOvertimeHours ?? employeeProfile?.overtimeHours ?? 0;
  const attendanceRate = stats?.attendanceRateToday ?? 100;

  return (
    <div className="space-y-4">
      {/* ─── SECTION 1: PUNCH IN / PUNCH OUT TERMINAL ─── */}
      <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 dark:from-blue-950/30 dark:via-card dark:to-indigo-950/20 p-4 sm:p-5 shadow-xs transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Side: Profile & Digital Clock */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white flex items-center gap-1.5 shadow-2xs">
                <Clock className="w-3.5 h-3.5" />
                My Attendance Terminal
              </span>

              {/* Real-time Clock */}
              <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-card border border-gray-200 dark:border-border px-2.5 py-0.5 rounded-lg shadow-2xs">
                {currentTime.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                })}
              </span>

              <span className="text-xs text-muted-foreground hidden sm:inline">
                {currentTime.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </span>
            </div>

            {/* Profile Pill & Live Status */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white dark:bg-card border border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200 shadow-2xs">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{employeeProfile?.fullName || user?.name || "My Account"}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-gray-100 dark:bg-muted px-1.5 py-0.5 rounded font-semibold">
                  {employeeProfile?.employeeCode || "EMP"}
                </span>
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                  • {employeeProfile?.role || user?.role || "Staff"}
                </span>
              </div>

              {/* Current Status Pill */}
              {status === "NOT_PUNCHED_IN" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Shift Not Started Today
                </span>
              )}

              {status === "WORKING" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Shift Active • Working: {getLiveWorkedDuration()}
                </span>
              )}

              {status === "COMPLETED" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  Shift Completed Today
                </span>
              )}
            </div>

            {/* Today Details: Check-in / Check-out */}
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
              {status === "WORKING" && punchData?.checkIn && (
                <span>
                  Punched In At:{" "}
                  <strong className="text-foreground font-mono">
                    {fmtTime(punchData.checkIn)}
                  </strong>
                </span>
              )}

              {status === "COMPLETED" && (
                <>
                  <span>
                    In:{" "}
                    <strong className="text-foreground font-mono">
                      {fmtTime(punchData?.checkIn)}
                    </strong>
                  </span>
                  <span>
                    Out:{" "}
                    <strong className="text-foreground font-mono">
                      {fmtTime(punchData?.checkOut)}
                    </strong>
                  </span>
                  <span>
                    Total Duration:{" "}
                    <strong className="text-emerald-600 font-bold">
                      {fmtDuration(punchData?.workedMinutes)}
                    </strong>
                  </span>
                  {punchData?.overtimeHours > 0 && (
                    <span className="text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200">
                      +{punchData.overtimeHours}h Overtime
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Side: Punch Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {status !== "COMPLETED" && (
              <input
                type="text"
                placeholder="Shift note / site location..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="text-xs border border-gray-300 dark:border-border rounded-xl px-3 py-2 bg-white dark:bg-card w-full sm:w-52 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
              />
            )}

            {status === "NOT_PUNCHED_IN" && (
              <Button
                onClick={handlePunchIn}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {submitting ? "Punching In..." : "Punch In (Start Shift)"}
              </Button>
            )}

            {status === "WORKING" && (
              <Button
                onClick={handlePunchOut}
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer animate-pulse"
              >
                <LogOut className="w-4 h-4" />
                {submitting ? "Punching Out..." : "Punch Out (End Shift)"}
              </Button>
            )}

            {status === "COMPLETED" && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-semibold px-3 py-2 bg-gray-100 dark:bg-muted rounded-xl border border-gray-200 dark:border-border">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Day Complete • Next punch opens tomorrow
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: MY PERSONAL ATTENDANCE METRICS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Present Days */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-card border border-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Days Present
            </span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-foreground">{presentDays}</span>
            <span className="text-xs text-muted-foreground">Days</span>
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">
            Recorded in attendance ledger
          </p>
        </div>

        {/* Leaves Taken */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-card border border-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Leaves Taken
            </span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-foreground">{leaveDays}</span>
            <span className="text-xs text-muted-foreground">Days</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Approved personal / sick leave</p>
        </div>

        {/* Overtime Logged */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-card border border-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Overtime Logged
            </span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-purple-600">{overtimeHours}</span>
            <span className="text-xs text-muted-foreground">Hours</span>
          </div>
          <p className="text-[10px] text-purple-600 font-medium mt-1">Beyond 8h standard shift</p>
        </div>

        {/* Attendance Rate */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-card border border-border shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Attendance Rate
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-blue-600">{attendanceRate}%</span>
            <span className="text-xs text-muted-foreground">Score</span>
          </div>
          <p className="text-[10px] text-blue-600 font-medium mt-1">Discipline & punctuality</p>
        </div>
      </div>

      {/* ─── SECTION 3: MY RECENT ATTENDANCE HISTORY ─── */}
      <div className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-muted/30 border-b border-gray-200/80 dark:border-border/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              My Recent Attendance Records
            </h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-7 text-xs font-semibold text-blue-600 hover:text-blue-800 p-0"
          >
            <Link href="/attendance">
              View All History <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-muted/20 text-muted-foreground font-semibold border-b border-gray-200/60 dark:border-border/40 text-[10px] uppercase">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Punch In</th>
                <th className="py-2.5 px-3">Punch Out</th>
                <th className="py-2.5 px-3">Duration Worked</th>
                <th className="py-2.5 px-4">Remarks / Site</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-border/40">
              {loadingStats ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Loading your attendance records...</span>
                    </div>
                  </td>
                </tr>
              ) : !Array.isArray(recentRecords) || recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    No past attendance logs found for your account.
                  </td>
                </tr>
              ) : (
                (Array.isArray(recentRecords) ? recentRecords : []).map((r) => {
                  return (
                    <tr
                      key={r._id || r.id || r.date}
                      className="hover:bg-blue-50/30 dark:hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2 px-4 font-medium text-foreground whitespace-nowrap">
                        {r.date}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            r.status === "Present"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                              : r.status === "Half Day"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200"
                              : r.status === "Leave"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200"
                              : r.status === "Week Off"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200"
                              : "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 border border-gray-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="py-2 px-3 font-mono text-muted-foreground whitespace-nowrap">
                        {fmtTime(r.checkIn)}
                      </td>

                      <td className="py-2 px-3 font-mono text-muted-foreground whitespace-nowrap">
                        {fmtTime(r.checkOut)}
                      </td>

                      <td className="py-2 px-3 font-semibold whitespace-nowrap">
                        {r.workedMinutes > 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400">
                            {fmtDuration(r.workedMinutes)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {r.overtimeHours > 0 && (
                          <span className="ml-1 text-[10px] text-purple-700 dark:text-purple-300 font-bold">
                            (+{r.overtimeHours}h OT)
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-4 text-muted-foreground max-w-xs truncate text-[11px]">
                        {r.remarks || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
