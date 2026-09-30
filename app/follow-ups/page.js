"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";

import { DataTable, Kpi, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/crm-data";
import {
  getFollowUps,
  getFollowUpStats,
  syncFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
} from "@/services/documentService";

const emptyForm = { customerName: "", dueDate: new Date().toISOString().split("T")[0], owner: "", priority: "Medium", note: "" };

const RULES = [
  ["Quotation follow-up", "3 days after sending, while still Sent/Viewed", "Active"],
  ["Proforma advance reminder", "While advance received is less than required", "Active"],
  ["Invoice due reminder", "5 days before the due date", "Active"],
  ["Overdue invoice escalation", "As soon as an invoice's status is Overdue", "Active"],
  ["Service follow-up", "7 days after a service job is resolved/closed", "Active"],
  ["Customer revisit", "60 days after last visit", "Not built — no Visits module"],
];

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState([]);
  const [stats, setStats] = useState({ pending: 0, overdue: 0, dueToday: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([getFollowUps(), getFollowUpStats()]);
      setFollowUps(Array.isArray(list) ? list : []);
      setStats(s || { pending: 0, overdue: 0, dueToday: 0, completed: 0 });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("action") === "create" || p.get("create") === "true") {
        setForm(emptyForm);
        setShowAddModal(true);
      }
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncFollowUps();
      showToast(`Synced — ${res.created} new follow-up(s) generated from real records.`);
      await load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.dueDate) return showToast("Customer and due date are required", "error");
    setSaving(true);
    try {
      await createFollowUp(form);
      showToast("Follow-up added.");
      setShowAddModal(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (f) => {
    try {
      await updateFollowUp(f._id, { status: "Completed" });
      showToast(`Marked "${f.customerName}" follow-up as done.`);
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleSnooze = async (f) => {
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    try {
      await updateFollowUp(f._id, { status: "Snoozed", dueDate: nextWeek });
      showToast("Snoozed for 7 days.");
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (f) => {
    if (!confirm(`Delete this follow-up for "${f.customerName}"?`)) return;
    try {
      await deleteFollowUp(f._id);
      showToast("Deleted.");
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const now = Date.now();
  const dayMs = 86400000;
  const pending = followUps.filter((f) => f.status === "Pending");
  const overdue = pending.filter((f) => new Date(f.dueDate).getTime() < now);
  const today = pending.filter((f) => Math.abs(new Date(f.dueDate).getTime() - now) < dayMs);
  const upcoming = pending.filter((f) => new Date(f.dueDate).getTime() > now + dayMs);
  const completed = followUps.filter((f) => f.status === "Completed" || f.status === "Snoozed");

  const renderMobileCard = (f) => {
    const isPending = f.status === "Pending";
    const isOverdue = isPending && new Date(f.dueDate).getTime() < now;
    return (
      <div className="p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
        {/* Customer + Status & Priority Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-foreground truncate">{f.customerName}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span className="font-medium text-primary/90">{f.type}</span>
              {f.sourceRef && (
                <>
                  <span>·</span>
                  <span className="font-mono text-[11px] bg-muted px-1.5 py-0.2 rounded border border-border/40">
                    {f.sourceRef}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <StatusBadge value={isOverdue ? "Overdue" : f.status} />
            <StatusBadge value={f.priority} className="text-[10px] px-1.5 py-0" />
          </div>
        </div>

        {/* Note snippet if present */}
        {f.note && (
          <div className="rounded-lg bg-muted/30 p-2 text-xs text-foreground/80 border border-border/40 leading-relaxed">
            <p className="line-clamp-2">{f.note}</p>
          </div>
        )}

        {/* Meta & Actions Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
          <div className="text-muted-foreground text-[11px] truncate mr-2">
            <span className="font-semibold text-foreground/85">{f.owner || "Unassigned"}</span>
            <span> · Due {fmtDate(f.dueDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isPending ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-semibold"
                  onClick={() => handleSnooze(f)}
                >
                  Snooze
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs bg-accent font-bold text-accent-foreground hover:bg-accent/90"
                  onClick={() => handleComplete(f)}
                >
                  Done
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => handleDelete(f)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const columns = [
    { header: "Customer", cell: (f) => <span className="font-medium text-foreground">{f.customerName}</span> },
    { header: "Type", cell: (f) => f.type },
    { header: "Source", cell: (f) => f.sourceRef ? <span className="font-mono text-xs">{f.sourceRef}</span> : "—" },
    { header: "Owner", cell: (f) => f.owner },
    { header: "Due", cell: (f) => fmtDate(f.dueDate) },
    { header: "Priority", cell: (f) => <StatusBadge value={f.priority} /> },
    {
      header: "Status",
      cell: (f) => (
        <StatusBadge value={f.status === "Pending" && new Date(f.dueDate).getTime() < now ? "Overdue" : f.status} />
      ),
    },
    { header: "Note", cell: (f) => <span className="text-xs text-muted-foreground">{f.note || "—"}</span> },
    {
      header: "",
      cell: (f) =>
        f.status === "Pending" ? (
          <div className="flex gap-1.5 whitespace-nowrap">
            <Button size="sm" variant="outline" onClick={() => handleSnooze(f)}>Snooze</Button>
            <Button size="sm" className="bg-accent font-bold text-accent-foreground hover:bg-accent/90" onClick={() => handleComplete(f)}>
              Done
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(f)}>
            Delete
          </Button>
        ),
    },
  ];

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-2xl ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-3 sm:p-4">
          <form onSubmit={handleAdd} className="w-[94vw] max-w-md space-y-3.5 sm:space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Add Follow-up</h2>
              <p className="text-xs text-muted-foreground">Manual reminder — for anything the automatic rules don&apos;t cover yet.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Customer *</label>
              <input required value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Customer name" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Due date *</label>
                <input type="date" required value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Priority</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Owner</label>
              <input placeholder="e.g. Kiran Jadhav" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Note</label>
              <textarea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Follow-up notes..." className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" className="h-9 text-xs sm:text-sm" onClick={() => { setShowAddModal(false); setForm(emptyForm); }}>Cancel</Button>
              <Button type="submit" disabled={saving} className="h-9 text-xs sm:text-sm bg-accent font-bold text-accent-foreground hover:bg-accent/90">
                {saving ? "Adding..." : "Add Follow-up"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <PageHeader
        breadcrumb="CRM / Follow-ups"
        title="Follow-up Engine"
        subtitle="Auto-generated from real quotations, proformas, invoices and service jobs, plus anything you add manually — nothing here is sample data."
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-initial h-9 text-xs sm:text-sm" onClick={handleSync} disabled={syncing}>
              {syncing ? "Syncing..." : "Sync now"}
            </Button>
            <Button size="sm" className="flex-1 sm:flex-initial h-9 bg-accent text-xs sm:text-sm font-bold text-accent-foreground hover:bg-accent/90" onClick={() => setShowAddModal(true)}>
              + Add Follow-up
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Pending" value={stats.pending} icon={BellRing} />
        <Kpi label="Overdue" value={stats.overdue} tone="danger" />
        <Kpi label="Due today" value={stats.dueToday} tone="accent" />
        <Kpi label="Completed" value={stats.completed} tone="success" />
      </div>

      <Tabs defaultValue="overdue" className="mt-4 sm:mt-5">
        <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-9 w-max items-center justify-start rounded-lg bg-muted/80 p-1 text-muted-foreground">
            <TabsTrigger value="overdue" className="gap-1 px-2.5 py-1 text-xs sm:px-3 sm:text-sm">Overdue ({overdue.length})</TabsTrigger>
            <TabsTrigger value="today" className="gap-1 px-2.5 py-1 text-xs sm:px-3 sm:text-sm">Due today ({today.length})</TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1 px-2.5 py-1 text-xs sm:px-3 sm:text-sm">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="completed" className="gap-1 px-2.5 py-1 text-xs sm:px-3 sm:text-sm">Completed ({completed.length})</TabsTrigger>
          </TabsList>
        </div>
        {loading ? (
          <div className="mt-6 flex h-40 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <>
            <TabsContent value="overdue" className="mt-3 sm:mt-4">
              <DataTable rows={overdue} columns={columns} mobileCard={renderMobileCard} emptyLabel="No overdue follow-ups." />
            </TabsContent>
            <TabsContent value="today" className="mt-3 sm:mt-4">
              <DataTable rows={today} columns={columns} mobileCard={renderMobileCard} emptyLabel="Nothing due today." />
            </TabsContent>
            <TabsContent value="upcoming" className="mt-3 sm:mt-4">
              <DataTable rows={upcoming} columns={columns} mobileCard={renderMobileCard} emptyLabel="Nothing upcoming." />
            </TabsContent>
            <TabsContent value="completed" className="mt-3 sm:mt-4">
              <DataTable rows={completed} columns={columns} mobileCard={renderMobileCard} emptyLabel="Nothing completed yet." />
            </TabsContent>
          </>
        )}
      </Tabs>

      <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Section title="Reminder rules" description="What actually generates a follow-up, and when">
          <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
            {RULES.map(([rule, cadence, state]) => (
              <li key={rule} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 sm:p-3 bg-card">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{rule}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">{cadence}</p>
                </div>
                <StatusBadge value={state} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Delivery channels" description="How a follow-up actually reaches its owner">
          <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
            {[
              ["In-app (this page + Dashboard tile)", "Connected"],
              ["Email reminder", "Not connected"],
              ["WhatsApp reminder", "Not connected"],
              ["Mobile push", "Not connected"],
            ].map(([ch, state]) => (
              <li key={ch} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5 sm:p-3 bg-card">
                <p className="font-semibold text-foreground">{ch}</p>
                <StatusBadge value={state} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
