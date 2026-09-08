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

  const columns = [
    { header: "Customer", cell: (f) => <span className="font-medium">{f.customerName}</span> },
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
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleAdd} className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Follow-up</h2>
              <p className="text-xs text-gray-500">Manual reminder — for anything the automatic rules don't cover yet.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Customer *</label>
              <input required value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Due date *</label>
                <input type="date" required value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Priority</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Owner</label>
              <input placeholder="e.g. Kiran Jadhav" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Note</label>
              <textarea rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setForm(emptyForm); }}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>{syncing ? "Syncing..." : "Sync now"}</Button>
            <Button className="bg-accent font-bold text-accent-foreground hover:bg-accent/90" onClick={() => setShowAddModal(true)}>
              + Add Follow-up
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending" value={stats.pending} icon={BellRing} />
        <Kpi label="Overdue" value={stats.overdue} tone="danger" />
        <Kpi label="Due today" value={stats.dueToday} tone="accent" />
        <Kpi label="Completed" value={stats.completed} tone="success" />
      </div>

      <Tabs defaultValue="overdue" className="mt-5">
        <TabsList>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="today">Due today ({today.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        {loading ? (
          <div className="mt-6 flex h-40 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : (
          <>
            <TabsContent value="overdue" className="mt-4"><DataTable rows={overdue} columns={columns} emptyLabel="No overdue follow-ups." /></TabsContent>
            <TabsContent value="today" className="mt-4"><DataTable rows={today} columns={columns} emptyLabel="Nothing due today." /></TabsContent>
            <TabsContent value="upcoming" className="mt-4"><DataTable rows={upcoming} columns={columns} emptyLabel="Nothing upcoming." /></TabsContent>
            <TabsContent value="completed" className="mt-4"><DataTable rows={completed} columns={columns} emptyLabel="Nothing completed yet." /></TabsContent>
          </>
        )}
      </Tabs>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Reminder rules" description="What actually generates a follow-up, and when">
          <ul className="space-y-3 text-sm">
            {RULES.map(([rule, cadence, state]) => (
              <li key={rule} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div>
                  <p className="font-semibold">{rule}</p>
                  <p className="text-xs text-muted-foreground">{cadence}</p>
                </div>
                <StatusBadge value={state} />
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Delivery channels" description="How a follow-up actually reaches its owner">
          <ul className="space-y-3 text-sm">
            {[
              ["In-app (this page + Dashboard tile)", "Connected"],
              ["Email reminder", "Not connected"],
              ["WhatsApp reminder", "Not connected"],
              ["Mobile push", "Not connected"],
            ].map(([ch, state]) => (
              <li key={ch} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <p className="font-semibold">{ch}</p>
                <StatusBadge value={state} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
