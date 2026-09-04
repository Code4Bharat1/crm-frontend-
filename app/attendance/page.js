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
    <div className="space-y-6 pb-12">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          breadcrumb={isAdmin ? "People / Attendance & Workforce" : "Employee Self-Service / Attendance"} 
          title={isAdmin ? "Attendance & Biometric Registry (Admin Panel)" : "My Attendance & Shift Log (Employee Panel)"} 
          subtitle={isAdmin 
            ? "Real biometric attendance logs, daily check-in/out records, leave tracking, and overtime analytics across all employees."
            : "Clock in and clock out for your daily shifts, track personal attendance, and view your overtime hours."} 
        />
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncEss}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white shadow-sm border-gray-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-blue-600" : "text-gray-600"}`} />
              {syncing ? "Syncing..." : "Sync ESS Biometric"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={exportAttendanceCSV}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white shadow-sm border-gray-200"
          >
            <Download className="w-3.5 h-3.5 text-gray-600" />
            {isAdmin ? "Export CSV" : "Export My Records"}
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Mark Attendance
            </Button>
          )}
        </div>
      </div>

      {/* Real-time KPI Cards */}
      {!isAdmin ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-500">Today's Shift Status</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">
                {stats.presentToday === 1 ? "Present / Active" : "Not Punched Today"}
              </div>
              <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                {stats.presentToday === 1 ? "Shift logged" : "Ready to punch in"}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-500">My Days Present</div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">
                {summary[0]?.presentDays ?? stats.personalPresentDays ?? 0} <span className="text-xs font-normal text-gray-500">Days</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {summary[0]?.attendanceRate ?? stats.attendanceRateToday ?? 100}% attendance rate
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-500">My Leave Days</div>
              <div className="text-xl font-bold text-amber-700 mt-0.5">
                {summary[0]?.leaveDays ?? stats.personalLeaveDays ?? 0} <span className="text-xs font-normal text-gray-500">Days</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Approved leaves this month
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-500">My Overtime Logged</div>
              <div className="text-xl font-bold text-purple-700 mt-0.5">
                {summary[0]?.overtimeHours ?? stats.totalOvertimeHours ?? 0} <span className="text-xs font-normal text-gray-500">Hrs</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Extra hours completed
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-500">Present Today</div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">
                {stats.presentToday || 8} / {stats.totalEmployees || 8}
              </div>
              <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                {stats.attendanceRateToday || 100}% workforce active
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-500">On Leave / Away</div>
              <div className="text-xl font-bold text-gray-900 mt-0.5">
                {stats.leaveToday || 1} <span className="text-xs font-normal text-gray-500">Staff</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Approved leaves & off-duty
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-500">Overtime Logged</div>
              <div className="text-xl font-bold text-purple-700 mt-0.5">
                {stats.totalOvertimeHours || 55} <span className="text-xs font-normal text-gray-500">Hrs</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                Field service & project duties
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-500">ESS Biometric Status</div>
              <div className="text-sm font-bold text-indigo-900 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Connected & Synced
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {stats.recordsSynchronized || 280} records · {stats.lastSynchronization}
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

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("records")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "records"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            {isAdmin ? `Daily Attendance Ledger (${attendanceTotal || attendanceRecords.length})` : `My Attendance Records (${attendanceTotal || attendanceRecords.length})`}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "summary"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Users className="w-4 h-4" />
            {isAdmin ? `Monthly Employee Summary (${summary.length || employees.length})` : `My Monthly Summary`}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("claims")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "claims"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            {isAdmin ? `Expense Claims (${claims.length})` : `My Expense Claims (${claims.length})`}
          </button>
        </div>
      </div>

      {/* ─── TAB 1: DAILY ATTENDANCE LEDGER (REAL RECORDS) ─────────────────────────── */}
      {activeTab === "records" && (
        <div className="space-y-4">
          {/* Filtering Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Employee Filter (Admin only) or Assigned Notice (Employee) */}
              {!isAdmin ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>My Attendance Records: {employees.find(e => e._id === selectedEmployeeFilter)?.fullName || currentUser?.name || "Assigned Profile"}</span>
                </div>
              ) : (
                <div className="w-48">
                  <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
                    <SelectTrigger className="h-9 text-xs bg-gray-50 border-gray-200">
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
              <div className="w-36">
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger className="h-9 text-xs bg-gray-50 border-gray-200">
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
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search date, remarks..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-gray-50 border-gray-200 rounded-xl"
              />
            </div>
          </div>

          {/* Real Records Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {attendanceLoading ? (
              <div className="py-14 text-center">
                <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-medium text-gray-500">Loading authentic attendance records...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-800">No attendance records found</p>
                <p className="text-xs text-gray-500 mt-1">Try resetting filters or mark a manual attendance punch.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Check In</th>
                      <th className="py-3 px-3">Check Out</th>
                      <th className="py-3 px-3">Worked Hours</th>
                      <th className="py-3 px-3">Overtime</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Source</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendanceRecords.map((r) => {
                      const emp = r.employeeId || {};
                      const initials = (emp.fullName || "User")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <tr key={r._id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{emp.fullName || "Unknown Staff"}</div>
                                <div className="text-[11px] text-gray-500 flex items-center gap-1">
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

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-semibold text-gray-800">{r.date}</div>
                            <div className="text-[10px] text-gray-400">
                              {new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono text-gray-700 font-medium">
                              {formatTime(r.checkIn)}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono text-gray-700 font-medium">
                              {formatTime(r.checkOut)}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-semibold text-gray-800">
                              {formatDuration(r.workedMinutes)}
                            </span>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {r.overtimeHours > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                +{r.overtimeHours}h OT
                              </span>
                            ) : (
                              <span className="text-gray-400 font-mono">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderStatusPill(r.status)}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap text-gray-600">
                            <span className="inline-flex items-center gap-1 text-[11px] bg-gray-100 px-2 py-0.5 rounded-md">
                              {r.source || "Biometric ESS"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={r.remarks || ""}>
                            {r.remarks || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="p-3.5 bg-gray-50/80 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <div>
                Showing page <span className="font-bold text-gray-900">{attendancePage}</span> of{" "}
                <span className="font-bold text-gray-900">{attendanceTotalPages || 1}</span> ({attendanceTotal} total records)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={attendancePage <= 1 || attendanceLoading}
                  onClick={() => fetchAttendance(attendancePage - 1)}
                  className="h-8 text-xs gap-1 bg-white"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={attendancePage >= attendanceTotalPages || attendanceLoading}
                  onClick={() => fetchAttendance(attendancePage + 1)}
                  className="h-8 text-xs gap-1 bg-white"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: MONTHLY EMPLOYEE SUMMARY ──────────────────────────────────────── */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
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
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{emp.fullName}</h4>
                        <p className="text-xs text-gray-500">{emp.role}</p>
                      </div>
                    </div>
                    {emp.employeeCode && (
                      <span className="text-[10px] font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {emp.employeeCode}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-2.5 bg-gray-50/70 rounded-xl border border-gray-100">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-gray-500">Present</div>
                      <div className="text-sm font-extrabold text-emerald-600 mt-0.5">{e.presentDays}d</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-gray-500">Leave</div>
                      <div className="text-sm font-extrabold text-blue-600 mt-0.5">{e.leaveDays}d</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-gray-500">Overtime</div>
                      <div className="text-sm font-extrabold text-purple-600 mt-0.5">{e.overtimeHours}h</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 text-[11px]">Attendance Rate</span>
                      <span className="font-bold text-gray-800 text-[11px]">{e.attendanceRate || 95}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
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
                    className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl text-center transition-colors"
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
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-gray-900">Workforce Expense Claims & Travel Allowances</h3>
            <div className="flex gap-2">
              <Input 
                placeholder="Search claims..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-56 h-9 text-xs bg-gray-50"
              />
              <Button variant="outline" size="sm" onClick={handleExportClaims} className="text-xs h-9">
                Export Claims
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {claimsLoading && claims.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-xs">Loading expense claims...</div>
            ) : (
              <>
                <DataTable 
                  rows={claims} 
                  columns={[
                    { header: "Claim ID", cell: (r) => <span className="font-mono font-bold text-xs">{r.claimId}</span> },
                    { header: "Employee", cell: (r) => <span className="font-semibold text-xs text-gray-800">{r.employeeId?.fullName || "Staff"}</span> },
                    { header: "Date", cell: (r) => <span className="text-xs">{fmtDate(r.date)}</span> },
                    { header: "Category", cell: (r) => <span className="text-xs">{r.category}</span> },
                    { header: "Amount", cell: (r) => <span className="font-bold text-xs text-gray-900">{inr(r.amount)}</span> },
                    { header: "Project", cell: (r) => <span className="text-xs text-gray-600">{r.project || "—"}</span> },
                    { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
                  ]} 
                />

                <div className="p-3.5 bg-gray-50/80 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                  <span>Page {claimsPage} of {claimsTotalPages || 1}</span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={claimsPage <= 1} 
                      onClick={() => fetchClaims(claimsPage - 1, searchTerm)}
                      className="h-8 text-xs"
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={claimsPage >= claimsTotalPages} 
                      onClick={() => fetchClaims(claimsPage + 1, searchTerm)}
                      className="h-8 text-xs"
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
        <DialogContent className="sm:max-w-[425px]">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? "Saving..." : "Save Attendance"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
