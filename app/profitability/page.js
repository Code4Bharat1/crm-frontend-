"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getProfitabilitySummary,
  addProjectCost,
  updateProjectCost,
  deleteProjectCost,
  fmtINR,
  fmtDate
} from "@/services/projectService";
import { PageHeader, Kpi, StatusBadge } from "@/components/crm-ui";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  IndianRupee,
  Layers,
  ArrowRight,
  PieChart as PieChartIcon,
  Filter,
  CheckCircle2,
  DollarSign,
  Plus,
  Receipt,
  Search,
  Calendar,
  Building2,
  FolderKanban,
  BarChart3,
  Sparkles,
  Tag,
  Briefcase,
  Pencil,
  Trash2
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const CATEGORIES = [
  "Materials",
  "Subcontractor",
  "Labor",
  "Travel & Site",
  "Expenses",
  "Other"
];

const CATEGORY_COLORS = {
  Materials: "#2563eb",       // Blue
  Subcontractor: "#8b5cf6",   // Violet
  Labor: "#06b6d4",           // Cyan
  "Travel & Site": "#f59e0b", // Amber
  Expenses: "#ec4899",        // Pink
  Other: "#64748b"            // Slate
};

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
};

export default function ProjectProfitabilityPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthFilter, setHealthFilter] = useState("All"); // "All" | "High" | "Healthy" | "Low" | "Loss"
  const [costCategoryFilter, setCostCategoryFilter] = useState("All");
  const [costSearch, setCostSearch] = useState("");
  const [toast, setToast] = useState(null);

  // Cost Incurred Modal State (Add & Edit)
  const [showCostModal, setShowCostModal] = useState(false);
  const [editingCostId, setEditingCostId] = useState(null);
  const [submittingCost, setSubmittingCost] = useState(false);
  const [costForm, setCostForm] = useState({
    projectId: "",
    head: "",
    category: "Materials",
    amount: "",
    reference: "",
    notes: "",
    date: new Date().toISOString().split("T")[0]
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getProfitabilitySummary();
      setData(res);
    } catch (err) {
      showToast("Failed to load profitability metrics: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCostModal = (defaultCategory = "Materials", defaultProjectId = "") => {
    const rawProjects = data?.rawProjects || [];
    setCostForm({
      projectId: defaultProjectId || rawProjects[0]?.id || rawProjects[0]?._id || "",
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

  const handleOpenEditCostModal = (c) => {
    let formattedDate = new Date().toISOString().split("T")[0];
    if (c.date) {
      try {
        formattedDate = new Date(c.date).toISOString().split("T")[0];
      } catch {
        // fallback
      }
    }
    setCostForm({
      projectId: c.projectId || "",
      head: c.head || "",
      category: c.category || "Materials",
      amount: c.amount !== undefined ? String(c.amount) : "",
      reference: c.reference || "",
      notes: c.notes || "",
      date: formattedDate
    });
    setEditingCostId(c._id);
    setShowCostModal(true);
  };

  const handleDeleteCost = async (projectId, costId, head) => {
    if (!confirm(`Are you sure you want to delete the expense entry "${head || 'Cost Item'}"?`)) return;
    try {
      await deleteProjectCost(projectId, costId);
      showToast(`Expense entry removed successfully`);
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to delete expense entry", "error");
    }
  };

  const handleSubmitCost = async (e) => {
    e.preventDefault();
    if (!costForm.projectId) {
      return showToast("Please select a project", "error");
    }
    if (!costForm.head.trim()) {
      return showToast("Cost head/description is required", "error");
    }
    if (!costForm.amount || Number(costForm.amount) <= 0) {
      return showToast("Please enter a valid cost amount", "error");
    }

    setSubmittingCost(true);
    try {
      if (editingCostId) {
        await updateProjectCost(costForm.projectId, editingCostId, {
          head: costForm.head,
          category: costForm.category,
          amount: Number(costForm.amount),
          reference: costForm.reference,
          notes: costForm.notes,
          date: costForm.date
        });
        showToast(`Updated expense "${costForm.head}"!`);
      } else {
        await addProjectCost(costForm.projectId, {
          head: costForm.head,
          category: costForm.category,
          amount: Number(costForm.amount),
          reference: costForm.reference,
          notes: costForm.notes,
          date: costForm.date
        });
        showToast(`Added ₹${Number(costForm.amount).toLocaleString("en-IN")} to ${costForm.category}!`);
      }
      setShowCostModal(false);
      setEditingCostId(null);
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to save cost", "error");
    } finally {
      setSubmittingCost(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.projects || data.projects.length === 0) {
      return showToast("No projects available to export", "error");
    }

    const headers = [
      "Project ID",
      "Project Name",
      "Customer",
      "Status",
      "Progress (%)",
      "Revenue (INR)",
      "Estimated Cost (INR)",
      "Actual Cost (INR)",
      "Budget Variance (INR)",
      "Gross Profit (INR)",
      "Margin (%)"
    ];

    const rows = data.projects.map((p) => [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.customerName.replace(/"/g, '""')}"`,
      `"${p.status}"`,
      p.progress,
      p.revenue,
      p.estimatedCost,
      p.actualCost,
      p.variance,
      p.grossProfit,
      p.margin.toFixed(2)
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-profitability-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Profitability report exported to CSV!");
  };

  // Filter projects by margin health
  const filteredProjects = (data?.projects || []).filter((p) => {
    if (healthFilter === "High") return p.margin >= 25;
    if (healthFilter === "Healthy") return p.margin >= 15 && p.margin < 25;
    if (healthFilter === "Low") return p.margin >= 0 && p.margin < 15;
    if (healthFilter === "Loss") return p.isLoss;
    return true;
  });

  const summary = data?.summary || {};
  const categoryBreakdown = data?.categoryBreakdown || {};
  const allCosts = data?.allCosts || [];

  // Filter individual costs for the ledger table
  const filteredCosts = allCosts.filter((c) => {
    if (costCategoryFilter !== "All" && c.category !== costCategoryFilter) return false;
    if (costSearch.trim()) {
      const q = costSearch.toLowerCase();
      return (
        c.head?.toLowerCase().includes(q) ||
        c.projectId?.toLowerCase().includes(q) ||
        c.projectName?.toLowerCase().includes(q) ||
        c.customerName?.toLowerCase().includes(q) ||
        c.reference?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Chart data preparation
  const categoryChartData = Object.entries(categoryBreakdown).map(([name, value]) => ({
    name,
    value: Number(value) || 0,
    color: CATEGORY_COLORS[name] || "#64748b"
  })).filter((c) => c.value > 0);

  const projectComparisonData = (data?.projects || []).slice(0, 6).map((p) => ({
    name: p.id || p.name.slice(0, 10),
    fullName: p.name,
    revenue: p.revenue,
    estimatedCost: p.estimatedCost,
    actualCost: p.actualCost
  }));

  // Count cost entries per category
  const categoryCounts = allCosts.reduce((acc, c) => {
    const cat = c.category || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            breadcrumb="Projects & Service / Profitability"
            title="Project Profitability & Margin Analytics"
            subtitle="Contracted revenue vs material, subcontractor, labor, travel and expenses — live cost burn and gross profit per project."
          />
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleOpenCostModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Cost Incurred
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm active:scale-95"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Global Financial Metrics */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Total Contract Revenue"
            value={fmtINR(summary.totalRevenue || 0)}
            tone="success"
            sub={`${summary.totalProjects || 0} active & billed projects`}
            icon={IndianRupee}
          />
          <Kpi
            label="Total Actual Incurred Cost"
            value={fmtINR(summary.totalActualCost || 0)}
            tone="warning"
            sub={`Budget: ${fmtINR(summary.totalEstimatedCost || 0)}`}
            icon={TrendingDown}
          />
          <Kpi
            label="Net Gross Profit"
            value={fmtINR(summary.totalGrossProfit || 0)}
            tone={(summary.totalGrossProfit || 0) >= 0 ? "success" : "danger"}
            sub={`Average Margin: ${(summary.overallMargin || 0).toFixed(1)}%`}
            icon={TrendingUp}
          />
          <Kpi
            label="Loss-Making Projects"
            value={summary.lossMakingCount || 0}
            tone={summary.lossMakingCount > 0 ? "danger" : "success"}
            sub={summary.lossMakingCount > 0 ? "Requires cost intervention!" : "All projects profitable ✓"}
            icon={AlertTriangle}
          />
        </div>

        {/* ─── SECTION 1: Cost Incurred By Category (Cards, Graph & Category Table) ─── */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" /> Overall Cost Incurred By Category
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Breakdown of incurred expenses across Materials, Subcontractor, Labor, Travel &amp; Site, Expenses, and Other heads.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCostModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Log Category Cost
            </button>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => {
              const amt = categoryBreakdown[cat] || 0;
              const count = categoryCounts[cat] || 0;
              const pct =
                summary.totalActualCost > 0
                  ? ((amt / summary.totalActualCost) * 100).toFixed(1)
                  : "0.0";
              const dotColor = CATEGORY_COLORS[cat] || "#64748b";

              return (
                <div
                  key={cat}
                  onClick={() => handleOpenCostModal(cat)}
                  className="p-3.5 bg-gray-50/70 hover:bg-blue-50/50 rounded-xl border border-gray-200/80 hover:border-blue-300 transition-all cursor-pointer group relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-gray-700 truncate flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        {cat}
                      </span>
                      <span className="text-[10px] text-gray-400 group-hover:text-blue-600 font-medium">
                        {count} {count === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-gray-900 mt-1.5 block">
                      {fmtINR(amt)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600">{pct}% of total</span>
                    <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 font-bold transition-opacity">
                      + Add
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual Graphs & Category Summary Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Donut Chart: Category Share */}
            <div className="lg:col-span-5 bg-gray-50/60 rounded-xl p-4 border border-gray-100 flex flex-col">
              <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-blue-600" /> Cost Incurred Distribution Chart
              </h4>
              {categoryChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val, name) => [fmtINR(val), `${name} Incurred`]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                        formatter={(value) => <span className="text-xs text-gray-700">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                  <PieChartIcon className="w-10 h-10 mb-2 stroke-1 text-gray-300" />
                  <p className="text-xs font-medium">No incurred cost entries recorded yet</p>
                  <button
                    type="button"
                    onClick={() => handleOpenCostModal()}
                    className="mt-2 text-xs text-blue-600 font-semibold underline"
                  >
                    + Add your first cost
                  </button>
                </div>
              )}
            </div>

            {/* Category Summary Table */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Cost Category</th>
                      <th className="py-2.5 px-3 text-right">Incurred Amount</th>
                      <th className="py-2.5 px-3 text-right">% Share</th>
                      <th className="py-2.5 px-3 text-center">Entries</th>
                      <th className="py-2.5 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {CATEGORIES.map((cat) => {
                      const amt = categoryBreakdown[cat] || 0;
                      const count = categoryCounts[cat] || 0;
                      const pct =
                        summary.totalActualCost > 0
                          ? ((amt / summary.totalActualCost) * 100).toFixed(1)
                          : "0.0";
                      const color = CATEGORY_COLORS[cat] || "#64748b";

                      return (
                        <tr key={cat} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2.5 px-3.5 font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            {cat}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-gray-900">
                            {fmtINR(amt)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-bold text-blue-700">{pct}%</span>
                              <div className="w-12 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${Math.min(100, Number(pct))}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-gray-600">
                            {count}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenCostModal(cat)}
                                className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-lg transition-all"
                              >
                                + Add
                              </button>
                              {count > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCostCategoryFilter(cat);
                                    const el = document.getElementById("incurred-cost-ledger");
                                    if (el) el.scrollIntoView({ behavior: "smooth" });
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-amber-700 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-200 rounded-lg transition-all flex items-center gap-1"
                                  title={`View & Edit ${count} entries under ${cat}`}
                                >
                                  <Pencil className="w-2.5 h-2.5" /> Edit ({count})
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: Project Financials Comparison Chart ─── */}
        {projectComparisonData.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" /> Revenue vs Estimated Budget vs Actual Incurred Cost
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectComparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 100000}L`} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val, name) => [
                      fmtINR(val),
                      name === "revenue"
                        ? "Contract Revenue"
                        : name === "estimatedCost"
                        ? "Estimated Budget"
                        : "Actual Incurred"
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                    formatter={(value) => (
                      <span className="text-xs text-gray-700">
                        {value === "revenue"
                          ? "Contract Revenue"
                          : value === "estimatedCost"
                          ? "Estimated Budget"
                          : "Actual Incurred Cost"}
                      </span>
                    )}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="estimatedCost" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actualCost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ─── SECTION 3: Detailed Incurred Cost Ledger Table (All Incurred Costs) ─── */}
        <div id="incurred-cost-ledger" className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <div>
                <h4 className="text-sm font-bold text-gray-900">Incurred Cost Ledger (All Logged Expenses)</h4>
                <p className="text-xs text-gray-500">Every individual cost item recorded against projects</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {["All", ...CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCostCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      costCategoryFilter === cat
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search expense..."
                  value={costSearch}
                  onChange={(e) => setCostSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <button
                type="button"
                onClick={() => handleOpenCostModal()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Log Expense
              </button>
            </div>
          </div>

          {filteredCosts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-xs font-semibold text-gray-600">No cost records found for the selected filter.</p>
              <button
                type="button"
                onClick={() => handleOpenCostModal()}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline"
              >
                + Log an expense item now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3.5">Date</th>
                    <th className="py-2.5 px-3.5">Project</th>
                    <th className="py-2.5 px-3.5">Expense Head / Scope</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Reference / Bill</th>
                    <th className="py-2.5 px-3.5">Notes</th>
                    <th className="py-2.5 px-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCosts.map((c) => {
                    const catColor = CATEGORY_COLORS[c.category] || "#64748b";
                    return (
                      <tr key={c._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-3.5 text-gray-500 font-mono whitespace-nowrap">
                          {fmtDate(c.date)}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <Link
                            href={`/projects/${c.projectId}`}
                            className="font-bold text-blue-600 hover:underline block truncate max-w-[200px]"
                          >
                            {c.projectName}
                          </Link>
                          <span className="text-[10px] text-gray-400 font-mono">{c.projectId} · {c.customerName}</span>
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-gray-800">
                          {c.head}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border"
                            style={{
                              borderColor: `${catColor}40`,
                              backgroundColor: `${catColor}15`,
                              color: catColor
                            }}
                          >
                            {c.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {fmtINR(c.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">
                          {c.reference || "—"}
                        </td>
                        <td className="py-2.5 px-3.5 text-gray-500 max-w-[200px] truncate text-[11px]">
                          {c.notes || "—"}
                        </td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCostModal(c)}
                              className="px-2 py-1 text-[11px] font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                              title="Edit Expense"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCost(c.projectId, c._id, c.head)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── SECTION 4: Project Profitability & Margins Table ─── */}
        <div className="space-y-3">
          {/* Margin Filter Tabs */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline">
                Margin Filter:
              </span>
              {[
                { id: "All", label: `All (${data?.projects?.length || 0})` },
                { id: "High", label: `High Margin >25% (${summary.highMarginCount || 0})` },
                { id: "Healthy", label: `Healthy 15-25% (${summary.healthyMarginCount || 0})` },
                { id: "Low", label: `Low <15% (${summary.lowMarginCount || 0})` },
                { id: "Loss", label: `Loss-Making (${summary.lossMakingCount || 0})` }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHealthFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    healthFilter === f.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Profitability Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
                <span className="text-sm">Calculating live project profitability...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">No projects match the selected criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Project &amp; Customer</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Revenue</th>
                      <th className="py-3 px-4 text-right">Estimated Cost</th>
                      <th className="py-3 px-4 text-right">Actual Incurred</th>
                      <th className="py-3 px-4 text-right">Budget Variance</th>
                      <th className="py-3 px-4 text-right">Gross Profit</th>
                      <th className="py-3 px-4 text-right">Margin %</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProjects.map((p) => {
                      const isLoss = p.isLoss;
                      const variance = p.variance || 0;
                      const marginVal = p.margin || 0;

                      const marginBadge =
                        marginVal >= 25
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : marginVal >= 15
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : marginVal >= 0
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-red-50 text-red-800 border-red-200";

                      return (
                        <tr key={p._id || p.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <Link
                              href={`/projects/${p.id || p._id}`}
                              className="font-bold text-blue-600 hover:underline text-sm block"
                            >
                              {p.name}
                            </Link>
                            <span className="text-[11px] text-gray-400">
                              {p.id} · {p.customerName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge value={p.status} />
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                            {fmtINR(p.revenue)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-gray-600 font-medium">
                            {fmtINR(p.estimatedCost)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-gray-800">
                            {fmtINR(p.actualCost)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`font-semibold ${
                                variance > 0 ? "text-red-600 font-bold" : "text-emerald-600"
                              }`}
                            >
                              {variance > 0 ? `+${fmtINR(variance)}` : `${fmtINR(variance)}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`font-bold text-sm ${
                                isLoss ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {fmtINR(p.grossProfit)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${marginBadge}`}
                            >
                              {marginVal.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenCostModal("Materials", p.id || p._id)}
                                className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                              >
                                + Add Cost
                              </button>
                              <Link
                                href={`/projects/${p.id || p._id}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-blue-600 bg-gray-50 px-2 py-1 rounded-md transition-colors"
                              >
                                Ledger <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL: Add Cost Incurred By Category ─── */}
      {showCostModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${editingCostId ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                  {editingCostId ? <Pencil className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingCostId ? "Edit Cost Incurred" : "Add Cost Incurred"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingCostId ? "Modify expense details, category, or amount" : "Record an incurred project expense by category"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCostModal(false);
                  setEditingCostId(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={costForm.projectId}
                  onChange={(e) => setCostForm({ ...costForm, projectId: e.target.value })}
                  required
                  className="w-full text-sm border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-800"
                >
                  <option value="">-- Select Project --</option>
                  {(data?.rawProjects || []).map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.id} — {p.name} ({p.customerName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cost Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={costForm.category}
                    onChange={(e) => setCostForm({ ...costForm, category: e.target.value })}
                    required
                    className="w-full text-sm border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-800"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Amount Incurred (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 45000"
                    value={costForm.amount}
                    onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Expense Head / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siemens PLC Modules, Site Cabling, Travel Allowance"
                  value={costForm.head}
                  onChange={(e) => setCostForm({ ...costForm, head: e.target.value })}
                  className="w-full text-sm border rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={costForm.date}
                    onChange={(e) => setCostForm({ ...costForm, date: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Bill / PO / Voucher Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9821 / PO-2026-004"
                    value={costForm.reference}
                    onChange={(e) => setCostForm({ ...costForm, reference: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Vendor Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional supplier notes or expenditure justification..."
                  value={costForm.notes}
                  onChange={(e) => setCostForm({ ...costForm, notes: e.target.value })}
                  className="w-full text-sm border rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
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
                  className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                    editingCostId ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {submittingCost
                    ? editingCostId ? "Saving Changes..." : "Recording Cost..."
                    : editingCostId ? "Save Changes" : "Add Incurred Cost"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
