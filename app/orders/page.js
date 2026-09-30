"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getSalesOrders, createSalesOrder, updateSalesOrder, deleteSalesOrder,
  createDNFromSO, createInvoiceFromSO, calcItem, calcTotals, getCompany, getSalespeople, fmtINR, fmtDate
} from "@/services/documentService";
import { fetchApi } from "@/services/api";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";
import {
  Printer,
  Pencil,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Truck,
  Receipt,
  FileText
} from "lucide-react";

const emptyForm = {
  customer: { id: "", name: "", address: "", gstNumber: "", state: "", contactPerson: "", email: "", phone: "" },
  poReference: "", quotationRef: "", proformaRef: "", deliveryAddress: "",
  expectedDelivery: "", salesperson: "", notes: "", termsAndConditions: "",
  isInterState: false, status: "Confirmed",
  items: [{ productCode: "", description: "", hsnCode: "", qty: 1, unit: "Nos", rate: 0, discount: 0, gstRate: 18, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalAmount: 0 }],
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [salespeople, setSalespeople] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [printDoc, setPrintDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [so, c, cust, sp] = await Promise.all([
        getSalesOrders(),
        getCompany().catch(() => null),
        fetchApi('/customers').catch(() => []),
        getSalespeople().catch(() => []),
      ]);
      setOrders(so);
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
      deliveryAddress: addr,
      items: recalc(f.items, isInterState)
    }));
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (o) => {
    const isInterState = !!o.isInterState;
    setForm({
      ...emptyForm,
      ...o,
      customer: {
        id: o.customer?.id || o.customer?._id || "",
        name: o.customer?.name || "",
        address: o.customer?.address || o.deliveryAddress || "",
        gstNumber: o.customer?.gstNumber || "",
        state: o.customer?.state || "",
        contactPerson: o.customer?.contactPerson || "",
        email: o.customer?.email || "",
        phone: o.customer?.phone || "",
      },
      deliveryAddress: o.deliveryAddress || o.customer?.address || "",
      items: (o.items || []).map(item => calcItem(item, isInterState)),
    });
    setEditingId(o.soNo || o._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer?.name) return showToast("Customer required", "error");
    setSaving(true);
    try {
      const payload = { ...form, ...calcTotals(form.items, form.isInterState) };
      if (editingId) {
        await updateSalesOrder(editingId, payload);
        showToast("Sales Order updated");
      } else {
        await createSalesOrder(payload);
        showToast("Sales Order created");
      }
      setShowForm(false);
      load();
    } catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this sales order?")) return;
    try { await deleteSalesOrder(id); showToast("Deleted"); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const handleCreateDN = async (so) => {
    try { const dn = await createDNFromSO(so.soNo || so._id, {}); showToast(`Delivery Note ${dn.dnNo} created`); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const handleCreateInvoice = async (so) => {
    try { const inv = await createInvoiceFromSO(so.soNo || so._id, {}); showToast(`Invoice ${inv.invoiceNo} created`); load(); }
    catch (e) { showToast(e.message, "error"); }
  };

  const totalValue = orders.reduce((s, o) => s + (o.grandTotal || 0), 0);
  const confirmed = orders.filter(o => o.status === "Confirmed").length;
  const inProgress = orders.filter(o => ["In Progress", "Partially Delivered"].includes(o.status)).length;
  const closed = orders.filter(o => ["Delivered", "Invoiced", "Closed"].includes(o.status)).length;

  const renderMobileCard = (o) => {
    const hasDN = o.deliveryNotes && o.deliveryNotes.length > 0;
    const hasInv = o.invoices && o.invoices.length > 0;

    return (
      <div className="p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/orders/${o.soNo || o._id}`}
              className="font-bold text-sm text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-mono"
            >
              <FileText className="size-3.5" />
              {o.soNo}
            </Link>
            <p className="text-xs font-semibold text-foreground truncate mt-0.5">
              {o.customer?.name || "Unnamed Customer"}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              {o.poReference && <span>PO: {o.poReference}</span>}
              {o.quotationRef && <span>QT: {o.quotationRef}</span>}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <StatusBadge value={o.status} />
            <span className="text-[11px] text-muted-foreground">{fmtDate(o.date)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/40 p-2.5 text-xs border border-border/40">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Order Value
            </span>
            <span className="font-bold font-mono text-foreground text-xs">{fmtINR(o.grandTotal)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Expected
            </span>
            <span className="font-medium text-foreground text-xs">{o.expectedDelivery ? fmtDate(o.expectedDelivery) : "—"}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Items
            </span>
            <span className="font-medium text-muted-foreground text-xs">{o.items?.length || 0} items</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-border/40">
          <button
            onClick={() => setPrintDoc(o)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 rounded-lg font-medium text-foreground transition-colors"
          >
            <Printer className="size-3 text-muted-foreground" />
            <span>Print</span>
          </button>

          {hasDN ? (
            <Link
              href={`/deliveries/${o.deliveryNotes[0]}`}
              title={`Delivery Note: ${o.deliveryNotes[0]}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg font-semibold transition-colors shadow-2xs"
            >
              <Truck className="size-3 text-amber-600 dark:text-amber-400" />
              <span>View DN</span>
            </Link>
          ) : (
            <button
              onClick={() => handleCreateDN(o)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg font-semibold transition-colors"
            >
              <Truck className="size-3 text-amber-600 dark:text-amber-400" />
              <span>DN</span>
            </button>
          )}

          {hasInv ? (
            <Link
              href={`/invoices/${o.invoices[0]}`}
              title={`Tax Invoice: ${o.invoices[0]}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg font-semibold transition-colors shadow-2xs"
            >
              <Receipt className="size-3 text-rose-600 dark:text-rose-400" />
              <span>View Inv</span>
            </Link>
          ) : (
            !hasDN && (
              <button
                onClick={() => handleCreateInvoice(o)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg font-semibold transition-colors"
              >
                <Receipt className="size-3 text-rose-600 dark:text-rose-400" />
                <span>Invoice</span>
              </button>
            )
          )}

          {!hasDN && !hasInv && (
            <button
              onClick={() => openEdit(o)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg font-semibold transition-colors"
            >
              <Pencil className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={() => handleDelete(o.soNo || o._id)}
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
      header: "SO No.",
      cell: (o) => (
        <Link
          href={`/orders/${o.soNo || o._id}`}
          className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-1 font-mono whitespace-nowrap"
        >
          {o.soNo}
        </Link>
      ),
    },
    {
      header: "Customer",
      cell: (o) => (
        <div className="min-w-0 max-w-[180px] lg:max-w-xs">
          <div className="font-semibold text-foreground truncate text-xs sm:text-sm">
            {o.customer?.name || "Unnamed Customer"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex gap-2 truncate font-mono">
            {o.poReference && <span>PO: {o.poReference}</span>}
            {o.quotationRef && <span>QT: {o.quotationRef}</span>}
          </div>
        </div>
      ),
    },
    {
      header: "Date",
      cell: (o) => (
        <span className="text-xs text-foreground whitespace-nowrap font-medium">
          {fmtDate(o.date)}
        </span>
      ),
    },
    {
      header: "Expected",
      cell: (o) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {o.expectedDelivery ? fmtDate(o.expectedDelivery) : "—"}
        </span>
      ),
    },
    {
      header: "Value",
      cell: (o) => (
        <span className="font-bold font-mono text-foreground text-xs sm:text-sm whitespace-nowrap">
          {fmtINR(o.grandTotal)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (o) => <StatusBadge value={o.status} />,
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (o) => {
        const hasDN = o.deliveryNotes && o.deliveryNotes.length > 0;
        const hasInv = o.invoices && o.invoices.length > 0;
        return (
          <div className="flex items-center justify-end gap-1 flex-nowrap">
            <button
              onClick={() => setPrintDoc(o)}
              title="Print Sales Order"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all hover:border-border/80 shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <Printer className="size-3 text-muted-foreground" />
              <span>Print</span>
            </button>
            
            {hasDN ? (
              <Link
                href={`/deliveries/${o.deliveryNotes[0]}`}
                title={`Delivery Note: ${o.deliveryNotes[0]}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg font-semibold transition-colors shadow-2xs whitespace-nowrap"
              >
                <Truck className="size-3 text-amber-600 dark:text-amber-400" />
                <span>View DN</span>
              </Link>
            ) : (
              <button
                onClick={() => handleCreateDN(o)}
                title="Create Delivery Note"
                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all whitespace-nowrap cursor-pointer"
              >
                <Truck className="size-3 text-amber-600 dark:text-amber-400" />
                <span>DN</span>
              </button>
            )}

            {hasInv ? (
              <Link
                href={`/invoices/${o.invoices[0]}`}
                title={`Tax Invoice: ${o.invoices[0]}`}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg font-semibold transition-colors shadow-2xs whitespace-nowrap"
              >
                <Receipt className="size-3 text-rose-600 dark:text-rose-400" />
                <span>View Inv</span>
              </Link>
            ) : (
              !hasDN && (
                <button
                  onClick={() => handleCreateInvoice(o)}
                  title="Create Tax Invoice"
                  className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all whitespace-nowrap cursor-pointer"
                >
                  <Receipt className="size-3 text-rose-600 dark:text-rose-400" />
                  <span>Inv</span>
                </button>
              )
            )}

            {!hasDN && !hasInv && (
              <button
                onClick={() => openEdit(o)}
                title="Edit Sales Order"
                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all whitespace-nowrap cursor-pointer"
              >
                <Pencil className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={() => handleDelete(o.soNo || o._id)}
              title="Delete Sales Order"
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
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}
      {printDoc && company && <DocumentPrintView doc={printDoc} type="Sales Order" company={company} onClose={() => setPrintDoc(null)} />}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto p-2 sm:p-4 py-4 sm:py-6">
          <div className="mx-auto max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/30">
              <h2 className="text-base sm:text-lg font-bold text-foreground">{editingId ? "Edit Sales Order" : "New Sales Order"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer *</label>
                  {customers.length > 0 && (
                    <select
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-background text-foreground mb-1.5"
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
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer PO Reference</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.poReference || ""} onChange={e => setForm(f => ({ ...f, poReference: e.target.value }))} placeholder="Customer's PO Number" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Quotation Ref</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.quotationRef || ""} onChange={e => setForm(f => ({ ...f, quotationRef: e.target.value }))} placeholder="QT-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Proforma Ref</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.proformaRef || ""} onChange={e => setForm(f => ({ ...f, proformaRef: e.target.value }))} placeholder="PI-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Expected Delivery</label>
                  <input type="date" className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.expectedDelivery ? form.expectedDelivery.slice(0, 10) : ""} onChange={e => setForm(f => ({ ...f, expectedDelivery: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Salesperson <span className="text-muted-foreground/80 font-normal">(Sales Team Only)</span>
                  </label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Delivery Address</label>
                  <textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={2} value={form.deliveryAddress || ""} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} placeholder="Delivery / shipping address" />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 pt-1">
                  <input type="checkbox" id="soInterState" checked={form.isInterState} onChange={e => { const is = e.target.checked; setForm(f => ({ ...f, isInterState: is, items: f.items.map(i => calcItem(i, is)) })); }} className="w-4 h-4 rounded" />
                  <label htmlFor="soInterState" className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">Inter-State supply (IGST)</label>
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
                  <div className="flex justify-between font-bold text-sm sm:text-base border-t border-border pt-2 mt-2"><span>Grand Total</span><span className="text-emerald-600 dark:text-emerald-400">{fmtINR(totals.grandTotal)}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Terms & Conditions</label><textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={3} value={form.termsAndConditions || ""} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label><textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={3} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-muted/20">
              <button onClick={() => setShowForm(false)} className="px-4 sm:px-5 py-2 text-xs sm:text-sm border border-border rounded-lg hover:bg-muted text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 sm:px-6 py-2 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update SO" : "Create Sales Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        breadcrumb="Sales / Sales Orders"
        title="Sales Orders"
        subtitle="Confirmed customer purchase orders driving procurement, dispatch and invoicing"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all w-full sm:w-auto"
          >
            + New Sales Order
          </button>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Total Orders" value={orders.length} />
        <Kpi label="Confirmed" value={confirmed} tone="warning" />
        <Kpi label="In Progress" value={inProgress} tone="accent" />
        <Kpi label="Order Value" value={fmtINR(totalValue)} tone="success" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
        </div>
      ) : (
        <DataTable
          rows={orders}
          columns={columns}
          mobileCard={renderMobileCard}
          searchKeys={["soNo", "customer.name", "poReference", "status"]}
        />
      )}
    </>
  );
}
