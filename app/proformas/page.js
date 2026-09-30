"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getProformas, createProforma, updateProforma, deleteProforma,
  recordProformaAdvance, convertProformaToSO,
  calcItem, calcTotals, getCompany, getSalespeople, fmtINR, fmtDate
} from "@/services/documentService";
import { fetchApi } from "@/services/api";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";
import {
  Printer,
  Pencil,
  PlusCircle,
  ArrowRight,
  Trash2,
  CheckCircle2,
  FileText,
  CreditCard
} from "lucide-react";

const emptyForm = {
  customer: { id: "", name: "", address: "", gstNumber: "", state: "", contactPerson: "", email: "", phone: "" },
  quotationRef: "", subject: "", salesperson: "", validUntil: "", notes: "", termsAndConditions: "",
  isInterState: false, status: "Draft", advanceRequired: 0,
  items: [{ productCode: "", description: "", hsnCode: "", qty: 1, unit: "Nos", rate: 0, discount: 0, gstRate: 18, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalAmount: 0 }],
};

export default function ProformasPage() {
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [printDoc, setPrintDoc] = useState(null);
  const [advanceModal, setAdvanceModal] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pi, c, cust, sp] = await Promise.all([
        getProformas(),
        getCompany().catch(() => null),
        fetchApi('/customers').catch(() => []),
        getSalespeople().catch(() => []),
      ]);
      setProformas(pi);
      setCompany(c);
      setCustomers(Array.isArray(cust) ? cust : []);
      setSalespeople(Array.isArray(sp) ? sp : []);
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
        phone: c.contactPerson?.phone || ""
      },
      items: recalc(f.items, isInterState),
    }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    const isInterState = !!p.isInterState;
    setForm({
      ...emptyForm,
      ...p,
      customer: {
        id: p.customer?.id || p.customer?._id || "",
        name: p.customer?.name || "",
        address: p.customer?.address || "",
        gstNumber: p.customer?.gstNumber || "",
        state: p.customer?.state || "",
        contactPerson: p.customer?.contactPerson || "",
        email: p.customer?.email || "",
        phone: p.customer?.phone || "",
      },
      items: (p.items || []).map(item => calcItem(item, isInterState)),
      advanceRequired: p.advanceRequired ?? 0,
    });
    setEditingId(p.proformaNo || p._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer?.name) return showToast("Customer name required", "error");
    setSaving(true);
    try {
      const payload = {
        ...form,
        ...calcTotals(form.items, form.isInterState),
        advanceRequired: Number(form.advanceRequired) || 0
      };
      if (editingId) {
        await updateProforma(editingId, payload);
        showToast("Proforma updated");
      } else {
        await createProforma(payload);
        showToast("Proforma created");
      }
      setShowForm(false);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this proforma?")) return;
    try {
      await deleteProforma(id);
      showToast("Deleted");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleRecordAdvance = async () => {
    if (!advanceAmount || Number(advanceAmount) <= 0) return showToast("Enter a valid advance amount", "error");
    try {
      await recordProformaAdvance(advanceModal.proformaNo || advanceModal._id, { amount: Number(advanceAmount) });
      showToast("Advance payment recorded");
      setAdvanceModal(null);
      setAdvanceAmount("");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleConvertToSO = async (p) => {
    try {
      const so = await convertProformaToSO(p.proformaNo || p._id, {});
      showToast(`Sales Order ${so.soNo} created`);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const totalValue = proformas.reduce((s, p) => s + (p.grandTotal || 0), 0);
  const totalAdvance = proformas.reduce((s, p) => s + (p.advanceReceived || 0), 0);
  const open = proformas.filter(p => ["Draft", "Sent", "Advance Received", "Partially Paid"].includes(p.status)).length;
  const converted = proformas.filter(p => p.status === "Converted").length;

  const renderMobileCard = (p) => {
    const isConverted = p.status === "Converted" || !!p.convertedToSalesOrder;
    return (
      <div className="p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
        {/* Top Row: Proforma No + Customer Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/proformas/${p.proformaNo || p._id}`}
              className="font-bold text-sm text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1 font-mono"
            >
              <FileText className="size-3.5" />
              {p.proformaNo}
            </Link>
            <p className="text-xs font-semibold text-foreground truncate mt-0.5">
              {p.customer?.name || "Unnamed Customer"}
            </p>
            {p.quotationRef && (
              <p className="text-[11px] text-muted-foreground truncate">Ref: {p.quotationRef}</p>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <StatusBadge value={p.status} />
            <span className="text-[11px] text-muted-foreground">{fmtDate(p.date)}</span>
          </div>
        </div>

        {/* Financial Details Box */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/40 p-2.5 text-xs border border-border/40">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Total Value
            </span>
            <span className="font-bold font-mono text-foreground text-xs">{fmtINR(p.grandTotal)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Advance Reqd
            </span>
            <span className="font-medium font-mono text-muted-foreground text-xs">{fmtINR(p.advanceRequired || 0)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Advance Recd
            </span>
            <span
              className={
                p.advanceReceived >= p.advanceRequired && p.advanceRequired > 0
                  ? "text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs"
                  : p.advanceReceived > 0
                  ? "text-amber-600 dark:text-amber-400 font-semibold font-mono text-xs"
                  : "text-muted-foreground font-mono text-xs"
              }
            >
              {fmtINR(p.advanceReceived || 0)}
            </span>
          </div>
        </div>

        {/* Touch Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-border/40">
          <button
            onClick={() => setPrintDoc(p)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 rounded-lg font-medium text-foreground transition-colors"
          >
            <Printer className="size-3 text-muted-foreground" />
            <span>Print</span>
          </button>
          {isConverted ? (
            <Link
              href={`/orders/${p.convertedToSalesOrder || ""}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg font-semibold transition-colors shadow-2xs"
            >
              <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span>View SO</span>
              {p.convertedToSalesOrder && (
                <span className="font-mono text-[10px] opacity-75 font-normal">({p.convertedToSalesOrder})</span>
              )}
            </Link>
          ) : (
            <>
              <button
                onClick={() => openEdit(p)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 rounded-lg font-semibold transition-colors"
              >
                <Pencil className="size-3 text-purple-600 dark:text-purple-400" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  setAdvanceModal(p);
                  setAdvanceAmount("");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg font-semibold transition-colors"
              >
                <CreditCard className="size-3 text-amber-600 dark:text-amber-400" />
                <span>Advance</span>
              </button>
              <button
                onClick={() => handleConvertToSO(p)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg font-semibold transition-colors"
              >
                <ArrowRight className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span>SO</span>
              </button>
            </>
          )}
          <button
            onClick={() => handleDelete(p.proformaNo || p._id)}
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
      header: "Proforma",
      cell: (p) => (
        <Link
          href={`/proformas/${p.proformaNo || p._id}`}
          className="font-bold text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline inline-flex items-center gap-1 font-mono whitespace-nowrap"
        >
          {p.proformaNo}
        </Link>
      ),
    },
    {
      header: "Customer",
      cell: (p) => (
        <div className="min-w-0 max-w-[200px] lg:max-w-xs">
          <div className="font-semibold text-foreground truncate text-xs sm:text-sm">
            {p.customer?.name || "Unnamed Customer"}
          </div>
          {p.quotationRef && (
            <div className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
              Ref: {p.quotationRef}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Date",
      cell: (p) => (
        <span className="text-xs text-foreground whitespace-nowrap font-medium">
          {fmtDate(p.date)}
        </span>
      ),
    },
    {
      header: "Value",
      cell: (p) => (
        <span className="font-bold font-mono text-foreground text-xs sm:text-sm whitespace-nowrap">
          {fmtINR(p.grandTotal)}
        </span>
      ),
    },
    {
      header: "Advance",
      cell: (p) => {
        const req = p.advanceRequired || 0;
        const recd = p.advanceReceived || 0;
        if (!req && !recd) {
          return <span className="text-muted-foreground text-xs font-mono">—</span>;
        }
        return (
          <div className="text-xs font-mono whitespace-nowrap">
            <div
              className={
                recd >= req && req > 0
                  ? "text-emerald-600 dark:text-emerald-400 font-bold"
                  : recd > 0
                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                  : "text-muted-foreground"
              }
            >
              {fmtINR(recd)}
            </div>
            {req > 0 && (
              <div className="text-[10px] text-muted-foreground">
                Req: {fmtINR(req)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Status",
      cell: (p) => <StatusBadge value={p.status} />,
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (p) => {
        const isConverted = p.status === "Converted" || !!p.convertedToSalesOrder;
        return (
          <div className="flex items-center justify-end gap-1 flex-nowrap">
            <button
              onClick={() => setPrintDoc(p)}
              title="Print Proforma"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all hover:border-border/80 shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <Printer className="size-3 text-muted-foreground" />
              <span>Print</span>
            </button>
            {isConverted ? (
              <Link
                href={`/orders/${p.convertedToSalesOrder || ""}`}
                title={p.convertedToSalesOrder ? `Sales Order: ${p.convertedToSalesOrder}` : "View Sales Order"}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg font-semibold transition-colors shadow-2xs whitespace-nowrap"
              >
                <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span>View SO</span>
              </Link>
            ) : (
              <>
                <button
                  onClick={() => openEdit(p)}
                  title="Edit Proforma"
                  className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all whitespace-nowrap cursor-pointer"
                >
                  <Pencil className="size-3 text-purple-600 dark:text-purple-400" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    setAdvanceModal(p);
                    setAdvanceAmount("");
                  }}
                  title="Record Advance Payment"
                  className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all whitespace-nowrap cursor-pointer"
                >
                  <CreditCard className="size-3 text-amber-600 dark:text-amber-400" />
                  <span>Advance</span>
                </button>
                <button
                  onClick={() => handleConvertToSO(p)}
                  title="Convert to Sales Order"
                  className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all whitespace-nowrap cursor-pointer"
                >
                  <ArrowRight className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span>SO</span>
                </button>
              </>
            )}
            <button
              onClick={() => handleDelete(p.proformaNo || p._id)}
              title="Delete Proforma"
              className="inline-flex items-center justify-center p-1 text-xs font-medium rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printDoc && company && <DocumentPrintView doc={printDoc} type="Proforma Invoice" company={company} onClose={() => setPrintDoc(null)} />}

      {/* Advance Modal */}
      {advanceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 w-[94vw] max-w-sm shadow-2xl">
            <h3 className="font-bold text-base sm:text-lg mb-1 text-foreground">Record Advance Payment</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 truncate">{advanceModal.proformaNo} — {advanceModal.customer?.name}</p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Advance Amount Received (₹) *</label>
              <input
                type="number"
                className="w-full border border-border bg-background rounded-lg px-3.5 py-2 text-sm font-bold text-foreground focus:ring-2 focus:ring-purple-500"
                value={advanceAmount}
                onChange={e => setAdvanceAmount(e.target.value)}
                placeholder="e.g. 5000"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdvanceModal(null)} className="flex-1 border border-border rounded-lg py-2 text-xs font-medium hover:bg-muted text-foreground">Cancel</button>
              <button onClick={handleRecordAdvance} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg py-2 text-xs font-bold shadow-xs">Record Advance</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto p-2 sm:p-4 py-4 sm:py-6">
          <div className="mx-auto max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/30">
              <h2 className="text-base sm:text-lg font-bold text-foreground">{editingId ? "Edit Proforma Invoice" : "New Proforma Invoice"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer *</label>
                  {customers.length > 0 && (
                    <select
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-background text-foreground mb-1.5"
                      value={form.customer?.id || customers.find(c => c.name === form.customer?.name)?._id || customers.find(c => c.name === form.customer?.name)?.id || ""}
                      onChange={e => handleCustomerSelect(e.target.value)}
                    >
                      <option value="">Select from customer master…</option>
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
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Quotation Reference</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.quotationRef || ""} onChange={e => setForm(f => ({ ...f, quotationRef: e.target.value }))} placeholder="QT-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Advance Amount Required (₹)</label>
                  <input
                    type="number"
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-bold"
                    value={form.advanceRequired ?? 0}
                    onChange={e => setForm(f => ({ ...f, advanceRequired: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Salesperson <span className="text-muted-foreground/80 font-normal">(Sales Team Only)</span>
                  </label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.salesperson || ""}
                    onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))}
                  >
                    <option value="">
                      {salespeople.length > 0 ? "-- Select Real Salesperson --" : "No sales team found"}
                    </option>
                    {salespeople.map(sp => {
                      const spName = sp.name || sp.fullName;
                      const spCode = sp.code || sp.employeeCode || "Sales";
                      return (
                        <option key={sp.id || sp._id || spCode || spName} value={spName}>
                          {spName} ({spCode} - {sp.role || sp.department || "Sales"})
                        </option>
                      );
                    })}
                    {form.salesperson && !salespeople.some(sp => (sp.name || sp.fullName)?.toLowerCase() === form.salesperson?.toLowerCase()) && (
                      <option value={form.salesperson}>
                        {form.salesperson} (Assigned)
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Valid Until</label>
                  <input type="date" className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.validUntil ? form.validUntil.slice(0, 10) : ""} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                  <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["Draft", "Sent", "Advance Received", "Partially Paid", "Converted", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 pt-1">
                  <input type="checkbox" id="piInterState" checked={form.isInterState} onChange={e => { const is = e.target.checked; setForm(f => ({ ...f, isInterState: is, items: f.items.map(i => calcItem(i, is)) })); }} className="w-4 h-4 rounded" />
                  <label htmlFor="piInterState" className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">Inter-State supply (IGST)</label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Line Items</label>
                <div className="overflow-x-auto">
                  <LineItemsEditor items={form.items} isInterState={form.isInterState} onChange={items => setForm(f => ({ ...f, items: items.map(i => calcItem(i, f.isInterState)) }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-muted/40 border border-border rounded-xl px-4 sm:px-5 py-3 sm:py-4 w-full sm:w-auto sm:min-w-60 text-xs sm:text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground">{fmtINR(totals.subtotal)}</span></div>
                  {!form.isInterState && totals.totalCgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="font-medium text-foreground">{fmtINR(totals.totalCgst)}</span></div>}
                  {!form.isInterState && totals.totalSgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="font-medium text-foreground">{fmtINR(totals.totalSgst)}</span></div>}
                  {form.isInterState && totals.totalIgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-medium text-foreground">{fmtINR(totals.totalIgst)}</span></div>}
                  <div className="flex justify-between font-bold text-sm sm:text-base border-t border-border pt-2 mt-2"><span>Grand Total</span><span className="text-purple-600 dark:text-purple-400">{fmtINR(totals.grandTotal)}</span></div>
                  {Number(form.advanceRequired) > 0 && (
                    <div className="flex justify-between font-semibold text-amber-600 dark:text-amber-400 pt-1">
                      <span>Advance Required</span>
                      <span>{fmtINR(form.advanceRequired)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Terms & Conditions</label><textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={3} value={form.termsAndConditions || ""} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label><textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={3} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-muted/20">
              <button onClick={() => setShowForm(false)} className="px-4 sm:px-5 py-2 text-xs sm:text-sm border border-border rounded-lg hover:bg-muted text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 sm:px-6 py-2 text-xs sm:text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update Proforma" : "Create Proforma"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        breadcrumb="Sales / Proforma Invoices"
        title="Proforma Invoices"
        subtitle="Commercial estimates with advance payment terms and order conversion"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all w-full sm:w-auto"
          >
            + New Proforma
          </button>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Total Proformas" value={proformas.length} />
        <Kpi label="Open" value={open} tone="warning" />
        <Kpi label="Converted to SO" value={converted} tone="success" />
        <Kpi label="Advance Collected" value={fmtINR(totalAdvance)} tone="accent" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full" />
        </div>
      ) : (
        <DataTable
          rows={proformas}
          columns={columns}
          mobileCard={renderMobileCard}
          searchKeys={["proformaNo", "customer.name", "quotationRef", "status"]}
        />
      )}
    </>
  );
}
