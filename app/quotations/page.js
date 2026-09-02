"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getQuotations, createQuotation, deleteQuotation,
  convertQuotationToProforma, convertQuotationToSO,
  createCustomer, calcItem, calcTotals, getCompany, fmtINR, fmtDate
} from "@/services/documentService";
import { fetchApi } from "@/services/api";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";

const STATUS_COLORS = {
  Draft: "bg-gray-100 text-gray-600",
  Sent: "bg-blue-100 text-blue-700",
  Viewed: "bg-purple-100 text-purple-700",
  Accepted: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Expired: "bg-orange-100 text-orange-700",
};

const emptyForm = {
  customer: { name: "", address: "", gstNumber: "", state: "", contactPerson: "", email: "", phone: "" },
  subject: "", salesperson: "", validUntil: "", notes: "", termsAndConditions: "",
  isInterState: false, status: "Draft",
  items: [{ productCode: "", description: "", hsnCode: "", qty: 1, unit: "Nos", rate: 0, discount: 0, gstRate: 18, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalAmount: 0 }],
};

const emptyQuickCustomer = {
  name: "",
  type: "End User",
  contactPerson: { name: "", phone: "", email: "" },
  address: { street: "", city: "Pune", state: "Maharashtra", pinCode: "" },
  gstNumber: "",
};

