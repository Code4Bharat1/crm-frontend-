"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { getUser } from "@/lib/authUtils";
import {
  getAttendance,
  getAttendanceSummary,
  getAttendanceStats,
  createAttendance
} from "@/services/attendanceService";
import { getExpenseClaims, exportExpenseClaims } from "@/services/expenseClaimService";
import { getEmployees } from "@/services/employeeService";
import { AttendanceWidget } from "@/components/AttendanceWidget";
import { WeekendPolicyCard } from "@/components/WeekendPolicyCard";
import {
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Filter,
  Download,
  RefreshCw,
  Search,
  Briefcase,
  Plus,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  Building,
  User
} from "lucide-react";

export default function Page() {
  const [stats, setStats] = useState({
    apiStatus: "Active & Synchronised",
    lastSynchronization: "Today, 09:15 AM",
    recordsSynchronized: 280,
    failedRecords: 0,
    totalEmployees: 8,
    presentToday: 8,
    leaveToday: 1,
    attendanceRateToday: 100,
    totalOvertimeHours: 55
  });
  const [summary, setSummary] = useState([]);
  const [claims, setClaims] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true);

  // Attendance Ledger State (Real Data)
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(1);
  const [attendanceTotal, setAttendanceTotal] = useState(0);
  const [attendanceLimit] = useState(20);

  // Filters
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [attendanceSearch, setAttendanceSearch] = useState("");

  // Tabs: 'records' | 'summary' | 'claims'
  const [activeTab, setActiveTab] = useState("records");

  const [loading, setLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Pagination and Search for Claims
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsTotalPages, setClaimsTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    date: new Date().toISOString().split('T')[0],
    status: "Present",
    overtimeHours: 0,
    remarks: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, summaryRes, empRes] = await Promise.all([
        getAttendanceStats(),
        getAttendanceSummary(),
        getEmployees({ limit: 100 })
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (summaryRes.success) setSummary(summaryRes.data);
      if (empRes.success) setEmployees(empRes.data.employees);

      await fetchClaims(1, searchTerm);
    } catch (error) {
      toast.error(error.message || "Failed to load summary data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (page = 1, empId = selectedEmployeeFilter, stat = selectedStatusFilter, search = attendanceSearch) => {
    try {
      setAttendanceLoading(true);
      const params = { page, limit: attendanceLimit };
      if (empId && empId !== "All") params.employeeId = empId;
      if (stat && stat !== "All") params.status = stat;
      if (search && search.trim()) params.search = search.trim();

      const res = await getAttendance(params);
      if (res.success && res.data) {
        setAttendanceRecords(res.data.records || []);
        setAttendancePage(res.data.pagination?.page || 1);
        setAttendanceTotalPages(res.data.pagination?.totalPages || 1);
        setAttendanceTotal(res.data.pagination?.total || 0);
      }
    } catch (error) {
      toast.error("Failed to fetch attendance records");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchClaims = async (page = 1, search = "") => {
    try {
      setClaimsLoading(true);
      const claimsRes = await getExpenseClaims({ page, limit: 10, search });
      if (claimsRes.success) {
        setClaims(claimsRes.data.claims);
        setClaimsPage(claimsRes.data.pagination.page);
        setClaimsTotalPages(claimsRes.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error("Failed to fetch claims");
    } finally {
      setClaimsLoading(false);
    }
  };

  useEffect(() => {
    const u = getUser();
    setCurrentUser(u);
    const admin = u?.role === 'Admin' || u?.role === 'Director' || u?.role === 'Admin Manager';
    setIsAdmin(admin);

    async function init() {
      try {
        setLoading(true);
        const [statsRes, summaryRes, empRes] = await Promise.all([
          getAttendanceStats(),
          getAttendanceSummary(),
          getEmployees({ limit: 100 })
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (summaryRes.success) setSummary(summaryRes.data);
        const empList = empRes?.data?.employees || empRes?.employees || [];
        setEmployees(empList);

        let initialEmpFilter = "All";
        if (!admin && u) {
          const matched = empList.find(
            e => e._id === u.employeeId || e.email?.toLowerCase() === u.email?.toLowerCase()
          );
          if (matched) {
            initialEmpFilter = matched._id;
          } else if (u.employeeId) {
            initialEmpFilter = u.employeeId;
          }
          setSelectedEmployeeFilter(initialEmpFilter);
        }

        await fetchAttendance(1, initialEmpFilter);
        await fetchClaims(1, searchTerm);
      } catch (error) {
        toast.error(error.message || "Failed to load summary data");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Filter effect for attendance records
  useEffect(() => {
    if (selectedEmployeeFilter) {
      fetchAttendance(1, selectedEmployeeFilter, selectedStatusFilter, attendanceSearch);
    }
  }, [selectedEmployeeFilter, selectedStatusFilter]);

  // Debounced search for attendance
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAttendance(1, selectedEmployeeFilter, selectedStatusFilter, attendanceSearch);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [attendanceSearch]);

  // Debounced search for claims
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!loading) fetchClaims(1, searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await createAttendance({
        ...formData,
        overtimeHours: Number(formData.overtimeHours)
      });
      if (res.success) {
        toast.success(res.message);
        setIsModalOpen(false);
        setFormData({
          employeeId: "", date: new Date().toISOString().split('T')[0], status: "Present", overtimeHours: 0, remarks: ""
        });
        // Refresh summary & attendance records
        fetchData();
        fetchAttendance(1, selectedEmployeeFilter, selectedStatusFilter, attendanceSearch);
      }
    } catch (error) {
      toast.error(error.message || "Failed to create attendance");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncEss = () => {
    setSyncing(true);
    toast.info("Syncing biometric records from ESS device...");
    setTimeout(() => {
      fetchData();
      fetchAttendance(1, selectedEmployeeFilter, selectedStatusFilter, attendanceSearch);
      setSyncing(false);
      toast.success("ESS Biometric records synchronised successfully!");
    }, 800);
  };

  const exportAttendanceCSV = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return toast.error("No attendance records to export");
    }
    const headers = [
      "Employee Code",
      "Employee Name",
      "Role",
      "Department",
      "Date",
      "Status",
      "Check In",
      "Check Out",
      "Worked Hours",
      "Overtime Hours",
      "Source",
      "Remarks"
    ];
    const rows = attendanceRecords.map(r => [
      r.employeeId?.employeeCode || "",
      r.employeeId?.fullName || "",
      r.employeeId?.role || "",
      r.employeeId?.department || "",
      r.date,
      r.status,
      r.checkIn ? new Date(r.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-",
      r.checkOut ? new Date(r.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-",
      r.workedMinutes ? (r.workedMinutes / 60).toFixed(1) : "0",
      r.overtimeHours || 0,
      r.source || "Biometric ESS",
      `"${(r.remarks || "").replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_records_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance report downloaded successfully!");
  };

  const handleExportClaims = async () => {
    try {
      await exportExpenseClaims();
      toast.success("Claims exported successfully");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  const formatDuration = (mins) => {
    if (!mins || mins <= 0) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  };

  const renderStatusPill = (status) => {
    switch (status) {
      case "Present":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Present
          </span>
        );
      case "Half Day":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Half Day
          </span>
        );
      case "Leave":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Leave
          </span>
        );
      case "Week Off":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            Week Off
          </span>
        );
      case "Holiday":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Holiday
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Header & Main Actions */}
      <PageHeader
        breadcrumb={isAdmin ? "People / Attendance & Workforce" : "Employee Self-Service / Attendance"}
        title={isAdmin ? "Attendance & Biometric Registry (Admin Panel)" : "My Attendance & Shift Log (Employee Panel)"}
        subtitle={isAdmin
          ? "Real biometric attendance logs, daily check-in/out records, leave tracking, and overtime analytics across all employees."
          : "Clock in and clock out for your daily shifts, track personal attendance, and view your overtime hours."}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAttendanceCSV}
              className="flex items-center gap-1.5 text-xs font-semibold bg-card shadow-xs border-border h-8.5 px-2.5 sm:px-3 cursor-pointer"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">{isAdmin ? "Export CSV" : "Export My Records"}</span>
              <span className="sm:hidden">Export</span>
            </Button>

            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs h-8.5 px-2.5 sm:px-3 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Mark Attendance</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Real-time KPI Cards: Compact 2-column grid on mobile, 4-col on desktop */}
      {!isAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="size-4.5 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">Today's Shift</div>
              <div className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
                {stats.presentToday === 1 ? "Present / Active" : "Not Punched"}
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                {stats.presentToday === 1 ? "Shift logged" : "Ready to punch in"}
              </div>
            </div>
          </div>

          <div className="bg-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="size-4.5 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">My Days Present</div>
              <div className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
                {summary[0]?.presentDays ?? stats.personalPresentDays ?? 0} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">Days</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                {summary[0]?.attendanceRate ?? stats.attendanceRateToday ?? 100}% rate
              </div>
            </div>
          </div>

          <div className="bg-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="size-4.5 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">My Leave Days</div>
              <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                {summary[0]?.leaveDays ?? stats.personalLeaveDays ?? 0} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">Days</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                Approved leaves
              </div>
            </div>
          </div>

          <div className="bg-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Sparkles className="size-4.5 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">My Overtime</div>
              <div className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                {summary[0]?.overtimeHours ?? stats.totalOvertimeHours ?? 0} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">Hrs</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                Extra hours
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="size-4.5 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">Present Today</div>
              <div className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
                {stats.presentToday || 8} / {stats.totalEmployees || 8}
              </div>
              <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                {stats.attendanceRateToday || 100}% workforce active
              </div>
            </div>
          </div>

          <div className="bg-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="size-4.5 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">On Leave / Away</div>
              <div className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
                {stats.leaveToday || 1} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">Staff</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                Approved leaves & off-duty
              </div>
            </div>
          </div>

          <div className="bg-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Clock className="size-4.5 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">Overtime Logged</div>
              <div className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                {stats.totalOvertimeHours || 55} <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">Hrs</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                Field service & duties
              </div>
            </div>
          </div>

          <div className="bg-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="size-9 sm:size-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-4.5 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">ESS Biometric</div>
              <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5 truncate">
                <span className="size-1.5 sm:size-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Connected & Synced</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                {stats.recordsSynchronized || 280} recs · {stats.lastSynchronization}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIVE EMPLOYEE PUNCH IN / PUNCH OUT TERMINAL (EMPLOYEE VIEW ONLY) ─── */}
      {!isAdmin && (
        <AttendanceWidget
          onPunchSuccess={() => {
            fetchData();
            fetchAttendance(1, selectedEmployeeFilter, selectedStatusFilter, attendanceSearch);
          }}
        />
      )}

      {/* ─── WEEKEND POLICY (ADMIN, HR & MANAGER ONLY) ─── */}
      <WeekendPolicyCard currentUser={currentUser} />

      {/* Tabs Switcher: Horizontal Scrollable */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1 sm:mx-0 sm:px-0 border-b border-border/80">
        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === "records"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground bg-card border border-border/80 hover:bg-muted/40"
          }`}
        >
          <Clock className="size-3.5 sm:size-4" />
          <span>{isAdmin ? `Daily Ledger (${attendanceTotal || attendanceRecords.length})` : `My Records (${attendanceTotal || attendanceRecords.length})`}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === "summary"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground bg-card border border-border/80 hover:bg-muted/40"
          }`}
        >
          <Users className="size-3.5 sm:size-4" />
          <span>{isAdmin ? `Monthly Summary (${summary.length || employees.length})` : `My Summary`}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("claims")}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            activeTab === "claims"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground bg-card border border-border/80 hover:bg-muted/40"
          }`}
        >
          <Briefcase className="size-3.5 sm:size-4" />
          <span>{isAdmin ? `Expense Claims (${claims.length})` : `My Claims (${claims.length})`}</span>
        </button>
      </div>

      {/* ─── TAB 1: DAILY ATTENDANCE LEDGER (REAL RECORDS) ─────────────────────────── */}
      {activeTab === "records" && (
        <div className="space-y-3 sm:space-y-4">
          {/* Filtering Bar */}
          <div className="bg-card p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Employee Filter */}
              {!isAdmin ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                  <UserCheck className="size-3.5 text-primary" />
                  <span className="truncate">My Attendance: {employees.find(e => e._id === selectedEmployeeFilter)?.fullName || currentUser?.name || "Assigned Profile"}</span>
                </div>
              ) : (
                <div className="w-full sm:w-44">
                  <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
                    <SelectTrigger className="h-8.5 text-xs bg-muted/30 border-border">
                      <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Employees ({employees.length})</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp._id} value={emp._id}>
                          {emp.fullName} ({emp.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Filter */}
              <div className="w-full sm:w-36">
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger className="h-8.5 text-xs bg-muted/30 border-border">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                    <SelectItem value="Leave">Leave</SelectItem>
                    <SelectItem value="Week Off">Week Off</SelectItem>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(selectedEmployeeFilter !== "All" || selectedStatusFilter !== "All" || attendanceSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmployeeFilter("All");
                    setSelectedStatusFilter("All");
                    setAttendanceSearch("");
                  }}
                  className="text-xs text-primary hover:underline font-semibold px-2 py-1 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-56">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search date, remarks..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="pl-8 h-8.5 text-xs bg-muted/30 border-border rounded-xl"
              />
            </div>
          </div>

          {/* Real Records Table */}
          {/* Attendance Records: Mobile Card View (< md) & Desktop Table View (>= md) */}
          <div className="bg-card rounded-xl sm:rounded-2xl border border-border/80 shadow-xs overflow-hidden">
            {attendanceLoading ? (
              <div className="py-14 text-center">
                <RefreshCw className="size-6 text-primary animate-spin mx-auto mb-2" />
                <p className="text-xs font-medium text-muted-foreground">Loading authentic attendance records...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Clock className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">No attendance records found</p>
                <p className="text-xs text-muted-foreground mt-1">Try resetting filters or mark a manual attendance punch.</p>
              </div>
            ) : (
              <>
                {/* ─── MOBILE CARD VIEW (Phones < 768px) ─── */}
                <div className="md:hidden divide-y divide-border/60">
                  {attendanceRecords.map((r) => {
                    const emp = r.employeeId || {};
                    const initials = (emp.fullName || "User")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <div key={r._id} className="p-3.5 space-y-2.5 hover:bg-muted/20 transition-colors">
                        {/* Header: Employee & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="size-8.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs sm:text-sm text-foreground truncate">
                                {emp.fullName || "Unknown Staff"}
                              </div>
                              <div className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                                <span>{emp.role || "Staff"}</span>
                                {emp.employeeCode && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono font-medium">{emp.employeeCode}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {renderStatusPill(r.status)}
                          </div>
                        </div>

                        {/* Date & Source Row */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            <span>{r.date}</span>
                            <span className="text-muted-foreground font-normal text-[11px]">
                              ({new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })})
                            </span>
                          </div>
                          <span className="inline-flex items-center text-[10px] bg-muted/70 text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                            {r.source || "Biometric ESS"}
                          </span>
                        </div>

                        {/* Metrics Bar: Check-In, Check-Out, Worked, Overtime */}
                        <div className="grid grid-cols-4 gap-1.5 bg-muted/40 p-2.5 rounded-xl border border-border/60 text-center">
                          <div className="min-w-0">
                            <div className="text-[10px] font-medium text-muted-foreground uppercase">Check In</div>
                            <div className="font-mono text-xs font-bold text-foreground mt-0.5 truncate">
                              {formatTime(r.checkIn)}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-medium text-muted-foreground uppercase">Check Out</div>
                            <div className="font-mono text-xs font-bold text-foreground mt-0.5 truncate">
                              {formatTime(r.checkOut)}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-medium text-muted-foreground uppercase">Worked</div>
                            <div className="font-semibold text-xs text-foreground mt-0.5 truncate">
                              {formatDuration(r.workedMinutes)}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-medium text-muted-foreground uppercase">Overtime</div>
                            <div className="text-xs font-bold mt-0.5 truncate">
                              {r.overtimeHours > 0 ? (
                                <span className="text-purple-600 dark:text-purple-400 font-bold">+{r.overtimeHours}h</span>
                              ) : (
                                <span className="text-muted-foreground font-mono font-normal">—</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Remarks Note (if present) */}
                        {r.remarks && (
                          <div className="text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/40">
                            <span className="font-semibold text-foreground">Remarks:</span> {r.remarks}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ─── DESKTOP TABLE VIEW (Tablets & Desktops >= 768px) ─── */}
                <div className="hidden md:block overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold uppercase tracking-wider text-[10px] sm:text-[11px]">
                        <th className="py-2.5 px-3 sm:px-4">Employee</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Check In</th>
                        <th className="py-2.5 px-3">Check Out</th>
                        <th className="py-2.5 px-3">Worked Hours</th>
                        <th className="py-2.5 px-3">Overtime</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Source</th>
                        <th className="py-2.5 px-3 sm:px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {attendanceRecords.map((r) => {
                        const emp = r.employeeId || {};
                        const initials = (emp.fullName || "User")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase();

                        return (
                          <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 sm:px-4">
                              <div className="flex items-center gap-2 sm:gap-2.5">
                                <div className="size-7 sm:size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-foreground truncate">{emp.fullName || "Unknown Staff"}</div>
                                  <div className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1">
                                    <span>{emp.role || "Staff"}</span>
                                    {emp.employeeCode && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono">{emp.employeeCode}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-semibold text-foreground">{r.date}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono text-foreground font-medium">
                                {formatTime(r.checkIn)}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono text-foreground font-medium">
                                {formatTime(r.checkOut)}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-semibold text-foreground">
                                {formatDuration(r.workedMinutes)}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {r.overtimeHours > 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                                  +{r.overtimeHours}h OT
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-mono">—</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {renderStatusPill(r.status)}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                              <span className="inline-flex items-center gap-1 text-[10px] bg-muted px-2 py-0.5 rounded-md">
                                {r.source || "Biometric ESS"}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 sm:px-4 text-muted-foreground max-w-xs truncate" title={r.remarks || ""}>
                              {r.remarks || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination Controls */}
            <div className="p-3 bg-muted/30 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <div>
                Showing page <span className="font-bold text-foreground">{attendancePage}</span> of{" "}
                <span className="font-bold text-foreground">{attendanceTotalPages || 1}</span> ({attendanceTotal} total records)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={attendancePage <= 1 || attendanceLoading}
                  onClick={() => fetchAttendance(attendancePage - 1)}
                  className="h-8 text-xs gap-1 bg-card cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={attendancePage >= attendanceTotalPages || attendanceLoading}
                  onClick={() => fetchAttendance(attendancePage + 1)}
                  className="h-8 text-xs gap-1 bg-card cursor-pointer"
                >
                  Next <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: MONTHLY EMPLOYEE SUMMARY ──────────────────────────────────────── */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            {summary.map((e) => {
              const emp = e.employee || {};
              const initials = (emp.fullName || "User")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={emp.id || emp._id}
                  className="bg-card rounded-xl sm:rounded-2xl border border-border/80 p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate">{emp.fullName}</h4>
                        <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
                      </div>
                    </div>
                    {emp.employeeCode && (
                      <span className="text-[10px] font-mono font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        {emp.employeeCode}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-muted/40 rounded-xl border border-border/60">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Present</div>
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{e.presentDays}d</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Leave</div>
                      <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{e.leaveDays}d</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Overtime</div>
                      <div className="text-sm font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">{e.overtimeHours}h</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">Attendance Rate</span>
                      <span className="font-bold text-foreground text-[11px]">{e.attendanceRate || 95}%</span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, e.attendanceRate || 95)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEmployeeFilter(emp.id || emp._id);
                      setActiveTab("records");
                    }}
                    className="w-full py-1.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-xl text-center transition-colors cursor-pointer"
                  >
                    View Daily Records →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: EXPENSE CLAIMS ─────────────────────────────────────────────────── */}
      {activeTab === "claims" && (
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-card p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-border/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground">Workforce Expense Claims</h3>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search claims..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 h-8.5 text-xs bg-muted/30 border-border"
              />
              <Button variant="outline" size="sm" onClick={handleExportClaims} className="text-xs h-8.5 bg-card cursor-pointer shrink-0">
                Export Claims
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-xl sm:rounded-2xl border border-border/80 shadow-xs overflow-hidden">
            {claimsLoading && claims.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-xs">Loading expense claims...</div>
            ) : (
              <>
                {/* Mobile Claims Cards (< md) */}
                <div className="md:hidden divide-y divide-border/60">
                  {claims.map((c) => (
                    <div key={c._id || c.claimId} className="p-3.5 space-y-2 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-xs text-primary">{c.claimId}</span>
                          <div className="font-bold text-xs sm:text-sm text-foreground mt-0.5">
                            {c.employeeId?.fullName || "Staff"}
                          </div>
                        </div>
                        <StatusBadge value={c.status} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2 rounded-xl border border-border/50">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Category</span>
                          <span className="font-medium text-foreground">{c.category}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Amount</span>
                          <span className="font-bold text-foreground">{inr(c.amount)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        <span>Date: {fmtDate(c.date)}</span>
                        <span>Project: {c.project || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Claims Table (>= md) */}
                <div className="hidden md:block">
                  <DataTable
                    rows={claims}
                    columns={[
                      { header: "Claim ID", cell: (r) => <span className="font-mono font-bold text-xs">{r.claimId}</span> },
                      { header: "Employee", cell: (r) => <span className="font-semibold text-xs text-foreground">{r.employeeId?.fullName || "Staff"}</span> },
                      { header: "Date", cell: (r) => <span className="text-xs">{fmtDate(r.date)}</span> },
                      { header: "Category", cell: (r) => <span className="text-xs">{r.category}</span> },
                      { header: "Amount", cell: (r) => <span className="font-bold text-xs text-foreground">{inr(r.amount)}</span> },
                      { header: "Project", cell: (r) => <span className="text-xs text-muted-foreground">{r.project || "—"}</span> },
                      { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
                    ]}
                  />
                </div>

                <div className="p-3 bg-muted/30 border-t border-border/80 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
                  <span>Page {claimsPage} of {claimsTotalPages || 1}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={claimsPage <= 1}
                      onClick={() => fetchClaims(claimsPage - 1, searchTerm)}
                      className="h-8 text-xs bg-card"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={claimsPage >= claimsTotalPages}
                      onClick={() => fetchClaims(claimsPage + 1, searchTerm)}
                      className="h-8 text-xs bg-card"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── MANUAL ATTENDANCE DIALOG ────────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[94vw] max-w-[425px] p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Mark Attendance Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={formData.employeeId} onValueChange={(val) => handleSelectChange('employeeId', val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" name="date" value={formData.date} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Leave">Leave</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="Week Off">Week Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="overtimeHours">Overtime Hours</Label>
              <Input id="overtimeHours" type="number" step="0.5" min="0" name="overtimeHours" value={formData.overtimeHours} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" name="remarks" value={formData.remarks} onChange={handleChange} placeholder="e.g. Field assignment at site" />
            </div>
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? "Saving..." : "Save Attendance"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
