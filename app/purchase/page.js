"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  markPOReceived,
  getSuppliers,
  calcItem,
  calcTotals,
  getCompany,
  fmtINR,
  fmtDate,
} from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  Plus,
  Printer,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  FileText,
  PackageCheck,
} from "lucide-react";

const emptyForm = {
  supplier: { name: "", address: "", gstNumber: "", contactPerson: "", email: "", phone: "" },
  soRef: "",
  projectRef: "",
  deliveryAddress: "",
  paymentTerms: "30 Days Net",
  notes: "",
  termsAndConditions: "",
  isInterState: false,
  status: "Draft",
  expectedDelivery: "",
  items: [
    {
      productCode: "",
      description: "",
      hsnCode: "",
      qty: 1,
      unit: "Nos",
      rate: 0,
      discount: 0,
      gstRate: 18,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalAmount: 0,
    },
  ],
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [printDoc, setPrintDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Mobile & Filter States
  const [mobileSearch, setMobileSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [po, c, sup] = await Promise.all([
        getPurchaseOrders(),
        getCompany().catch(() => null),
        getSuppliers().catch(() => []),
      ]);
      setOrders(Array.isArray(po) ? po : []);
      setCompany(c);
      setSuppliers(Array.isArray(sup) ? sup : []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("action") === "create" || p.get("create") === "true") {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(true);
      }
    }
  }, []);

  const recalc = (items, isInterState) => items.map((i) => calcItem(i, isInterState));
  const totals = calcTotals(form.items, form.isInterState);

  const handleSupplierSelect = (supId) => {
    if (!supId) {
      setForm((f) => ({
        ...f,
        supplier: { id: "", name: "", address: "", gstNumber: "", contactPerson: "", email: "", phone: "" },
      }));
      return;
    }
    const s = suppliers.find((sup) => sup._id === supId || sup.id === supId || sup.name === supId);
    if (!s) return;

    const supplierState = (s.address?.state || "").toLowerCase().trim();
    const isInterState = supplierState ? supplierState !== "maharashtra" : form.isInterState;

    const fullAddress = [s.address?.street, s.address?.city, s.address?.state, s.address?.pinCode]
      .filter(Boolean)
      .join(", ");

    setForm((f) => ({
      ...f,
      isInterState,
      paymentTerms: s.paymentTerms || f.paymentTerms || "30 Days Net",
      supplier: {
        id: s._id || s.id,
        name: s.name,
        address: fullAddress,
        gstNumber: s.gstNumber || "",
        contactPerson: s.contactPerson || "",
        email: s.email || "",
        phone: s.phone || "",
        state: s.address?.state || "",
      },
      items: recalc(f.items, isInterState),
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.supplier?.name) return showToast("Supplier is required", "error");
    if (!form.items || form.items.length === 0) return showToast("At least one line item is required", "error");

    setSaving(true);
    try {
      const payload = { ...form, ...calcTotals(form.items, form.isInterState) };
      if (editingId) {
        await updatePurchaseOrder(editingId, payload);
        showToast("Purchase Order updated successfully!");
      } else {
        await createPurchaseOrder(payload);
        showToast("Purchase Order created successfully!");
      }
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err.message || "Failed to save Purchase Order", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this Purchase Order?")) return;
    try {
      await deletePurchaseOrder(id);
      showToast("Purchase Order deleted successfully");
      load();
    } catch (err) {
      showToast(err.message || "Failed to delete Purchase Order", "error");
    }
  };

  const handleMarkReceived = async (po) => {
    try {
      await markPOReceived(po.poNo || po._id, {
        items: po.items.map((_, i) => ({ index: i, receivedQty: po.items[i].qty })),
      });
      showToast(`PO ${po.poNo || ""} marked as Received!`);
      load();
    } catch (err) {
      showToast(err.message || "Failed to mark as received", "error");
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      ...p,
      supplier: p.supplier || emptyForm.supplier,
      items: Array.isArray(p.items) && p.items.length > 0 ? p.items : emptyForm.items,
    });
    setEditingId(p.poNo || p._id);
    setShowForm(true);
  };

  // Metrics Calculations
  const totalValue = useMemo(() => orders.reduce((s, o) => s + (o.grandTotal || 0), 0), [orders]);
  const pendingCount = useMemo(
    () => orders.filter((o) => ["Sent", "Acknowledged", "Partially Received"].includes(o.status)).length,
    [orders]
  );
  const receivedCount = useMemo(() => orders.filter((o) => o.status === "Received").length, [orders]);
  const draftCount = useMemo(() => orders.filter((o) => o.status === "Draft").length, [orders]);

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter === "pending") {
        return ["Sent", "Acknowledged", "Partially Received"].includes(o.status);
      }
      if (statusFilter === "received") {
        return o.status === "Received";
      }
      if (statusFilter === "draft") {
        return o.status === "Draft";
      }
      return true;
    });
  }, [orders, statusFilter]);

  const displayedMobileOrders = useMemo(() => {
    if (!mobileSearch.trim()) return filteredOrders;
    const q = mobileSearch.toLowerCase().trim();
    return filteredOrders.filter((o) => {
      return (
        (o.poNo && o.poNo.toLowerCase().includes(q)) ||
        (o.supplier?.name && o.supplier.name.toLowerCase().includes(q)) ||
        (o.soRef && o.soRef.toLowerCase().includes(q)) ||
        (o.status && o.status.toLowerCase().includes(q))
      );
    });
  }, [filteredOrders, mobileSearch]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (orders.length === 0) {
      showToast("No records to export", "error");
      return;
    }
    const headers = ["PO Number", "Supplier", "Date", "Expected Delivery", "Items", "Grand Total (INR)", "Status", "SO Reference"];
    const rows = filteredOrders.map((o) => [
      o.poNo || "",
      o.supplier?.name || "",
      o.date ? new Date(o.date).toLocaleDateString("en-IN") : "",
      o.expectedDelivery ? new Date(o.expectedDelivery).toLocaleDateString("en-IN") : "",
      o.items?.length || 0,
      o.grandTotal || 0,
      o.status || "",
      o.soRef || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `purchase-orders-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Purchase Orders downloaded as CSV");
  };

  // Desktop Table Columns
  const columns = [
    {
      header: "PO NO.",
      cell: (p) => (
        <Link
          href={`/purchase/${p.poNo || p._id}`}
          className="font-mono text-xs font-bold text-cyan-700 hover:text-cyan-900 hover:underline bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 inline-block"
        >
          {p.poNo}
        </Link>
      ),
    },
    {
      header: "SUPPLIER",
      cell: (p) => (
        <div>
          <div className="font-bold text-gray-900 text-xs">{p.supplier?.name || "Unnamed Supplier"}</div>
          {p.soRef ? (
            <div className="text-[11px] text-blue-600 font-mono mt-0.5">SO: {p.soRef}</div>
          ) : (
            <div className="text-[11px] text-gray-400">{p.supplier?.city || "Direct Sourcing"}</div>
          )}
        </div>
      ),
    },
    {
      header: "ORDER DATE",
      cell: (p) => <span className="text-xs text-gray-700">{fmtDate(p.date)}</span>,
    },
    {
      header: "EXPECTED DELIVERY",
      cell: (p) => (
        <span className="text-xs text-gray-700 font-medium">
          {p.expectedDelivery ? fmtDate(p.expectedDelivery) : "—"}
        </span>
      ),
    },
    {
      header: "ITEMS",
      cell: (p) => (
        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
          {p.items?.length || 0} {p.items?.length === 1 ? "item" : "items"}
        </span>
      ),
    },
    {
      header: "TOTAL VALUE",
      cell: (p) => <span className="font-bold text-xs text-gray-900 font-mono">{fmtINR(p.grandTotal)}</span>,
    },
    {
      header: "STATUS",
      cell: (p) => <StatusBadge value={p.status} />,
    },
    {
      header: "ACTIONS",
      className: "whitespace-nowrap",
      cell: (p) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <button
            onClick={() => setPrintDoc(p)}
            className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
            title="Print PO PDF"
          >
            <Printer className="size-3 text-gray-600" />
            <span>Print</span>
          </button>
          <button
            onClick={() => openEdit(p)}
            className="px-2 py-1 text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
            title="Edit PO"
          >
            <Pencil className="size-3 text-cyan-600" />
            <span>Edit</span>
          </button>
          {!["Received", "Closed", "Cancelled"].includes(p.status) && (
            <button
              onClick={() => handleMarkReceived(p)}
              className="px-2 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
              title="Mark as Received"
            >
              <PackageCheck className="size-3 text-emerald-600" />
              <span>Received</span>
            </button>
          )}
          <button
            onClick={() => handleDelete(p.poNo || p._id)}
            className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
            title="Delete PO"
          >
            <Trash2 className="size-3 text-red-600" />
            <span>Del</span>
          </button>
        </div>
      ),
    },
  ];

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

      {printDoc && company && (
        <DocumentPrintView doc={printDoc} type="Purchase Order" company={company} onClose={() => setPrintDoc(null)} />
      )}

      {/* Add / Edit Purchase Order Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-gray-200 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  {editingId ? "Edit Purchase Order" : "New Purchase Order"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingId
                    ? "Modify material items, supplier pricing, and delivery schedule"
                    : "Issue a new procurement order to supplier against inventory or customer SO"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-base transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Supplier Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Supplier *</label>
                    <Link
                      href="/suppliers"
                      target="_blank"
                      className="text-xs text-cyan-700 font-medium hover:underline"
                    >
                      + Manage Suppliers
                    </Link>
                  </div>
                  <select
                    required
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.supplier?.id || suppliers.find((s) => s.name === form.supplier?.name)?._id || ""}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                  >
                    <option value="">
                      {suppliers.length > 0 ? "-- Select Supplier to Auto-Fill Details --" : "Loading suppliers…"}
                    </option>
                    {suppliers.map((s) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name} ({s.supplierCode || "SUP"} · {s.address?.city || "India"})
                      </option>
                    ))}
                  </select>

                  {/* Supplier Preview Card */}
                  {form.supplier?.name && (
                    <div className="mt-2.5 rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 text-xs text-gray-800 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-cyan-950">
                        <span>🏢 {form.supplier.name}</span>
                        {form.supplier.gstNumber && (
                          <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-md border border-cyan-300 font-semibold">
                            GSTIN: {form.supplier.gstNumber}
                          </span>
                        )}
                      </div>
                      {(form.supplier.contactPerson || form.supplier.phone || form.supplier.email) && (
                        <div className="text-[11px] text-gray-600 flex flex-wrap gap-2 pt-0.5">
                          {form.supplier.contactPerson && <span>👤 {form.supplier.contactPerson}</span>}
                          {form.supplier.phone && <span>📞 {form.supplier.phone}</span>}
                          {form.supplier.email && <span>✉️ {form.supplier.email}</span>}
                        </div>
                      )}
                      {form.supplier.address && (
                        <div className="text-[11px] text-gray-500 truncate pt-0.5">
                          📍 {form.supplier.address}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sales Order Reference */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Sales Order Reference <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-mono text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.soRef || ""}
                    onChange={(e) => setForm((f) => ({ ...f, soRef: e.target.value }))}
                    placeholder="e.g. SO-2026-001"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Links procurement directly to a customer order.</p>
                </div>

                {/* Expected Delivery */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.expectedDelivery ? form.expectedDelivery.slice(0, 10) : ""}
                    onChange={(e) => setForm((f) => ({ ...f, expectedDelivery: e.target.value }))}
                  />
                </div>

                {/* Payment Terms */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Terms</label>
                  <select
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.paymentTerms}
                    onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                  >
                    {[
                      "Immediate",
                      "7 Days Net",
                      "15 Days Net",
                      "30 Days Net",
                      "45 Days Net",
                      "60 Days Net",
                      "Against Delivery",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delivery Address */}
                <div className="col-span-1 sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Delivery Warehouse / Site Address</label>
                    {company?.address && (
                      <button
                        type="button"
                        onClick={() => {
                          const addr = [
                            company.address?.street,
                            company.address?.city,
                            company.address?.state,
                            company.address?.pinCode,
                          ]
                            .filter(Boolean)
                            .join(", ");
                          setForm((f) => ({ ...f, deliveryAddress: addr }));
                        }}
                        className="text-xs text-cyan-700 font-medium hover:underline cursor-pointer"
                      >
                        Use Company Address
                      </button>
                    )}
                  </div>
                  <textarea
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    rows={2}
                    value={form.deliveryAddress || ""}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                    placeholder="Where should the supplier dispatch items?"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Order Status</label>
                  <select
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {["Draft", "Sent", "Acknowledged", "Partially Received", "Received", "Closed", "Cancelled"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Inter-State Tax Supply */}
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="poInterState"
                      checked={form.isInterState}
                      onChange={(e) => {
                        const is = e.target.checked;
                        setForm((f) => ({ ...f, isInterState: is, items: recalc(f.items, is) }));
                      }}
                      className="w-4 h-4 rounded text-cyan-600 border-gray-300 focus:ring-gray-200 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-800">
                      Inter-State Supply (Apply IGST instead of CGST+SGST)
                    </span>
                  </label>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Line Items & Bill of Materials
                </label>
                <LineItemsEditor
                  items={form.items}
                  isInterState={form.isInterState}
                  allowOutOfStock={true}
                  onChange={(items) =>
                    setForm((f) => ({ ...f, items: items.map((i) => calcItem(i, f.isInterState)) }))
                  }
                />
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-1">
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 w-full sm:w-72 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-medium">{fmtINR(totals.subtotal)}</span>
                  </div>
                  {!form.isInterState && totals.totalCgst > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>CGST:</span>
                      <span className="font-mono font-medium">{fmtINR(totals.totalCgst)}</span>
                    </div>
                  )}
                  {!form.isInterState && totals.totalSgst > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>SGST:</span>
                      <span className="font-mono font-medium">{fmtINR(totals.totalSgst)}</span>
                    </div>
                  )}
                  {form.isInterState && totals.totalIgst > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>IGST:</span>
                      <span className="font-mono font-medium">{fmtINR(totals.totalIgst)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-gray-200 pt-2 text-gray-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-cyan-800 font-extrabold">{fmtINR(totals.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Terms and Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    rows={2}
                    value={form.termsAndConditions || ""}
                    onChange={(e) => setForm((f) => ({ ...f, termsAndConditions: e.target.value }))}
                    placeholder="Inspection clauses, penalty on delivery delay, warranty expectations"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Notes / Instructions</label>
                  <textarea
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    rows={2}
                    value={form.notes || ""}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Store keeper instructions, payment release milestones"
                  />
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 px-6 py-4 rounded-b-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-xs bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-bold shadow-sm disabled:opacity-60 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving…</span>
                    </>
                  ) : editingId ? (
                    "Update Purchase Order"
                  ) : (
                    "Create Purchase Order"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        breadcrumb="Purchase / Purchase Orders"
        title="Purchase Orders"
        subtitle="Plan material against customer orders, track receipts and supplier-wise delivery"
        actions={
          <Button
            onClick={openCreate}
            className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 h-9 px-4 rounded-xl cursor-pointer"
          >
            <Plus className="size-4" />
            <span>New Purchase Order</span>
          </Button>
        }
      />

      {/* KPI Cards Grid (2x2 on Mobile, 4x1 on PC) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Kpi label="Total POs" value={orders.length} sub="All generated orders" />
        <Kpi label="Pending Receipt" value={pendingCount} tone="warning" sub="Awaiting vendor dispatch" />
        <Kpi label="Received" value={receivedCount} tone="success" sub="Inward stock accepted" />
        <Kpi label="Total PO Value" value={fmtINR(totalValue)} tone="accent" sub="Gross procurement commitment" />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-4">
        {[
          { id: "all", label: "All Orders", count: orders.length },
          { id: "pending", label: "Pending", count: pendingCount },
          { id: "received", label: "Received", count: receivedCount },
          { id: "draft", label: "Drafts", count: draftCount },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusFilter(t.id)}
            className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === t.id
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Desktop Table View (Full Width for PC) */}
      <div className="hidden md:block mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-cyan-200 border-t-cyan-700 rounded-full" />
          </div>
        ) : (
          <DataTable
            rows={filteredOrders}
            columns={columns}
            searchKeys={["poNo", "supplier.name", "soRef", "status"]}
          />
        )}
      </div>

      {/* Mobile Responsive Cards View (Optimized for Phones & Small Screens) */}
      <div className="md:hidden mt-2 space-y-3">
        {/* Mobile Search & CSV Export Toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              placeholder="Search POs, suppliers, SOs…"
              className="h-9 pl-8 text-xs bg-white"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5 px-3 text-xs shrink-0 cursor-pointer"
            onClick={handleExportCSV}
          >
            <Download className="size-3.5" />
            <span>Export</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-cyan-200 border-t-cyan-700 rounded-full" />
          </div>
        ) : displayedMobileOrders.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted-foreground bg-white border rounded-xl">
            No purchase orders found
          </div>
        ) : (
          displayedMobileOrders.map((p, i) => (
            <div
              key={p.poNo || p._id || i}
              className="panel p-3.5 space-y-2.5 bg-white border border-gray-200/80 rounded-xl shadow-xs"
            >
              {/* Card Header: PO No + Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-mono font-bold text-xs text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 inline-block">
                    {p.poNo}
                  </span>
                  <h4 className="font-bold text-sm text-gray-900 mt-1 leading-snug truncate">
                    {p.supplier?.name || "Unnamed Supplier"}
                  </h4>
                  {p.soRef && (
                    <div className="text-[11px] text-blue-600 font-mono mt-0.5">
                      SO: {p.soRef}
                    </div>
                  )}
                </div>
                <StatusBadge value={p.status} />
              </div>

              {/* Card Grid Info: Order Date, Delivery Expected, Items */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50/90 p-2.5 rounded-xl border border-gray-200 text-xs">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Order Date</div>
                  <div className="font-medium text-gray-800 mt-0.5">{fmtDate(p.date)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Expected Delivery</div>
                  <div className="font-medium text-gray-800 mt-0.5">
                    {p.expectedDelivery ? fmtDate(p.expectedDelivery) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Items Count</div>
                  <div className="font-medium text-gray-800 mt-0.5">
                    {p.items?.length || 0} {p.items?.length === 1 ? "Item" : "Items"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Payment Terms</div>
                  <div className="font-medium text-gray-800 mt-0.5 truncate">
                    {p.paymentTerms || "30 Days Net"}
                  </div>
                </div>
              </div>

              {/* Total Value Banner */}
              <div className="flex items-center justify-between px-3 py-2 bg-cyan-50/50 rounded-lg border border-cyan-100">
                <span className="text-xs text-cyan-900 font-medium">Grand Total Value:</span>
                <span className="font-mono font-bold text-sm text-cyan-950">{fmtINR(p.grandTotal)}</span>
              </div>

              {/* Card Actions Footer */}
              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-100 text-xs">
                <button
                  onClick={() => setPrintDoc(p)}
                  className="px-2.5 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                >
                  <Printer className="size-3" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => openEdit(p)}
                  className="px-2.5 py-1 text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                >
                  <Pencil className="size-3" />
                  <span>Edit</span>
                </button>
                {!["Received", "Closed", "Cancelled"].includes(p.status) && (
                  <button
                    onClick={() => handleMarkReceived(p)}
                    className="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                  >
                    <PackageCheck className="size-3" />
                    <span>Received</span>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(p.poNo || p._id)}
                  className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
                >
                  <Trash2 className="size-3" />
                  <span>Del</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
