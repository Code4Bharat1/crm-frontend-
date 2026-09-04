"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarDays,
  ShieldCheck,
  Briefcase,
  Moon,
  Coffee,
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";
import { getWeekendPolicy, updateWeekendPolicy } from "@/services/attendanceService";

/**
 * Role-check helper: Saturday and Sunday ON/OFF toggle controls
 * are visible ONLY to Admin, HR, and Manager panels.
 */
export const canManageWeekendPolicy = (user) => {
  if (!user) return false;
  const r = (user.role || "").toLowerCase().trim();
  return (
    r === "admin" ||
    r === "director" ||
    r === "admin manager" ||
    r === "hr" ||
    r.includes("manager")
  );
};

export function WeekendPolicyCard({ currentUser, onPolicyChange }) {
  const [saturdayOff, setSaturdayOff] = useState(true);
  const [sundayOff, setSundayOff] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState(null); // 'saturday' | 'sunday' | null

  // Guard: if user is not Admin, HR, or Manager, do not render this component
  const isAuthorized = canManageWeekendPolicy(currentUser);

  useEffect(() => {
    if (!isAuthorized) return;

    let mounted = true;
    async function fetchPolicy() {
      try {
        setLoading(true);
        const res = await getWeekendPolicy();
        if (mounted && res?.success && res.data) {
          setSaturdayOff(res.data.saturdayOff ?? true);
          setSundayOff(res.data.sundayOff ?? true);
        }
      } catch (error) {
        console.error("Failed to load weekend policy:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchPolicy();

    return () => {
      mounted = false;
    };
  }, [isAuthorized]);

  if (!isAuthorized) {
    return null;
  }

  const handleToggleSaturday = async (newOffState) => {
    try {
      setSavingDay("saturday");
      const prevSaturdayOff = saturdayOff;
      setSaturdayOff(newOffState); // optimistic update

      const res = await updateWeekendPolicy({
        saturdayOff: newOffState,
        sundayOff: sundayOff
      });

      if (res?.success) {
        const statusLabel = newOffState ? "OFF (Weekend Holiday)" : "ON (Working Day)";
        toast.success(`Saturday set to ${statusLabel}`);
        if (onPolicyChange) onPolicyChange(res.data);
      } else {
        setSaturdayOff(prevSaturdayOff);
        toast.error(res?.message || "Failed to update Saturday policy");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update weekend policy");
    } finally {
      setSavingDay(null);
    }
  };

  const handleToggleSunday = async (newOffState) => {
    try {
      setSavingDay("sunday");
      const prevSundayOff = sundayOff;
      setSundayOff(newOffState); // optimistic update

      const res = await updateWeekendPolicy({
        saturdayOff: saturdayOff,
        sundayOff: newOffState
      });

      if (res?.success) {
        const statusLabel = newOffState ? "OFF (Weekend Holiday)" : "ON (Working Day)";
        toast.success(`Sunday set to ${statusLabel}`);
        if (onPolicyChange) onPolicyChange(res.data);
      } else {
        setSundayOff(prevSundayOff);
        toast.error(res?.message || "Failed to update Sunday policy");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update weekend policy");
    } finally {
      setSavingDay(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white px-5 py-4 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                Weekend Work Policy (Saturday & Sunday)
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100/80 text-blue-800 border border-blue-200">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                Admin, HR & Manager Only
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Set Saturday and Sunday operational status. Toggling <span className="font-semibold text-gray-700">OFF</span> marks the day as a Weekly Holiday (Week Off); toggling <span className="font-semibold text-emerald-700">ON</span> designates it as a Working Day.
            </p>
          </div>
        </div>

        {/* Live Status Overview */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
            saturdayOff ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${saturdayOff ? "bg-gray-400" : "bg-emerald-500 animate-pulse"}`} />
            Sat: {saturdayOff ? "OFF" : "ON (Work)"}
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
            sundayOff ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sundayOff ? "bg-gray-400" : "bg-emerald-500 animate-pulse"}`} />
            Sun: {sundayOff ? "OFF" : "ON (Work)"}
          </div>
        </div>
      </div>

      {/* Control Tiles (Saturday & Sunday) */}
      <div className="p-5 grid gap-4 md:grid-cols-2">
        {/* ─── SATURDAY POLICY TILE ─── */}
        <div className={`rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between ${
          saturdayOff 
            ? "bg-slate-50/80 border-gray-200/90" 
            : "bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 border-emerald-200 shadow-sm"
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  saturdayOff ? "bg-gray-200/80 text-gray-600" : "bg-emerald-600 text-white shadow-sm"
                }`}>
                  {saturdayOff ? <Coffee className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Saturday</h4>
                  <p className="text-[11px] text-gray-500">Weekly operational schedule</p>
                </div>
              </div>

              {/* Status Badge */}
              {saturdayOff ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  <Moon className="w-3 h-3 text-gray-500" />
                  OFF (Weekend Off)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  ON (Working Day)
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 mt-3 leading-relaxed">
              {saturdayOff
                ? "Saturday is configured as a Weekly Holiday (Week Off). Standard workforce shifts and biometric check-ins are not required."
                : "Saturday is configured as an Active Working Day. Employees must clock in for their regular shifts, and punch records are logged."}
            </p>
          </div>

          {/* Controls: Segmented Buttons */}
          <div className="mt-4 pt-3 border-t border-gray-200/80 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-500">
              Schedule Mode:
            </span>

            {/* Segmented Button Group (OFF vs ON) */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-gray-100/90 border border-gray-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleToggleSaturday(true)}
                disabled={loading || savingDay === "saturday"}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-semibold ${
                  saturdayOff
                    ? "bg-white text-gray-800 shadow-sm border border-gray-200/80"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {savingDay === "saturday" && saturdayOff && (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                )}
                OFF (Holiday)
              </button>
              <button
                type="button"
                onClick={() => handleToggleSaturday(false)}
                disabled={loading || savingDay === "saturday"}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-semibold ${
                  !saturdayOff
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {savingDay === "saturday" && !saturdayOff ? (
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-3 h-3 text-emerald-200" />
                )}
                ON (Working)
              </button>
            </div>
          </div>
        </div>

        {/* ─── SUNDAY POLICY TILE ─── */}
        <div className={`rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between ${
          sundayOff 
            ? "bg-slate-50/80 border-gray-200/90" 
            : "bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 border-emerald-200 shadow-sm"
        }`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  sundayOff ? "bg-gray-200/80 text-gray-600" : "bg-emerald-600 text-white shadow-sm"
                }`}>
                  {sundayOff ? <Coffee className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Sunday</h4>
                  <p className="text-[11px] text-gray-500">Weekly operational schedule</p>
                </div>
              </div>

              {/* Status Badge */}
              {sundayOff ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  <Moon className="w-3 h-3 text-gray-500" />
                  OFF (Weekend Off)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  ON (Working Day)
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 mt-3 leading-relaxed">
              {sundayOff
                ? "Sunday is configured as a Weekly Holiday (Week Off). Standard workforce rest day with no scheduled attendance."
                : "Sunday is configured as an Active Working Day. Special shift operations are active and workforce punch-in is recorded."}
            </p>
          </div>

          {/* Controls: Segmented Buttons */}
          <div className="mt-4 pt-3 border-t border-gray-200/80 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-500">
              Schedule Mode:
            </span>

            {/* Segmented Button Group (OFF vs ON) */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-gray-100/90 border border-gray-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleToggleSunday(true)}
                disabled={loading || savingDay === "sunday"}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-semibold ${
                  sundayOff
                    ? "bg-white text-gray-800 shadow-sm border border-gray-200/80"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {savingDay === "sunday" && sundayOff && (
                  <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                )}
                OFF (Holiday)
              </button>
              <button
                type="button"
                onClick={() => handleToggleSunday(false)}
                disabled={loading || savingDay === "sunday"}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-semibold ${
                  !sundayOff
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {savingDay === "sunday" && !sundayOff ? (
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                ) : (
                  <Sparkles className="w-3 h-3 text-emerald-200" />
                )}
                ON (Working)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-2.5 bg-gray-50/80 border-t border-gray-200/70 flex items-center justify-between text-[11px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>Policies update across biometric ledgers and ESS records automatically.</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Policy System Online</span>
        </div>
      </div>
    </div>
  );
}
