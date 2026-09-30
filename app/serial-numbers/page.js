"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, Download, Pencil, Trash2, Tag, Calendar, User, MapPin, FileText, CheckCircle2 } from "lucide-react";
import {
  getSerialNumbers, createSerialNumber, updateSerialNumber, deleteSerialNumber,
  getProducts, fmtDate,
  getCustomers, getSalesOrders, getDeliveryNotes
} from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";

const SERIAL_STATUSES = ["In Stock", "Reserved", "Dispatched", "Installed", "Under Repair"];

const emptyForm = {
  serialNo: "",
  product: { id: "", itemCode: "", name: "" },
  supplier: { id: "", name: "" },
  receivedOn: new Date().toISOString().slice(0, 10),
  location: "Main Warehouse - Bay 1",
  customer: { id: "", name: "" },
  soRef: "",
  dnRef: "",
  invoiceRef: "",
  warrantyEnd: "",
  status: "In Stock",
  notes: "",
};

export default function SerialNumbersPage() {
  const [serials, setSerials] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [mobileSearch, setMobileSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [customMode, setCustomMode] = useState({ customer: false, so: false, dn: false });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sList, pList, cList, soList, dnList] = await Promise.all([
        getSerialNumbers().catch(() => []),
        getProducts().catch(() => []),
        getCustomers().catch(() => []),
        getSalesOrders().catch(() => []),
        getDeliveryNotes().catch(() => []),
      ]);
      setSerials(Array.isArray(sList) ? sList : []);
      setProducts(Array.isArray(pList) ? pList : []);
      setCustomers(Array.isArray(cList) ? cList : (cList?.customers || []));
      setSalesOrders(Array.isArray(soList) ? soList : (soList?.data || []));
      setDeliveryNotes(Array.isArray(dnList) ? dnList : (dnList?.data || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setCustomMode({ customer: false, so: false, dn: false });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setForm({
      ...emptyForm,
      ...s,
      receivedOn: s.receivedOn ? s.receivedOn.slice(0, 10) : "",
      warrantyEnd: s.warrantyEnd ? s.warrantyEnd.slice(0, 10) : "",
    });
    setEditingId(s.serialNo || s._id);
    setCustomMode({
      customer: Boolean(s.customer?.name && !customers.some(c => c.name === s.customer?.name)),
      so: Boolean(s.soRef && !salesOrders.some(so => so.soNo === s.soRef)),
      dn: Boolean(s.dnRef && !deliveryNotes.some(dn => dn.dnNo === s.dnRef)),
    });
    setShowForm(true);
  };

  const handleProductSelect = (itemCode) => {
    const p = products.find(prod => prod.itemCode === itemCode || prod._id === itemCode);
    if (!p) return;
    setForm(f => ({
      ...f,
      product: { id: p._id, itemCode: p.itemCode, name: p.name },
      location: p.location || f.location,
    }));
  };

  const handleSalesOrderSelect = (soNo) => {
    if (soNo === "__custom__") {
      setCustomMode(m => ({ ...m, so: true }));
      return;
    }
    if (!soNo) {
      setForm(f => ({ ...f, soRef: "" }));
      return;
    }
    const so = salesOrders.find(s => s.soNo === soNo);
    if (!so) {
      setForm(f => ({ ...f, soRef: soNo }));
      return;
    }

    const custName = so.customer?.name || "";
    const custId = so.customer?.id || so.customer?._id || "";
    const matchedDn = deliveryNotes.find(d => d.soRef === so.soNo);

    setForm(f => ({
      ...f,
      soRef: so.soNo,
      customer: custName ? { id: custId, name: custName } : f.customer,
      dnRef: matchedDn ? matchedDn.dnNo : f.dnRef,
      status: matchedDn ? "Dispatched" : (f.status === "In Stock" ? "Reserved" : f.status),
    }));

    if (custName) {
      showToast(`Linked Customer (${custName}) from SO ${so.soNo}`, "info");
    }
  };

  const handleDeliveryNoteSelect = (dnNo) => {
    if (dnNo === "__custom__") {
      setCustomMode(m => ({ ...m, dn: true }));
      return;
    }
    if (!dnNo) {
      setForm(f => ({ ...f, dnRef: "" }));
      return;
    }
    const dn = deliveryNotes.find(d => d.dnNo === dnNo);
    if (!dn) {
      setForm(f => ({ ...f, dnRef: dnNo }));
      return;
    }

    const custName = dn.customer?.name || "";
    const custId = dn.customer?.id || dn.customer?._id || "";

    setForm(f => ({
      ...f,
      dnRef: dn.dnNo,
      soRef: dn.soRef || f.soRef,
      customer: custName ? { id: custId, name: custName } : f.customer,
      status: "Dispatched",
    }));

    if (custName || dn.soRef) {
      showToast(`Linked ${custName ? 'Customer (' + custName + ')' : ''} ${dn.soRef ? '& SO ' + dn.soRef : ''} from DN ${dn.dnNo}`, "info");
    }
  };

  const handleCustomerSelect = (custName) => {
    if (custName === "__custom__") {
      setCustomMode(m => ({ ...m, customer: true }));
      return;
    }
    if (!custName) {
      setForm(f => ({ ...f, customer: { id: "", name: "" } }));
      return;
    }
    const c = customers.find(item => item.name === custName);
    setForm(f => ({
      ...f,
      customer: { id: c?._id || c?.id || "", name: custName }
    }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.serialNo) return showToast("Serial Number is required", "error");
    if (!form.product?.name) return showToast("Select a Product", "error");
    setSaving(true);
    try {
      if (editingId) {
        await updateSerialNumber(editingId, form);
        showToast("Serial Number updated");
      } else {
        await createSerialNumber(form);
        showToast("Serial Number created");
      }
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this serial number record?")) return;
    try {
      await deleteSerialNumber(id);
      showToast("Serial number deleted");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const filteredSerials = statusFilter === "All"
    ? serials
    : serials.filter(s => s.status === statusFilter);

  const displayedMobileSerials = useMemo(() => {
    if (!mobileSearch.trim()) return filteredSerials;
    const terms = mobileSearch.toLowerCase().split(/\s+/).filter(Boolean);
    return filteredSerials.filter((s) => {
      const hay = `${s.serialNo || ""} ${s.product?.name || ""} ${s.product?.itemCode || ""} ${s.customer?.name || ""} ${s.location || ""} ${s.status || ""} ${s.soRef || ""} ${s.dnRef || ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [filteredSerials, mobileSearch]);

  const inStockCount = serials.filter(s => s.status === "In Stock").length;
  const installedCount = serials.filter(s => s.status === "Installed").length;
  const underRepairCount = serials.filter(s => s.status === "Under Repair").length;

  const handleMobileExport = () => {
    if (!displayedMobileSerials || displayedMobileSerials.length === 0) {
      showToast("No serial records to export", "error");
      return;
    }
    const headers = ["serialNo", "productName", "itemCode", "status", "location", "customer", "receivedOn", "warrantyEnd", "soRef", "dnRef"];
    const csvContent = [
      headers.join(","),
      ...displayedMobileSerials.map(s => [
        s.serialNo || "",
        s.product?.name || "",
        s.product?.itemCode || "",
        s.status || "",
        s.location || "",
        s.customer?.name || "",
        s.receivedOn ? fmtDate(s.receivedOn) : "",
        s.warrantyEnd ? fmtDate(s.warrantyEnd) : "",
        s.soRef || "",
        s.dnRef || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `serial-numbers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded serial numbers CSV");
  };

  const columns = [
    {
      header: "Serial Number",
      cell: (r) => (
        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-200/80">
          {r.serialNo}
        </span>
      ),
    },
    {
      header: "Product",
      cell: (r) => (
        <div>
          <div className="font-semibold text-gray-900 text-sm">{r.product?.name}</div>
          <div className="text-[11px] text-gray-400 font-mono">{r.product?.itemCode}</div>
        </div>
      ),
    },
    {
      header: "Location / Customer",
      cell: (r) => (
        <div>
          {r.customer?.name ? (
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs">👤</span>
              <span className="font-semibold text-gray-900 text-xs">{r.customer.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs">📍</span>
              <span className="text-gray-600 text-xs">{r.location || "Main Warehouse"}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Received On",
      cell: (r) => <span className="text-xs text-gray-600">{fmtDate(r.receivedOn)}</span>,
    },
    {
      header: "Order Trail",
      cell: (r) => {
        const trail = [r.soRef, r.dnRef, r.invoiceRef].filter(Boolean);
        return trail.length > 0 ? (
          <span className="font-mono text-[11px] text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">{trail.join(" → ")}</span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        );
      },
    },
    {
      header: "Warranty End",
      cell: (r) => <span className="text-xs text-gray-600">{r.warrantyEnd ? fmtDate(r.warrantyEnd) : "—"}</span>,
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge value={r.status} />,
    },
    {
      header: "Actions",
      cell: (r) => (
        <div className="flex gap-1.5 items-center">
          <button
            onClick={() => openEdit(r)}
            className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
            title="Edit Serial Number"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(r.serialNo || r._id)}
            className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs"
            title="Delete Record"
          >
            Del
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Add / Edit Serial Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 border border-gray-200 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-4 shrink-0">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900">
                  {editingId ? "Edit Serial Number Record" : "Add New Serial Number"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingId ? "Update unit tracking, warehouse location, customer & warranty" : "Register a serialized product item to inventory"}
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

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Serial Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN-AUTO-2026-0042"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-mono text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.serialNo}
                    onChange={e => setForm(f => ({ ...f, serialNo: e.target.value }))}
                  />
                </div>

                {/* Product */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product *</label>
                  <select
                    required
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.product?.itemCode || ""}
                    onChange={e => handleProductSelect(e.target.value)}
                  >
                    <option value="">Select a product…</option>
                    {products.map(p => (
                      <option key={p.itemCode || p._id} value={p.itemCode}>
                        {p.name} ({p.itemCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    {SERIAL_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Current Location */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Current Warehouse Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Warehouse - Bay 1"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>

                {/* Customer Assigned */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      Customer Assigned <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomMode(m => ({ ...m, customer: !m.customer }))}
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium cursor-pointer underline"
                    >
                      {customMode.customer ? "Pick from list" : "Type manual"}
                    </button>
                  </div>

                  {customMode.customer ? (
                    <input
                      type="text"
                      placeholder="Type customer name..."
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.customer?.name || ""}
                      onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, name: e.target.value } }))}
                    />
                  ) : (
                    <select
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.customer?.name || ""}
                      onChange={e => handleCustomerSelect(e.target.value)}
                    >
                      <option value="">-- None (In Warehouse Stock / Unsold) --</option>
                      {customers.map(c => (
                        <option key={c._id || c.id} value={c.name}>
                          {c.name} {c.area ? `(${c.area})` : ""}
                        </option>
                      ))}
                      <option value="__custom__">✏️ Type Custom Customer Name...</option>
                    </select>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">Leave empty if unit is currently in warehouse inventory.</p>
                </div>

                {/* Warranty End Date */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">Warranty End Date <span className="text-[11px] text-gray-400 font-normal">(Optional)</span></label>
                  </div>
                  <input
                    type="date"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.warrantyEnd}
                    onChange={e => setForm(f => ({ ...f, warrantyEnd: e.target.value }))}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Calculated from dispatch or installation date.</p>
                </div>

                {/* Sales Order Ref */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      Sales Order Ref <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomMode(m => ({ ...m, so: !m.so }))}
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium cursor-pointer underline"
                    >
                      {customMode.so ? "Pick from list" : "Type manual"}
                    </button>
                  </div>

                  {customMode.so ? (
                    <input
                      type="text"
                      placeholder="e.g. SO-2026-001"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-mono text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.soRef || ""}
                      onChange={e => setForm(f => ({ ...f, soRef: e.target.value }))}
                    />
                  ) : (
                    <select
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm bg-white font-mono text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.soRef || ""}
                      onChange={e => handleSalesOrderSelect(e.target.value)}
                    >
                      <option value="">-- None (Unsold / In Stock) --</option>
                      {salesOrders.map(so => (
                        <option key={so._id} value={so.soNo}>
                          {so.soNo} — {so.customer?.name || "Customer"} ({so.status})
                        </option>
                      ))}
                      <option value="__custom__">✏️ Type Custom Sales Order Ref...</option>
                    </select>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">Selecting auto-fills Customer & matching Delivery Note.</p>
                </div>

                {/* Delivery Note Ref */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      Delivery Note Ref <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomMode(m => ({ ...m, dn: !m.dn }))}
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium cursor-pointer underline"
                    >
                      {customMode.dn ? "Pick from list" : "Type manual"}
                    </button>
                  </div>

                  {customMode.dn ? (
                    <input
                      type="text"
                      placeholder="e.g. DN-2026-001"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-mono text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.dnRef || ""}
                      onChange={e => setForm(f => ({ ...f, dnRef: e.target.value }))}
                    />
                  ) : (
                    <select
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm bg-white font-mono text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.dnRef || ""}
                      onChange={e => handleDeliveryNoteSelect(e.target.value)}
                    >
                      <option value="">-- None (Not Dispatched Yet) --</option>
                      {deliveryNotes.map(dn => (
                        <option key={dn._id} value={dn.dnNo}>
                          {dn.dnNo} — {dn.customer?.name || "Customer"} {dn.soRef ? `(SO: ${dn.soRef})` : ""}
                        </option>
                      ))}
                      <option value="__custom__">✏️ Type Custom Delivery Note Ref...</option>
                    </select>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">Selecting auto-fills Customer & Sales Order, sets Dispatched.</p>
                </div>

                {/* Notes */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Inspection Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Quality inspection notes, firmware version, commissioning details"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.notes || ""}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-gray-100 mt-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-gray-900 hover:bg-black text-white rounded-lg shadow-xs transition-all disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Saving…" : editingId ? "Update Serial" : "Create Serial Number"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        breadcrumb="Products & Inventory / Serial Numbers"
        title="Serial Numbers"
        subtitle="Item-level serialized tracking from purchase receipt to warehouse, dispatch, installation and warranty support"
        actions={
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            + Add Serial Number
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Total Serials" value={serials.length} sub="Registered units" />
        <Kpi label="In Stock" value={inStockCount} tone="accent" sub="Available in warehouse" />
        <Kpi label="Installed" value={installedCount} tone="success" sub="At customer sites" />
        <Kpi label="Under Repair" value={underRepairCount} tone="warning" sub="In service queue" />
      </div>

      {/* Mobile Search & Action Toolbar */}
      <div className="sm:hidden mb-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
            <input
              type="text"
              placeholder="Search serial, product, customer..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-gray-300 rounded-xl outline-none hover:border-gray-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 transition-all shadow-2xs"
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
            />
            {mobileSearch && (
              <button
                onClick={() => setMobileSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleMobileExport}
            className="flex items-center justify-center p-2.5 border border-gray-300 bg-white rounded-xl text-gray-700 hover:bg-gray-50 active:scale-95 shadow-2xs shrink-0 cursor-pointer"
            title="Export CSV"
          >
            <Download className="size-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
        {["All", ...SERIAL_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === s
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s} {s !== "All" && `(${serials.filter(item => item.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          </div>
        ) : (
          <DataTable
            rows={filteredSerials}
            columns={columns}
            searchKeys={["serialNo", "product.name", "product.itemCode", "customer.name", "location", "status"]}
          />
        )}
      </div>

      {/* Mobile Card List View */}
      <div className="sm:hidden space-y-3 mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-7 h-7 border-3 border-blue-200 border-t-blue-600 rounded-full" />
          </div>
        ) : displayedMobileSerials.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 p-6">
            <Tag className="size-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-700">No serial number records found</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Try searching with a different term or clear filters</p>
          </div>
        ) : (
          displayedMobileSerials.map((s) => (
            <div
              key={s._id || s.serialNo}
              className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-3 hover:border-blue-300 transition-all"
            >
              {/* Card Header: Serial & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50/90 px-2.5 py-1 rounded-lg border border-blue-200/80 inline-block">
                    {s.serialNo}
                  </span>
                  <h4 className="font-bold text-sm text-gray-900 mt-1.5 leading-snug truncate">
                    {s.product?.name || "Unnamed Product"}
                  </h4>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    {s.product?.itemCode}
                  </div>
                </div>
                <StatusBadge value={s.status} />
              </div>

              {/* Card Grid Info */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50/90 p-2.5 rounded-xl border border-gray-200 text-xs">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Location / Customer</div>
                  <div className="font-medium text-gray-800 mt-0.5 truncate">
                    {s.customer?.name ? `👤 ${s.customer.name}` : `📍 ${s.location || "Warehouse"}`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Warranty End</div>
                  <div className="font-medium text-gray-800 mt-0.5">
                    {s.warrantyEnd ? fmtDate(s.warrantyEnd) : "—"}
                  </div>
                </div>
                {s.soRef && (
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Sales Order</div>
                    <div className="font-mono text-[11px] text-blue-600 mt-0.5 font-medium">{s.soRef}</div>
                  </div>
                )}
                {s.dnRef && (
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Delivery Note</div>
                    <div className="font-mono text-[11px] text-indigo-600 mt-0.5 font-medium">{s.dnRef}</div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {s.notes && (
                <p className="text-[11px] text-gray-500 bg-amber-50/40 p-2 rounded-lg border border-amber-200/60 line-clamp-2">
                  📝 {s.notes}
                </p>
              )}

              {/* Card Actions Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                <span className="text-gray-400 text-[11px]">
                  Rec: {fmtDate(s.receivedOn)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEdit(s)}
                    className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Pencil className="size-3 text-blue-600" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(s.serialNo || s._id)}
                    className="px-3 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Trash2 className="size-3 text-red-600" />
                    <span>Del</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
