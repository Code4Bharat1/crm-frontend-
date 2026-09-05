"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getWarranties,
  createWarranty,
  renewWarrantyAMC,
  checkSerialWarranty,
  fmtINR,
  fmtDate
} from "@/services/projectService";
import {
  getCustomers,
  getInvoices,
  getProducts,
  getSerialNumbers
} from "@/services/documentService";
import { PageHeader, Kpi, StatusBadge } from "@/components/crm-ui";
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  FileCheck,
  Zap
} from "lucide-react";

export default function WarrantyPage() {
  const [warranties, setWarranties] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  // Manual fallback toggles for Register Warranty Modal dropdowns
  const [customSerialMode, setCustomSerialMode] = useState(false);
  const [customProductMode, setCustomProductMode] = useState(false);
  const [customInvoiceMode, setCustomInvoiceMode] = useState(false);

  // Serial Quick Check Tool
  const [checkSerialInput, setCheckSerialInput] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  // Register Warranty Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    serialNo: "",
    productName: "",
    productCode: "",
    customerId: "",
    customerName: "",
    invoiceRef: "",
    startDate: new Date().toISOString().split("T")[0],
    durationMonths: 12,
    coverageType: "Standard Manufacturer",
    terms: ""
  });

  // AMC Renewal Modal
  const [showAmcModal, setShowAmcModal] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [amcForm, setAmcForm] = useState({
    contractNo: "",
    amcValue: 45000,
    extensionMonths: 12
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openCreateModal = () => {
    setCustomSerialMode(false);
    setCustomProductMode(false);
    setCustomInvoiceMode(false);
    setShowCreateModal(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const isAmcParam = statusFilter === "AMC" ? "true" : "All";
      const statusParam = statusFilter === "AMC" ? "All" : statusFilter;

      const [warRes, custRes, invRes, prodRes, snRes] = await Promise.all([
        getWarranties({ status: statusParam, isAmc: isAmcParam, search }),
        getCustomers().catch(() => ({ customers: [] })),
        getInvoices().catch(() => []),
        getProducts().catch(() => []),
        getSerialNumbers().catch(() => [])
      ]);
      setWarranties(warRes.warranties || []);
      setKpis(warRes.kpis || null);
      setCustomers(custRes.customers || (Array.isArray(custRes) ? custRes : []));
      setInvoices(Array.isArray(invRes) ? invRes : invRes?.invoices || []);
      setProducts(Array.isArray(prodRes) ? prodRes : prodRes?.products || []);
      setSerialNumbers(Array.isArray(snRes) ? snRes : snRes?.serialNumbers || []);
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

  const handleQuickCheck = async (e) => {
    e.preventDefault();
    if (!checkSerialInput.trim()) return;

    setChecking(true);
    try {
      const res = await checkSerialWarranty(checkSerialInput.trim());
      setCheckResult(res);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setChecking(false);
    }
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const selected = customers.find((c) => (c.id || c._id) === custId);
    setForm((f) => ({
      ...f,
      customerId: custId,
      customerName: selected ? selected.name : ""
    }));
  };

  // Selected invoice object and items
  const currentInvoice = React.useMemo(() => {
    return invoices.find((inv) => inv.invoiceNo === form.invoiceRef);
  }, [invoices, form.invoiceRef]);

  const currentInvoiceItems = React.useMemo(() => {
    return currentInvoice?.items || [];
  }, [currentInvoice]);

  // Handle Invoice Selection from Dropdown
  const handleInvoiceSelect = (invNo) => {
    if (invNo === "__custom__") {
      setCustomInvoiceMode(true);
      return;
    }
    if (!invNo) {
      setForm((f) => ({ ...f, invoiceRef: "" }));
      return;
    }

    const selectedInv = invoices.find((inv) => inv.invoiceNo === invNo);
    if (!selectedInv) {
      setForm((f) => ({ ...f, invoiceRef: invNo }));
      return;
    }

    const invCustId = selectedInv.customer?.id || selectedInv.customer?._id || "";
    const invCustName = selectedInv.customer?.name || "";
    const invDate = selectedInv.date ? new Date(selectedInv.date).toISOString().split("T")[0] : undefined;

    setForm((f) => ({
      ...f,
      invoiceRef: selectedInv.invoiceNo,
      ...(invCustId ? { customerId: invCustId } : {}),
      ...(invCustName ? { customerName: invCustName } : {}),
      ...(invDate ? { startDate: invDate } : {})
    }));
  };

  // Handle Product Selection from Dropdown
  const handleProductSelect = (val) => {
    if (val === "__custom__") {
      setCustomProductMode(true);
      return;
    }
    if (!val) {
      setForm((f) => ({ ...f, productName: "", productCode: "" }));
      return;
    }

    // Check if it's from invoice items
    const fromInv = currentInvoiceItems.find(
      (it) => (it.description || it.name) === val || it.productCode === val
    );
    if (fromInv) {
      setForm((f) => ({
        ...f,
        productName: fromInv.description || fromInv.name,
        productCode: fromInv.productCode || ""
      }));
      return;
    }

    // Check if it's from catalog products
    const fromCatalog = products.find(
      (p) => p.name === val || p.itemCode === val || (p._id && p._id === val)
    );
    if (fromCatalog) {
      setForm((f) => ({
        ...f,
        productName: fromCatalog.name,
        productCode: fromCatalog.itemCode || ""
      }));
      return;
    }

    setForm((f) => ({ ...f, productName: val }));
  };

  // Dynamically filter serial numbers based on selected product and/or invoice
  const { matchingSerials, otherSerials } = React.useMemo(() => {
    if (!serialNumbers || serialNumbers.length === 0) {
      return { matchingSerials: [], otherSerials: [] };
    }

    const pName = (form.productName || "").trim().toLowerCase();
    const pCode = (form.productCode || "").trim().toLowerCase();
    const invRef = (form.invoiceRef || "").trim().toLowerCase();

    if (!pName && !pCode && !invRef) {
      return { matchingSerials: [], otherSerials: serialNumbers };
    }

    const matches = [];
    const others = [];

    serialNumbers.forEach((s) => {
      const sProdName = (s.product?.name || "").trim().toLowerCase();
      const sProdCode = (s.product?.itemCode || "").trim().toLowerCase();
      const sInvRef = (s.invoiceRef || "").trim().toLowerCase();

      const matchesProd =
        (pName && (sProdName === pName || sProdName.includes(pName) || pName.includes(sProdName))) ||
        (pCode && (sProdCode === pCode || sProdCode.includes(pCode) || pCode.includes(sProdCode)));

      const matchesInv = invRef && sInvRef && sInvRef === invRef;

      if (matchesProd || matchesInv) {
        matches.push(s);
      } else {
        others.push(s);
      }
    });

    return { matchingSerials: matches, otherSerials: others };
  }, [serialNumbers, form.productName, form.productCode, form.invoiceRef]);

  // Handle Serial Number Selection from Dropdown
  const handleSerialSelect = (serialVal) => {
    if (serialVal === "__custom__") {
      setCustomSerialMode(true);
      return;
    }
    if (!serialVal) {
      setForm((f) => ({ ...f, serialNo: "" }));
      return;
    }

    const selectedSn = serialNumbers.find((s) => s.serialNo === serialVal);
    if (!selectedSn) {
      setForm((f) => ({ ...f, serialNo: serialVal }));
      return;
    }

    // Auto-populate associated product, customer, or invoice if not already chosen
    setForm((f) => {
      const updates = { serialNo: selectedSn.serialNo };

      if (!f.productName && selectedSn.product?.name) {
        updates.productName = selectedSn.product.name;
        updates.productCode = selectedSn.product.itemCode || "";
      }
      if (!f.customerName && selectedSn.customer?.name) {
        updates.customerName = selectedSn.customer.name;
        if (selectedSn.customer.id) updates.customerId = selectedSn.customer.id;
      }
      if (!f.invoiceRef && selectedSn.invoiceRef) {
        updates.invoiceRef = selectedSn.invoiceRef;
      }
      return { ...f, ...updates };
    });
  };

  const handleRegisterWarranty = async (e) => {
    e.preventDefault();
    if (!form.serialNo.trim()) return showToast("Serial number is required", "error");
    if (!form.productName.trim()) return showToast("Product name is required", "error");
    if (!form.customerName.trim()) return showToast("Customer is required", "error");

    setSubmitting(true);
    try {
      await createWarranty({
        serialNo: form.serialNo.trim(),
        product: {
          name: form.productName,
          itemCode: form.productCode
        },
        customer: {
          id: form.customerId,
          name: form.customerName
        },
        invoiceRef: form.invoiceRef,
        startDate: form.startDate,
        durationMonths: Number(form.durationMonths) || 12,
        coverageType: form.coverageType,
        terms: form.terms
      });
      showToast("Warranty registered successfully!");
      setShowCreateModal(false);
      setCustomSerialMode(false);
      setCustomProductMode(false);
      setCustomInvoiceMode(false);
      setForm({
        serialNo: "",
        productName: "",
        productCode: "",
        customerId: "",
        customerName: "",
        invoiceRef: "",
        startDate: new Date().toISOString().split("T")[0],
        durationMonths: 12,
        coverageType: "Standard Manufacturer",
        terms: ""
      });
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openAmcModal = (war) => {
    setSelectedWarranty(war);
    setAmcForm({
      contractNo: `AMC-${new Date().getFullYear()}-${war.serialNo.replace(/[^a-zA-Z0-9]/g, "")}`,
      amcValue: 50000,
      extensionMonths: 12
    });
    setShowAmcModal(true);
  };

  const handleAmcSubmit = async (e) => {
    e.preventDefault();
    try {
      await renewWarrantyAMC(selectedWarranty._id || selectedWarranty.warrantyNo, amcForm);
      showToast("Warranty upgraded/renewed as AMC Contract!");
      setShowAmcModal(false);
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
            breadcrumb="Projects & Service / Warranty"
            title="Equipment Warranty & AMC Tracking"
            subtitle="Installed base warranty management, serial number tracking, 30-day expiry notifications, and AMC contract conversions."
          />
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Register Warranty
          </button>
        </div>

        {/* Global KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Units Under Warranty"
            value={kpis?.active || 0}
            tone="success"
            sub="Active protection period"
            icon={ShieldCheck}
          />
          <Kpi
            label="Expiring in 30 Days"
            value={kpis?.expiringSoon || 0}
            tone="warning"
            sub="AMC Renewal Opportunity!"
            icon={Clock}
          />
          <Kpi
            label="Out of Warranty"
            value={kpis?.expired || 0}
            tone="danger"
            sub="Paid service eligible"
            icon={ShieldAlert}
          />
          <Kpi
            label="Active AMC Contracts"
            value={kpis?.amc || 0}
            tone="accent"
            sub="Annual maintenance active"
            icon={FileCheck}
          />
        </div>

        {/* ─── SERIAL NUMBER LOOKUP BAR ────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-200/80 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" /> Instant Serial Number Warranty Verification
              </h3>
              <p className="text-xs text-blue-700">
                Type a machine or unit serial number to verify active warranty coverage, expiry date, and service records.
              </p>
            </div>

            <form onSubmit={handleQuickCheck} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Serial Number (e.g. SN-2026-0001)..."
                value={checkSerialInput}
                onChange={(e) => setCheckSerialInput(e.target.value)}
                className="text-xs font-mono px-3.5 py-2 rounded-xl border border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
              <button
                type="submit"
                disabled={checking}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition-colors disabled:opacity-60 shrink-0"
              >
                {checking ? "Checking..." : "Verify"}
              </button>
            </form>
          </div>

          {/* Quick Check Result Card */}
          {checkResult && (
            <div className="mt-3 p-4 bg-white rounded-xl border border-blue-200 shadow-sm animate-in fade-in duration-150">
              {checkResult.found ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-blue-700">{checkSerialInput}</span>
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          checkResult.underWarranty
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {checkResult.underWarranty ? "✓ UNDER WARRANTY" : "OUT OF WARRANTY / EXPIRED"}
                      </span>
                      {checkResult.warranty?.coverageType && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          {checkResult.warranty.coverageType}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 font-semibold">
                      {checkResult.warranty?.product?.name || checkResult.serialInfo?.product?.name}
                    </p>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      Client: {checkResult.warranty?.customer?.name || checkResult.serialInfo?.customer?.name || "—"} ·
                      Valid Until: {fmtDate(checkResult.warranty?.endDate || checkResult.serialInfo?.warrantyEnd)} ({checkResult.daysRemaining} days remaining)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/service"
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                    >
                      + Log Service Call
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> No record found for serial number &quot;{checkSerialInput}&quot;. Please verify the serial tag.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "All", label: "All Warranties" },
              { id: "Active", label: "Active" },
              { id: "Expiring Soon", label: "Expiring Soon (30d)" },
              { id: "Expired", label: "Expired" },
              { id: "AMC", label: "AMC Contracts" }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === st.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search serial, client, product..."
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

        {/* Warranties Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
              <span className="text-sm">Loading warranty registries...</span>
            </div>
          ) : warranties.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">No warranty records found</p>
              <p className="text-xs text-gray-400 mt-1">Register a warranty or adjust filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Product & Model</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Invoice / SO</th>
                    <th className="py-3 px-4">Warranty Period</th>
                    <th className="py-3 px-4">Coverage</th>
                    <th className="py-3 px-4 text-center">Service Calls</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {warranties.map((w) => {
                    const isExpiring = w.status === "Expiring Soon";
                    const isExpired = w.status === "Expired";
                    const isAmc = w.coverageType === "AMC" || w.amc?.isAmc;

                    return (
                      <tr key={w._id || w.warrantyNo} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {w.serialNo}
                          <span className="block text-[11px] font-sans text-gray-400 font-normal">
                            {w.warrantyNo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">{w.product?.name}</div>
                          {w.product?.itemCode && (
                            <div className="text-[11px] font-mono text-gray-400">{w.product.itemCode}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-800">
                          {w.customer?.name || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-500">
                          {w.invoiceRef || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                          <div>{fmtDate(w.startDate)}</div>
                          <div className="font-bold text-gray-800">to {fmtDate(w.endDate)}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isAmc
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {w.coverageType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                          {w.serviceCount || 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge value={w.status} />
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {(isExpiring || isExpired) && !isAmc ? (
                            <button
                              type="button"
                              onClick={() => openAmcModal(w)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
                            >
                              Renew AMC
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium">Standard</span>
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

      {/* ─── REGISTER WARRANTY MODAL ─────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Register Equipment Warranty</h3>
                  <p className="text-xs text-gray-500">Bind serial number to customer, invoice, and warranty duration</p>
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

            <form onSubmit={handleRegisterWarranty} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. INVOICE / PO REFERENCE DROPDOWN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">Invoice / PO Reference</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomInvoiceMode(!customInvoiceMode);
                        if (!customInvoiceMode) setForm((f) => ({ ...f, invoiceRef: "" }));
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {customInvoiceMode ? "← Select from Invoices" : "+ Custom Invoice"}
                    </button>
                  </div>
                  {customInvoiceMode ? (
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-0042"
                      value={form.invoiceRef}
                      onChange={(e) => setForm({ ...form, invoiceRef: e.target.value })}
                      className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <select
                      value={form.invoiceRef}
                      onChange={(e) => handleInvoiceSelect(e.target.value)}
                      className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-800 font-medium"
                    >
                      <option value="">-- Select Sales Invoice (Optional) --</option>
                      {invoices.map((inv) => (
                        <option key={inv._id || inv.invoiceNo} value={inv.invoiceNo}>
                          {inv.invoiceNo} — {inv.customer?.name || "Customer"} {inv.date ? `(${new Date(inv.date).toLocaleDateString("en-IN")})` : ""}
                        </option>
                      ))}
                      <option value="__custom__">+ Enter Custom / External Invoice...</option>
                    </select>
                  )}
                </div>

                {/* 2. CUSTOMER / CLIENT DROPDOWN */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Customer / Client *</label>
                  <select
                    value={form.customerId}
                    onChange={handleCustomerChange}
                    required
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-800 font-medium"
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

                {/* 3. PRODUCT NAME DROPDOWN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">Product Name *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomProductMode(!customProductMode);
                        if (!customProductMode) setForm((f) => ({ ...f, productName: "", productCode: "" }));
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {customProductMode ? "← Select from Catalog" : "+ Custom Product"}
                    </button>
                  </div>
                  {customProductMode ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Danfoss VFD FC-302 15kW"
                      value={form.productName}
                      onChange={(e) => setForm({ ...form, productName: e.target.value })}
                      className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <select
                      value={form.productName}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      required
                      className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-800 font-medium"
                    >
                      <option value="">-- Select Product --</option>
                      {currentInvoiceItems.length > 0 && (
                        <optgroup label={`📦 Billed on Invoice (${form.invoiceRef})`}>
                          {currentInvoiceItems.map((it, idx) => {
                            const itName = it.description || it.name;
                            return (
                              <option key={`inv-item-${idx}`} value={itName}>
                                {itName} {it.productCode ? `(${it.productCode})` : ""}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                      <optgroup label={`🏭 Product Catalog (${products.length})`}>
                        {products.map((p) => (
                          <option key={p._id || p.itemCode} value={p.name}>
                            {p.name} {p.itemCode ? `(${p.itemCode})` : ""}
                          </option>
                        ))}
                      </optgroup>
                      <option value="__custom__">+ Enter Custom Product Name...</option>
                    </select>
                  )}
                </div>

                {/* 4. SERIAL NUMBER DROPDOWN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">Serial Number *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomSerialMode(!customSerialMode);
                        if (!customSerialMode) setForm((f) => ({ ...f, serialNo: "" }));
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {customSerialMode ? "← Select from List" : "+ Custom Serial No"}
                    </button>
                  </div>
                  {customSerialMode ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. SN-2026-0099"
                      value={form.serialNo}
                      onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
                      className="w-full text-xs font-mono border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  ) : (
                    <select
                      value={form.serialNo}
                      onChange={(e) => handleSerialSelect(e.target.value)}
                      required
                      className="w-full text-xs font-mono border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-800 font-semibold"
                    >
                      <option value="">-- Select Serial Number --</option>
                      {matchingSerials.length > 0 && (
                        <optgroup label={`🔍 Matching Equipment (${matchingSerials.length})`}>
                          {matchingSerials.map((s) => (
                            <option key={s._id || s.serialNo} value={s.serialNo}>
                              {s.serialNo} — {s.status || "In Stock"} {s.customer?.name ? `(${s.customer.name})` : ""}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherSerials.length > 0 && (
                        <optgroup
                          label={`📋 ${matchingSerials.length > 0 ? "Other Serial Numbers" : "All Registered Serials"} (${otherSerials.length})`}
                        >
                          {otherSerials.map((s) => (
                            <option key={s._id || s.serialNo} value={s.serialNo}>
                              {s.serialNo} — {s.product?.name || "Equipment"} ({s.status || "Active"})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__custom__">+ Enter Custom Serial Number...</option>
                    </select>
                  )}
                </div>

                {/* 5. START DATE */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* 6. DURATION (MONTHS) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (Months)</label>
                  <select
                    value={form.durationMonths}
                    onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value={12}>12 Months (1 Year)</option>
                    <option value={24}>24 Months (2 Years)</option>
                    <option value={36}>36 Months (3 Years)</option>
                    <option value={6}>6 Months</option>
                  </select>
                </div>

                {/* 7. COVERAGE SCOPE */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Coverage Scope</label>
                  <select
                    value={form.coverageType}
                    onChange={(e) => setForm({ ...form, coverageType: e.target.value })}
                    className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Standard Manufacturer">Standard Manufacturer (Parts & Labor defects)</option>
                    <option value="Comprehensive">Comprehensive All-Inclusive</option>
                    <option value="Parts Only">Parts Only</option>
                    <option value="Labor Only">Labor Only</option>
                    <option value="AMC">Annual Maintenance Contract (AMC)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Special Terms / Exclusions</label>
                <textarea
                  rows={2}
                  placeholder="Excludes physical impact, water ingress, lightning surge..."
                  value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-60"
                >
                  {submitting ? "Registering..." : "Save Warranty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── AMC CONVERSION / RENEWAL MODAL ──────────────────────────────────── */}
      {showAmcModal && selectedWarranty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Upgrade to AMC Contract</h3>
                <p className="text-xs text-gray-500">
                  {selectedWarranty.serialNo} · {selectedWarranty.customer?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAmcModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAmcSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">AMC Contract Number</label>
                <input
                  type="text"
                  required
                  value={amcForm.contractNo}
                  onChange={(e) => setAmcForm({ ...amcForm, contractNo: e.target.value })}
                  className="w-full text-xs font-mono border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Annual AMC Billing Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={amcForm.amcValue}
                  onChange={(e) => setAmcForm({ ...amcForm, amcValue: e.target.value })}
                  className="w-full text-xs border rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Extension Duration</label>
                <select
                  value={amcForm.extensionMonths}
                  onChange={(e) => setAmcForm({ ...amcForm, extensionMonths: e.target.value })}
                  className="w-full text-xs border rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  <option value={12}>12 Months (1 Year Extension)</option>
                  <option value={24}>24 Months (2 Year Extension)</option>
                  <option value={6}>6 Months Extension</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAmcModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow"
                >
                  Activate AMC Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
