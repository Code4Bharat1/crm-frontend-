"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getDeliveryNotes, createDeliveryNote, updateDeliveryNote, deleteDeliveryNote,
  markDelivered, createInvoiceFromDN, getCompany, fmtDate
} from "@/services/documentService";
import { fetchApi } from "@/services/api";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import { LineItemsEditor } from "@/components/LineItemsEditor";
import { ConvertNotificationModal } from "@/components/ConvertNotificationModal";
import {
  Printer,
  Pencil,
  Truck,
  CheckCircle2,
  Trash2,
  FileText,
  Layers,
  ArrowRight,
  Plus
} from "lucide-react";

const emptyForm = {
  soRef: "", customer: { name: "", address: "", contactPerson: "", phone: "" },
  deliveryAddress: "", transporter: "", vehicleNumber: "", lrNumber: "", notes: "",
  status: "Prepared",
  items: [{ description: "", hsnCode: "", qty: 1, unit: "Nos", serialNumbers: [], remarks: "" }],
};

export default function DeliveriesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [printDoc, setPrintDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deliverModal, setDeliverModal] = useState(null);
  const [receivedBy, setReceivedBy] = useState("");
  const [toast, setToast] = useState(null);
  const [postDeliveryModal, setPostDeliveryModal] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dn, c, cust] = await Promise.all([
        getDeliveryNotes(),
        getCompany().catch(() => null),
        fetchApi('/customers').catch(() => [])
      ]);
      setNotes(dn);
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

  const handleCustomerSelect = (custId) => {
    const c = customers.find(c => c._id === custId || c.id === custId);
    if (!c) return;
    const addr = [c.address?.street, c.address?.city, c.address?.state, c.address?.pinCode].filter(Boolean).join(", ");
    setForm(f => ({ ...f, customer: { id: c._id || c.id, name: c.name, address: addr, contactPerson: c.contactPerson?.name || "", phone: c.contactPerson?.phone || "" }, deliveryAddress: addr }));
  };

  const handleSave = async () => {
    if (!form.soRef) return showToast("Sales Order reference required", "error");
    if (!form.customer.name) return showToast("Customer name required", "error");
    setSaving(true);
    try {
      if (editingId) {
        await updateDeliveryNote(editingId, form);
        showToast("Delivery Note updated");
      } else {
        await createDeliveryNote(form);
        showToast("Delivery Note created");
      }
      setShowForm(false);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this delivery note?")) return;
    try {
      await deleteDeliveryNote(id);
      showToast("Deleted");
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleMarkDelivered = async () => {
    try {
      const updated = await markDelivered(deliverModal.dnNo || deliverModal._id, { receivedBy, deliveryDate: new Date() });
      showToast("Marked as Delivered ✓");
      setDeliverModal(null);
      setReceivedBy("");
      setPostDeliveryModal(updated);
      load();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const [convertModal, setConvertModal] = useState(null);

  const handleConvertToInvoice = (d) => {
    setConvertModal(d);
  };

  const handleConfirmConvert = async () => {
    if (!convertModal) return;
    const d = convertModal;
    try {
      const inv = await createInvoiceFromDN(d.dnNo || d._id);
      showToast(`Tax Invoice ${inv.invoiceNo} created successfully ✓`);
      load();
      router.push(`/invoices/${inv.invoiceNo}`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const dispatched = notes.filter(n => n.status === "Dispatched").length;
  const inTransit = notes.filter(n => n.status === "In Transit").length;
  const delivered = notes.filter(n => n.status === "Delivered").length;

  const renderMobileCard = (d) => {
    return (
      <div className="p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/deliveries/${d.dnNo || d._id}`}
              className="font-bold text-sm text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-mono"
            >
              <FileText className="size-3.5" />
              {d.dnNo}
            </Link>
            <p className="text-xs font-semibold text-foreground truncate mt-0.5">
              {d.customer?.name || "Unnamed Customer"}
            </p>
            {d.soRef && (
              <p className="text-[11px] text-muted-foreground truncate font-mono">SO: {d.soRef}</p>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <StatusBadge value={d.status} />
            <span className="text-[11px] text-muted-foreground">{fmtDate(d.date)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/40 p-2.5 text-xs border border-border/40">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Dispatch Date
            </span>
            <span className="font-medium text-foreground text-xs">{fmtDate(d.date)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Items
            </span>
            <span className="font-medium text-foreground text-xs">{d.items?.length || 0} items</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Transporter
            </span>
            <span className="font-medium text-muted-foreground text-xs truncate block">
              {d.transporter || "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-border/40">
          <button
            onClick={() => setPrintDoc(d)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 rounded-lg font-medium text-foreground transition-colors"
          >
            <Printer className="size-3 text-muted-foreground" />
            <span>Print</span>
          </button>

          {d.invoiceRef ? (
            <Link
              href={`/invoices/${d.invoiceRef}`}
              title={`Tax Invoice: ${d.invoiceRef}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg font-semibold transition-colors shadow-2xs"
            >
              <CheckCircle2 className="size-3 text-rose-600 dark:text-rose-400" />
              <span>View Inv</span>
            </Link>
          ) : (
            <>
              <button
                onClick={() => {
                  setForm({ ...d });
                  setEditingId(d.dnNo || d._id);
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg font-semibold transition-colors"
              >
                <Pencil className="size-3 text-amber-600 dark:text-amber-400" />
                <span>Edit</span>
              </button>
              {d.status !== "Delivered" && (
                <button
                  onClick={() => {
                    setDeliverModal(d);
                    setReceivedBy("");
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg font-semibold transition-colors"
                >
                  <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Delivered</span>
                </button>
              )}
              <button
                onClick={() => handleConvertToInvoice(d)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
              >
                <ArrowRight className="size-3" />
                <span>Invoice</span>
              </button>
            </>
          )}

          <button
            onClick={() => handleDelete(d.dnNo || d._id)}
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
      header: "DN No.",
      cell: (d) => (
        <div className="whitespace-nowrap">
          <Link
            href={`/deliveries/${d.dnNo || d._id}`}
            className="font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline inline-flex items-center gap-1 font-mono"
          >
            {d.dnNo}
          </Link>
          {d.soRef && (
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
              SO: <Link href={`/orders/${d.soRef}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{d.soRef}</Link>
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (d) => (
        <div className="min-w-0 max-w-[160px] lg:max-w-xs font-semibold text-foreground truncate text-xs sm:text-sm">
          {d.customer?.name || "Unnamed Customer"}
        </div>
      ),
    },
    {
      header: "Dispatch",
      cell: (d) => (
        <span className="text-xs text-foreground whitespace-nowrap font-medium">
          {fmtDate(d.date)}
        </span>
      ),
    },
    {
      header: "Transporter",
      cell: (d) => (
        <div className="text-xs text-foreground whitespace-nowrap">
          <div>{d.transporter || "—"}</div>
          {d.lrNumber && (
            <div className="text-[10px] text-muted-foreground font-mono">LR: {d.lrNumber}</div>
          )}
        </div>
      ),
    },
    {
      header: "Items",
      cell: (d) => {
        const count = d.items?.length || 0;
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border/40 whitespace-nowrap">
            <Layers className="size-3 text-muted-foreground/70" />
            <span>{count} {count === 1 ? "item" : "items"}</span>
          </span>
        );
      },
    },
    {
      header: "Status",
      cell: (d) => <StatusBadge value={d.status} />,
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1 flex-nowrap">
          <button
            onClick={() => setPrintDoc(d)}
            title="Print Delivery Note"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all hover:border-border/80 shadow-2xs whitespace-nowrap cursor-pointer"
          >
            <Printer className="size-3 text-muted-foreground" />
            <span>Print</span>
          </button>
          
          {d.invoiceRef ? (
            <Link
              href={`/invoices/${d.invoiceRef}`}
              title={`Tax Invoice: ${d.invoiceRef}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg font-semibold transition-colors shadow-2xs whitespace-nowrap"
            >
              <CheckCircle2 className="size-3 text-rose-600 dark:text-rose-400" />
              <span>View Inv</span>
            </Link>
          ) : (
            <>
              <button
                onClick={() => {
                  setForm({ ...d });
                  setEditingId(d.dnNo || d._id);
                  setShowForm(true);
                }}
                title="Edit Delivery Note"
                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-all whitespace-nowrap cursor-pointer"
              >
                <Pencil className="size-3 text-amber-600 dark:text-amber-400" />
                <span>Edit</span>
              </button>
              {d.status !== "Delivered" && (
                <button
                  onClick={() => {
                    setDeliverModal(d);
                    setReceivedBy("");
                  }}
                  title="Mark Delivered"
                  className="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all whitespace-nowrap cursor-pointer"
                >
                  <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Delivered</span>
                </button>
              )}
              <button
                onClick={() => handleConvertToInvoice(d)}
                title="Create Tax Invoice from Delivery Note"
                className="inline-flex items-center gap-0.5 px-2 py-1 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              >
                <ArrowRight className="size-3" />
                <span>Inv</span>
              </button>
            </>
          )}

          <button
            onClick={() => handleDelete(d.dnNo || d._id)}
            title="Delete Delivery Note"
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
      {printDoc && company && <DocumentPrintView doc={printDoc} type="Delivery Note" company={company} onClose={() => setPrintDoc(null)} />}

      {/* Post-Delivery Prompt to Generate Invoice */}
      {postDeliveryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl text-center animate-in fade-in zoom-in duration-150">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-3.5 border border-emerald-500/20">
              ✓
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1.5">Delivery Confirmed!</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-5 leading-relaxed">
              <strong className="text-foreground font-bold">{postDeliveryModal.dnNo}</strong> has been successfully marked as Delivered to{" "}
              <strong className="text-foreground font-bold">{postDeliveryModal.customer?.name}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPostDeliveryModal(null)}
                className="flex-1 py-2.5 sm:py-3 px-4 border border-border text-foreground rounded-xl text-xs sm:text-sm font-semibold hover:bg-muted transition-all cursor-pointer"
              >
                Keep Delivered
              </button>
              <button
                onClick={() => {
                  const d = postDeliveryModal;
                  setPostDeliveryModal(null);
                  handleConvertToInvoice(d);
                }}
                className="flex-1 py-2.5 sm:py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                🧾 Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Delivered Modal */}
      {deliverModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 w-[94vw] max-w-sm sm:max-w-md shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-3.5 border border-amber-500/20">
              🚚
            </div>
            <h3 className="font-bold text-lg sm:text-xl text-foreground text-center mb-1.5">Mark as Delivered?</h3>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mb-5 leading-relaxed">
              Confirm delivery for Delivery Note <strong className="text-foreground font-bold">{deliverModal.dnNo}</strong>
            </p>

            <div className="bg-muted/40 border border-border/70 rounded-2xl p-4 mb-5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">{deliverModal.customer?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">SO Reference:</span>
                <span className="font-mono font-semibold text-foreground">{deliverModal.soRef || "—"}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Received By (Person / Gate Stamp)</label>
              <input
                className="w-full border border-border bg-background text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                placeholder="Name of receiver or signee"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeliverModal(null)}
                className="flex-1 py-2.5 sm:py-3 px-4 border border-border rounded-xl text-xs sm:text-sm font-semibold hover:bg-muted text-foreground transition-all cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                onClick={handleMarkDelivered}
                className="flex-1 py-2.5 sm:py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Yes, Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto p-2 sm:p-4 py-4 sm:py-6">
          <div className="mx-auto max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/30">
              <h2 className="text-base sm:text-lg font-bold text-foreground">{editingId ? "Edit Delivery Note" : "New Delivery Note"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Sales Order Ref *</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-mono" value={form.soRef} onChange={e => setForm(f => ({ ...f, soRef: e.target.value }))} placeholder="SO-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer *</label>
                  <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-background text-foreground" onChange={e => handleCustomerSelect(e.target.value)} defaultValue="">
                    <option value="">{customers.length > 0 ? "Select customer…" : "No customers yet -- add one in Customers first"}</option>
                    {customers.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Transporter</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.transporter || ""} onChange={e => setForm(f => ({ ...f, transporter: e.target.value }))} placeholder="Transport company" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Vehicle No.</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-mono uppercase" value={form.vehicleNumber || ""} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))} placeholder="MH12AB1234" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">LR Number</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm font-mono" value={form.lrNumber || ""} onChange={e => setForm(f => ({ ...f, lrNumber: e.target.value }))} placeholder="Lorry Receipt No." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                  <select className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["Prepared", "Dispatched", "In Transit", "Delivered", "Returned", "Partial"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Delivery Address</label>
                  <textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={2} value={form.deliveryAddress || ""} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Items (with Serial Numbers)</label>
                <LineItemsEditor items={form.items} isDelivery={true} onChange={items => setForm(f => ({ ...f, items }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
                <textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={2} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-muted/20">
              <button onClick={() => setShowForm(false)} className="px-4 sm:px-5 py-2 text-xs sm:text-sm border border-border rounded-lg hover:bg-muted text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 sm:px-6 py-2 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update DN" : "Create Delivery Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        breadcrumb="Sales / Delivery Notes"
        title="Delivery Notes"
        subtitle="Material dispatch with serial numbers, transport details and delivery confirmation"
        actions={
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>New Delivery Note</span>
          </button>
        }
      />
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Total Notes" value={notes.length} />
        <Kpi label="Dispatched" value={dispatched} tone="warning" />
        <Kpi label="In Transit" value={inTransit} tone="warning" />
        <Kpi label="Delivered" value={delivered} tone="success" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full" />
        </div>
      ) : (
        <DataTable
          rows={notes}
          columns={columns}
          mobileCard={renderMobileCard}
          searchKeys={["dnNo", "soRef", "customer.name", "status", "lrNumber", "invoiceRef"]}
        />
      )}

      {convertModal && (
        <ConvertNotificationModal
          isOpen={Boolean(convertModal)}
          onClose={() => setConvertModal(null)}
          title="Convert to Sales Invoice?"
          sourceDocNo={convertModal.dnNo}
          customerName={convertModal.customer?.name}
          targetType="Sales Invoice"
          amount={convertModal.grandTotal || (convertModal.items?.reduce((s, i) => s + (i.totalAmount || 0), 0))}
          onConfirm={handleConfirmConvert}
        />
      )}
    </>
  );
}
