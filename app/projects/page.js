"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getProjects, createProject, fmtINR, fmtDate } from "@/services/projectService";
import { getCustomers, getSalesOrders, getQuotations } from "@/services/documentService";
import { getEmployees } from "@/services/employeeService";
import { PageHeader, Kpi, StatusBadge } from "@/components/crm-ui";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  IndianRupee,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Briefcase,
  Sparkles
} from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // New project form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    customerId: "",
    customerName: "",
    manager: "",
    soRef: "",
    status: "Planning",
    priority: "Medium",
    revenue: "",
    estimatedCost: "",
    start: new Date().toISOString().split("T")[0],
    end: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
    progress: ""
  });

  const isProjectManager = (emp) => {
    if (!emp?.role) return false;
    const r = emp.role.trim().toLowerCase().replace(/[-_]/g, " ");
    return r.includes("project manager") || r === "pm";
  };

  const projectManagers = employees.filter(isProjectManager);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, custRes, empRes, soRes, qtRes] = await Promise.all([
        getProjects({ status: statusFilter, search }),
        getCustomers().catch(() => ({ customers: [] })),
        getEmployees({ limit: 100 }).catch(() => ({ data: { employees: [] } })),
        getSalesOrders().catch(() => []),
        getQuotations().catch(() => [])
      ]);
      setProjects(projRes.projects || []);
      setKpis(projRes.kpis || null);
      const rawCusts = custRes.customers || custRes || [];
      setCustomers(rawCusts);

      const rawEmps = empRes?.data?.employees || empRes?.employees || (Array.isArray(empRes) ? empRes : []);
      setEmployees(rawEmps);

      const rawOrders = Array.isArray(soRes) ? soRes : (soRes?.value || soRes?.orders || []);
      setSalesOrders(rawOrders);

      const rawQuotes = Array.isArray(qtRes) ? qtRes : (qtRes?.value || qtRes?.quotations || []);
      setQuotations(rawQuotes);

      // Auto-populate manager only if employee has Project Manager role
      const pmEmps = rawEmps.filter(isProjectManager);
      if (pmEmps.length > 0) {
        setForm((prev) => ({
          ...prev,
          manager: prev.manager || pmEmps[0]?.fullName || ""
        }));
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Intelligent Auto-Fetch logic for projects
  const getAutoFetchedProjectData = (custId, custList = customers, ordersList = salesOrders, quotesList = quotations) => {
    const selectedCust = custList.find((c) => (c.id || c._id) === custId) || custList[0];
    if (!selectedCust) return null;

    const actualCustId = selectedCust.id || selectedCust._id;
    const custName = selectedCust.name || "";

    // 1. Check matching Sales Order
    const matchedSO = ordersList.find(
      (o) => (o.customer?.id === actualCustId || o.customer?.name?.toLowerCase() === custName.toLowerCase())
    );

    if (matchedSO) {
      const itemTitle = matchedSO.items?.[0]?.description || matchedSO.items?.[0]?.productCode || "Automation Project";
      const scope = matchedSO.items?.map((i) => `${i.description || i.productCode} (${i.qty} ${i.unit || "Nos"})`).join(", ") || "";
      const rev = matchedSO.grandTotal || matchedSO.subtotal || 0;
      return {
        name: `${custName} - ${itemTitle}`,
        customerId: actualCustId,
        customerName: custName,
        revenue: rev > 0 ? rev : "",
        estimatedCost: rev > 0 ? Math.round(rev * 0.65) : "",
        description: scope ? `Scope under Sales Order ${matchedSO.soNo}: ${scope}. Turnkey delivery, site commissioning & handover.` : `Engineering project under ${matchedSO.soNo}.`,
        soRef: matchedSO.soNo || "",
        sourceKey: `SO:${matchedSO.soNo}`
      };
    }

    // 2. Check matching Quotation
    const matchedQT = quotesList.find(
      (q) => (q.customer?.id === actualCustId || q.customer?.name?.toLowerCase() === custName.toLowerCase())
    );

    if (matchedQT) {
      const qSubject = matchedQT.subject || matchedQT.items?.[0]?.description || "SCADA & PLC Automation";
      const scope = matchedQT.items?.map((i) => `${i.description || i.productCode} (${i.qty} ${i.unit || "Nos"})`).join(", ") || "";
      const rev = matchedQT.grandTotal || matchedQT.subtotal || 0;
      return {
        name: `${custName} - ${qSubject}`,
        customerId: actualCustId,
        customerName: custName,
        revenue: rev > 0 ? rev : "",
        estimatedCost: rev > 0 ? Math.round(rev * 0.65) : "",
        description: scope ? `Scope under Quotation ${matchedQT.quotationNo}: ${scope}. Engineering integration and verification.` : `Scope of work for ${qSubject}.`,
        soRef: matchedQT.quotationNo || "",
        sourceKey: `QT:${matchedQT.quotationNo}`
      };
    }

    // 3. Structured fallback based on customer profile
    const suggestedRev = selectedCust.totalRevenue > 0 ? selectedCust.totalRevenue : 1500000;
    return {
      name: `${custName} - SCADA & Automation Retrofit`,
      customerId: actualCustId,
      customerName: custName,
      revenue: suggestedRev,
      estimatedCost: Math.round(suggestedRev * 0.65),
      description: `Complete engineering & automation project for ${custName}. Includes PLC logic programming, electrical control panel fabrication, SCADA HMI integration, field sensor wiring, and site commissioning.`,
      soRef: "",
      sourceKey: ""
    };
  };

  const handleOpenCreateModal = () => {
    const defaultManager = projectManagers[0]?.fullName || "";
    const firstCust = customers[0];
    const initialCustId = firstCust?.id || firstCust?._id || "";
    const autoData = getAutoFetchedProjectData(initialCustId, customers, salesOrders, quotations) || {};

    setForm({
      name: autoData.name || (firstCust?.name ? `${firstCust.name} - Automation Project` : ""),
      description: autoData.description || "Turnkey automation engineering, SCADA software deployment, and site testing.",
      customerId: autoData.customerId || initialCustId,
      customerName: autoData.customerName || firstCust?.name || "",
      manager: defaultManager,
      soRef: autoData.soRef || "",
      status: "Planning",
      priority: "Medium",
      revenue: autoData.revenue !== undefined ? autoData.revenue : 1500000,
      estimatedCost: autoData.estimatedCost !== undefined ? autoData.estimatedCost : 975000,
      start: new Date().toISOString().split("T")[0],
      end: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
      progress: ""
    });
    setSelectedSource(autoData.sourceKey || "");
    setShowModal(true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const selected = customers.find((c) => (c.id || c._id) === custId);
    if (!selected) {
      setForm((f) => ({ ...f, customerId: "", customerName: "" }));
      return;
    }

    const autoData = getAutoFetchedProjectData(custId, customers, salesOrders, quotations);
    if (autoData) {
      setForm((f) => ({
        ...f,
        customerId: custId,
        customerName: selected.name,
        name: autoData.name || `${selected.name} - Automation Project`,
        revenue: autoData.revenue || f.revenue,
        estimatedCost: autoData.estimatedCost || f.estimatedCost,
        description: autoData.description || f.description,
        soRef: autoData.soRef || ""
      }));
      setSelectedSource(autoData.sourceKey || "");
      showToast(`Auto-fetched project details for ${selected.name}`);
    } else {
      setForm((f) => ({
        ...f,
        customerId: custId,
        customerName: selected.name,
        name: `${selected.name} - Automation Project`
      }));
    }
  };

  const handleAutoFetchFromSource = (sourceKey) => {
    setSelectedSource(sourceKey);
    if (!sourceKey) return;

    const [type, refNo] = sourceKey.split(":");
    if (type === "SO") {
      const so = salesOrders.find((o) => o.soNo === refNo);
      if (so) {
        const custId = so.customer?.id || "";
        const custName = so.customer?.name || form.customerName;
        const itemTitle = so.items?.[0]?.description || so.items?.[0]?.productCode || "Automation Project";
        const scope = so.items?.map((i) => `${i.description || i.productCode} (${i.qty} ${i.unit || "Nos"})`).join(", ") || "";
        const rev = so.grandTotal || so.subtotal || 0;

        setForm((f) => ({
          ...f,
          name: `${custName} - ${itemTitle}`,
          customerId: custId || f.customerId,
          customerName: custName,
          revenue: rev > 0 ? rev : f.revenue,
          estimatedCost: rev > 0 ? Math.round(rev * 0.65) : f.estimatedCost,
          description: scope ? `Execution of Sales Order ${so.soNo}: ${scope}. Turnkey delivery and installation.` : f.description,
          soRef: so.soNo
        }));
        showToast(`Auto-filled project from Sales Order ${so.soNo}`);
      }
    } else if (type === "QT") {
      const qt = quotations.find((q) => q.quotationNo === refNo);
      if (qt) {
        const custId = qt.customer?.id || "";
        const custName = qt.customer?.name || form.customerName;
        const qTitle = qt.subject || qt.items?.[0]?.description || "Engineering Scope";
        const scope = qt.items?.map((i) => `${i.description || i.productCode} (${i.qty} ${i.unit || "Nos"})`).join(", ") || "";
        const rev = qt.grandTotal || qt.subtotal || 0;

        setForm((f) => ({
          ...f,
          name: `${custName} - ${qTitle}`,
          customerId: custId || f.customerId,
          customerName: custName,
          revenue: rev > 0 ? rev : f.revenue,
          estimatedCost: rev > 0 ? Math.round(rev * 0.65) : f.estimatedCost,
          description: scope ? `Quotation ${qt.quotationNo} Scope: ${scope}. System testing and commissioning.` : f.description,
          soRef: qt.quotationNo
        }));
        showToast(`Auto-filled project from Quotation ${qt.quotationNo}`);
      }
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast("Project name is required", "error");
    if (!form.customerName.trim()) return showToast("Customer is required", "error");

    setSubmitting(true);
    try {
      await createProject({
        name: form.name,
        description: form.description,
        customer: {
          id: form.customerId,
          name: form.customerName
        },
        manager: form.manager,
        soRef: form.soRef || "",
        status: form.status,
        priority: form.priority,
        revenue: Number(form.revenue) || 0,
        estimatedCost: Number(form.estimatedCost) || 0,
        start: form.start,
        end: form.end,
        progress: Number(form.progress) || 0
      });
      showToast("Project created successfully!");
      setShowModal(false);
      setSelectedSource("");
      const defaultManager = projectManagers[0]?.fullName || "";
      setForm({
        name: "",
        description: "",
        customerId: "",
        customerName: "",
        manager: defaultManager,
        soRef: "",
        status: "Planning",
        priority: "Medium",
        revenue: "",
        estimatedCost: "",
        start: new Date().toISOString().split("T")[0],
        end: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
        progress: ""
      });
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

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
            breadcrumb="Projects & Service / Projects"
            title="Projects Execution"
            subtitle="Industrial automation & engineering projects — team assignments, site milestones, expenses and live cost accounting."
          />
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Create Project
          </button>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Total Projects"
            value={kpis?.total || 0}
            sub={`${kpis?.inProgress || 0} In Progress`}
            icon={FolderKanban}
          />
          <Kpi
            label="Total Contract Revenue"
            value={fmtINR(kpis?.totalRevenue || 0)}
            tone="success"
            sub={`${kpis?.completed || 0} Completed`}
            icon={IndianRupee}
          />
          <Kpi
            label="Actual Incurred Cost"
            value={fmtINR(kpis?.totalActualCost || 0)}
            tone="warning"
            sub="Materials, Subcontractor, Labor"
            icon={TrendingUp}
          />
          <Kpi
            label="Overall Gross Margin"
            value={`${(kpis?.avgMargin || 0).toFixed(1)}%`}
            tone={(kpis?.avgMargin || 0) >= 15 ? "success" : "danger"}
            sub={`Net Profit: ${fmtINR(kpis?.totalGrossProfit || 0)}`}
            icon={Briefcase}
          />
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {["All", "In Progress", "Planning", "Completed", "On Hold"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects, client, manager..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Projects Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
              <span className="text-sm">Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">No projects found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or create a new project.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Manager & Team</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    <th className="py-3 px-4 text-right">Actual Cost</th>
                    <th className="py-3 px-4 text-right">Margin</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((p) => {
                    const marginVal = p.margin || 0;
                    const marginColor =
                      marginVal >= 25
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : marginVal >= 15
                        ? "text-blue-700 bg-blue-50 border-blue-200"
                        : marginVal >= 0
                        ? "text-amber-700 bg-amber-50 border-amber-200"
                        : "text-red-700 bg-red-50 border-red-200";

                    return (
                      <tr key={p._id || p.projectId} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-gray-900">
                          <Link
                            href={`/projects/${p.projectId || p._id}`}
                            className="font-bold text-blue-600 hover:underline text-sm block"
                          >
                            {p.name}
                          </Link>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {p.projectId} · {p.priority} Priority
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-700">
                          {p.customer?.name || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          <div className="font-semibold text-gray-800">{p.manager}</div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3" />
                            {p.team?.length || 0} members · {p.suppliers?.length || 0} suppliers
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                          <div>{fmtDate(p.start)}</div>
                          <div className="text-[11px] text-gray-400">to {fmtDate(p.end)}</div>
                        </td>
                        <td className="py-3.5 px-4 w-32">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-semibold text-gray-700">{p.progress}%</span>
                          </div>
                          <Progress value={p.progress} className="h-1.5" />
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                          {fmtINR(p.revenue)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                          {fmtINR(p.actualCost)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${marginColor}`}
                          >
                            {marginVal.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge value={p.status} />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Link
                            href={`/projects/${p.projectId || p._id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            View <ArrowRight className="w-3.5 h-3.5" />
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

      {/* ─── CREATE PROJECT MODAL ────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Create New Project</h3>
                  <p className="text-xs text-gray-500">Initiate an engineering or automation project</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {/* Auto-Fetch Project Toolbar */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/90 rounded-2xl shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span>Auto-Fetch Project from Orders &amp; Quotations</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const autoData = getAutoFetchedProjectData(form.customerId);
                      if (autoData) {
                        setForm((f) => ({
                          ...f,
                          name: autoData.name || f.name,
                          revenue: autoData.revenue || f.revenue,
                          estimatedCost: autoData.estimatedCost || f.estimatedCost,
                          description: autoData.description || f.description,
                          soRef: autoData.soRef || f.soRef
                        }));
                        showToast("Auto-fetched project details!");
                      }
                    }}
                    className="text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-300 shadow-2xs transition-all flex items-center gap-1 active:scale-95"
                  >
                    ⚡ Auto-Fill Project
                  </button>
                </div>
                {(salesOrders.length > 0 || quotations.length > 0) ? (
                  <select
                    value={selectedSource}
                    onChange={(e) => handleAutoFetchFromSource(e.target.value)}
                    className="w-full text-xs border border-blue-200 rounded-xl px-3 py-2 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                  >
                    <option value="">-- Select Sales Order / Quotation to Auto-Fill Form --</option>
                    {salesOrders.map((so) => (
                      <option key={so._id || so.soNo} value={`SO:${so.soNo}`}>
                        📋 Order: {so.soNo} — {so.customer?.name} (₹{Number(so.grandTotal || 0).toLocaleString("en-IN")})
                      </option>
                    ))}
                    {quotations.map((q) => (
                      <option key={q._id || q.quotationNo} value={`QT:${q.quotationNo}`}>
                        📄 Quotation: {q.quotationNo} — {q.customer?.name} ({q.subject || "Project"}) (₹{Number(q.grandTotal || 0).toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[11px] text-blue-700 flex items-center gap-1">
                    <span>💡 Selecting a client will automatically fetch and structure their project title, budget &amp; scope.</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Project Title <span className="text-red-500">*</span>
                  </label>
                  {form.soRef && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md border border-blue-200">
                      Linked: {form.soRef}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weighbridge SCADA Integration & PLC Retrofit"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-sm border rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Customer / Client <span className="text-red-500">*</span>
                  </label>
                  {customers.length > 0 ? (
                    <select
                      value={form.customerId}
                      onChange={handleCustomerChange}
                      required
                      className="w-full text-sm border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id || c._id} value={c.id || c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Customer Legal Name"
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      className="w-full text-sm border rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Project Manager
                  </label>
                  {projectManagers.length > 0 ? (
                    <select
                      value={form.manager}
                      onChange={(e) => setForm({ ...form, manager: e.target.value })}
                      className="w-full text-sm border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-800"
                    >
                      <option value="">-- Select Project Manager --</option>
                      {projectManagers.map((emp) => (
                        <option key={emp._id || emp.employeeCode} value={emp.fullName}>
                          {emp.fullName} {emp.role ? `(${emp.role})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="e.g. Project Manager name"
                        value={form.manager}
                        onChange={(e) => setForm({ ...form, manager: e.target.value })}
                        className="w-full text-sm border rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-[11px] text-amber-600">
                        No employees with &quot;Project Manager&quot; role found. You can type a name or assign this role in HR.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Contract Revenue (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1500000"
                    value={form.revenue}
                    onChange={(e) => setForm({ ...form, revenue: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estimated Cost Budget (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 950000"
                    value={form.estimatedCost}
                    onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target End Date</label>
                  <input
                    type="date"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full text-sm border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Scope of Work</label>
                <textarea
                  rows={2}
                  placeholder="Outline key deliverables, technical specs, site constraints..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full text-sm border rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all disabled:opacity-60"
                >
                  {submitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
