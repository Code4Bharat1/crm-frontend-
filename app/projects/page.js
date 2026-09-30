"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getProjects, createProject, fmtINR, fmtDate } from "@/services/projectService";
import { getCustomers, getSalesOrders, getQuotations } from "@/services/documentService";
import { getEmployees } from "@/services/employeeService";
import { PageHeader, Kpi, StatusBadge } from "@/components/crm-ui";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  Calendar,
  IndianRupee,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  Download,
} from "lucide-react";

// Clean project name helper to avoid clutter strings
const cleanProjectName = (str) => {
  if (!str) return "";
  let clean = str;
  // Strip "Quote for: " or "Quotation for: "
  clean = clean.replace(/^(Quote|Quotation|Order|PO|Sales Order)\s+(for|ref|no|#)?:\s*/i, "");
  // If formatted like "Customer Name - Actual Project", strip customer name prefix
  const dashIdx = clean.indexOf(" - ");
  if (dashIdx !== -1 && dashIdx < 35) {
    clean = clean.substring(dashIdx + 3);
  }
  clean = clean.replace(/^(Quote|Quotation|Order|PO|Sales Order)\s+(for|ref|no|#)?:\s*/i, "");
  clean = clean.replace(/^Quote\s*[-:]\s*/i, "");
  return clean.trim();
};



export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isCustomProject, setIsCustomProject] = useState(false);
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
    progress: "",
  });

  const isProjectManager = (emp) => {
    if (!emp) return false;
    const role = (emp.role || "").trim().toLowerCase().replace(/[-_]/g, " ");
    const dept = (emp.department || "").trim().toLowerCase().replace(/[-_]/g, " ");
    const combined = `${role} ${dept}`;
    return (
      combined.includes("project manager") ||
      combined.includes("project lead") ||
      combined.includes("project head") ||
      combined.includes("pm") ||
      combined.includes("project") ||
      combined.includes("manager")
    );
  };

  // Only project managers list
  const projectManagers = useMemo(() => {
    const pms = employees.filter(isProjectManager);
    return pms.length > 0 ? pms : employees;
  }, [employees]);

  // Options derived from quotations and sales orders
  const customerProjectOptions = useMemo(() => {
    const list = [];
    const custId = form.customerId;
    const custName = form.customerName?.toLowerCase();

    // 1. Matched Sales Orders
    salesOrders.forEach((so) => {
      const isMatch = !custId || so.customer?.id === custId || so.customer?.name?.toLowerCase() === custName;
      if (isMatch) {
        const rawTitle = so.items?.[0]?.description || so.items?.[0]?.productCode || `Order ${so.soNo}`;
        const cleanTitle = cleanProjectName(rawTitle);
        const rev = so.grandTotal || so.subtotal || 0;
        const scope = so.items?.map((i) => `${i.description || i.productCode} (${i.qty} ${i.unit || "Nos"})`).join(", ") || "";
        list.push({
          name: cleanTitle,
          ref: so.soNo,
          type: "Sales Order",
          revenue: rev > 0 ? rev : "",
          estimatedCost: rev > 0 ? Math.round(rev * 0.65) : "",
          description: scope
            ? `Scope under Sales Order ${so.soNo}: ${scope}. Turnkey delivery, installation & testing.`
            : `Engineering project under ${so.soNo}.`,
          customer: so.customer,
        });
      }
    });

    // 2. Matched Quotations
    quotations.forEach((qt) => {
      const isMatch = !custId || qt.customer?.id === custId || qt.customer?.name?.toLowerCase() === custName;
      if (isMatch) {
        const rawTitle = qt.subject || qt.items?.[0]?.description || `Quotation ${qt.quotationNo}`;
        const cleanTitle = cleanProjectName(rawTitle);
        const rev = qt.grandTotal || qt.subtotal || 0;
        const scope = qt.items?.map((i) => `${i.description || i.productCode} (${i.qty} ${i.unit || "Nos"})`).join(", ") || "";
        list.push({
          name: cleanTitle,
          ref: qt.quotationNo,
          type: "Quotation",
          revenue: rev > 0 ? rev : "",
          estimatedCost: rev > 0 ? Math.round(rev * 0.65) : "",
          description: scope
            ? `Scope under Quotation ${qt.quotationNo}: ${scope}. Engineering integration & commissioning.`
            : `Scope of work for ${cleanTitle}.`,
          customer: qt.customer,
        });
      }
    });

    // Remove duplicates based on name
    const uniqueMap = new Map();
    list.forEach((item) => {
      if (item.name && !uniqueMap.has(item.name)) {
        uniqueMap.set(item.name, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [form.customerId, form.customerName, salesOrders, quotations]);

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
        getQuotations().catch(() => []),
      ]);
      setProjects(projRes.projects || []);
      setKpis(projRes.kpis || null);
      const rawCusts = custRes.customers || custRes || [];
      setCustomers(rawCusts);

      const rawEmps = empRes?.data?.employees || empRes?.employees || (Array.isArray(empRes) ? empRes : []);
      setEmployees(rawEmps);

      const rawOrders = Array.isArray(soRes) ? soRes : soRes?.value || soRes?.orders || [];
      setSalesOrders(rawOrders);

      const rawQuotes = Array.isArray(qtRes) ? qtRes : qtRes?.value || qtRes?.quotations || [];
      setQuotations(rawQuotes);

      // Default manager to first available project manager
      const pmEmps = rawEmps.filter(isProjectManager);
      if (pmEmps.length > 0) {
        setForm((prev) => ({
          ...prev,
          manager: prev.manager || pmEmps[0]?.fullName || "",
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("action") === "create" || p.get("create") === "true") {
        setShowModal(true);
      }
    }
  }, []);

  // Clean Auto-Fetch project data logic
  const getAutoFetchedProjectData = (custId, custList = customers, ordersList = salesOrders, quotesList = quotations) => {
    const selectedCust = custList.find((c) => (c.id || c._id) === custId) || custList[0];
    if (!selectedCust) return null;

    const actualCustId = selectedCust.id || selectedCust._id;
    const custName = selectedCust.name || "";

    // 1. Check matching Sales Order
    const matchedSO = ordersList.find(
      (o) => o.customer?.id === actualCustId || o.customer?.name?.toLowerCase() === custName.toLowerCase()
    );

    if (matchedSO) {
      const rawTitle = matchedSO.items?.[0]?.description || matchedSO.items?.[0]?.productCode || "Automation Project";
      const cleanTitle = cleanProjectName(rawTitle) || "Automation Engineering Project";
      const scope =
        matchedSO.items?.map((i) => `${i.description || i.productCode} (${i.qty} ${i.unit || "Nos"})`).join(", ") || "";
      const rev = matchedSO.grandTotal || matchedSO.subtotal || 0;
      return {
        name: cleanTitle,
        customerId: actualCustId,
        customerName: custName,
        revenue: rev > 0 ? rev : "",
        estimatedCost: rev > 0 ? Math.round(rev * 0.65) : "",
        description: scope
          ? `Scope under Sales Order ${matchedSO.soNo}: ${scope}. Turnkey delivery, installation & testing.`
          : `Engineering project under ${matchedSO.soNo}.`,
        soRef: matchedSO.soNo || "",
      };
    }

    // 2. Check matching Quotation
    const matchedQT = quotesList.find(
      (q) => q.customer?.id === actualCustId || q.customer?.name?.toLowerCase() === custName.toLowerCase()
    );

    if (matchedQT) {
      const rawTitle = matchedQT.subject || matchedQT.items?.[0]?.description || "SCADA & PLC Automation";
      const cleanTitle = cleanProjectName(rawTitle) || "SCADA & Automation Integration";
      const scope =
        matchedQT.items?.map((i) => `${i.description || i.productCode} (${i.qty} ${i.unit || "Nos"})`).join(", ") || "";
      const rev = matchedQT.grandTotal || matchedQT.subtotal || 0;
      return {
        name: cleanTitle,
        customerId: actualCustId,
        customerName: custName,
        revenue: rev > 0 ? rev : "",
        estimatedCost: rev > 0 ? Math.round(rev * 0.65) : "",
        description: scope
          ? `Scope under Quotation ${matchedQT.quotationNo}: ${scope}. Engineering integration & commissioning.`
          : `Scope of work for ${cleanTitle}.`,
        soRef: matchedQT.quotationNo || "",
      };
    }

    // 3. Fallback
    return {
      name: "",
      customerId: actualCustId,
      customerName: custName,
      revenue: selectedCust.totalRevenue || "",
      estimatedCost: selectedCust.totalRevenue ? Math.round(selectedCust.totalRevenue * 0.65) : "",
      description: "",
      soRef: "",
    };
  };

  const handleOpenCreateModal = () => {
    const defaultManager = projectManagers[0]?.fullName || "";
    const firstCust = customers[0];
    const initialCustId = firstCust?.id || firstCust?._id || "";
    const autoData = getAutoFetchedProjectData(initialCustId, customers, salesOrders, quotations) || {};

    setIsCustomProject(false);
    setForm({
      name: autoData.name || "",
      description: autoData.description || "",
      customerId: autoData.customerId || initialCustId,
      customerName: autoData.customerName || firstCust?.name || "",
      manager: defaultManager,
      soRef: autoData.soRef || "",
      status: "Planning",
      priority: "Medium",
      revenue: autoData.revenue || "",
      estimatedCost: autoData.estimatedCost || "",
      start: new Date().toISOString().split("T")[0],
      end: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
      progress: "",
    });
    setShowModal(true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleProjectNameChange = (e) => {
    const selectedVal = e.target.value;
    if (selectedVal === "__custom__") {
      setIsCustomProject(true);
      setForm((prev) => ({ ...prev, name: "" }));
      return;
    }

    setIsCustomProject(false);
    // 1. Check if it's from customer quotations / orders
    const matchedDoc = customerProjectOptions.find((o) => o.name === selectedVal);
    if (matchedDoc) {
      setForm((prev) => ({
        ...prev,
        name: matchedDoc.name,
        revenue: matchedDoc.revenue || prev.revenue,
        estimatedCost: matchedDoc.estimatedCost || prev.estimatedCost,
        description: matchedDoc.description || prev.description,
        soRef: matchedDoc.ref || prev.soRef,
        customerId: prev.customerId || matchedDoc.customer?.id || "",
        customerName: prev.customerName || matchedDoc.customer?.name || "",
      }));
      return;
    }

   

    setForm((prev) => ({ ...prev, name: selectedVal }));
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
      setIsCustomProject(false);
      setForm((f) => ({
        ...f,
        customerId: custId,
        customerName: selected.name,
        name: autoData.name || f.name,
        revenue: autoData.revenue || f.revenue, 
        estimatedCost: autoData.estimatedCost || f.estimatedCost,
        description: autoData.description || f.description,
        soRef: autoData.soRef || "",
      }));
    } else {
      setForm((f) => ({
        ...f,
        customerId: custId,
        customerName: selected.name,
      }));
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast("Project Name is required", "error");
    if (!form.customerName.trim()) return showToast("Customer is required", "error");

    setSubmitting(true);
    try {
      await createProject({
        name: form.name.trim(),
        description: form.description,
        customer: {
          id: form.customerId,
          name: form.customerName,
        },
        manager: form.manager,
        soRef: form.soRef || "",
        status: form.status,
        priority: form.priority,
        revenue: Number(form.revenue) || 0,
        estimatedCost: Number(form.estimatedCost) || 0,
        start: form.start,
        end: form.end,
        progress: Number(form.progress) || 0,
      });
      showToast("Project created successfully!");
      setShowModal(false);
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
        progress: "",
      });
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to create project", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Mobile filtered projects
  const displayedMobileProjects = useMemo(() => {
    if (!mobileSearch.trim()) return projects;
    const q = mobileSearch.toLowerCase().trim();
    return projects.filter((p) => {
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.projectId && p.projectId.toLowerCase().includes(q)) ||
        (p.customer?.name && p.customer.name.toLowerCase().includes(q)) ||
        (p.manager && p.manager.toLowerCase().includes(q)) ||
        (p.status && p.status.toLowerCase().includes(q))
      );
    });
  }, [projects, mobileSearch]);

  const handleMobileExport = () => {
    if (projects.length === 0) return showToast("No records to export", "error");
    const headers = ["Project ID", "Project Name", "Customer", "Manager", "Start Date", "End Date", "Revenue", "Cost", "Margin %", "Status"];
    const rows = projects.map((p) => [
      p.projectId || "",
      p.name || "",
      p.customer?.name || "",
      p.manager || "",
      p.start ? fmtDate(p.start) : "",
      p.end ? fmtDate(p.end) : "",
      p.revenue || 0,
      p.actualCost || 0,
      p.margin || 0,
      p.status || "",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `projects-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Projects exported as CSV");
  };

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all flex items-center gap-2 ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          <span>{toast.msg}</span>
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
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Project
          </button>
        </div>

        {/* KPIs Grid (2x2 on Mobile, 4x1 on PC) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <Kpi
            label="Total Projects"
            value={kpis?.total || 0}
            sub={`${kpis?.inProgress || 0} In Progress`}
            icon={FolderKanban}
          />
          <Kpi
            label="Contract Revenue"
            value={fmtINR(kpis?.totalRevenue || 0)}
            tone="success"
            sub={`${kpis?.completed || 0} Completed`}
            icon={IndianRupee}
          />
          <Kpi
            label="Incurred Cost"
            value={fmtINR(kpis?.totalActualCost || 0)}
            tone="warning"
            sub="Materials, Subcontractor, Labor"
            icon={TrendingUp}
          />
          <Kpi
            label="Overall Gross Margin"
            value={`${(kpis?.avgMargin || 0).toFixed(1)}%`}
            tone={(kpis?.avgMargin || 0) >= 15 ? "success" : "danger"}
            sub={`Net: ${fmtINR(kpis?.totalGrossProfit || 0)}`}
            icon={Briefcase}
          />
        </div>

        {/* Status Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-4">
          {["All", "In Progress", "Planning", "Completed", "On Hold"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Desktop Projects Table */}
        <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
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
                    <th className="py-3 px-4">Project Manager</th>
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
                        <td className="py-3.5 px-4 font-medium text-gray-700">{p.customer?.name || "—"}</td>
                        <td className="py-3.5 px-4 text-gray-600">
                          <div className="font-semibold text-gray-800">{p.manager || "—"}</div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3" />
                            {p.team?.length || 0} team · {p.suppliers?.length || 0} vendors
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                          <div>{fmtDate(p.start)}</div>
                          <div className="text-[11px] text-gray-400">to {fmtDate(p.end)}</div>
                        </td>
                        <td className="py-3.5 px-4 w-32">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-semibold text-gray-700">{p.progress || 0}%</span>
                          </div>
                          <Progress value={p.progress || 0} className="h-1.5" />
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900">{fmtINR(p.revenue)}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-gray-700">{fmtINR(p.actualCost)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${marginColor}`}>
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

        {/* Mobile Responsive Cards View */}
        <div className="md:hidden space-y-3">
          {/* Mobile Search & Export Toolbar */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Search projects, client, PM…"
                className="h-9 pl-8 text-xs bg-white"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 gap-1.5 px-3 text-xs shrink-0 cursor-pointer"
              onClick={handleMobileExport}
            >
              <Download className="size-3.5" />
              <span>Export</span>
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
            </div>
          ) : displayedMobileProjects.length === 0 ? (
            <div className="panel p-8 text-center text-sm text-muted-foreground bg-white border rounded-xl">
              No projects found
            </div>
          ) : (
            displayedMobileProjects.map((p, i) => {
              const marginVal = p.margin || 0;
              return (
                <div
                  key={p.projectId || p._id || i}
                  className="panel p-3.5 space-y-2.5 bg-white border border-gray-200/80 rounded-xl shadow-xs"
                >
                  {/* Card Header: Project Name + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                        {p.projectId}
                      </span>
                      <h4 className="font-bold text-sm text-gray-900 mt-1 leading-snug truncate">{p.name}</h4>
                      <div className="text-xs text-gray-500 mt-0.5 font-medium">👤 {p.customer?.name || "Client"}</div>
                    </div>
                    <StatusBadge value={p.status} />
                  </div>

                  {/* Card Grid Info: PM, Schedule, Progress */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-50/90 p-2.5 rounded-xl border border-gray-200 text-xs">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Project Manager</div>
                      <div className="font-medium text-gray-800 mt-0.5 truncate">{p.manager || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Timeline</div>
                      <div className="font-medium text-gray-800 mt-0.5">
                        {fmtDate(p.start)} → {fmtDate(p.end)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Contract Revenue</div>
                      <div className="font-bold text-gray-900 mt-0.5 font-mono">{fmtINR(p.revenue)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Margin</div>
                      <div className="font-bold text-emerald-700 mt-0.5">{marginVal.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-600 font-medium">
                      <span>Completion Progress</span>
                      <span>{p.progress || 0}%</span>
                    </div>
                    <Progress value={p.progress || 0} className="h-1.5" />
                  </div>

                  {/* Action Link Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                    <span className="text-gray-400 text-[11px]">{p.priority} Priority</span>
                    <Link
                      href={`/projects/${p.projectId || p._id}`}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                    >
                      <span>View Details</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── CREATE PROJECT MODAL (NO OVERFLOW & CLEAN INPUTS) ────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col my-auto border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Fixed) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Create New Project</h3>
                  <p className="text-xs text-gray-500">Initiate an engineering or automation project</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-base transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form with separated scrollable body and fixed footer */}
            <form onSubmit={handleCreateProject} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Scrollable Form Fields */}
              <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto">
                {/* Project Name Selection (From Dropdown) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomProject((prev) => !prev);
                        if (!isCustomProject) {
                          setForm((prev) => ({ ...prev, name: "" }));
                        }
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
                    >
                      {isCustomProject ? "Select from list" : "+ Custom project name"}
                    </button>
                  </div>

                  {!isCustomProject ? (
                    <select
                      value={form.name}
                      onChange={handleProjectNameChange}
                      required
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all font-medium"
                    >
                      <option value="">-- Select Project Name --</option>
                      {customerProjectOptions.map((opt, idx) => (
                        <option key={`doc-${idx}`} value={opt.name}>
                          {opt.name} ({opt.ref ? `${opt.ref}` : "Order/Quote"})
                        </option>
                      ))}

                      <option value="__custom__">-- Enter Custom Project Name --</option>
                    </select>
                  ) : (
                    <div className="space-y-1.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        required
                        placeholder="Type custom project name..."
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all font-medium"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Grid: Customer & Project Manager */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Customer */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Customer / Client <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.customerId}
                      onChange={handleCustomerChange}
                      required
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    >
                      <option value="">
                        {customers.length > 0 ? "-- Select Customer --" : "No customers yet"}
                      </option>
                      {customers.map((c) => (
                        <option key={c.id || c._id} value={c.id || c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project Manager - ONLY Project Managers List */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Project Manager</label>
                    <select
                      value={form.manager}
                      onChange={(e) => setForm({ ...form, manager: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all font-medium"
                    >
                      <option value="">-- Select Project Manager --</option>
                      {projectManagers.map((emp) => (
                        <option key={emp._id || emp.employeeCode || emp.fullName} value={emp.fullName}>
                          {emp.fullName} {emp.role ? `(${emp.role})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contract Revenue */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Contract Revenue (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1500000"
                      value={form.revenue}
                      onChange={(e) => setForm({ ...form, revenue: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all font-mono"
                    />
                  </div>

                  {/* Estimated Cost Budget */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Estimated Cost Budget (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 950000"
                      value={form.estimatedCost}
                      onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all font-mono"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={form.start}
                      onChange={(e) => setForm({ ...form, start: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    />
                  </div>

                  {/* Target End Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target End Date</label>
                    <input
                      type="date"
                      value={form.end}
                      onChange={(e) => setForm({ ...form, end: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    />
                  </div>

                  {/* Initial Status */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    >
                      <option value="Planning">Planning</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Description / Scope */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Scope of Work</label>
                  <textarea
                    rows={3}
                    placeholder="Outline key deliverables, technical specs, site constraints..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                  />
                </div>
              </div>

              {/* Modal Actions Footer (Fixed bottom) */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm disabled:opacity-60 cursor-pointer transition-all flex items-center gap-1.5"
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
