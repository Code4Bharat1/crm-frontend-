"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, fmtDate } from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";

const emptyForm = {
  name: "", contactPerson: "", phone: "", email: "", gstNumber: "", panNumber: "",
  paymentTerms: "30 Days Net", creditLimit: 0, status: "Active", notes: "",
  address: { street: "", city: "", state: "", pinCode: "", country: "India" },
  bankDetails: { bankName: "", accountNumber: "", ifscCode: "", accountName: "", branch: "" },
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const load = useCallback(async () => {
    setLoading(true);
    try { setSuppliers(await getSuppliers()); } catch { /**/ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name) return showToast("Supplier name required", "error");
    setSaving(true);
    try {
      if (editingId) { await updateSupplier(editingId, form); showToast("Supplier updated"); }
      else { await createSupplier(form); showToast("Supplier created"); }
      setShowForm(false); load();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this supplier?")) return;
    try { await deleteSupplier(id); showToast("Deleted"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const setAddr = (field, value) => setForm(f => ({ ...f, address: { ...f.address, [field]: value } }));
  const setBank = (field, value) => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, [field]: value } }));

  const active = suppliers.filter(s => s.status === "Active").length;

  const columns = [
    { header: "Code", cell: (s) => <span className="font-mono text-xs font-bold text-cyan-700">{s.supplierCode}</span> },
    { header: "Supplier", cell: (s) => <Link href={`/suppliers/${s._id}`} className="font-semibold text-gray-900 hover:text-cyan-700 hover:underline">{s.name}</Link> },
    { header: "Contact", cell: (s) => <div><div>{s.contactPerson}</div><div className="text-xs text-gray-400">{s.phone}</div></div> },
    { header: "City", cell: (s) => s.address?.city || "—" },
    { header: "GST", cell: (s) => <span className="font-mono text-xs">{s.gstNumber || "—"}</span> },
    { header: "Payment Terms", cell: (s) => s.paymentTerms },
    { header: "Status", cell: (s) => <StatusBadge value={s.status} /> },
    {
      header: "Actions", cell: (s) => (
        <div className="flex gap-1">
          <button onClick={() => { setForm({ ...emptyForm, ...s, address: { ...emptyForm.address, ...s.address }, bankDetails: { ...emptyForm.bankDetails, ...s.bankDetails } }); setEditingId(s._id || s.id); setShowForm(true); }} className="px-2 py-1 text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded font-medium">Edit</button>
          <button onClick={() => handleDelete(s._id || s.id)} className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded font-medium">Del</button>
        </div>
      )
    },
  ];

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto py-6">
          <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? "Edit Supplier" : "New Supplier"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Basic Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Supplier Name *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Contact Person</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.contactPerson || ""} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Email</label><input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">GST Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.gstNumber || ""} onChange={e => setForm(f => ({ ...f, gstNumber: e.target.value }))} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">PAN Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.panNumber || ""} onChange={e => setForm(f => ({ ...f, panNumber: e.target.value }))} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Payment Terms</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>{["Immediate", "7 Days Net", "15 Days Net", "30 Days Net", "45 Days Net", "60 Days Net"].map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Status</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{["Active", "Inactive", "Blacklisted"].map(s => <option key={s}>{s}</option>)}</select></div>
                </div>
              </div>
              {/* Address */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Address</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-xs font-semibold text-gray-500 mb-1">Street</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.address.street} onChange={e => setAddr("street", e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">City</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.address.city} onChange={e => setAddr("city", e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">State</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.address.state} onChange={e => setAddr("state", e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">PIN Code</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.address.pinCode} onChange={e => setAddr("pinCode", e.target.value)} /></div>
                </div>
              </div>
              {/* Bank Details */}
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Bank Details</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Bank Name</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bankDetails.bankName} onChange={e => setBank("bankName", e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Account Name</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bankDetails.accountName} onChange={e => setBank("accountName", e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">Account Number</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bankDetails.accountNumber} onChange={e => setBank("accountNumber", e.target.value)} /></div>
                  <div><label className="block text-xs font-semibold text-gray-500 mb-1">IFSC Code</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bankDetails.ifscCode} onChange={e => setBank("ifscCode", e.target.value)} /></div>
                </div>
              </div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-medium disabled:opacity-60">{saving ? "Saving…" : editingId ? "Update Supplier" : "Create Supplier"}</button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Purchase / Suppliers" title="Suppliers" subtitle="Manage supplier master with contact, GST, and bank details for purchase orders" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Suppliers" value={suppliers.length} />
        <Kpi label="Active" value={active} tone="success" />
        <Kpi label="Inactive" value={suppliers.length - active} tone="warning" />
      </div>
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="flex items-center gap-2 bg-cyan-700 hover:bg-cyan-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all">+ New Supplier</button>
      </div>
      {loading ? <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-cyan-200 border-t-cyan-700 rounded-full" /></div> : (
        <DataTable rows={suppliers} columns={columns} searchKeys={["supplierCode", "name", "contactPerson", "gstNumber", "address.city"]} />
      )}
    </>
  );
}
