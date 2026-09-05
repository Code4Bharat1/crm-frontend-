"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  getServiceRequests,
  createServiceRequest,
  updateServiceRequest,
  resolveServiceRequest,
  checkSerialWarranty,
  fmtINR,
  fmtDate,
  getProjects
} from "@/services/projectService";
import { getCustomers, getProducts, getSerialNumbers } from "@/services/documentService";
import { getEmployees } from "@/services/employeeService";
import { getNotifications, markNotificationAsRead } from "@/services/notificationService";
import { PageHeader, Kpi, StatusBadge } from "@/components/crm-ui";
import {
  Wrench,
  Plus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  IndianRupee,
  Calendar,
  Layers,
  FileText,
  Briefcase,
  Bell,
  UserCheck,
  CheckCheck,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Cpu,
  Hash,
  ArrowRight
} from "lucide-react";

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [products, setProducts] = useState([]);
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [serviceNotifications, setServiceNotifications] = useState([]);
  const [selectedTechFilter, setSelectedTechFilter] = useState("All");
  const [showTechPanel, setShowTechPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  // New Request Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warrantyCheckResult, setWarrantyCheckResult] = useState(null);
  const [checkingSerial, setCheckingSerial] = useState(false);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [isCustomSerial, setIsCustomSerial] = useState(false);
  const [isCustomTechnician, setIsCustomTechnician] = useState(false);

  const [form, setForm] = useState({
    projectId: "",
    projectName: "",
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    productId: "",
    productName: "",
    serialNo: "",
    issue: "",
    description: "",
    type: "Breakdown / Repair",
    priority: "Medium",
    engineerId: "",
    engineerName: "",
    engineerPhone: "",
    scheduledOn: new Date().toISOString().split("T")[0],
    underWarranty: false,
    serviceCharges: 0
  });

  // Resolve Ticket Modal State
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolveForm, setResolveForm] = useState({
    resolutionNotes: "",
    engineerHours: 4,
    partsCost: 0,
    travelCost: 1200,
    serviceCharges: 0
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, custRes, projRes, prodRes, snRes, empRes, notifRes] = await Promise.all([
        getServiceRequests({ status: statusFilter, search }),
        getCustomers().catch(() => ({ customers: [] })),
        getProjects().catch(() => ({ projects: [] })),
        getProducts().catch(() => []),


        
        getSerialNumbers().catch(() => []),
        getEmployees({ limit: 100 }).catch(() => ({ data: { employees: [] } })),
        getNotifications({ type: "Service", limit: 50 }).catch(() => ({ notifications: [] }))
      ]);

      setRequests(reqRes.requests || []);
      setKpis(reqRes.kpis || null);
      setCustomers(custRes.customers || custRes || []);
      setProjects(projRes.projects || projRes || []);
      setProducts(Array.isArray(prodRes) ? prodRes : prodRes?.products || []);
      setSerialNumbers(Array.isArray(snRes) ? snRes : snRes?.serialNumbers || []);

      const rawEmps = empRes?.data?.employees || empRes?.employees || (Array.isArray(empRes) ? empRes : []);
      setEmployees(rawEmps);

      const notifs = notifRes?.notifications || (Array.isArray(notifRes) ? notifRes : []);
      setServiceNotifications(notifs);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Filter serial numbers dynamically based on selected product
  const matchingSerials = useMemo(() => {
    if (!form.productName) return [];
    const pName = form.productName.trim().toLowerCase();
    const pId = form.productId;
    const prodObj = products.find(
      (p) => p._id === pId || p.itemCode === pId || (p.name && p.name.trim().toLowerCase() === pName)
    );
    const pCode = prodObj?.itemCode ? prodObj.itemCode.trim().toLowerCase() : "";

    return serialNumbers.filter((s) => {
      const sProdId = s.product?.id || s.product?._id;
      const sProdName = (s.product?.name || "").trim().toLowerCase();
      const sProdCode = (s.product?.itemCode || "").trim().toLowerCase();

      const idMatch = pId && sProdId && sProdId === pId;
      const codeMatch = pCode && sProdCode && pCode === sProdCode;
      const nameMatch =
        pName &&
        sProdName &&
        (sProdName === pName ||
          (pName.length > 2 && sProdName.includes(pName)) ||
          (sProdName.length > 2 && pName.includes(sProdName)));
      const codeToNameMatch =
        (pCode && (pCode === sProdName || pCode === s.serialNo?.toLowerCase())) ||
        (sProdCode && (sProdCode === pName || sProdCode === form.productName?.toLowerCase()));

      return idMatch || codeMatch || nameMatch || codeToNameMatch;
    });
  }, [serialNumbers, products, form.productName, form.productId]);

  // Prioritize and sort technicians and service engineers for selection dropdowns
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const aRole = (a.role || "").toLowerCase();
      const bRole = (b.role || "").toLowerCase();
      const aIsTech = aRole.includes("tech") || aRole.includes("service") || aRole.includes("field") || aRole.includes("engineer");
      const bIsTech = bRole.includes("tech") || bRole.includes("service") || bRole.includes("field") || bRole.includes("engineer");
      if (aIsTech && !bIsTech) return -1;
      if (!aIsTech && bIsTech) return 1;
      return (a.fullName || "").localeCompare(b.fullName || "");
    });
  }, [employees]);

  // Real-time warranty check when typing or blurring serial number
  const verifySerial = async (serial) => {
    if (!serial || !serial.trim()) {
      setWarrantyCheckResult(null);
      return;
    }
    setCheckingSerial(true);
    try {
      const result = await checkSerialWarranty(serial.trim());
      setWarrantyCheckResult(result);
      if (result.found) {
        setForm((f) => ({
          ...f,
          serialNo: serial.trim(),
          underWarranty: result.underWarranty,
          serviceCharges: result.underWarranty ? 0 : f.serviceCharges,
          customerName: result.warranty?.customer?.name || result.serialInfo?.customer?.name || f.customerName,
          productName: result.warranty?.product?.name || result.serialInfo?.product?.name || f.productName
        }));
      } else {
        const matchedSn = serialNumbers.find((s) => s.serialNo === serial.trim());
        if (matchedSn) {
          const isUnder = matchedSn.warrantyEnd && new Date(matchedSn.warrantyEnd) > new Date();
          setForm((f) => ({
            ...f,
            serialNo: serial.trim(),
            underWarranty: !!isUnder,
            serviceCharges: isUnder ? 0 : f.serviceCharges
          }));
          setWarrantyCheckResult({
            found: true,
            underWarranty: !!isUnder,
            daysRemaining: isUnder ? Math.ceil((new Date(matchedSn.warrantyEnd) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
            serialInfo: matchedSn
          });
        }
      }
    } catch {
      const matchedSn = serialNumbers.find((s) => s.serialNo === serial.trim());
      if (matchedSn) {
        const isUnder = matchedSn.warrantyEnd && new Date(matchedSn.warrantyEnd) > new Date();
        setForm((f) => ({
          ...f,
          serialNo: serial.trim(),
          underWarranty: !!isUnder,
          serviceCharges: isUnder ? 0 : f.serviceCharges
        }));
        setWarrantyCheckResult({
          found: true,
          underWarranty: !!isUnder,
          daysRemaining: isUnder ? Math.ceil((new Date(matchedSn.warrantyEnd) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
          serialInfo: matchedSn
        });
      }
    } finally {
      setCheckingSerial(false);
    }
  };

  const handleSerialBlur = async () => {
    if (form.serialNo) {
      verifySerial(form.serialNo);
    }
  };

  const handleSerialDropdownChange = (e) => {
    const val = e.target.value;
    if (val === "__CUSTOM__") {
      setIsCustomSerial(true);
      setForm((f) => ({ ...f, serialNo: "" }));
      setWarrantyCheckResult(null);
    } else {
      setIsCustomSerial(false);
      setForm((f) => ({ ...f, serialNo: val }));
      verifySerial(val);
    }
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const selected = customers.find((c) => (c.id || c._id) === custId);
    setForm((f) => ({
      ...f,
      customerId: custId,
      customerName: selected ? selected.name : "",
      customerPhone: selected?.contactPerson?.phone || selected?.phone || "",
      customerEmail: selected?.contactPerson?.email || selected?.email || ""
    }));
  };

  const handleProjectChange = (e) => {
    const pId = e.target.value;
    if (!pId) {
      setForm((f) => ({ ...f, projectId: "", projectName: "" }));
      return;
    }
    const selectedProj = projects.find((p) => (p.projectId === pId || p._id === pId));
    if (selectedProj) {
      const custObj = customers.find((c) => (c.id || c._id) === (selectedProj.customer?.id || selectedProj.customer?._id));
      setForm((f) => ({
        ...f,
        projectId: selectedProj.projectId || selectedProj._id,
        projectName: selectedProj.name,
        customerId: selectedProj.customer?.id || custObj?.id || custObj?._id || f.customerId,
        customerName: selectedProj.customer?.name || custObj?.name || f.customerName,
        customerPhone: selectedProj.customer?.phone || custObj?.contactPerson?.phone || f.customerPhone,
        customerEmail: selectedProj.customer?.email || custObj?.contactPerson?.email || f.customerEmail
      }));
    }
  };

  const handleProductChange = (e) => {
    const val = e.target.value;
    if (val === "__CUSTOM__") {
      setIsCustomProduct(true);
      setIsCustomSerial(true);
      setForm((f) => ({ ...f, productId: "", productName: "", serialNo: "" }));
      setWarrantyCheckResult(null);
    } else if (!val) {
      setIsCustomProduct(false);
      setForm((f) => ({ ...f, productId: "", productName: "", serialNo: "" }));
      setWarrantyCheckResult(null);
    } else {
      setIsCustomProduct(false);
      const prod = products.find((p) => (p._id === val || p.itemCode === val || p.name === val));
      const pName = prod ? prod.name : val;
      setForm((f) => ({
        ...f,
        productId: prod?._id || "",
        productName: pName,
        serialNo: ""
      }));
      setIsCustomSerial(false);
      setWarrantyCheckResult(null);
    }
  };

  const handleTechnicianChange = (e) => {
    const val = e.target.value;
    if (val === "__CUSTOM__") {
      setIsCustomTechnician(true);
      setForm((f) => ({ ...f, engineerId: "", engineerName: "", engineerPhone: "" }));
    } else if (!val) {
      setIsCustomTechnician(false);
      setForm((f) => ({ ...f, engineerId: "", engineerName: "Unassigned", engineerPhone: "" }));
    } else {
      setIsCustomTechnician(false);
      const emp = employees.find((em) => em.fullName === val || (em._id || em.employeeCode) === val);
      if (emp) {
        setForm((f) => ({
          ...f,
          engineerId: emp.employeeCode || emp._id,
          engineerName: emp.fullName,
          engineerPhone: emp.phone || ""
        }));
      } else {
        setForm((f) => ({ ...f, engineerName: val, engineerId: "", engineerPhone: "" }));
      }
    }
  };

  const handleAcknowledgeNotification = async (notifId) => {
    try {
      await markNotificationAsRead(notifId);
      setServiceNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, read: true } : n))
      );
      showToast("Assignment acknowledged & marked read!");
    } catch {
      showToast("Failed to update notification status", "error");
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!form.issue.trim()) return showToast("Issue title is required", "error");
    if (!form.customerName.trim()) return showToast("Customer name is required", "error");
    if (!form.productName.trim()) return showToast("Product / Unit name is required", "error");

    setSubmitting(true);
    try {
      await createServiceRequest({
        customer: {
          id: form.customerId,
          name: form.customerName,
          phone: form.customerPhone,
          email: form.customerEmail
        },
        project: {
          id: form.projectId,
          name: form.projectName
        },
        productName: form.productName || "Industrial Unit",
        serialNo: form.serialNo.trim(),
        issue: form.issue,
        description: form.description,
        type: form.type,
        priority: form.priority,
        engineer: {
          id: form.engineerId,
          name: form.engineerName || "Unassigned",
          phone: form.engineerPhone
        },
        scheduledOn: form.scheduledOn,
        underWarranty: form.underWarranty,
        serviceCharges: form.underWarranty ? 0 : Number(form.serviceCharges) || 0
      });

      showToast("Service ticket created & technician notification dispatched!");
      setShowCreateModal(false);
      setWarrantyCheckResult(null);
      setIsCustomProduct(false);
      setIsCustomSerial(false);
      setIsCustomTechnician(false);
      setForm({
        projectId: "",
        projectName: "",
        customerId: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        productId: "",
        productName: "",
        serialNo: "",
        issue: "",
        description: "",
        type: "Breakdown / Repair",
        priority: "Medium",
        engineerId: "",
        engineerName: "Amit Patel",
        engineerPhone: "",
        scheduledOn: new Date().toISOString().split("T")[0],
        underWarranty: false,
        serviceCharges: 0
      });
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openResolveModal = (ticket) => {
    setSelectedTicket(ticket);
    setResolveForm({
      resolutionNotes: "",
      engineerHours: ticket.engineerHours || 3,
      partsCost: ticket.partsCost || 0,
      travelCost: ticket.travelCost || 1200,
      serviceCharges: ticket.underWarranty ? 0 : ticket.serviceCharges || 15000
    });
    setShowResolveModal(true);
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolveForm.resolutionNotes.trim()) {
      return showToast("Resolution notes are required", "error");
    }

    try {
      await resolveServiceRequest(selectedTicket._id || selectedTicket.requestId, resolveForm);
      showToast("Ticket marked as resolved!");
      setShowResolveModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Filter notifications based on selected technician
  const filteredNotifications = useMemo(() => {
    if (selectedTechFilter === "All") return serviceNotifications;
    return serviceNotifications.filter(
      (n) => (n.recipient || "").toLowerCase() === selectedTechFilter.toLowerCase()
    );
  }, [serviceNotifications, selectedTechFilter]);

  const uniqueTechnicians = useMemo(() => {
    const set = new Set();
    serviceNotifications.forEach((n) => {
      if (n.recipient && n.recipient !== "all") set.add(n.recipient);
    });
    employees.forEach((e) => {
      const r = (e.role || "").toLowerCase();
      if (r.includes("tech") || r.includes("engineer") || r.includes("service") || r.includes("field")) {
        set.add(e.fullName);
      }
    });
    return Array.from(set);
  }, [serviceNotifications, employees]);

  const unreadNotifCount = useMemo(() => {
    return serviceNotifications.filter((n) => !n.read).length;
  }, [serviceNotifications]);

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-in fade-in slide-in-from-top-3 duration-200 ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            breadcrumb="Projects & Service / Service Requests"
            title="Field Service & Breakdown Tickets"
            subtitle="Customer breakdown calls, planned preventive maintenance, technician scheduling, and automated serial warranty verification."
          />
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Log Service Request
          </button>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Service Requests"
            value={kpis?.total || 0}
            sub={`${kpis?.open || 0} Open / In Progress`}
            icon={Wrench}
          />
          <Kpi
            label="Under Warranty"
            value={kpis?.underWarranty || 0}
            tone="accent"
            sub="Free service coverage"
            icon={ShieldCheck}
          />
          <Kpi
            label="Service Revenue Billed"
            value={fmtINR(kpis?.serviceRevenue || 0)}
            tone="success"
            sub="Out-of-warranty charges"
            icon={IndianRupee}
          />
          <Kpi
            label="Technician Effort"
            value={`${kpis?.engineerHours || 0} hrs`}
            tone="warning"
            sub={`Parts Cost: ${fmtINR(kpis?.partsCost || 0)}`}
            icon={Clock}
          />
        </div>

        {/* ─── TECHNICIAN ASSIGNMENT & LIVE NOTIFICATIONS PANEL ──────────────────────── */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-blue-700/40 relative overflow-hidden">
          {/* Subtle ambient lighting */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-700/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 relative shadow-inner">
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 text-[9px] font-bold text-white items-center justify-center">
                      {unreadNotifCount}
                    </span>
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Technician Dispatch & Assignment Notifications
                  </h3>
                  <span className="text-[11px] bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-medium">
                    {serviceNotifications.length} Dispatch Alerts
                  </span>
                </div>
                <p className="text-xs text-blue-200/80">
                  Real-time alerts generated when tickets are assigned to technicians and service engineers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Technician Filter Pill Bar */}
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
                <span className="text-[11px] text-blue-200 font-semibold px-2 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-300" /> Technician:
                </span>
                <select
                  value={selectedTechFilter}
                  onChange={(e) => setSelectedTechFilter(e.target.value)}
                  className="bg-transparent text-white font-semibold text-xs rounded-lg px-2 py-1 outline-none cursor-pointer focus:bg-blue-800"
                >
                  <option value="All" className="bg-slate-900 text-white">All Technicians</option>
                  {uniqueTechnicians.map((tech) => (
                    <option key={tech} value={tech} className="bg-slate-900 text-white">
                      {tech}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowTechPanel(!showTechPanel)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-blue-200 transition-colors text-xs flex items-center gap-1 font-semibold"
                title={showTechPanel ? "Collapse Panel" : "Expand Panel"}
              >
                {showTechPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Panel Content (Collapsible) */}
          {showTechPanel && (
            <div className="pt-4 animate-in fade-in duration-200">
              {filteredNotifications.length === 0 ? (
                <div className="py-8 text-center text-blue-200/70 flex flex-col items-center justify-center gap-2">
                  <UserCheck className="w-9 h-9 text-blue-400/50" />
                  <p className="text-sm font-semibold">No active technician assignment alerts</p>
                  <p className="text-xs text-blue-300/60 max-w-md">
                    When you log a new service ticket and assign a technician, real-time dispatch alerts and scheduling details will appear in this feed.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredNotifications.slice(0, 6).map((notif) => {
                    const isUrgent = notif.severity === "danger" || notif.detail?.includes("Urgent");
                    const isHigh = notif.severity === "warning" || notif.detail?.includes("High");
                    return (
                      <div
                        key={notif._id}
                        className={`rounded-xl p-3.5 transition-all border relative backdrop-blur-md flex flex-col justify-between ${
                          notif.read
                            ? "bg-white/5 border-white/10 text-gray-300"
                            : isUrgent
                            ? "bg-red-500/15 border-red-400/40 text-white shadow-sm ring-1 ring-red-500/30"
                            : "bg-blue-500/15 border-blue-400/30 text-white shadow-sm"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-200 font-bold text-xs flex items-center justify-center border border-blue-400/20">
                                {notif.recipient ? notif.recipient.charAt(0).toUpperCase() : "T"}
                              </span>
                              <div>
                                <span className="text-xs font-bold text-white block leading-tight">
                                  {notif.recipient || "Assigned Technician"}
                                </span>
                                <span className="text-[10px] text-blue-300/80 block">
                                  {notif.recipientRole || "Service Engineer"}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                isUrgent
                                  ? "bg-red-600 text-white animate-pulse"
                                  : isHigh
                                  ? "bg-amber-500/80 text-white"
                                  : "bg-blue-600/60 text-blue-100"
                              }`}
                            >
                              {isUrgent ? "Urgent" : isHigh ? "High" : "Assigned"}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">
                            {notif.title}
                          </h4>
                          <p className="text-[11px] text-blue-100/90 leading-relaxed mb-3 line-clamp-3">
                            {notif.detail}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-blue-200/80">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-blue-300" />
                            {fmtDate(notif.at || notif.createdAt)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {!notif.read && (
                              <button
                                type="button"
                                onClick={() => handleAcknowledgeNotification(notif._id)}
                                className="px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors flex items-center gap-1"
                                title="Acknowledge dispatch"
                              >
                                <CheckCheck className="w-3 h-3" /> Acknowledge
                              </button>
                            )}
                            {notif.title?.includes("SR-") && (
                              <button
                                type="button"
                                onClick={() => {
                                  const ticketMatch = notif.title.match(/SR-\d+-\d+/);
                                  if (ticketMatch) setSearch(ticketMatch[0]);
                                }}
                                className="px-2 py-0.5 rounded-md bg-blue-600/40 hover:bg-blue-600 text-white font-semibold transition-colors flex items-center gap-1"
                                title="Filter table for this ticket"
                              >
                                View <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {["All", "New", "Assigned", "In Progress", "Resolved", "Closed"].map((st) => (
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
                placeholder="Search ticket, client, serial..."
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
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  loadData();
                }}
                className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Service Requests Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
              <span className="text-sm">Loading service tickets...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">No service requests found</p>
              <p className="text-xs text-gray-400 mt-1">Create a new ticket or adjust search filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Customer & Project</th>
                    <th className="py-3 px-4">Equipment & Serial</th>
                    <th className="py-3 px-4">Issue Description</th>
                    <th className="py-3 px-4">Warranty</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4 text-right">Charges</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((r) => {
                    const isClosed = ["Resolved", "Closed"].includes(r.status);
                    return (
                      <tr key={r._id || r.requestId} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                          {r.requestId}
                          <span className="block font-sans text-[11px] text-gray-400 font-normal">
                            {r.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-800">
                          <div>{r.customer?.name}</div>
                          {r.project?.name && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded mt-0.5">
                              <Briefcase className="w-2.5 h-2.5 text-blue-600" /> {r.project.name}
                            </div>
                          )}
                          {r.customer?.phone && (
                            <div className="text-[11px] text-gray-400">{r.customer.phone}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">{r.productName}</div>
                          <div className="font-mono text-[11px] text-gray-500 flex items-center gap-1">
                            <Hash className="w-3 h-3 text-gray-400" />
                            {r.serialNo ? r.serialNo : "No Serial"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-gray-800">{r.issue}</div>
                          {r.description && (
                            <div className="text-[11px] text-gray-400 truncate">{r.description}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.underWarranty ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <ShieldCheck className="w-3.5 h-3.5" /> In Warranty
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                              Out of Warranty
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={r.engineer?.name || ""}
                              onChange={async (e) => {
                                const techName = e.target.value;
                                if (!techName) return;
                                const emp = employees.find((em) => em.fullName === techName);
                                try {
                                  await updateServiceRequest(r._id || r.requestId, {
                                    engineer: {
                                      name: techName,
                                      id: emp?.employeeCode || emp?._id || "",
                                      phone: emp?.phone || ""
                                    },
                                    status: r.status === "New" ? "Assigned" : r.status
                                  });
                                  showToast(`Assigned ${techName} to ${r.requestId} & dispatched notification!`);
                                  loadData();
                                } catch (err) {
                                  showToast("Failed to assign technician", "error");
                                }
                              }}
                              className="text-xs font-semibold bg-blue-50/70 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[175px] truncate"
                            >
                              <option value="">{r.engineer?.name || "-- Assign Tech --"}</option>
                              {sortedEmployees.map((emp) => (
                                <option key={emp.employeeCode || emp._id} value={emp.fullName}>
                                  {emp.fullName} ({emp.role || "Staff"})
                                </option>
                              ))}
                            </select>
                          </div>
                          {r.scheduledOn && (
                            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-gray-400" />
                              {fmtDate(r.scheduledOn)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                          {fmtINR(r.serviceCharges)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge value={r.status} />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {!isClosed ? (
                            <button
                              type="button"
                              onClick={() => openResolveModal(r)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
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

      {/* ─── CREATE SERVICE TICKET MODAL ─────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Log Field Service Request</h3>
                  <p className="text-xs text-gray-500">
                    Record breakdown issue, linked project, catalog equipment, dynamic serial warranty & technician dispatch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Project Name Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                    Project Name / Contract (Optional)
                  </label>
                  <select
                    value={form.projectId}
                    onChange={handleProjectChange}
                    className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-800"
                  >
                    <option value="">-- Standalone / Direct Customer Service --</option>
                    {projects.map((p) => (
                      <option key={p.projectId || p._id} value={p.projectId || p._id}>
                        {p.name} {p.projectId ? `(${p.projectId})` : ""} {p.customer?.name ? `· ${p.customer.name}` : ""}
                      </option>
                    ))}
                  </select>
                  {form.projectName && (
                    <p className="text-[10px] text-blue-600 mt-1 font-medium">
                      ✓ Linked to project: {form.projectName}
                    </p>
                  )}
                </div>

                {/* 2. Customer / Client */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Customer / Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.customerId}
                    onChange={handleCustomerChange}
                    required
                    className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-800"
                  >
                    <option value="">
                      {customers.length > 0 ? "-- Select Customer --" : "No customers yet -- add one in Customers first"}
                    </option>
                    {customers.map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Product / Unit Name Dropdown with Custom option */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                      Product / Unit Name <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomProduct(!isCustomProduct);
                        if (!isCustomProduct) {
                          setIsCustomSerial(true);
                        }
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      {isCustomProduct ? "← Choose from Catalog" : "+ Enter Custom Product"}
                    </button>
                  </div>

                  {isCustomProduct ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Siemens S7-1500 PLC, 15kW VFD, or Custom Panel"
                      value={form.productName}
                      onChange={(e) => {
                        setForm({ ...form, productName: e.target.value, productId: "" });
                      }}
                      className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <select
                      value={form.productId || form.productName}
                      onChange={handleProductChange}
                      required
                      className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-800"
                    >
                      <option value="">-- Select Product from Catalog --</option>
                      {products.map((p) => (
                        <option key={p._id || p.itemCode} value={p._id || p.itemCode}>
                          {p.name} {p.itemCode ? `(${p.itemCode})` : ""} {p.category ? `· ${p.category}` : ""}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Other / Enter Custom Product Name...</option>
                    </select>
                  )}
                </div>

                {/* 4. Serial Number Dropdown (Cascades as per product selected) */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-blue-600" />
                      Serial Number (Filtered by Selected Product)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSerial(!isCustomSerial)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      {isCustomSerial ? "← Pick from Available Serials" : "+ Enter Custom Serial"}
                    </button>
                  </div>

                  {!isCustomSerial ? (
                    <div className="relative">
                      <select
                        value={form.serialNo}
                        onChange={handleSerialDropdownChange}
                        disabled={!form.productName}
                        className="w-full text-xs font-mono border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed shadow-sm font-semibold"
                      >
                        {!form.productName ? (
                          <option value="">
                            -- Please select Product / Unit Name above first to load serial numbers --
                          </option>
                        ) : matchingSerials.length > 0 ? (
                          <>
                            <option value="">
                              -- Select Serial Number ({matchingSerials.length} registered for &ldquo;{form.productName}&rdquo;) --
                            </option>
                            {matchingSerials.map((s) => (
                              <option key={s._id || s.serialNo} value={s.serialNo}>
                                {s.serialNo} · Status: {s.status || "In Stock"}{s.warrantyEnd ? ` · Warranty till: ${fmtDate(s.warrantyEnd)}` : ""}{s.customer?.name ? ` (${s.customer.name})` : ""}
                              </option>
                            ))}
                            <option value="__CUSTOM__">+ Other / Enter Custom Serial Number...</option>
                          </>
                        ) : (
                          <>
                            <option value="">
                              -- No registered serials found for &ldquo;{form.productName}&rdquo; --
                            </option>
                            <option value="__CUSTOM__">+ Enter Custom Serial Number Manually...</option>
                          </>
                        )}
                      </select>
                      {checkingSerial && (
                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-semibold animate-pulse">
                          Verifying warranty...
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. SN-2026-0001 (Press Tab or click out to auto-verify warranty)"
                        value={form.serialNo}
                        onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
                        onBlur={handleSerialBlur}
                        className="w-full text-xs font-mono border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {checkingSerial && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-semibold animate-pulse">
                          Verifying warranty...
                        </span>
                      )}
                    </div>
                  )}

                  {/* Contextual guidance message */}
                  {!isCustomSerial && !form.productName && (
                    <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                      ℹ️ Choose a Product from the dropdown above to filter its registered equipment serial numbers.
                    </p>
                  )}
                  {!isCustomSerial && form.productName && matchingSerials.length === 0 && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        No registered serial numbers found for &ldquo;{form.productName}&rdquo;.
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomSerial(true)}
                        className="font-bold underline text-amber-800 hover:text-amber-900"
                      >
                        Enter serial manually
                      </button>
                    </div>
                  )}

                  {/* Warranty Verification Feedback Banner */}
                  {warrantyCheckResult && (
                    <div className="mt-2">
                      {warrantyCheckResult.found && warrantyCheckResult.underWarranty ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Active Warranty Covered ({warrantyCheckResult.daysRemaining} days remaining)
                          </span>
                          <span className="text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                            Free Service (₹0 Charges)
                          </span>
                        </div>
                      ) : warrantyCheckResult.found ? (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                            Warranty Expired · Standard billable service charges apply
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* 5. Issue Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Issue / Symptom Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Drive tripping on ground fault or PLC communication failure"
                    value={form.issue}
                    onChange={(e) => setForm({ ...form, issue: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* 6. Service Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Service Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Breakdown / Repair">Breakdown / Repair</option>
                    <option value="Preventive Maintenance">Preventive Maintenance</option>
                    <option value="Installation & Setup">Installation & Setup</option>
                    <option value="Commissioning">Commissioning</option>
                    <option value="Calibration">Calibration</option>
                    <option value="Inspection">Inspection</option>
                  </select>
                </div>

                {/* 7. Priority */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Production Impacted)</option>
                    <option value="Urgent">Urgent / Line Stopped</option>
                  </select>
                </div>

                {/* 8. Assign Technician Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      Assign Technician
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTechnician(!isCustomTechnician)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      {isCustomTechnician ? "← Pick Employee" : "+ Other Tech"}
                    </button>
                  </div>

                  {isCustomTechnician ? (
                    <input
                      type="text"
                      placeholder="Technician / External Engineer Name"
                      value={form.engineerName}
                      onChange={(e) => setForm({ ...form, engineerName: e.target.value, engineerId: "" })}
                      className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <select
                      value={form.engineerId || form.engineerName}
                      onChange={handleTechnicianChange}
                      className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-800"
                    >
                      <option value="">-- Select Technician / Service Engineer --</option>
                      {sortedEmployees.map((emp) => (
                        <option key={emp.employeeCode || emp._id} value={emp.employeeCode || emp._id}>
                          {emp.fullName} — {emp.role || "Staff"} {emp.department ? `(${emp.department})` : ""}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Assign External / Other Engineer...</option>
                    </select>
                  )}
                  {form.engineerName && form.engineerName !== "Unassigned" && (
                    <p className="text-[10px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                      <Bell className="w-3 h-3" /> Automatic notification will be sent to {form.engineerName}
                    </p>
                  )}
                </div>

                {/* 9. Scheduled Visit Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Scheduled Visit Date</label>
                  <input
                    type="date"
                    value={form.scheduledOn}
                    onChange={(e) => setForm({ ...form, scheduledOn: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* 10. Service Charges */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Service Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={form.underWarranty}
                    value={form.serviceCharges}
                    onChange={(e) => setForm({ ...form, serviceCharges: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  />
                </div>

                {/* 11. Covered Under Warranty / AMC Checkbox */}
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="underWarrantyCheck"
                    checked={form.underWarranty}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        underWarranty: e.target.checked,
                        serviceCharges: e.target.checked ? 0 : form.serviceCharges
                      })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="underWarrantyCheck" className="text-xs font-semibold text-gray-700 cursor-pointer">
                    Covered Under Warranty / AMC (₹0 Charge)
                  </label>
                </div>
              </div>

              {/* 12. Detailed Symptoms */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Detailed Symptoms / Diagnosis</label>
                <textarea
                  rows={2}
                  placeholder="Describe alarm codes, machine behaviour, environment conditions..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting ? "Logging Ticket..." : "Log Ticket & Notify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RESOLVE TICKET MODAL ────────────────────────────────────────────── */}
      {showResolveModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Resolve Ticket — {selectedTicket.requestId}</h3>
                <p className="text-xs text-gray-500">{selectedTicket.issue}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Resolution Notes & Corrective Actions *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Root cause identified, parts replaced, calibration performed, machine verified in production..."
                  value={resolveForm.resolutionNotes}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolutionNotes: e.target.value })}
                  className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Engineer Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={resolveForm.engineerHours}
                    onChange={(e) => setResolveForm({ ...resolveForm, engineerHours: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Parts Cost Incurred (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={resolveForm.partsCost}
                    onChange={(e) => setResolveForm({ ...resolveForm, partsCost: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Travel & DA Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={resolveForm.travelCost}
                    onChange={(e) => setResolveForm({ ...resolveForm, travelCost: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Billable Service Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={resolveForm.serviceCharges}
                    onChange={(e) => setResolveForm({ ...resolveForm, serviceCharges: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Mark as Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