function QuotationsContent() {
  const searchParams = useSearchParams();
  const preselectedCustId = searchParams.get("customerId");

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [printDoc, setPrintDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Quick Customer Modal
  const [showQuickCust, setShowQuickCust] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState(emptyQuickCustomer);
  const [quickCustSaving, setQuickCustSaving] = useState(false);

  // Convert to Proforma Modal
  const [convertToPIModal, setConvertToPIModal] = useState(null);
  const [piAdvanceAmount, setPiAdvanceAmount] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [q, c, cust] = await Promise.all([
        getQuotations(),
        getCompany().catch(() => null),
        fetchApi('/customers').catch(() => []),
      ]);
      setQuotations(q);
      setCompany(c);
      const custList = Array.isArray(cust) ? cust : [];
      setCustomers(custList);

      // If came with ?customerId=... auto-open quotation modal with this customer
      if (preselectedCustId && custList.length > 0) {
        const found = custList.find(cust => cust._id === preselectedCustId || cust.id === preselectedCustId);
        if (found) {
          const isInterState = (found.address?.state || "").toLowerCase() !== "maharashtra";
          setForm({
            ...emptyForm,
            isInterState,
            customer: {
              id: found._id || found.id,
              name: found.name,
              address: [found.address?.street, found.address?.city, found.address?.state, found.address?.pinCode].filter(Boolean).join(", "),
              gstNumber: found.gstNumber || "",
              state: found.address?.state || "",
              contactPerson: found.contactPerson?.name || "",
              email: found.contactPerson?.email || "",
              phone: found.contactPerson?.phone || "",
            },
            items: emptyForm.items.map(i => calcItem(i, isInterState)),
          });
          setShowForm(true);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [preselectedCustId]);

  useEffect(() => { load(); }, [load]);

  const recalc = (items, isInterState) => items.map(i => calcItem(i, isInterState));
  const totals = calcTotals(form.items, form.isInterState);

  const handleCustomerSelect = (custId) => {
    const c = customers.find(c => c._id === custId || c.id === custId);
    if (!c) return;
    const isInterState = (c.address?.state || "").toLowerCase() !== "maharashtra";
    setForm(f => ({
      ...f,
      isInterState,
      customer: {
        id: c._id || c.id,
        name: c.name,
        address: [c.address?.street, c.address?.city, c.address?.state, c.address?.pinCode].filter(Boolean).join(", "),
        gstNumber: c.gstNumber || "",
        state: c.address?.state || "",
        contactPerson: c.contactPerson?.name || "",
        email: c.contactPerson?.email || "",
        phone: c.contactPerson?.phone || "",
      },
      items: recalc(f.items, isInterState),
    }));
  };

  const handleQuickCustomerSave = async (e) => {
    e?.preventDefault();
    if (!quickCustForm.name.trim()) return showToast("Customer name required", "error");
    setQuickCustSaving(true);
    try {
      const created = await createCustomer(quickCustForm);
      showToast(`Customer ${created.name} added!`);
      const updatedCusts = await fetchApi('/customers').catch(() => []);
      setCustomers(updatedCusts);
      
      // Auto select the newly created customer in quotation form
      const isInterState = (created.address?.state || "").toLowerCase() !== "maharashtra";
      setForm(f => ({
        ...f,
        isInterState,
        customer: {
          id: created._id || created.id,
          name: created.name,
          address: [created.address?.street, created.address?.city, created.address?.state, created.address?.pinCode].filter(Boolean).join(", "),
          gstNumber: created.gstNumber || "",
          state: created.address?.state || "",
          contactPerson: created.contactPerson?.name || "",
          email: created.contactPerson?.email || "",
          phone: created.contactPerson?.phone || "",
        },
        items: recalc(f.items, isInterState),
      }));
      setShowQuickCust(false);
      setQuickCustForm(emptyQuickCustomer);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setQuickCustSaving(false);
    }
  };

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (q) => { setForm({ ...q }); setEditingId(q.quotationNo || q._id); setShowForm(true); };

  const handleSave = async () => {
    if (!form.customer.name) return showToast("Customer name is required", "error");
    if (!form.items.length) return showToast("Add at least one line item", "error");
    setSaving(true);
    try {
      const payload = { ...form, ...calcTotals(form.items, form.isInterState) };
      if (editingId) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api'}/quotations/${editingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        showToast("Quotation updated");
      } else {
        await createQuotation(payload);
        showToast("Quotation created");
      }
      setShowForm(false);
      load();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this quotation?")) return;
    try { await deleteQuotation(id); showToast("Deleted"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const confirmConvertToProforma = async () => {
    if (!convertToPIModal) return;
    try {
      const pi = await convertQuotationToProforma(convertToPIModal.quotationNo || convertToPIModal._id, {
        advanceRequired: Number(piAdvanceAmount) || 0,
      });
      showToast(`Proforma ${pi.proformaNo} created`);
      setConvertToPIModal(null);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleConvertToSO = async (q) => {
    try {
      const so = await convertQuotationToSO(q.quotationNo || q._id, {});
      showToast(`Sales Order ${so.soNo} created`);
      load();
    } catch (e) { showToast(e.message, "error"); }
  };

  const totalValue = quotations.reduce((s, q) => s + (q.grandTotal || 0), 0);
  const accepted = quotations.filter(q => q.status === "Accepted").length;
  const pending = quotations.filter(q => ["Draft", "Sent", "Viewed"].includes(q.status)).length;

  const columns = [
    { header: "Quotation", cell: (q) => <Link href={`/quotations/${q.quotationNo || q._id}`} className="font-bold text-blue-600 hover:underline">{q.quotationNo}</Link> },
    { header: "Customer", cell: (q) => <div><div className="font-medium">{q.customer?.name}</div><div className="text-xs text-gray-400">{q.customer?.gstNumber}</div></div> },
    { header: "Date", cell: (q) => fmtDate(q.date) },
    { header: "Valid Until", cell: (q) => fmtDate(q.validUntil) },
    { header: "Items", cell: (q) => `${q.items?.length || 0} items` },
    { header: "Amount", cell: (q) => <span className="font-bold">{fmtINR(q.grandTotal)}</span> },
    { header: "Status", cell: (q) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.status] || "bg-gray-100 text-gray-600"}`}>{q.status}</span> },
    {
      header: "Actions",
      cell: (q) => (
        <div className="flex gap-1.5 flex-wrap items-center">
          <button onClick={() => setPrintDoc(q)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded font-medium transition-colors">🖨 Print</button>
          
          {q.convertedToProforma ? (
            <Link
              href={`/proformas/${q.convertedToProforma}`}
              className="px-2.5 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded font-semibold transition-colors flex items-center gap-1 shadow-sm"
            >
              <span>👁 View PI</span>
              <span className="font-mono text-[11px]">({q.convertedToProforma})</span>
            </Link>
          ) : q.convertedToSalesOrder ? (
            <Link
              href={`/orders/${q.convertedToSalesOrder}`}
              className="px-2.5 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded font-semibold transition-colors flex items-center gap-1 shadow-sm"
            >
              <span>👁 View SO</span>
              <span className="font-mono text-[11px]">({q.convertedToSalesOrder})</span>
            </Link>
          ) : (
            <>
              <button onClick={() => openEdit(q)} className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-medium transition-colors">Edit</button>
              {q.status !== "Rejected" && (
                <>
                  <button
                    onClick={() => { setConvertToPIModal(q); setPiAdvanceAmount(""); }}
                    className="px-2 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded font-medium transition-colors"
                  >
                    → PI
                  </button>
                  <button
                    onClick={() => handleConvertToSO(q)}
                    className="px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded font-medium transition-colors"
                  >
                    → SO
                  </button>
                </>
              )}
            </>
          )}

          <button onClick={() => handleDelete(q.quotationNo || q._id)} className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded font-medium transition-colors">Del</button>
        </div>
      )
    },
  ];

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Print Modal */}
      {printDoc && company && (
        <DocumentPrintView doc={printDoc} type="Quotation" company={company} onClose={() => setPrintDoc(null)} />
      )}

      {/* Convert to Proforma Modal */}
      {convertToPIModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl border animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-lg text-gray-900 mb-1">Create Proforma Invoice</h3>
            <p className="text-xs text-gray-500 mb-4">
              Quotation: <strong>{convertToPIModal.quotationNo}</strong> · Total: <strong>{fmtINR(convertToPIModal.grandTotal)}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Advance Amount Required (₹)</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-purple-500"
                value={piAdvanceAmount}
                onChange={e => setPiAdvanceAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">Specify advance requirement or leave 0</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setConvertToPIModal(null)} className="flex-1 border rounded-lg py-2 text-xs font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={confirmConvertToProforma} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-xs font-bold shadow">
                Create Proforma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal inside Quotation Creator */}
      {showQuickCust && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-bold text-base text-gray-900">+ Quick Add New Customer</h3>
              <button onClick={() => setShowQuickCust(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleQuickCustomerSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Motors Ltd"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  value={quickCustForm.name}
                  onChange={e => setQuickCustForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Contact name"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={quickCustForm.contactPerson.name}
                    onChange={e => setQuickCustForm(f => ({ ...f, contactPerson: { ...f.contactPerson, name: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={quickCustForm.contactPerson.phone}
                    onChange={e => setQuickCustForm(f => ({ ...f, contactPerson: { ...f.contactPerson, phone: e.target.value } }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    placeholder="27AABCN..."
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase"
                    value={quickCustForm.gstNumber}
                    onChange={e => setQuickCustForm(f => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Pune"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={quickCustForm.address.city}
                    onChange={e => setQuickCustForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="Industrial Area, Chakan..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={quickCustForm.address.street}
                  onChange={e => setQuickCustForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  placeholder="Maharashtra"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={quickCustForm.address.state}
                  onChange={e => setQuickCustForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowQuickCust(false)}
                  className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickCustSaving}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow disabled:opacity-60"
                >
                  {quickCustSaving ? "Saving..." : "Save & Select Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto py-6">
          <div className="mx-auto max-w-5xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? "Edit Quotation" : "New Quotation"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Customer Selection with Quick Add Button */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-500">Customer *</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCust(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                    >
                      + Add New Customer
                    </button>
                  </div>
                  {customers.length > 0 ? (
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.customer.id || ""}
                      onChange={e => handleCustomerSelect(e.target.value)}
                    >
                      <option value="">Select customer…</option>
                      {customers.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.name} ({c.id || "CUST"})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                        value={form.customer.name}
                        onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, name: e.target.value } }))}
                        placeholder="Customer name"
                      />
                      <button
                        type="button"
                        onClick={() => setShowQuickCust(true)}
                        className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 whitespace-nowrap"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                  {form.customer.name && (
                    <div className="mt-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded border">
                      Selected: <strong>{form.customer.name}</strong> {form.customer.contactPerson && `· Attn: ${form.customer.contactPerson}`}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">GST Number</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.customer.gstNumber || ""} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, gstNumber: e.target.value } }))} placeholder="27AABCN..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.customer.address || ""} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, address: e.target.value } }))} placeholder="Customer address" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Subject</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.subject || ""} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Quotation subject" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Salesperson</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.salesperson || ""} onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))} placeholder="Name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Valid Until</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.validUntil ? form.validUntil.slice(0, 10) : ""} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <input type="checkbox" id="interState" checked={form.isInterState} onChange={e => {
                    const is = e.target.checked;
                    setForm(f => ({ ...f, isInterState: is, items: recalc(f.items, is) }));
                  }} className="w-4 h-4 rounded" />
                  <label htmlFor="interState" className="text-sm font-medium text-gray-700">Inter-State supply (apply IGST instead of CGST+SGST)</label>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Line Items</label>
                <LineItemsEditor
                  items={form.items}
                  isInterState={form.isInterState}
                  onChange={items => setForm(f => ({ ...f, items: recalc(items, f.isInterState) }))}
                />
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="bg-gray-50 border rounded-xl px-5 py-4 min-w-60 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmtINR(totals.subtotal)}</span></div>
                  {!form.isInterState && totals.totalCgst > 0 && <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{fmtINR(totals.totalCgst)}</span></div>}
                  {!form.isInterState && totals.totalSgst > 0 && <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{fmtINR(totals.totalSgst)}</span></div>}
                  {form.isInterState && totals.totalIgst > 0 && <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{fmtINR(totals.totalIgst)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Grand Total</span><span className="text-blue-600">{fmtINR(totals.grandTotal)}</span></div>
                </div>
              </div>

              {/* Terms & Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Terms & Conditions</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={4} value={form.termsAndConditions || ""} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} placeholder="Payment terms, delivery terms..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={4} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update Quotation" : "Create Quotation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page */}
      <PageHeader
        breadcrumb="Sales / Quotations"
        title="Quotations"
        subtitle="Create, send, and convert quotations to Proforma Invoices or Sales Orders"
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Quotations" value={quotations.length} />
        <Kpi label="Pending" value={pending} tone="warning" />
        <Kpi label="Accepted" value={accepted} tone="success" />
        <Kpi label="Total Value" value={fmtINR(totalValue)} tone="accent" />
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all">
          + New Quotation
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      ) : (
        <DataTable rows={quotations} columns={columns} searchKeys={["quotationNo", "customer.name", "salesperson", "status"]} />
      )}
    </>
  );
}

export default function QuotationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" /></div>}>
      <QuotationsContent />
    </Suspense>
  );
}
