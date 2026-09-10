"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
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
    setFetchingDocs(true);
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
      setFetchingDocs(false);
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
              {/* Warehouse In-Stock Helper & Live Fetch Status Banner */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 text-xs text-purple-900 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-base leading-none">💡</span>
                  <div className="space-y-1">
                    <span className="font-bold">Live Data Fetched from CRM</span>
                    <p className="text-purple-700 leading-relaxed">
                      <strong>Customer Assigned</strong>, <strong>Sales Order Ref</strong>, and <strong>Delivery Note Ref</strong> are fetched directly from your database. You can select an order to auto-populate the customer and challan, or leave them empty if this unit is currently in warehouse inventory.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                        ✓ {customers.length} Customers Fetched
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
                        ✓ {salesOrders.length} Sales Orders Fetched
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-800">
                        ✓ {deliveryNotes.length} Delivery Notes Fetched
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={load}
                  disabled={fetchingDocs}
                  className="shrink-0 px-2.5 py-1.5 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-semibold text-xs shadow-sm flex items-center gap-1 transition-colors"
                >
                  <span className={fetchingDocs ? "animate-spin" : ""}>🔄</span>
                  {fetchingDocs ? "Fetching…" : "Re-fetch"}
                </button>
              </div>

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
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500"
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
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>

                {/* Customer Assigned */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      Customer Assigned
                      <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded">
                        {customers.length} fetched
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomMode(m => ({ ...m, customer: !m.customer }))}
                        className="text-[10px] text-purple-600 hover:text-purple-800 underline font-medium"
                      >
                        {customMode.customer ? "Pick from list" : "Type manual"}
                      </button>
                    </div>
                  </div>

                  {customMode.customer ? (
                    <input
                      type="text"
                      placeholder="Type custom customer name..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                      value={form.customer?.name || ""}
                      onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, name: e.target.value } }))}
                      autoFocus
                    />
                  ) : (
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500"
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
                    <label className="text-xs font-semibold text-gray-700">Warranty End Date</label>
                    <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </div>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                    value={form.warrantyEnd}
                    onChange={e => setForm(f => ({ ...f, warrantyEnd: e.target.value }))}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Calculated from dispatch or installation date.</p>
                </div>

                {/* Sales Order Ref */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      Sales Order Ref
                      <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                        {salesOrders.length} fetched
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomMode(m => ({ ...m, so: !m.so }))}
                        className="text-[10px] text-purple-600 hover:text-purple-800 underline font-medium"
                      >
                        {customMode.so ? "Pick from list" : "Type manual"}
                      </button>
                    </div>
                  </div>

                  {customMode.so ? (
                    <input
                      type="text"
                      placeholder="e.g. SO-2026-001"
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500"
                      value={form.soRef || ""}
                      onChange={e => setForm(f => ({ ...f, soRef: e.target.value }))}
                      autoFocus
                    />
                  ) : (
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-purple-500"
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
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      Delivery Note Ref
                      <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-1.5 py-0.5 rounded">
                        {deliveryNotes.length} fetched
                      </span>
                      <button
                        type="button"
                        onClick={() => setCustomMode(m => ({ ...m, dn: !m.dn }))}
                        className="text-[10px] text-purple-600 hover:text-purple-800 underline font-medium"
                      >
                        {customMode.dn ? "Pick from list" : "Type manual"}
                      </button>
                    </div>
                  </div>

                  {customMode.dn ? (
                    <input
                      type="text"
                      placeholder="e.g. DN-2026-001"
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-500"
                      value={form.dnRef || ""}
                      onChange={e => setForm(f => ({ ...f, dnRef: e.target.value }))}
                      autoFocus
                    />
                  ) : (
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white font-mono focus:ring-2 focus:ring-purple-500"
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

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Inspection Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Quality inspection notes, firmware version, commissioning details"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
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
