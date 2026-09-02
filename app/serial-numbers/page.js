"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getSerialNumbers, createSerialNumber, updateSerialNumber, deleteSerialNumber,
  getProducts, fmtDate
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
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sList, pList] = await Promise.all([
        getSerialNumbers().catch(() => []),
        getProducts().catch(() => []),
      ]);
      setSerials(Array.isArray(sList) ? sList : []);
      setProducts(Array.isArray(pList) ? pList : []);
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

  const inStockCount = serials.filter(s => s.status === "In Stock").length;
  const installedCount = serials.filter(s => s.status === "Installed").length;
  const underRepairCount = serials.filter(s => s.status === "Under Repair").length;

  const columns = [
    {
      header: "Serial Number",
      cell: (r) => <span className="font-mono text-xs font-bold text-purple-700">{r.serialNo}</span>,
    },
    {
      header: "Product",
      cell: (r) => (
        <div>
          <div className="font-semibold text-gray-900">{r.product?.name}</div>
          <div className="text-[11px] text-gray-400 font-mono">{r.product?.itemCode}</div>
        </div>
      ),
    },
    {
      header: "Location / Customer",
      cell: (r) => (
        <div>
          {r.customer?.name ? (
            <span className="font-semibold text-gray-900">{r.customer.name}</span>
          ) : (
            <span className="text-gray-600">{r.location || "Main Warehouse"}</span>
          )}
        </div>
      ),
    },
    {
      header: "Received On",
      cell: (r) => fmtDate(r.receivedOn),
    },
    {
      header: "Order Trail",
      cell: (r) => {
        const trail = [r.soRef, r.dnRef, r.invoiceRef].filter(Boolean);
        return trail.length > 0 ? (
          <span className="font-mono text-[11px] text-gray-600">{trail.join(" → ")}</span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        );
      },
    },
    {
      header: "Warranty End",
      cell: (r) => r.warrantyEnd ? fmtDate(r.warrantyEnd) : "—",
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge value={r.status} />,
    },
    {
      header: "Actions",
      cell: (r) => (
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => openEdit(r)}
            className="px-2 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(r.serialNo || r._id)}
            className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-red-600 rounded font-medium transition-colors"
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
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border my-auto">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-bold text-lg text-gray-900">
                {editingId ? "Edit Serial Number Record" : "Add New Serial Number"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN-AUTO-2026-0042"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-purple-500"
                    value={form.serialNo}
                    onChange={e => setForm(f => ({ ...f, serialNo: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product *</label>
                  <select
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500"
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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    {SERIAL_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Current Warehouse Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Warehouse A - Bay 1"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Assigned</label>
                  <input
                    type="text"
                    placeholder="Customer Name (if dispatched/installed)"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.customer?.name || ""}
                    onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, name: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Warranty End Date</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.warrantyEnd}
                    onChange={e => setForm(f => ({ ...f, warrantyEnd: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sales Order Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. SO-2026-001"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    value={form.soRef || ""}
                    onChange={e => setForm(f => ({ ...f, soRef: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Delivery Note Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. DN-2026-001"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    value={form.dnRef || ""}
                    onChange={e => setForm(f => ({ ...f, dnRef: e.target.value }))}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Inspection Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Quality inspection notes, firmware version, commissioning details"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.notes || ""}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow disabled:opacity-60"
                >
                  {saving ? "Saving…" : editingId ? "Update Serial" : "Create Serial Number"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PageHeader
        breadcrumb="Products & Inventory / Serial Numbers"
        title="Serial Numbers"
        subtitle="Item-level serialized tracking from purchase receipt to warehouse, dispatch, installation and warranty support"
        actions={
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            + Add Serial Number
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Serials" value={serials.length} sub="Registered units" />
        <Kpi label="In Stock" value={inStockCount} tone="accent" sub="Available in warehouse" />
        <Kpi label="Installed" value={installedCount} tone="success" sub="At customer sites" />
        <Kpi label="Under Repair" value={underRepairCount} tone="warning" sub="In service queue" />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {["All", ...SERIAL_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              statusFilter === s
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s} {s !== "All" && `(${serials.filter(item => item.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" />
          </div>
        ) : (
          <DataTable
            rows={filteredSerials}
            columns={columns}
            searchKeys={["serialNo", "product.name", "product.itemCode", "customer.name", "location", "status"]}
          />
        )}
      </div>
    </>
  );
}
