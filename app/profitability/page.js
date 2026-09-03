"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getProfitabilitySummary, fmtINR } from "@/services/projectService";
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
  PieChart,
  Filter,
  CheckCircle2,
  DollarSign
} from "lucide-react";

export default function ProjectProfitabilityPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthFilter, setHealthFilter] = useState("All"); // "All" | "High" | "Healthy" | "Low" | "Loss"
  const [toast, setToast] = useState(null);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            breadcrumb="Projects & Service / Profitability"
            title="Project Profitability & Margin Analytics"
            subtitle="Contracted revenue vs material, subcontractor, labor effort, travel and expenses — live cost burn and gross profit per project."
          />
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" /> Export CSV Report
          </button>
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

        {/* Cost Category Distribution Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" /> Overall Cost Incurred By Category
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(categoryBreakdown).map(([cat, amt]) => {
              const pct =
                summary.totalActualCost > 0
                  ? ((amt / summary.totalActualCost) * 100).toFixed(1)
                  : 0;
              return (
                <div key={cat} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-500 block truncate">{cat}</span>
                  <span className="text-sm font-bold text-gray-900 mt-1 block">{fmtINR(amt)}</span>
                  <span className="text-[10px] font-bold text-blue-600 mt-0.5 block">{pct}% of total</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Health Filter Tabs */}
        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline">
              Margin Filter:
            </span>
            {[
              { id: "All", label: `All (${data?.projects?.length || 0})` },
              { id: "High", label: `High Margin >25% (${summary.highMarginCount || 0})`, color: "text-emerald-700" },
              { id: "Healthy", label: `Healthy 15-25% (${summary.healthyMarginCount || 0})`, color: "text-blue-700" },
              { id: "Low", label: `Low <15% (${summary.lowMarginCount || 0})`, color: "text-amber-700" },
              { id: "Loss", label: `Loss-Making (${summary.lossMakingCount || 0})`, color: "text-red-700" }
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
                    <th className="py-3 px-4">Project & Customer</th>
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
                          <Link
                            href={`/projects/${p.id || p._id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Ledger <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
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
    </>
  );
}
