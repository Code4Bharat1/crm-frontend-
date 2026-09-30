"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getInvoices, createInvoice, updateInvoice, deleteInvoice, recordPayment,
  calcItem, calcTotals, getCompany, fmtINR, fmtDate
} from "@/services/documentService";
import { fetchApi } from "@/services/api";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { cn } from "@/lib/utils";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";
import {
  Printer,
  Pencil,
  CreditCard,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText
} from "lucide-react";

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

  const renderMobileCard = (i) => {
    const isOverdue = new Date(i.dueDate) < new Date() && i.status !== "Paid";

    return (
      <div className="p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/invoices/${i.invoiceNo || i._id}`}
              className="font-bold text-sm text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 font-mono"
            >
              <FileText className="size-3.5" />
              {i.invoiceNo}
            </Link>
            <p className="text-xs font-semibold text-foreground truncate mt-0.5">
              {i.customer?.name || "Unnamed Customer"}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              {i.soRef && <span>SO: {i.soRef}</span>}
              {i.proformaRef && <span>PI: {i.proformaRef}</span>}
              {i.dnRef && <span>DN: {i.dnRef}</span>}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <StatusBadge value={i.status} />
            <span className="text-[11px] text-muted-foreground">{fmtDate(i.date)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/40 p-2.5 text-xs border border-border/40">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Total Amount
            </span>
            <span className="font-bold font-mono text-foreground text-xs">{fmtINR(i.grandTotal)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Received
            </span>
            <span className="font-semibold font-mono text-emerald-600 dark:text-emerald-400 text-xs">
              {fmtINR(i.receivedAmount || 0)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Balance Due
            </span>
            <span
              className={
                i.balanceAmount > 0
                  ? isOverdue
                    ? "font-bold font-mono text-rose-600 dark:text-rose-400 text-xs"
                    : "font-semibold font-mono text-foreground text-xs"
                  : "font-semibold font-mono text-emerald-600 dark:text-emerald-400 text-xs"
              }
            >
              {i.balanceAmount > 0 ? fmtINR(i.balanceAmount) : "Paid ✓"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-border/40">
          <button
            onClick={() => setPrintDoc(i)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 rounded-lg font-medium text-foreground transition-colors"
          >
            <Printer className="size-3 text-muted-foreground" />
            <span>Print</span>
          </button>
          <button
            onClick={() => openEdit(i)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg font-semibold transition-colors"
          >
            <Pencil className="size-3 text-rose-600 dark:text-rose-400" />
            <span>Edit</span>
          </button>
          {i.status !== "Paid" && i.status !== "Cancelled" && (
            <button
              onClick={() => {
                setPaymentModal(i);
                setPaymentForm({ amount: i.balanceAmount || "", mode: "NEFT", reference: "", notes: "" });
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <CreditCard className="size-3" />
              <span>Record Payment</span>
            </button>
          )}
          <button
            onClick={() => handleDelete(i.invoiceNo || i._id)}
            className="inline-flex items-center justify-center p-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const columns = [
    {
      header: "Invoice",
      cell: (i) => (
        <Link
          href={`/invoices/${i.invoiceNo || i._id}`}
          className="font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline inline-flex items-center gap-1 font-mono whitespace-nowrap"
        >
          {i.invoiceNo}
        </Link>
      ),
    },
    {
      header: "Customer",
      cell: (i) => (
        <div className="min-w-0 max-w-[160px] lg:max-w-xs">
          <div className="font-semibold text-foreground truncate text-xs sm:text-sm">
            {i.customer?.name || "Unnamed Customer"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex gap-2 truncate font-mono">
            {i.soRef && <span>SO: {i.soRef}</span>}
            {i.dnRef && <span>DN: {i.dnRef}</span>}
          </div>
        </div>
      ),
    },
    {
      header: "Date",
      cell: (i) => {
        const isOverdue = i.dueDate && new Date(i.dueDate) < new Date() && i.status !== "Paid" && i.status !== "Cancelled";
        return (
          <div className="text-xs whitespace-nowrap">
            <span className="text-foreground font-medium">{fmtDate(i.date)}</span>
            {i.dueDate && (
              <div className={cn("text-[10px] mt-0.5 flex items-center gap-0.5", isOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-muted-foreground")}>
                {isOverdue && <AlertCircle className="size-2.5 inline text-rose-600" />}
                <span>Due: {fmtDate(i.dueDate)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Amount",
      cell: (i) => (
        <div className="whitespace-nowrap font-mono">
          <div className="font-bold text-foreground text-xs sm:text-sm">{fmtINR(i.grandTotal)}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Recd: {fmtINR(i.receivedAmount || 0)}</span>
            {i.advanceAdjusted > 0 && <span className="opacity-75">(Adv: {fmtINR(i.advanceAdjusted)})</span>}
          </div>
        </div>
      ),
    },
    {
      header: "Balance",
      cell: (i) => (
        <span
          className={
            i.balanceAmount > 0
              ? "text-rose-600 dark:text-rose-400 font-bold font-mono text-xs sm:text-sm whitespace-nowrap"
              : "text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-xs whitespace-nowrap"
          }
        >
          {i.balanceAmount > 0 ? fmtINR(i.balanceAmount) : "PAID ✓"}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (i) => <StatusBadge value={i.status} />,
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (i) => (
        <div className="flex items-center justify-end gap-1 flex-nowrap">
          <button
            onClick={() => setPrintDoc(i)}
            title="Print Invoice"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all hover:border-border/80 shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <Printer className="size-3 text-muted-foreground" />
            <span>Print</span>
          </button>
          <button
            onClick={() => openEdit(i)}
            title="Edit Invoice"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all whitespace-nowrap cursor-pointer"
          >
            <Pencil className="size-3 text-rose-600 dark:text-rose-400" />
            <span>Edit</span>
          </button>
          {i.status !== "Paid" && i.status !== "Cancelled" && (
            <button
              onClick={() => {
                setPaymentModal(i);
                setPaymentForm({ amount: i.balanceAmount || "", mode: "NEFT", reference: "", notes: "" });
              }}
              title="Record Payment"
              className="inline-flex items-center gap-0.5 px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <CreditCard className="size-3" />
              <span>Pay</span>
            </button>
          )}
          <button
            onClick={() => handleDelete(i.invoiceNo || i._id)}
            title="Delete Invoice"
            className="inline-flex items-center justify-center p-1 text-xs font-medium rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printDoc && company && <DocumentPrintView doc={printDoc} type="Sales Invoice" company={company} onClose={() => setPrintDoc(null)} />}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 w-[94vw] max-w-sm shadow-2xl">
            <h3 className="font-bold text-base sm:text-lg mb-1 text-foreground">Record Payment</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 truncate">{paymentModal.invoiceNo} — Balance: <strong className="text-rose-600 dark:text-rose-400">{fmtINR(paymentModal.balanceAmount)}</strong></p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Amount (₹) *</label>
                <input type="number" className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-bold" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Mode</label>
                <select className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={paymentForm.mode} onChange={e => setPaymentForm(f => ({ ...f, mode: e.target.value }))}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Reference (UTR / Cheque No.)</label>
                <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-mono" value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. UTR123456" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
                <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment notes" />
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 mt-5">
              <button onClick={() => setPaymentModal(null)} className="flex-1 border border-border rounded-lg py-2 text-xs sm:text-sm hover:bg-muted text-foreground">Cancel</button>
              <button onClick={handleRecordPayment} className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-xs sm:text-sm font-semibold hover:bg-emerald-700 shadow-xs">Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto p-2 sm:p-4 py-4 sm:py-6">
          <div className="mx-auto max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/30">
              <h2 className="text-base sm:text-lg font-bold text-foreground">{editingId ? "Edit Invoice" : "New Tax Invoice"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer *</label>
                  {customers.length > 0 && (
                    <select
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none bg-background text-foreground mb-1.5"
                      value={form.customer?.id || customers.find(c => c.name === form.customer?.name)?._id || customers.find(c => c.name === form.customer?.name)?.id || ""}
                      onChange={e => handleCustomerSelect(e.target.value)}
                    >
                      <option value="">Choose from customer master…</option>
                      {customers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.id || "CUST"})</option>)}
                    </select>
                  )}
                  <input
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-medium"
                    value={form.customer?.name || ""}
                    onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, name: e.target.value } }))}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">GST Number</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.customer?.gstNumber || ""} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, gstNumber: e.target.value } }))} placeholder="27AABCN..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Due Date</label>
                  <input type="date" className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.dueDate ? form.dueDate.slice(0, 10) : ""} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Terms</label>
                  <select className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                    {["Immediate", "7 Days Net", "15 Days Net", "30 Days Net", "45 Days Net", "60 Days Net"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">SO Reference</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.soRef || ""} onChange={e => setForm(f => ({ ...f, soRef: e.target.value }))} placeholder="SO-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Proforma Reference</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.proformaRef || ""} onChange={e => setForm(f => ({ ...f, proformaRef: e.target.value }))} placeholder="PI-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Advance Adjusted (₹)</label>
                  <input
                    type="number"
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-bold"
                    value={form.advanceAdjusted ?? 0}
                    onChange={e => setForm(f => ({ ...f, advanceAdjusted: Number(e.target.value) }))}
                    placeholder="Advance deducted"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                  <select className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 pt-1">
                  <input type="checkbox" id="invInterState" checked={form.isInterState} onChange={e => { const is = e.target.checked; setForm(f => ({ ...f, isInterState: is, items: f.items.map(i => calcItem(i, is)) })); }} className="w-4 h-4 rounded" />
                  <label htmlFor="invInterState" className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">Inter-State supply (IGST)</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Line Items</label>
                <div className="overflow-x-auto">
                  <LineItemsEditor items={form.items} isInterState={form.isInterState} onChange={items => setForm(f => ({ ...f, items: items.map(i => calcItem(i, f.isInterState)) }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-muted/40 border border-border rounded-xl px-4 sm:px-5 py-3 sm:py-4 w-full sm:w-auto sm:min-w-64 text-xs sm:text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground">{fmtINR(totals.subtotal)}</span></div>
                  {!form.isInterState && totals.totalCgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="font-medium text-foreground">{fmtINR(totals.totalCgst)}</span></div>}
                  {!form.isInterState && totals.totalSgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="font-medium text-foreground">{fmtINR(totals.totalSgst)}</span></div>}
                  {form.isInterState && totals.totalIgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-medium text-foreground">{fmtINR(totals.totalIgst)}</span></div>}
                  <div className="flex justify-between font-bold text-sm sm:text-base border-t border-border pt-2 mt-2"><span>Grand Total</span><span className="text-rose-600 dark:text-rose-400">{fmtINR(totals.grandTotal)}</span></div>
                  {form.advanceAdjusted > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium"><span>Advance Adjusted</span><span>— {fmtINR(form.advanceAdjusted)}</span></div>}
                  <div className="flex justify-between font-bold text-rose-600 dark:text-rose-400 pt-1 border-t border-border">
                    <span>Balance Due</span>
                    <span>{fmtINR(Math.max(0, totals.grandTotal - (form.advanceAdjusted || 0)))}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Terms & Conditions</label><textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={3} value={form.termsAndConditions || ""} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label><textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={3} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-muted/20">
              <button onClick={() => setShowForm(false)} className="px-4 sm:px-5 py-2 text-xs sm:text-sm border border-border rounded-lg hover:bg-muted text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 sm:px-6 py-2 text-xs sm:text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update Invoice" : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        breadcrumb="Sales / Sales Invoices"
        title="Tax Invoices"
        subtitle="GST invoices with CGST/SGST/IGST split, advance adjustment, payment recording and outstanding tracking"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all w-full sm:w-auto"
          >
            + New Invoice
          </button>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Total Invoices" value={invoices.length} />
        <Kpi label="Outstanding" value={fmtINR(outstanding)} tone="danger" />
        <Kpi label="Overdue" value={overdue} tone="danger" />
        <Kpi label="Total Received" value={fmtINR(totalReceived)} tone="success" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full" />
        </div>
      ) : (
        <DataTable
          rows={invoices}
          columns={columns}
          mobileCard={renderMobileCard}
          searchKeys={["invoiceNo", "customer.name", "soRef", "proformaRef", "status"]}
        />
      )}
    </>
  );
}
