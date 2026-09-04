"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getProject,
  addProjectCost,
  updateProjectCost,
  deleteProjectCost,
  updateProject,
  fmtINR,
  fmtDate
} from "@/services/projectService";
import { PageHeader, StatusBadge } from "@/components/crm-ui";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban,
  Building2,
  Calendar,
  Users,
  Briefcase,
  TrendingUp,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
  Receipt,
  FileText,
  DollarSign,
  Layers,
  Wrench,
  Pencil,
  Trash2
} from "lucide-react";

const CATEGORY_COLORS = {
  Materials: "#2563eb",
  Subcontractor: "#8b5cf6",
  Labor: "#06b6d4",
  "Travel & Site": "#f59e0b",
  Expenses: "#ec4899",
  Other: "#64748b"
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState(null);

  // Modals state
  const [showCostModal, setShowCostModal] = useState(false);
  const [editingCostId, setEditingCostId] = useState(null);
  const [costForm, setCostForm] = useState({
    head: "",
    category: "Materials",
    amount: "",
    reference: "",
    notes: "",
    date: new Date().toISOString().split("T")[0]
  });
  const [submittingCost, setSubmittingCost] = useState(false);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    status: "Pending",
    progress: 0
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProject = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getProject(id);
      setProject(res.project);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const handleOpenAddCost = (defaultCategory = "Materials") => {
    setCostForm({
      head: "",
      category: defaultCategory,
      amount: "",
      reference: "",
      notes: "",
      date: new Date().toISOString().split("T")[0]
    });
    setEditingCostId(null);
    setShowCostModal(true);
  };

  const handleOpenEditCost = (cost) => {
    let d = new Date().toISOString().split("T")[0];
    if (cost.date) {
      try {
        d = new Date(cost.date).toISOString().split("T")[0];
      } catch {}
    }
    setCostForm({
      head: cost.head || "",
      category: cost.category || "Materials",
      amount: cost.amount !== undefined ? String(cost.amount) : "",
      reference: cost.reference || "",
      notes: cost.notes || "",
      date: d
    });
    setEditingCostId(cost._id);
    setShowCostModal(true);
  };

  const handleSaveCost = async (e) => {
    e.preventDefault();
    if (!costForm.head.trim() || !costForm.amount) {
      return showToast("Head and amount are required", "error");
    }

    setSubmittingCost(true);
    try {
      const projId = project._id || project.projectId;
      if (editingCostId) {
        await updateProjectCost(projId, editingCostId, {
          ...costForm,
          amount: Number(costForm.amount)
        });
        showToast("Cost entry updated successfully!");
      } else {
        await addProjectCost(projId, {
          ...costForm,
          amount: Number(costForm.amount)
        });
        showToast("Cost entry logged successfully!");
      }
      setShowCostModal(false);
      setEditingCostId(null);
      setCostForm({
        head: "",
        category: "Materials",
        amount: "",
        reference: "",
        notes: "",
        date: new Date().toISOString().split("T")[0]
      });
      loadProject();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmittingCost(false);
    }
  };

  const handleDeleteCost = async (costId, head) => {
    if (!confirm(`Are you sure you want to delete the cost log "${head || 'Cost Item'}"?`)) return;
    try {
      const projId = project._id || project.projectId;
      await deleteProjectCost(projId, costId);
      showToast("Cost entry deleted successfully!");
      loadProject();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.title.trim()) return showToast("Title is required", "error");

    try {
      const updatedMilestones = [...(project.milestones || []), milestoneForm];
      await updateProject(project._id || project.projectId, { milestones: updatedMilestones });
      showToast("Milestone added!");
      setShowMilestoneModal(false);
      setMilestoneForm({
        title: "",
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
        status: "Pending",
        progress: 0
      });
      loadProject();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const toggleMilestoneStatus = async (mIndex) => {
    try {
      const updated = [...project.milestones];
      const current = updated[mIndex];
      const nextStatus =
        current.status === "Pending"
          ? "In Progress"
          : current.status === "In Progress"
          ? "Completed"
          : "Pending";
      const nextProgress = nextStatus === "Completed" ? 100 : nextStatus === "In Progress" ? 50 : 0;

      updated[mIndex] = { ...current, status: nextStatus, progress: nextProgress };

      // Also recalculate overall project progress based on milestones
      const avgProgress = Math.round(
        updated.reduce((s, m) => s + (m.progress || 0), 0) / updated.length
      );

      await updateProject(project._id || project.projectId, {
        milestones: updated,
        progress: avgProgress
      });
      loadProject();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        <span className="text-sm font-medium text-gray-500">Loading project details...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-800">Project Not Found</h3>
        <p className="text-xs text-gray-500 mt-1">The requested project identifier does not exist.</p>
        <div className="mt-4">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const actualCost = project.actualCost || 0;
  const revenue = Number(project.revenue) || 0;
  const grossProfit = project.grossProfit !== undefined ? project.grossProfit : revenue - actualCost;
  const margin = project.margin !== undefined ? project.margin : revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const categoryCosts = project.categoryCosts || {};

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        {/* Back Link & Header */}
        <div className="flex flex-col gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 w-fit transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  {project.projectId}
                </span>
                <StatusBadge value={project.status} />
                <span className="text-xs font-semibold text-gray-500">
                  Priority: <strong>{project.priority}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>Client: <strong>{project.customer?.name}</strong></span>
                <span>·</span>
                <span>Manager: <strong>{project.manager}</strong></span>
                <span>·</span>
                <span>Period: {fmtDate(project.start)} – {fmtDate(project.end)}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => handleOpenAddCost()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Log Cost
              </button>
              <button
                type="button"
                onClick={() => setShowMilestoneModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            </div>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contract Revenue</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{fmtINR(revenue)}</p>
            <p className="mt-1 text-xs text-emerald-600 font-medium">Agreed Client Billing</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated Budget</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{fmtINR(project.estimatedCost)}</p>
            <p className="mt-1 text-xs text-gray-400">Target project cost</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actual Incurred Cost</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{fmtINR(actualCost)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {project.costs?.length || 0} cost lines booked
            </p>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-sm ${
              grossProfit >= 0
                ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                : "bg-red-50/50 border-red-200 text-red-950"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Gross Profit</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                grossProfit >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {fmtINR(grossProfit)}
            </p>
            <p className="mt-1 text-xs font-bold">
              Margin: {margin.toFixed(1)}% {grossProfit < 0 && "(Budget Overrun)"}
            </p>
          </div>
        </div>

        {/* Project Progress Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Overall Project Progress</h4>
              <p className="text-xs text-gray-500">Weighted against milestone completion</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Progress value={project.progress} className="h-2 flex-1" />
            <span className="text-sm font-bold text-gray-800">{project.progress}%</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Milestones", icon: FolderKanban },
            { id: "costs", label: `Cost Breakdown (${project.costs?.length || 0})`, icon: DollarSign },
            { id: "team", label: `Team & Engineers (${project.team?.length || 0})`, icon: Users },
            { id: "suppliers", label: `Suppliers (${project.suppliers?.length || 0})`, icon: Briefcase },
            { id: "visits", label: `Site Visits (${project.siteVisits?.length || 0})`, icon: MapPin }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── TAB: OVERVIEW & MILESTONES ───────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scope & Customer Details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
                  Scope of Work / Description
                </h3>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {project.description || "No specific scope notes provided."}
                </p>
              </div>

              {/* Milestones Checklist */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Milestones & Execution Checklist
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowMilestoneModal(true)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    + Add Milestone
                  </button>
                </div>

                {!project.milestones || project.milestones.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No milestones defined yet.</p>
                ) : (
                  <div className="space-y-3">
                    {project.milestones.map((m, idx) => {
                      const isDone = m.status === "Completed";
                      const isInProgress = m.status === "In Progress";
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleMilestoneStatus(idx)}
                          className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isDone
                              ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                              : isInProgress
                              ? "bg-blue-50/50 border-blue-200 text-blue-950"
                              : "bg-gray-50/70 border-gray-200 text-gray-800 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                isDone
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : isInProgress
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-gray-400 text-transparent"
                              }`}
                            >
                              ✓
                            </div>
                            <div>
                              <p className={`text-xs font-semibold ${isDone ? "line-through text-gray-500" : ""}`}>
                                {m.title}
                              </p>
                              {m.dueDate && (
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Due: {fmtDate(m.dueDate)}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isDone
                                ? "bg-emerald-100 text-emerald-800"
                                : isInProgress
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Incurred Cost Logs & Ledger */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-600" /> Cost Logs & Expense Ledger ({project.costs?.length || 0})
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      All itemized expenses and cost heads booked for this project
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAddCost()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log Cost
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("costs")}
                      className="text-xs font-semibold text-blue-600 hover:underline px-2 py-1"
                    >
                      Full Ledger →
                    </button>
                  </div>
                </div>

                {!project.costs || project.costs.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-semibold text-gray-600">No cost lines logged for this project yet.</p>
                    <button
                      type="button"
                      onClick={() => handleOpenAddCost()}
                      className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
                    >
                      + Log the first cost entry
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Cost Head / Scope</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Ref / Bill</th>
                          <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {project.costs.map((c, i) => {
                          const catColor = CATEGORY_COLORS[c.category] || "#64748b";
                          return (
                            <tr key={c._id || i} className="hover:bg-gray-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap font-mono">
                                {fmtDate(c.date)}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-gray-900">
                                {c.head}
                                {c.notes && (
                                  <p className="text-[10px] text-gray-400 font-normal truncate max-w-xs">{c.notes}</p>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
                                  style={{
                                    borderColor: `${catColor}40`,
                                    backgroundColor: `${catColor}15`,
                                    color: catColor
                                  }}
                                >
                                  {c.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">
                                {c.reference || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                                {fmtINR(c.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditCost(c)}
                                    className="px-2 py-1 text-[11px] font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                                    title="Edit Cost Line"
                                  >
                                    <Pencil className="w-3 h-3" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCost(c._id, c.head)}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Cost Line"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-bold border-t border-gray-200 text-gray-900">
                          <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px]">
                            Total Incurred Cost:
                          </td>
                          <td className="py-2.5 px-3 text-right text-sm text-amber-600">
                            {fmtINR(actualCost)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Customer & Contact
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Customer Entity:</span>
                    <span className="font-bold text-gray-800 text-sm">{project.customer?.name}</span>
                  </div>
                  {project.customer?.email && (
                    <div>
                      <span className="text-gray-400 block text-[11px]">Email:</span>
                      <span className="text-gray-700">{project.customer.email}</span>
                    </div>
                  )}
                  {project.customer?.phone && (
                    <div>
                      <span className="text-gray-400 block text-[11px]">Phone:</span>
                      <span className="text-gray-700">{project.customer.phone}</span>
                    </div>
                  )}
                  {project.soRef && (
                    <div>
                      <span className="text-gray-400 block text-[11px]">Sales Order Reference:</span>
                      <span className="font-mono text-blue-600 font-semibold">{project.soRef}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Cost Summary By Head
                </h3>
                <div className="space-y-2.5 text-xs">
                  {Object.entries(categoryCosts).map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-gray-600">{cat}</span>
                      <span className="font-semibold text-gray-900">{fmtINR(amount)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between font-bold text-sm">
                    <span>Total Incurred</span>
                    <span className="text-amber-600">{fmtINR(actualCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: COST BREAKDOWN ─────────────────────────────────────────── */}
        {activeTab === "costs" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Project Expense & Cost Ledger</h3>
                <p className="text-xs text-gray-500">All materials, labor hours, subcontractor and site travel billed to this project</p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddCost()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Cost Line
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {!project.costs || project.costs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="font-semibold text-xs">No cost lines recorded yet.</p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddCost()}
                    className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
                  >
                    + Log the first cost entry
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Cost Head & Description</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {project.costs.map((c, i) => (
                        <tr key={c._id || i} className="hover:bg-gray-50/80">
                          <td className="py-3 px-4 text-gray-500 whitespace-nowrap font-mono">{fmtDate(c.date)}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{c.head}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                              {c.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-500">{c.reference || "—"}</td>
                          <td className="py-3 px-4 text-gray-500 max-w-xs truncate">{c.notes || "—"}</td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            {fmtINR(c.amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCost(c)}
                                className="px-2.5 py-1 text-xs font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                                title="Edit Cost Line"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCost(c._id, c.head)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Cost Line"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold border-t border-gray-200 text-gray-900">
                        <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider text-xs">
                          Total Actual Cost:
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-amber-600">
                          {fmtINR(actualCost)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: TEAM & ENGINEERS ───────────────────────────────────────── */}
        {activeTab === "team" && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">Assigned Team & Engineering Resources</h3>
            {!project.team || project.team.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No specific team members logged.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {project.team.map((m, i) => (
                  <div key={i} className="p-4 border rounded-xl bg-gray-50/50 flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-full font-bold text-xs">
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">{m.name}</h4>
                      <p className="text-[11px] text-gray-500">{m.role}</p>
                      {m.daysAllocated > 0 && (
                        <p className="text-[11px] text-blue-600 font-semibold mt-1">
                          {m.daysAllocated} engineer-days allocated
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: SUPPLIERS ──────────────────────────────────────────────── */}
        {activeTab === "suppliers" && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">Suppliers Engaged on this Project</h3>
            {!project.suppliers || project.suppliers.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No external suppliers recorded.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.suppliers.map((s, i) => (
                  <div key={i} className="p-4 border rounded-xl bg-gray-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">{s.name}</h4>
                      {s.poRef && <p className="text-[11px] font-mono text-gray-500">PO: {s.poRef}</p>}
                    </div>
                    <span className="font-bold text-sm text-gray-800">{fmtINR(s.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: SITE VISITS ────────────────────────────────────────────── */}
        {activeTab === "visits" && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">Site Installation & Commissioning Visits</h3>
            {!project.siteVisits || project.siteVisits.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No site visits logged yet.</p>
            ) : (
              <div className="space-y-3">
                {project.siteVisits.map((v, i) => (
                  <div key={i} className="p-4 border rounded-xl bg-gray-50/60 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-blue-700 font-bold">{v.engineer}</span>
                      <span className="text-gray-400">{fmtDate(v.date)}</span>
                    </div>
                    <p className="text-xs text-gray-800 font-medium">Purpose: {v.purpose}</p>
                    {v.outcome && <p className="text-[11px] text-gray-500">Outcome: {v.outcome}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── LOG / EDIT COST MODAL ───────────────────────────────────────────── */}
      {showCostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${editingCostId ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                  {editingCostId ? <Pencil className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingCostId ? "Edit Cost Log" : "Log Project Cost"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingCostId ? "Modify the booked expense or category" : "Record an incurred project expense by category"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCostModal(false);
                  setEditingCostId(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCost} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cost Head / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PLC Modules, Cable Tray, Commissioning Travel"
                  value={costForm.head}
                  onChange={(e) => setCostForm({ ...costForm, head: e.target.value })}
                  className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={costForm.category}
                    onChange={(e) => setCostForm({ ...costForm, category: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="Materials">Materials</option>
                    <option value="Subcontractor">Subcontractor</option>
                    <option value="Labor">Labor</option>
                    <option value="Travel & Site">Travel & Site</option>
                    <option value="Expenses">Expenses</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 45000"
                    value={costForm.amount}
                    onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={costForm.date}
                    onChange={(e) => setCostForm({ ...costForm, date: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">PO / Invoice Ref</label>
                  <input
                    type="text"
                    placeholder="PO-2026-001"
                    value={costForm.reference}
                    onChange={(e) => setCostForm({ ...costForm, reference: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or supplier details..."
                  value={costForm.notes}
                  onChange={(e) => setCostForm({ ...costForm, notes: e.target.value })}
                  className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCostModal(false);
                    setEditingCostId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCost}
                  className={`px-5 py-2 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-60 transition-all active:scale-95 ${
                    editingCostId ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {submittingCost
                    ? editingCostId ? "Saving..." : "Logging..."
                    : editingCostId ? "Save Changes" : "Save Cost"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD MILESTONE MODAL ─────────────────────────────────────────────── */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-gray-900">Add Project Milestone</h3>
              <button onClick={() => setShowMilestoneModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Factory Acceptance Test (FAT)"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={milestoneForm.dueDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Status</label>
                  <select
                    value={milestoneForm.status}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
