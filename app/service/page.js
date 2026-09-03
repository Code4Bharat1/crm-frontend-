"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getServiceRequests,
  createServiceRequest,
  updateServiceRequest,
  resolveServiceRequest,
  checkSerialWarranty,
  fmtINR,
  fmtDate
} from "@/services/projectService";
import { getCustomers } from "@/services/documentService";
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
  Briefcase
} from "lucide-react";

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  // New Request Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warrantyCheckResult, setWarrantyCheckResult] = useState(null);
  const [checkingSerial, setCheckingSerial] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    productName: "",
    serialNo: "",
    issue: "",
    description: "",
    type: "Breakdown / Repair",
    priority: "Medium",
    engineerName: "Amit Patel",
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
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, custRes] = await Promise.all([
        getServiceRequests({ status: statusFilter, search }),
        getCustomers().catch(() => ({ customers: [] }))
      ]);
      setRequests(reqRes.requests || []);
      setKpis(reqRes.kpis || null);
      setCustomers(custRes.customers || custRes || []);
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

  // Real-time warranty check when typing or blurring serial number
  const handleSerialBlur = async () => {
    if (!form.serialNo.trim()) {
      setWarrantyCheckResult(null);
      return;
    }
    setCheckingSerial(true);
    try {
      const result = await checkSerialWarranty(form.serialNo.trim());
      setWarrantyCheckResult(result);
      if (result.found) {
        setForm((f) => ({
          ...f,
          underWarranty: result.underWarranty,
          serviceCharges: result.underWarranty ? 0 : f.serviceCharges,
          customerName: result.warranty?.customer?.name || result.serialInfo?.customer?.name || f.customerName,
          productName: result.warranty?.product?.name || result.serialInfo?.product?.name || f.productName
        }));
      }
    } catch {
      setWarrantyCheckResult(null);
    } finally {
      setCheckingSerial(false);
    }
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const selected = customers.find((c) => (c.id || c._id) === custId);
    setForm((f) => ({
      ...f,
      customerId: custId,
      customerName: selected ? selected.name : "",
      customerPhone: selected?.contactPerson?.phone || "",
      customerEmail: selected?.contactPerson?.email || ""
    }));
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!form.issue.trim()) return showToast("Issue title is required", "error");
    if (!form.customerName.trim()) return showToast("Customer name is required", "error");

    setSubmitting(true);
    try {
      await createServiceRequest({
        customer: {
          id: form.customerId,
          name: form.customerName,
          phone: form.customerPhone,
          email: form.customerEmail
        },
        productName: form.productName || "Industrial Unit",
        serialNo: form.serialNo.trim(),
        issue: form.issue,
        description: form.description,
        type: form.type,
        priority: form.priority,
        engineer: {
          name: form.engineerName
        },
        scheduledOn: form.scheduledOn,
        underWarranty: form.underWarranty,
        serviceCharges: form.underWarranty ? 0 : Number(form.serviceCharges) || 0
      });
      showToast("Service ticket created successfully!");
      setShowCreateModal(false);
      setWarrantyCheckResult(null);
      setForm({
        customerId: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        productName: "",
        serialNo: "",
        issue: "",
        description: "",
        type: "Breakdown / Repair",
        priority: "Medium",
        engineerName: "Amit Patel",
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
                    <th className="py-3 px-4">Customer</th>
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
                          {r.customer?.phone && (
                            <div className="text-[11px] text-gray-400">{r.customer.phone}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">{r.productName}</div>
                          <div className="font-mono text-[11px] text-gray-500">
                            {r.serialNo ? `SN: ${r.serialNo}` : "No Serial"}
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
                          <div className="font-semibold">{r.engineer?.name || "Unassigned"}</div>
                          {r.scheduledOn && (
                            <div className="text-[11px] text-gray-400">{fmtDate(r.scheduledOn)}</div>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Log Field Service Request</h3>
                  <p className="text-xs text-gray-500">Record breakdown issue, customer, and equipment serial</p>
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
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Customer / Client <span className="text-red-500">*</span>
                  </label>
                  {customers.length > 0 ? (
                    <select
                      value={form.customerId}
                      onChange={handleCustomerChange}
                      required
                      className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
                      placeholder="Customer Name"
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product / Unit Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siemens S7-1500 PLC or 15kW VFD"
                    value={form.productName}
                    onChange={(e) => setForm({ ...form, productName: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Serial Number with Live Warranty Check */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Serial Number (Automatic Warranty Verification)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. SN-2026-0001"
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

                  {/* Warranty Verification Feedback */}
                  {warrantyCheckResult && (
                    <div className="mt-2">
                      {warrantyCheckResult.found && warrantyCheckResult.underWarranty ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Active Warranty Covered ({warrantyCheckResult.daysRemaining} days remaining)
                          </span>
                          <span className="text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                            Free Service
                          </span>
                        </div>
                      ) : warrantyCheckResult.found ? (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                            Warranty Expired · Standard service charges apply
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Issue / Symptom Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Drive tripping on ground fault or communication error"
                    value={form.issue}
                    onChange={(e) => setForm({ ...form, issue: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent / Line Stopped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assign Technician</label>
                  <input
                    type="text"
                    value={form.engineerName}
                    onChange={(e) => setForm({ ...form, engineerName: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Scheduled Visit Date</label>
                  <input
                    type="date"
                    value={form.scheduledOn}
                    onChange={(e) => setForm({ ...form, scheduledOn: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

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
                    Covered Under Warranty / AMC
                  </label>
                </div>
              </div>

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
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-all disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Log Ticket"}
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
