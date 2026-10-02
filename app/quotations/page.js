"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getQuotations, createQuotation, deleteQuotation,
  convertQuotationToProforma, convertQuotationToSO,
  createCustomer, calcItem, calcTotals, getCompany, getSalespeople, fmtINR, fmtDate
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
  Clock,
  Layers,
  FileText,
  Plus
} from "lucide-react";

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
  const preselectedCustName = searchParams.get("customerName");
  const preselectedEmail = searchParams.get("email");
  const preselectedPhone = searchParams.get("phone");
  const preselectedSubject = searchParams.get("subject");
  const preselectedNotes = searchParams.get("notes");
  const preselectedLeadId = searchParams.get("leadId");
  const isCreateAction = searchParams.get("action") === "create" || searchParams.get("create") === "true";

  const [quotations, setQuotations] = useState([]);
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

  // Quick Customer Modal
  const [showQuickCust, setShowQuickCust] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState(emptyQuickCustomer);
  const [quickCustSaving, setQuickCustSaving] = useState(false);

  // Convert to Proforma Modal
  const [convertToPIModal, setConvertToPIModal] = useState(null);
  const [piAdvanceAmount, setPiAdvanceAmount] = useState("");
  // Convert to SO Modal
  const [convertToSOModal, setConvertToSOModal] = useState(null);
  const [convertingSO, setConvertingSO] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const paramsHandledRef = React.useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [q, c, cust, sp] = await Promise.all([
        getQuotations(),
        getCompany().catch(() => null),
        fetchApi('/customers').catch(() => []),
        getSalespeople().catch(() => []),
      ]);
      setQuotations(q);
      setCompany(c);
      const custList = Array.isArray(cust) ? cust : [];
      setCustomers(custList);
      setSalespeople(Array.isArray(sp) ? sp : []);
      return { q, c, customers: custList, salespeople: Array.isArray(sp) ? sp : [] };
    } catch { /* ignore */ }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().then(data => {
      if (paramsHandledRef.current) return;
      const custList = data?.customers || [];

      // If came with ?customerId=... or ?customerName=... or ?email=... or ?action=create
      if (preselectedCustId || preselectedCustName || preselectedEmail || isCreateAction) {
        paramsHandledRef.current = true;
        let found = null;
        if (preselectedCustId && custList.length > 0) {
          found = custList.find(cust => cust._id === preselectedCustId || cust.id === preselectedCustId);
        }
        if (!found && preselectedCustName && custList.length > 0) {
          found = custList.find(cust => cust.name && cust.name.trim().toLowerCase() === preselectedCustName.trim().toLowerCase());
        }
        if (!found && preselectedEmail && custList.length > 0) {
          found = custList.find(cust => cust.contactPerson?.email && cust.contactPerson.email.trim().toLowerCase() === preselectedEmail.trim().toLowerCase());
        }

        const isInterState = found ? (found.address?.state || "").toLowerCase() !== "maharashtra" : false;
        
        setForm({
          ...emptyForm,
          isInterState,
          subject: preselectedSubject || (found ? `Quotation for ${found.name}` : ""),
          notes: preselectedNotes || (preselectedLeadId ? `Ref Lead: ${preselectedLeadId}` : ""),
          customer: found ? {
            id: found._id || found.id,
            name: found.name,
            address: [found.address?.street, found.address?.city, found.address?.state, found.address?.pinCode].filter(Boolean).join(", "),
            gstNumber: found.gstNumber || "",
            state: found.address?.state || "",
            contactPerson: found.contactPerson?.name || "",
            email: found.contactPerson?.email || preselectedEmail || "",
            phone: found.contactPerson?.phone || preselectedPhone || "",
          } : {
            name: preselectedCustName || "",
            email: preselectedEmail || "",
            phone: preselectedPhone || "",
            contactPerson: preselectedCustName || "",
            address: "",
            gstNumber: "",
            state: "Maharashtra",
          },
          items: emptyForm.items.map(i => calcItem(i, isInterState)),
        });
        setShowForm(true);

        // Clear query parameters from URL history so future load() or submits won't reopen the form
        if (typeof window !== "undefined" && window.history?.replaceState) {
          window.history.replaceState({}, "", "/quotations");
        }
      }
    });
  }, [load, preselectedCustId, preselectedCustName, preselectedEmail, preselectedPhone, preselectedSubject, preselectedNotes, preselectedLeadId, isCreateAction]);

  const recalc = (items, isInterState) => items.map(i => calcItem(i, isInterState));
  const totals = calcTotals(form.items, form.isInterState);

  const handleCustomerSelect = (custId) => {
    const c = customers.find(c => c._id === custId || c.id === custId);
    if (!c) return;
    const isInterState = (c.address?.state || "").toLowerCase() !== "maharashtra";
    const email = c.contactPerson?.email || c.email || c.contactEmail || "";
    const phone = c.contactPerson?.phone || c.phone || c.contactPhone || "";
    const contactPerson = c.contactPerson?.name || (typeof c.contactPerson === "string" ? c.contactPerson : "");
    const address = typeof c.address === "string"
      ? c.address
      : [c.address?.street, c.address?.city, c.address?.state, c.address?.pinCode].filter(Boolean).join(", ");

    setForm(f => ({
      ...f,
      isInterState,
      customer: {
        id: c._id || c.id,
        name: c.name,
        address,
        gstNumber: c.gstNumber || "",
        state: c.address?.state || "",
        contactPerson,
        email,
        phone,
      },
      salesperson: f.salesperson || c.salesPerson || "",
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
      setEditingId(null);
      setForm(emptyForm);
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

  const confirmConvertToSO = async () => {
    if (!convertToSOModal) return;
    setConvertingSO(true);
    try {
      const so = await convertQuotationToSO(convertToSOModal.quotationNo || convertToSOModal._id, {});
      showToast(`Sales Order ${so.soNo} created successfully!`);
      setConvertToSOModal(null);
      load();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setConvertingSO(false);
    }
  };

  const totalValue = quotations.reduce((s, q) => s + (q.grandTotal || 0), 0);
  const accepted = quotations.filter(q => q.status === "Accepted").length;
  const pending = quotations.filter(q => ["Draft", "Sent", "Viewed"].includes(q.status)).length;

  const renderMobileCard = (q) => {
    const isConvertedToPI = !!q.convertedToProforma;
    const isConvertedToSO = !!q.convertedToSalesOrder;
    const count = q.items?.length || 0;

    return (
      <div className="p-3.5 space-y-2.5 hover:bg-muted/30 transition-colors">
        {/* Top Row: Quotation No + Customer Name + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/quotations/${q.quotationNo || q._id}`}
              className="font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono"
            >
              <FileText className="size-3.5" />
              {q.quotationNo}
            </Link>
            <p className="text-xs font-semibold text-foreground truncate mt-0.5">
              {q.customer?.name || "Unnamed Customer"}
            </p>
            {q.subject && !/^0+$/.test(q.subject.trim()) && (
              <p className="text-[11px] text-muted-foreground truncate">{q.subject}</p>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <StatusBadge value={q.status} />
            <span className="text-[11px] text-muted-foreground">{fmtDate(q.date)}</span>
          </div>
        </div>

        {/* Amount & Summary Box */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/40 p-2.5 text-xs border border-border/40">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Amount
            </span>
            <span className="font-bold font-mono text-foreground text-xs">{fmtINR(q.grandTotal)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Items
            </span>
            <span className="font-medium text-foreground text-xs">{count} {count === 1 ? "item" : "items"}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">
              Valid Until
            </span>
            <span className="font-medium text-muted-foreground text-xs">
              {q.validUntil ? fmtDate(q.validUntil) : "—"}
            </span>
          </div>
        </div>

        {/* Touch Action Bar */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-border/40">
          <button
            onClick={() => setPrintDoc(q)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 rounded-lg font-medium text-foreground transition-colors"
          >
            <Printer className="size-3 text-muted-foreground" />
            <span>Print</span>
          </button>

          {isConvertedToPI ? (
            <Link
              href={`/proformas/${q.convertedToProforma}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 rounded-lg font-semibold transition-colors shadow-2xs"
            >
              <CheckCircle2 className="size-3 text-purple-600 dark:text-purple-400" />
              <span>View PI</span>
              <span className="font-mono text-[10px] opacity-75 font-normal">({q.convertedToProforma})</span>
            </Link>
          ) : isConvertedToSO ? (
            <Link
              href={`/orders/${q.convertedToSalesOrder}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg font-semibold transition-colors shadow-2xs"
            >
              <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span>View SO</span>
              <span className="font-mono text-[10px] opacity-75 font-normal">({q.convertedToSalesOrder})</span>
            </Link>
          ) : (
            <>
              <button
                onClick={() => openEdit(q)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 rounded-lg font-semibold transition-colors"
              >
                <Pencil className="size-3 text-blue-600 dark:text-blue-400" />
                <span>Edit</span>
              </button>
              {q.status !== "Rejected" && (
                <>
                  <button
                    onClick={() => {
                      setConvertToPIModal(q);
                      setPiAdvanceAmount("");
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 rounded-lg font-semibold transition-colors"
                  >
                    <ArrowRight className="size-3 text-purple-600 dark:text-purple-400" />
                    <span>PI</span>
                  </button>
                  <button
                    onClick={() => setConvertToSOModal(q)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-lg font-semibold transition-colors"
                    title="Convert to Sales Order"
                  >
                    <ArrowRight className="size-3 text-emerald-600 dark:text-emerald-400" />
                    <span>SO</span>
                  </button>
                </>
              )}
            </>
          )}

          <button
            onClick={() => handleDelete(q.quotationNo || q._id)}
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
      header: "Quotation",
      cell: (q) => (
        <Link
          href={`/quotations/${q.quotationNo || q._id}`}
          className="font-bold text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 font-mono"
        >
          {q.quotationNo}
        </Link>
      ),
    },
    {
      header: "Customer",
      cell: (q) => {
        const custName = q.customer?.name || "Unnamed Customer";
        const hasSubject = q.subject && q.subject.trim() && !/^0+$/.test(q.subject.trim());
        const hasGst = q.customer?.gstNumber && !/^0+$/.test(q.customer.gstNumber.trim());
        const hasContact = q.customer?.contactPerson && !/^0+$/.test(q.customer.contactPerson.trim());

        return (
          <div className="min-w-0 max-w-xs">
            <div className="font-semibold text-foreground truncate text-xs sm:text-sm">
              {custName}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
              {hasSubject ? (
                <span className="truncate">{q.subject}</span>
              ) : hasGst ? (
                <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border/40">
                  GST: {q.customer.gstNumber}
                </span>
              ) : hasContact ? (
                <span className="text-[11px] truncate">Attn: {q.customer.contactPerson}</span>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      header: "Date",
      cell: (q) => (
        <div className="text-xs text-foreground whitespace-nowrap">
          <div className="font-medium">{fmtDate(q.date)}</div>
          {q.validUntil ? (
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="size-3 text-muted-foreground/70" />
              <span>Valid: {fmtDate(q.validUntil)}</span>
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground mt-0.5">—</div>
          )}
        </div>
      ),
    },
    {
      header: "Items",
      cell: (q) => {
        const count = q.items?.length || 0;
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border/40 whitespace-nowrap">
            <Layers className="size-3 text-muted-foreground/70" />
            <span>{count} {count === 1 ? "item" : "items"}</span>
          </span>
        );
      },
    },
    {
      header: "Amount",
      cell: (q) => (
        <span className="font-bold font-mono text-foreground text-xs sm:text-sm whitespace-nowrap">
          {fmtINR(q.grandTotal)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (q) => <StatusBadge value={q.status} />,
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (q) => {
        const isConvertedToPI = !!q.convertedToProforma;
        const isConvertedToSO = !!q.convertedToSalesOrder;

        return (
          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
            {/* Print Button */}
            <button
              onClick={() => setPrintDoc(q)}
              title="Print Quotation"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all hover:border-border/80 shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <Printer className="size-3.5 text-muted-foreground" />
              <span>Print</span>
            </button>

            {isConvertedToPI ? (
              <Link
                href={`/proformas/${q.convertedToProforma}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all shadow-2xs whitespace-nowrap"
              >
                <CheckCircle2 className="size-3 text-purple-600 dark:text-purple-400" />
                <span>View PI</span>
                <span className="font-mono text-[10px] opacity-75 font-normal">({q.convertedToProforma})</span>
              </Link>
            ) : isConvertedToSO ? (
              <Link
                href={`/orders/${q.convertedToSalesOrder}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-2xs whitespace-nowrap"
              >
                <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span>View SO</span>
                <span className="font-mono text-[10px] opacity-75 font-normal">({q.convertedToSalesOrder})</span>
              </Link>
            ) : (
              <>
                <button
                  onClick={() => openEdit(q)}
                  title="Edit Quotation"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-all whitespace-nowrap cursor-pointer"
                >
                  <Pencil className="size-3 text-blue-600 dark:text-blue-400" />
                  <span>Edit</span>
                </button>
                {q.status !== "Rejected" && (
                  <>
                    <button
                      onClick={() => {
                        setConvertToPIModal(q);
                        setPiAdvanceAmount("");
                      }}
                      title="Convert to Proforma Invoice"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all whitespace-nowrap cursor-pointer"
                    >
                      <ArrowRight className="size-3 text-purple-600 dark:text-purple-400" />
                      <span>PI</span>
                    </button>
                    <button
                      onClick={() => setConvertToSOModal(q)}
                      title="Convert to Sales Order"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all whitespace-nowrap cursor-pointer"
                    >
                      <ArrowRight className="size-3 text-emerald-600 dark:text-emerald-400" />
                      <span>SO</span>
                    </button>
                  </>
                )}
              </>
            )}

            <button
              onClick={() => handleDelete(q.quotationNo || q._id)}
              title="Delete Quotation"
              className="inline-flex items-center justify-center p-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-xs sm:text-sm font-medium transition-all ${
            toast.type === "error" ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Print Modal */}
      {printDoc && company && (
        <DocumentPrintView doc={printDoc} type="Quotation" company={company} onClose={() => setPrintDoc(null)} />
      )}

      {/* Convert to Proforma Modal */}
      {convertToPIModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 w-[94vw] max-w-sm shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-base sm:text-lg text-foreground mb-1">Create Proforma Invoice</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Quotation: <strong>{convertToPIModal.quotationNo}</strong> · Total: <strong>{fmtINR(convertToPIModal.grandTotal)}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Advance Amount Required (₹)</label>
              <input
                type="number"
                className="w-full border border-border bg-background text-foreground rounded-lg px-3.5 py-2 text-sm font-bold focus:ring-2 focus:ring-purple-500"
                value={piAdvanceAmount}
                onChange={e => setPiAdvanceAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-1">Specify advance requirement or leave 0</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConvertToPIModal(null)} className="flex-1 border border-border rounded-lg py-2 text-xs font-medium hover:bg-muted text-foreground">
                Cancel
              </button>
              <button onClick={confirmConvertToProforma} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 text-xs font-bold shadow-xs">
                Create Proforma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Sales Order Modal */}
      {convertToSOModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 w-[94vw] max-w-sm sm:max-w-md shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-xl mx-auto mb-3 border border-emerald-500/20">
              🛒
            </div>
            <h3 className="font-bold text-base sm:text-lg text-foreground text-center mb-1">
              Convert to Sales Order?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mb-4">
              Are you sure you want to convert Quotation <strong className="text-foreground">{convertToSOModal.quotationNo}</strong> into a confirmed Sales Order?
            </p>

            <div className="bg-muted/40 border border-border/70 rounded-xl p-3.5 mb-5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]">{convertToSOModal.customer?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Grand Total:</span>
                <span className="font-bold text-foreground">{fmtINR(convertToSOModal.grandTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={convertingSO}
                onClick={() => setConvertToSOModal(null)}
                className="flex-1 py-2.5 px-4 border border-border rounded-xl text-xs sm:text-sm font-semibold hover:bg-muted text-foreground transition-colors disabled:opacity-50 cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                disabled={convertingSO}
                onClick={confirmConvertToSO}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {convertingSO ? "Converting..." : "Yes, Convert to SO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showQuickCust && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-[94vw] p-5 sm:p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-base text-foreground">+ Quick Add New Customer</h3>
              <button onClick={() => setShowQuickCust(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>
            <form onSubmit={handleQuickCustomerSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Company / Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Motors Ltd"
                  className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
                  value={quickCustForm.name}
                  onChange={e => setQuickCustForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Contact name"
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm"
                    value={quickCustForm.contactPerson.name}
                    onChange={e => setQuickCustForm(f => ({ ...f, contactPerson: { ...f.contactPerson, name: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Email (For Notifications)</label>
                  <input
                    type="email"
                    placeholder="client@company.com"
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm"
                    value={quickCustForm.contactPerson.email}
                    onChange={e => setQuickCustForm(f => ({ ...f, contactPerson: { ...f.contactPerson, email: e.target.value } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm"
                    value={quickCustForm.contactPerson.phone}
                    onChange={e => setQuickCustForm(f => ({ ...f, contactPerson: { ...f.contactPerson, phone: e.target.value } }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">GST Number</label>
                  <input
                    type="text"
                    placeholder="27AABCN..."
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm font-mono uppercase"
                    value={quickCustForm.gstNumber}
                    onChange={e => setQuickCustForm(f => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Pune"
                    className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm"
                    value={quickCustForm.address.city}
                    onChange={e => setQuickCustForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="Industrial Area, Chakan..."
                  className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm"
                  value={quickCustForm.address.street}
                  onChange={e => setQuickCustForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">State</label>
                <input
                  type="text"
                  placeholder="Maharashtra"
                  className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm"
                  value={quickCustForm.address.state}
                  onChange={e => setQuickCustForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowQuickCust(false)}
                  className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickCustSaving}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs disabled:opacity-60"
                >
                  {quickCustSaving ? "Saving..." : "Save & Select"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 overflow-y-auto p-2 sm:p-4 py-4 sm:py-6">
          <div className="mx-auto max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-muted/30">
              <h2 className="text-base sm:text-lg font-bold text-foreground">{editingId ? "Edit Quotation" : "New Quotation"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Customer Selection with Quick Add Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-muted-foreground">Customer *</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCust(true)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5"
                    >
                      + Add New Customer
                    </button>
                  </div>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                    value={form.customer.id || ""}
                    onChange={e => handleCustomerSelect(e.target.value)}
                  >
                    <option value="">
                      {customers.length > 0 ? "Select customer…" : "No customers yet -- use + Add New Customer"}
                    </option>
                    {customers.map(c => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name} ({c.id || "CUST"})
                      </option>
                    ))}
                  </select>
                  {form.customer.name && (
                    <div className="mt-1.5 text-xs bg-muted/60 px-2.5 py-1 rounded-md border border-border/60 flex items-center gap-1.5">
                      {form.customer.email ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium inline-flex items-center gap-1.5">
                          ✉ <span className="font-mono">{form.customer.email}</span>
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                          ✉ No email on file
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">GST Number</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm font-mono uppercase" value={form.customer.gstNumber || ""} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, gstNumber: e.target.value.toUpperCase() } }))} placeholder="27AABCN..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Address</label>
                  <textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={2} value={form.customer.address || ""} onChange={e => setForm(f => ({ ...f, customer: { ...f.customer, address: e.target.value } }))} placeholder="Customer address" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Subject</label>
                  <input className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" value={form.subject || ""} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Quotation subject" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Salesperson <span className="text-muted-foreground/80 font-normal">(Sales Team Only)</span>
                  </label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2 text-xs sm:text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <input type="date" className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" value={form.validUntil ? form.validUntil.slice(0, 10) : ""} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                  <select className="w-full border border-border rounded-lg px-3 py-2 text-xs sm:text-sm bg-background text-foreground" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 pt-1">
                  <input type="checkbox" id="interState" checked={form.isInterState} onChange={e => {
                    const is = e.target.checked;
                    setForm(f => ({ ...f, isInterState: is, items: recalc(f.items, is) }));
                  }} className="w-4 h-4 rounded" />
                  <label htmlFor="interState" className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">Inter-State supply (apply IGST instead of CGST+SGST)</label>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2">Line Items</label>
                <div className="overflow-x-auto">
                  <LineItemsEditor
                    items={form.items}
                    isInterState={form.isInterState}
                    onChange={items => setForm(f => ({ ...f, items: recalc(items, f.isInterState) }))}
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="bg-muted/40 border border-border rounded-xl px-4 sm:px-5 py-3 sm:py-4 w-full sm:w-auto sm:min-w-60 text-xs sm:text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground">{fmtINR(totals.subtotal)}</span></div>
                  {!form.isInterState && totals.totalCgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="font-medium text-foreground">{fmtINR(totals.totalCgst)}</span></div>}
                  {!form.isInterState && totals.totalSgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="font-medium text-foreground">{fmtINR(totals.totalSgst)}</span></div>}
                  {form.isInterState && totals.totalIgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-medium text-foreground">{fmtINR(totals.totalIgst)}</span></div>}
                  <div className="flex justify-between font-bold text-sm sm:text-base border-t border-border pt-2 mt-2"><span>Grand Total</span><span className="text-blue-600 dark:text-blue-400">{fmtINR(totals.grandTotal)}</span></div>
                </div>
              </div>

              {/* Terms & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Terms & Conditions</label>
                  <textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={3} value={form.termsAndConditions || ""} onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))} placeholder="Payment terms, delivery terms..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes</label>
                  <textarea className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 text-xs sm:text-sm" rows={3} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-border bg-muted/20">
              <button onClick={() => setShowForm(false)} className="px-4 sm:px-5 py-2 text-xs sm:text-sm border border-border rounded-lg hover:bg-muted text-foreground transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 sm:px-6 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors disabled:opacity-60">
                {saving ? "Saving…" : editingId ? "Update Quotation" : "Create Quotation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        breadcrumb="Sales / Quotations"
        title="Quotations"
        subtitle="Create, send, and convert quotations to Proforma Invoices or Sales Orders"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>New Quotation</span>
          </button>
        }
      />

      {/* 2-Column Responsive KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Total Quotations" value={quotations.length} />
        <Kpi label="Pending" value={pending} tone="warning" />
        <Kpi label="Accepted" value={accepted} tone="success" />
        <Kpi label="Total Value" value={fmtINR(totalValue)} tone="accent" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      ) : (
        <DataTable
          rows={quotations}
          columns={columns}
          mobileCard={renderMobileCard}
          searchKeys={["quotationNo", "customer.name", "salesperson", "status"]}
        />
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
