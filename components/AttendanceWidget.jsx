"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUser } from "@/lib/authUtils";
import { punchIn, punchOut, getTodayStatus } from "@/services/attendanceService";
import { getEmployees } from "@/services/employeeService";
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
  User
} from "lucide-react";

export function AttendanceWidget({ onPunchSuccess, title = "Employee Punch In / Punch Out Panel", compact = false }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [status, setStatus] = useState("LOADING");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [punchData, setPunchData] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Live timer tick every second
  useEffect(() => {
    const u = getUser();
    setUser(u);
    const admin = u?.role === "Admin" || u?.role === "Director" || u?.role === "Admin Manager" || u?.role === "HR";
    setIsAdmin(admin);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load employees list and determine active employee
  useEffect(() => {
    async function loadEmployees() {
      try {
        const empRes = await getEmployees({ limit: 100 });
        const list = empRes?.data?.employees || empRes?.employees || [];
        setEmployees(list);

        // Try to match logged-in user
        const currentUser = getUser();
        let defaultId = "";
        if (currentUser) {
          const matched = list.find(
            e => e._id === currentUser.employeeId || e.email?.toLowerCase() === currentUser.email?.toLowerCase()
          );
          if (matched) defaultId = matched._id;
        }

        if (!defaultId && list.length > 0) {
          // Default to first technician or first employee
          const tech = list.find(e => (e.role || "").toLowerCase().includes("tech")) || list[0];
          defaultId = tech._id;
        }

        setSelectedEmployeeId(defaultId);
      } catch (err) {
        console.error("Failed to load employees for punch widget", err);
      }
    }
    loadEmployees();
  }, []);

  // Fetch today's punch status when selected employee changes
  const fetchStatus = async (empId = selectedEmployeeId) => {
    if (!empId) return;
    setLoading(true);
    try {
      const data = await getTodayStatus(empId);
      if (data.success && data.data) {
        setStatus(data.data.status);
        setPunchData(data.data);
      } else {
        setStatus("NOT_PUNCHED_IN");
        setPunchData(null);
      }
    } catch (err) {
      console.error(err);
      setStatus("NOT_PUNCHED_IN");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchStatus(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  const handlePunchIn = async () => {
    if (!selectedEmployeeId) return toast.error("Please select an employee profile");
    setSubmitting(true);
    try {
      const res = await punchIn({
        employeeId: selectedEmployeeId,
        source: "Employee Panel (Web)",
        remarks: remarks.trim() || "Clocked in via Employee Self-Service Panel"
      });
      if (res.success) {
        toast.success(res.message || "Punched in successfully!");
        setRemarks("");
        await fetchStatus(selectedEmployeeId);
        if (onPunchSuccess) onPunchSuccess();
      } else {
        toast.error(res.message || "Failed to punch in");
      }
    } catch (err) {
      toast.error(err.message || "Network error while punching in");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePunchOut = async () => {
    if (!selectedEmployeeId) return toast.error("Please select an employee profile");
    setSubmitting(true);
    try {
      const res = await punchOut({
        employeeId: selectedEmployeeId,
        source: "Employee Panel (Web)",
        remarks: remarks.trim() || "Clocked out via Employee Self-Service Panel"
      });
      if (res.success) {
        toast.success(res.message || "Punched out successfully!");
        setRemarks("");
        await fetchStatus(selectedEmployeeId);
        if (onPunchSuccess) onPunchSuccess();
      } else {
        toast.error(res.message || "Failed to punch out");
      }
    } catch (err) {
      toast.error(err.message || "Network error while punching out");
    } finally {
      setSubmitting(false);
    }
  };

  const activeEmployee = employees.find(e => e._id === selectedEmployeeId);

  // Compute live duration if working
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

  if (loading && status === "LOADING") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-center gap-2 text-xs text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        <span>Loading attendance terminal...</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-white to-indigo-50/50 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Side: Employee Info & Live Clock */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-600 text-white flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3.5 h-3.5 animate-spin-slow" />
              Employee Self-Service Terminal
            </span>

            {/* Current Real-Time Digital Clock */}
            <span className="text-xs font-mono font-bold text-gray-700 bg-white border border-gray-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
              {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="text-xs text-gray-500 hidden sm:inline">
              {currentTime.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Display ONLY the logged-in individual's profile — no dropdown, no other employees */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 whitespace-nowrap">Employee:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-blue-200 text-blue-950 shadow-2xs">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>{activeEmployee?.fullName || user?.name || "My Account"}</span>
                <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-semibold">
                  {activeEmployee?.employeeCode || "EMP"}
                </span>
                <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                  • {activeEmployee?.role || user?.role || "Staff"}
                </span>
              </span>
            </div>

            {/* Current Status Pill */}
            {status === "NOT_PUNCHED_IN" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Shift Not Started Today
              </span>
            )}

            {status === "WORKING" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Shift Active • Working: {getLiveWorkedDuration()}
              </span>
            )}

            {status === "COMPLETED" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                Shift Completed Today
              </span>
            )}
          </div>

          {/* Details Row */}
          <div className="text-xs text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
            {status === "WORKING" && punchData?.checkIn && (
              <span>
                Punched In: <strong className="text-gray-900 font-mono">{new Date(punchData.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</strong>
              </span>
            )}

            {status === "COMPLETED" && (
              <>
                <span>
                  In: <strong className="text-gray-900 font-mono">{new Date(punchData.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</strong>
                </span>
                <span>
                  Out: <strong className="text-gray-900 font-mono">{new Date(punchData.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</strong>
                </span>
                <span>
                  Duration: <strong className="text-emerald-700">{Math.floor((punchData.workedMinutes || 0) / 60)}h {(punchData.workedMinutes || 0) % 60}m</strong>
                </span>
                {punchData.overtimeHours > 0 && (
                  <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                    +{punchData.overtimeHours}h Overtime
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Side: Punch Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <input
            type="text"
            placeholder="Shift note / site location..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white w-full sm:w-56 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
          />

          {status === "NOT_PUNCHED_IN" && (
            <Button
              onClick={handlePunchIn}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 px-5 py-2 rounded-xl shadow-md transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? "Punching In..." : "Punch In (Start Shift)"}
            </Button>
          )}

          {status === "WORKING" && (
            <Button
              onClick={handlePunchOut}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 px-5 py-2 rounded-xl shadow-md transition-all active:scale-95 animate-pulse"
            >
              <LogOut className="w-4 h-4" />
              {submitting ? "Punching Out..." : "Punch Out (End Shift)"}
            </Button>
          )}

          {status === "COMPLETED" && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 font-medium px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              Shift Logged — next punch-in opens at midnight IST
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
