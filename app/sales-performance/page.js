"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { RotateCw, Users, TrendingUp, Target, Award, Pencil, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

import { Kpi, Metric, PageHeader, Section } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inrShort } from "@/lib/crm-data";
import { getSalesPerformance, updateSalesTarget } from "@/lib/api";
import { getUser } from "@/lib/authUtils";
import { toast } from "sonner";

export default function SalesPerformancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canSetTarget, setCanSetTarget] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState("");

  // Target editing modal state
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [targetInLakhs, setTargetInLakhs] = useState("");
  const [submittingTarget, setSubmittingTarget] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSalesPerformance();
      if (res?.success && res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load real sales performance data:", err);
      toast.error("Could not load real sales performance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getUser();
    const role = (user?.role || "").toLowerCase().trim();
    setCurrentUserRole(user?.role || "Admin / Manager");
    // Admin, Director, Admin Manager, and Managers can set/update sales targets
    const isRestricted = role === "technician" || role === "service" || role === "support";
    setCanSetTarget(!isRestricted);

    fetchPerformance();
  }, [fetchPerformance]);

  const openTargetModal = (person) => {
    setEditingPerson(person);
    setDialogError("");
    const inLakhs = person.target ? (person.target / 100000).toFixed(1) : "15.0";
    setTargetInLakhs(inLakhs.endsWith(".0") ? inLakhs.slice(0, -2) : inLakhs);
    setTargetDialogOpen(true);
  };

  const handleSaveTarget = async () => {
    if (!editingPerson?.id || !targetInLakhs) return;
    setDialogError("");
    try {
      setSubmittingTarget(true);
      const targetInRupees = Math.round(Number(targetInLakhs) * 100000);
      const res = await updateSalesTarget(editingPerson.id, targetInRupees);
      if (res?.success) {
        toast.success(res.message || "Sales target updated successfully");
        setTargetDialogOpen(false);
        await fetchPerformance();
      } else {
        const errMsg = res?.message || "Failed to update sales target";
        setDialogError(errMsg);
        toast.error(errMsg);
      }
    } catch (err) {
      console.error("Error updating sales target:", err);
      const errMsg = err.message || "Error updating target";
      setDialogError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmittingTarget(false);
    }
  };


  const summary = data?.summary || {
    salespeopleCount: 0,
    totalTarget: 0,
    totalAchieved: 0,
    aboveTarget: 0,
    totalLeads: 0,
    totalWonLeads: 0,
    totalQuotations: 0,
    totalConfirmedQuotations: 0,
    totalConfirmedQuotationAmount: 0
  };

  const salespeople = data?.salespeople || [];
  const teamComparison = data?.teamComparison || [];

  return (
    <>
      <PageHeader 
        breadcrumb="People / Sales Performance" 
        title="Sales Performance" 
        subtitle="Target vs achievement, leads, conversion and revenue for every salesperson."
        actions={
          <div className="flex items-center gap-2">
            {canSetTarget && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-800">
                <Target className="size-3.5 text-blue-600" />
                Target Management Enabled
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPerformance}
              disabled={loading}
              className="flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <RotateCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>{loading ? "Refreshing..." : "Refresh Live Sales"}</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Kpi 
          label="Salespeople" 
          value={summary.salespeopleCount} 
          icon={Users}
        />
        <Kpi 
          label="Total target" 
          value={inrShort(summary.totalTarget)} 
          icon={Target}
        />
        <Kpi 
          label="Total achieved" 
          value={inrShort(summary.totalAchieved)} 
          sub={`${summary.totalConfirmedQuotations || 0} approved quotes`}
          tone={summary.totalAchieved >= summary.totalTarget ? "success" : "default"} 
          icon={TrendingUp}
        />
        <Kpi 
          label="Above target" 
          value={summary.aboveTarget} 
          tone={summary.aboveTarget > 0 ? "accent" : "default"} 
          icon={Award}
        />
      </div>

      {loading && !data ? (
        <div className="mt-8 flex flex-col items-center justify-center py-16 text-muted-foreground">
          <RotateCw className="size-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium">Loading real sales performance records...</p>
        </div>
      ) : salespeople.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-8 sm:p-12 text-center text-muted-foreground">
          <Users className="mx-auto size-10 text-muted-foreground/60 mb-2" />
          <h3 className="text-base font-semibold text-foreground">No Sales Team Members Found</h3>
          <p className="mt-1 text-xs">Ensure employees are registered with role or department as &quot;Sales&quot;.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 sm:mt-5 grid gap-3 sm:gap-4 lg:grid-cols-2">
            {salespeople.map((s) => {
              const pct = s.pct ?? (s.target > 0 ? Math.round(((s.achieved ?? 0) / s.target) * 100) : 0);
              const isAbove = pct >= 100;
              return (
                <Section 
                  key={s.id || s.name} 
                  title={s.name.toUpperCase()} 
                  description={`${s.code} · ${s.department}`}
                  actions={
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {canSetTarget && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTargetModal(s)}
                          className="h-7 text-[11px] sm:text-xs font-semibold gap-1 sm:gap-1.5 px-2 sm:px-2.5 border-primary/40 text-primary hover:bg-primary/10 shadow-2xs cursor-pointer"
                        >
                          <Pencil className="size-3" />
                          <span>Set Target</span>
                        </Button>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold ${
                        isAbove 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" 
                          : pct >= 50 
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" 
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}>
                        {isAbove ? "Above Target" : pct >= 50 ? "On Track" : "In Progress"}
                      </span>
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {/* 1. Target with Edit Action */}
                    <div 
                      onClick={() => canSetTarget && openTargetModal(s)}
                      className={`rounded-lg border border-border bg-muted/40 p-2.5 sm:p-3 relative flex flex-col justify-between transition-colors ${
                        canSetTarget ? "hover:border-primary/50 hover:bg-muted/70 cursor-pointer group" : ""
                      }`}
                      title={canSetTarget ? "Click to change target" : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Target</p>
                        {canSetTarget && (
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-primary group-hover:underline">
                            <Pencil className="size-2.5" />
                            <span>Edit</span>
                          </span>
                        )}
                      </div>
                      <p className="font-display text-base sm:text-lg font-bold text-foreground mt-0.5">
                        {inrShort(s.target ?? 0)}
                      </p>
                    </div>

                    {/* 2. Achieved - Driven by Quotation Amount */}
                    <div className="rounded-lg border border-border bg-muted/40 p-2.5 sm:p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Achieved</p>
                        <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded border truncate ${
                          (s.confirmedQuotations ?? 0) > 0 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
                            : (s.quotations ?? 0) > 0
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                            : "bg-muted text-muted-foreground border-border"
                        }`}>
                          {(s.confirmedQuotations ?? 0) > 0 
                            ? `${s.confirmedQuotations} Approved Quote${(s.confirmedQuotations ?? 0) === 1 ? "" : "s"}` 
                            : (s.quotations ?? 0) > 0
                            ? "Quotation Amount"
                            : "0 Quotes"}
                        </span>
                      </div>
                      <p className="font-display text-base sm:text-lg font-bold text-foreground mt-0.5">
                        {inrShort(s.achieved ?? 0)}
                      </p>
                    </div>

                    {/* 3. Won Leads */}
                    <div className="rounded-lg border border-border bg-muted/40 p-2.5 sm:p-3 flex flex-col justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Won Leads</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className={`font-display text-base sm:text-lg font-bold ${(s.wonLeads ?? 0) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                          {String(s.wonLeads ?? 0)}
                        </span>
                        <span className="text-[11px] sm:text-xs text-muted-foreground font-normal">
                          / {s.leads ?? 0} total leads
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 sm:mt-3 flex items-center gap-2.5 sm:gap-3">
                    <Progress value={Math.min(pct, 100)} className="h-2 sm:h-2.5 flex-1" />
                    <span className={`w-12 sm:w-14 text-right text-xs sm:text-sm font-bold shrink-0 ${isAbove ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-foreground"}`}>
                      {pct}%
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] sm:text-xs text-muted-foreground border-t border-border/40 pt-2">
                    <span>
                      <strong className="text-foreground font-semibold">{s.wonLeads ?? 0} won</strong> out of {s.leads ?? 0} assigned leads ({s.leads > 0 ? Math.round(((s.wonLeads ?? 0) / s.leads) * 100) : 0}% conversion)
                    </span>
                    <span className="text-foreground">
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{s.confirmedQuotations ?? 0} confirmed</strong> / {s.quotations ?? 0} quotations ({inrShort(s.quotationValue ?? 0)})
                    </span>
                  </div>
                </Section>
              );
            })}
          </div>

          <div className="mt-4 sm:mt-5">
            <Section 
              title="Team comparison" 
              description="Comparative quota achievement and lead conversion across the sales unit"
            >
              {teamComparison.length === 0 ? (
                <p className="py-4 text-xs text-muted-foreground">No comparison data available.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {teamComparison.map((s) => (
                    <li key={s.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 px-1 hover:bg-muted/30 transition-colors rounded-md">
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                        <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 sm:mt-0">
                          {s.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-sm text-foreground block sm:inline">{s.name}</span>
                          <div className="text-xs text-muted-foreground mt-0.5 sm:mt-0 sm:ml-2 flex flex-wrap gap-x-1.5 gap-y-0.5">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{s.wonLeads} won</span>
                            <span>·</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">{s.confirmedQuotations ?? 0} confirmed</span>
                            <span>·</span>
                            <span>{s.leads} leads</span>
                            <span>·</span>
                            <span>{s.quotations} quotes ({inrShort(s.quotationValue || 0)})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 text-xs w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Target ₹{s.target.toFixed(1)}L</span>
                          <span className="font-bold text-foreground">Achieved ₹{s.achieved.toFixed(1)}L</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            s.pct >= 100 
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" 
                              : s.pct >= 50 
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" 
                              : "bg-gray-100 text-gray-700 dark:bg-muted dark:text-muted-foreground"
                          }`}>
                            {s.pct}%
                          </span>
                          {canSetTarget && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const found = salespeople.find(p => p.name === s.name);
                                if (found) openTargetModal(found);
                              }}
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <Pencil className="size-3 mr-1" />
                              <span>Set Target</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}


      {/* Target Setting Modal for Admin and Manager */}
      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Target className="size-5 text-primary" />
              <span>Set Sales Target</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure target quota for <span className="font-semibold text-foreground">{editingPerson?.name}</span> ({editingPerson?.code}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Role indicator */}
            <div className="flex items-center justify-between px-3 py-2 bg-blue-50/80 border border-blue-200/80 rounded-lg text-xs">
              <span className="flex items-center gap-1.5 font-medium text-blue-900">
                <ShieldCheck className="size-4 text-blue-600 shrink-0" />
                <span>Admin &amp; Manager Quota Control</span>
              </span>
              <span className="font-semibold text-blue-700 uppercase tracking-wide text-[10px] bg-blue-100/80 px-2 py-0.5 rounded">
                {currentUserRole || 'Authorized'}
              </span>
            </div>

            {/* Inline error alert if any */}
            {dialogError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/25 p-3 text-xs text-destructive font-medium animate-in fade-in-50">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Unable to Update Target</p>
                  <p className="text-[11px] opacity-90">{dialogError}</p>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-muted/40 p-3 border border-border">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Target
              </label>
              <p className="text-xl font-bold text-foreground mt-0.5">
                {inrShort(editingPerson?.target ?? 0)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (₹{((editingPerson?.target ?? 0) / 100000).toFixed(1)} Lakhs)
                </span>
              </p>
            </div>


            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                New Target (₹ in Lakhs)
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-bold">₹</span>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  placeholder="e.g. 25"
                  value={targetInLakhs}
                  onChange={(e) => setTargetInLakhs(e.target.value)}
                  className="pl-7 pr-14 font-semibold text-base"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">Lakhs</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                Amount in Rupees: <strong className="text-foreground">₹{(Number(targetInLakhs || 0) * 100000).toLocaleString("en-IN")}</strong>
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Quick 1-Click Presets
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[10, 15, 20, 25, 30, 40, 50, 100].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={Number(targetInLakhs) === amt ? "default" : "outline"}
                    size="sm"
                    className="text-xs font-semibold cursor-pointer"
                    onClick={() => setTargetInLakhs(String(amt))}
                  >
                    {amt >= 100 ? "₹1 Cr" : `₹${amt}L`}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTargetDialogOpen(false)}
              disabled={submittingTarget}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveTarget}
              disabled={submittingTarget || !targetInLakhs || Number(targetInLakhs) <= 0}
              className="gap-1.5 cursor-pointer"
            >
              {submittingTarget ? (
                <>
                  <RotateCw className="size-3.5 animate-spin" />
                  <span>Saving Target...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Save Target</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
