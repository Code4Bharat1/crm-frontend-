"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getInvoices, createInvoice, updateInvoice, deleteInvoice, recordPayment,
  calcItem, calcTotals, getCompany, fmtINR, fmtDate
} from "@/services/documentService";
import { fetchApi } from "@/services/api";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";

const emptyForm = {
  customer: { id: "", name: "", address: "", gstNumber: "", state: "", contactPerson: "", email: "", phone: "" },
  soRef: "", proformaRef: "", quotationRef: "", dnRef: "",
  dueDate: "", billingAddress: "", shippingAddress: "",
  salesperson: "", paymentTerms: "30 Days Net", notes: "", termsAndConditions: "",
  isInterState: false, status: "Draft", advanceAdjusted: 0,
  items: [{ productCode: "", description: "", hsnCode: "", qty: 1, unit: "Nos", rate: 0, discount: 0, gstRate: 18, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalAmount: 0 }],
};

const PAYMENT_MODES = ["NEFT", "RTGS", "UPI", "Cheque", "Cash", "DD", "Credit Note"];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [printDoc, setPrintDoc] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", mode: "NEFT", reference: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, c, cust] = await Promise.all([
        getInvoices(),
        getCompany().catch(() => null),
        fetchApi('/customers').catch(() => [])
      ]);
      setInvoices(inv);
      setCompany(c);
      setCustomers(Array.isArray(cust) ? cust : []);
    } catch { /**/ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const recalc = (items, isInterState) => items.map(i => calcItem(i, isInterState));
  const totals = calcTotals(form.items, form.isInterState);

  const handleCustomerSelect = (custId) => {
    const c = customers.find(c => c._id === custId || c.id === custId);
    if (!c) return;
    const isInterState = (c.address?.state || "").toLowerCase() !== "maharashtra";
    const addr = [c.address?.street, c.address?.city, c.address?.state, c.address?.pinCode].filter(Boolean).join(", ");
    setForm(f => ({
      ...f,
      isInterState,
      customer: {
        id: c._id || c.id,
        name: c.name,
        address: addr,
        gstNumber: c.gstNumber || "",
        state: c.address?.state || "",
        contactPerson: c.contactPerson?.name || "",
        email: c.contactPerson?.email || "",
        phone: c.contactPerson?.phone || ""
      },
      billingAddress: addr,
      shippingAddress: addr,
      items: recalc(f.items, isInterState)
    }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (i) => {
    const isInterState = !!i.isInterState;
    setForm({
      ...emptyForm,
      ...i,
      customer: {
        id: i.customer?.id || i.customer?._id || "",
        name: i.customer?.name || "",
        address: i.customer?.address || i.billingAddress || "",
        gstNumber: i.customer?.gstNumber || "",
        state: i.customer?.state || "",
        contactPerson: i.customer?.contactPerson || "",
        email: i.customer?.email || "",
        phone: i.customer?.phone || "",
      },
      billingAddress: i.billingAddress || i.customer?.address || "",
      shippingAddress: i.shippingAddress || i.deliveryAddress || i.customer?.address || "",
      advanceAdjusted: i.advanceAdjusted || 0,
      items: (i.items || []).map(item => calcItem(item, isInterState)),
    });
    setEditingId(i.invoiceNo || i._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer?.name) return showToast("Customer required", "error");
    setSaving(true);
    try {
      const t = calcTotals(form.items, form.isInterState);
      const payload = { ...form, ...t, advanceAdjusted: Number(form.advanceAdjusted) || 0 };
      if (editingId) {
        await updateInvoice(editingId, payload);
        showToast("Invoice updated");
      } else {
        await createInvoice(payload);
        showToast("Invoice created");
      }
      setShowForm(false);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      await deleteInvoice(id);
      showToast("Deleted");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount) return showToast("Enter amount", "error");
    try {
      await recordPayment(paymentModal.invoiceNo || paymentModal._id, paymentForm);
      showToast("Payment recorded successfully");
      setPaymentModal(null);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const totalValue = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);
  const totalReceived = invoices.reduce((s, i) => s + (i.receivedAmount || 0), 0);
  const outstanding = Math.max(0, totalValue - totalReceived);
  const overdue = invoices.filter(i => i.status === "Overdue").length;

  const columns = [
    { header: "Invoice", cell: (i) => <Link href={`/invoices/${i.invoiceNo || i._id}`} className="font-bold text-red-600 hover:underline">{i.invoiceNo}</Link> },
    {
      header: "Customer",
      cell: (i) => (
        <div>
          <div className="font-medium text-gray-900">{i.customer?.name}</div>
          <div className="text-xs text-gray-400 flex gap-2">
            {i.soRef && <span>SO: {i.soRef}</span>}
            {i.proformaRef && <span>PI: {i.proformaRef}</span>}
            {i.dnRef && <span>DN: {i.dnRef}</span>}
          </div>
        </div>
      )
    },
    { header: "Date", cell: (i) => fmtDate(i.date) },
    { header: "Due", cell: (i) => <span className={new Date(i.dueDate) < new Date() && i.status !== "Paid" ? "text-red-600 font-medium" : ""}>{fmtDate(i.dueDate)}</span> },
    { header: "Total", cell: (i) => <span className="font-bold">{fmtINR(i.grandTotal)}</span> },
    {
      header: "Received",
      cell: (i) => (
        <div>
          <span className="text-green-600 font-semibold">{fmtINR(i.receivedAmount || 0)}</span>
          {i.advanceAdjusted > 0 && (
            <div className="text-xs text-green-700">Incl. Adv: {fmtINR(i.advanceAdjusted)}</div>
          )}
        </div>
      )
    },
    {
      header: "Balance",
      cell: (i) => (
        <span className={i.balanceAmount > 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
          {i.balanceAmount > 0 ? fmtINR(i.balanceAmount) : "PAID ✓"}
        </span>
      )
    },
    { header: "Status", cell: (i) => <StatusBadge value={i.status} /> },
    {
      header: "Actions", cell: (i) => (
        <div className="flex gap-1 flex-wrap items-center">
          <button onClick={() => setPrintDoc(i)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded font-medium">🖨 Print</button>
          <button onClick={() => openEdit(i)} className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded font-medium">Edit</button>
          {i.status !== "Paid" && i.status !== "Cancelled" && (
            <button
              onClick={() => { setPaymentModal(i); setPaymentForm({ amount: i.balanceAmount || "", mode: "NEFT", reference: "", notes: "" }); }}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
            >
              ₹ Payment
            </button>
          )}
          <button onClick={() => handleDelete(i.invoiceNo || i._id)} className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 rounded font-medium">Del</button>
        </div>
      )
    },
  ];

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printDoc && company && <DocumentPrintView doc={printDoc} type="Sales Invoice" company={company} onClose={() => setPrintDoc(null)} />}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-bold text-lg mb-1">Record Payment</h3>
            <p className="text-sm text-gray-500 mb-4">{paymentModal.invoiceNo} — Balance: <strong className="text-red-600">{fmtINR(paymentModal.balanceAmount)}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₹) *</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Mode</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={paymentForm.mode} onChange={e => setPaymentForm(f => ({ ...f, mode: e.target.value }))}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Reference (UTR / Cheque No.)</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. UTR123456" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment notes" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setPaymentModal(null)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleRecordPayment} className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700">Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto py-6">
          <div className="mx-auto max-w-5xl bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingId ? "Edit Invoice" : "New Tax Invoice"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Customer *</label>
                  {customers.length > 0 && (
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white mb-1.5"
                      value={form.customer?.id || customers.find(c => c.name === form.customer?.name)?._id || customers.find(c => c.name === form.customer?.name)?.id || ""}
                      onChange={e => handleCustomerSelect(e.target.value)}
                    >
                      <option value="">Choose from customer master…</option>
                      {customers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.id || "CUST"})</option>)}
                    </select>
                  )}
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm font-medium"
                    value={form.customer?.name || ""}
                    onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, name: e.target.value } }))}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">GST Number</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.customer?.gstNumber || ""} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, gstNumber: e.target.value } }))} placeholder="27AABCN..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Due Date</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.dueDate ? form.dueDate.slice(0, 10) : ""} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Terms</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                    {["Immediate", "7 Days Net", "15 Days Net", "30 Days Net", "45 Days Net", "60 Days Net"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">SO Reference</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.soRef || ""} onChange={e => setForm(f => ({ ...f, soRef: e.target.value }))} placeholder="SO-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Proforma Reference</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.proformaRef || ""} onChange={e => setForm(f => ({ ...f, proformaRef: e.target.value }))} placeholder="PI-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Advance Adjusted (₹)</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.advanceAdjusted ?? 0}
                    onChange={e => setForm(f => ({ ...f, advanceAdjusted: Number(e.target.value) }))}
                    placeholder="Advance deducted"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm bg-white" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <input type="checkbox" id="invInterState" checked={form.isInterState} onChange={e => { const is = e.target.checked; setForm(f => ({ ...f, isInterState: is, items: f.items.map(i => calcItem(i, is)) })); }} className="w-4 h-4 rounded" />
                  <label htmlFor="invInterState" className="text-sm font-medium text-gray-700">Inter-State supply (IGST)</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Line Items</label>
                <LineItemsEditor items={form.items} isInterState={form.isInterState} onChange={items => setForm(f => ({ ...f, items: items.map(i => calcItem(i, f.isInterState)) }))} />
              </div>
              <div className="flex justify-end">
                <div className="bg-gray-50 border rounded-xl px-5 py-4 min-w-64 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmtINR(totals.subtotal)}</span></div>
                  {!form.isInterState && totals.totalCgst > 0 && <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{fmtINR(totals.totalCgst)}</span></div>}
                  {!form.isInterState && totals.totalSgst > 0 && <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{fmtINR(totals.totalSgst)}</span></div>}
                  {form.isInterState && totals.totalIgst > 0 && <div className="flex justify-between"><span className="text-gray-500">IGST</span><span>{fmtINR(totals.totalIgst)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Grand Total</span><span className="text-red-600">{fmtINR(totals.grandTotal)}</span></div>
                  {form.advanceAdjusted > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Advance Adjusted</span><span>— {fmtINR(form.advanceAdjusted)}</span></div>}
                  <div className="flex justify-between font-bold text-red-600 pt-1 border-t">
                    <span>Balance Due</span>
                    <span>{fmtINR(Math.max(0, totals.grandTotal - (form.advanceAdjusted || 0)))}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Terms & Conditions</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.termsAndConditions || ""} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update Invoice" : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader breadcrumb="Sales / Sales Invoices" title="Tax Invoices" subtitle="GST invoices with CGST/SGST/IGST split, advance adjustment, payment recording and outstanding tracking" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Invoices" value={invoices.length} />
        <Kpi label="Outstanding" value={fmtINR(outstanding)} tone="danger" />
        <Kpi label="Overdue" value={overdue} tone="danger" />
        <Kpi label="Total Received" value={fmtINR(totalReceived)} tone="success" />
      </div>
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all">+ New Invoice</button>
      </div>
      {loading ? <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full" /></div> : (
        <DataTable rows={invoices} columns={columns} searchKeys={["invoiceNo", "customer.name", "soRef", "proformaRef", "status"]} />
      )}
    </>
  );
}
