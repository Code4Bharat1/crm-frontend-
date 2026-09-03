"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getQuotations,
  getSalesOrders,
  getInvoices,
  fmtINR,
  fmtDate,
} from "@/services/documentService";
import { PageHeader, StatusBadge, Section, Kpi } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";

const TYPES = ["OEM", "End User", "System Integrator", "EPC", "Trader"];
const INDUSTRIES = ["Automotive", "Industrial Automation", "Robotics", "Packaging", "Pharma", "Food & Beverage", "Engineering", "Electronics", "Other"];
const PAYMENT_TERMS = ["Immediate", "7 Days Net", "15 Days Net", "30 Days Net", "45 Days Net", "60 Days Net"];

const toForm = (c) => ({
  name: c.name || "",
  type: c.type || "End User",
  status: c.status || "Active",
  industry: c.industry || "",
  area: c.area || "",
  salesPerson: c.salesPerson || "",
  contactPerson: {
    name: c.contactPerson?.name || "",
    phone: c.contactPerson?.phone || "",
    email: c.contactPerson?.email || "",
    designation: c.contactPerson?.designation || "",
  },
  address: {
    street: c.address?.street || "",
    city: c.address?.city || "",
    state: c.address?.state || "Maharashtra",
    pinCode: c.address?.pinCode || "",
    country: c.address?.country || "India",
  },
  gstNumber: c.gstNumber || "",
  panNumber: c.panNumber || "",
  paymentTerms: c.paymentTerms || "30 Days Net",
  creditLimit: c.creditLimit || 0,
  notes: c.notes || "",
});

function inputCls(editing) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    editing ? "bg-white" : "bg-muted/40 text-foreground/90 cursor-default"
  }`;
}

function LabeledInput({ label, value, onChange, editing, type = "text", mono = false, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={!editing}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls(editing)} ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}

function LabeledSelect({ label, value, onChange, editing, options }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      {editing ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls(true) + " bg-white"}
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input readOnly value={value} className={inputCls(false)} />
      )}
    </div>
  );
}

function DocList({ docs, hrefBase, valueKey = "grandTotal" }) {
  if (!docs.length) {
    return <p className="px-1 py-3 text-sm text-muted-foreground">None yet.</p>;
  }
  return (
    <div className="divide-y divide-border">
      {docs.map((d) => (
        <Link
          key={d._id || d.id}
          href={`${hrefBase}/${d.quotationNo || d.soNo || d.invoiceNo || d.id}`}
          className="flex items-center justify-between gap-2 px-1 py-2.5 text-sm transition-colors hover:bg-muted/50"
        >
          <div>
            <div className="font-semibold text-primary">{d.quotationNo || d.soNo || d.invoiceNo || d.id}</div>
            <div className="text-xs text-muted-foreground">{fmtDate(d.date)}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{fmtINR(d[valueKey] || 0)}</span>
            <StatusBadge value={d.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [quotations, setQuotations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getCustomer(id);
      setCustomer(c);
      setForm(toForm(c));

      setDocsLoading(true);
      const customerId = c._id || c.id;
      const [q, so, inv] = await Promise.all([
        getQuotations({ customerId }).catch(() => []),
        getSalesOrders({ customerId }).catch(() => []),
        getInvoices({ customerId }).catch(() => []),
      ]);
      setQuotations(Array.isArray(q) ? q : []);
      setOrders(Array.isArray(so) ? so : []);
      setInvoices(Array.isArray(inv) ? inv : []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
      setDocsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setContact = (field, val) => setForm((f) => ({ ...f, contactPerson: { ...f.contactPerson, [field]: val } }));
  const setAddr = (field, val) => setForm((f) => ({ ...f, address: { ...f.address, [field]: val } }));

  const startEdit = () => {
    setForm(toForm(customer));
    setEditing(true);
  };

  const cancelEdit = () => {
    setForm(toForm(customer));
    setEditing(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return showToast("Customer Name is required", "error");
    setSaving(true);
    try {
      const updated = await updateCustomer(customer._id || customer.id, form);
      setCustomer(updated);
      setForm(toForm(updated));
      setEditing(false);
      showToast("Customer updated successfully!");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete customer "${customer.name}"? This cannot be undone.`)) return;
    try {
      await deleteCustomer(customer._id || customer.id);
      showToast("Customer deleted");
      router.push("/customers");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Customer not found.{" "}
        <Link href="/customers" className="text-primary hover:underline">Back to Customers</Link>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      <PageHeader
        breadcrumb="CRM / Customers / 360°"
        title={customer.name}
        subtitle={`${customer.id} · ${customer.industry || customer.type || "—"}`}
        actions={
          <>
            <Link
              href={`/quotations?customerId=${customer._id || customer.id}&customerName=${encodeURIComponent(customer.name)}`}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              + Quotation
            </Link>
            {editing ? (
              <>
                <Button variant="outline" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={startEdit}>Edit</Button>
                <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </>
            )}
            <Link href="/customers" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              ← Back
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Status" value={<StatusBadge value={customer.status} />} />
        <Kpi label="Total Revenue" value={fmtINR(customer.totalRevenue)} tone="success" />
        <Kpi label="Outstanding" value={fmtINR(customer.outstanding)} tone={customer.outstanding > 0 ? "danger" : "default"} />
        <Kpi label="Credit Limit" value={fmtINR(customer.creditLimit)} tone="accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Business Identity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <LabeledInput label="Company / Customer Name" value={form.name} editing={editing} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
              </div>
              <LabeledSelect label="Customer Type" value={form.type} editing={editing} options={TYPES} onChange={(v) => setForm((f) => ({ ...f, type: v }))} />
              <LabeledSelect label="Industry Sector" value={form.industry} editing={editing} options={INDUSTRIES} onChange={(v) => setForm((f) => ({ ...f, industry: v }))} />
              <LabeledInput label="GST Number" value={form.gstNumber} editing={editing} mono onChange={(v) => setForm((f) => ({ ...f, gstNumber: v.toUpperCase() }))} />
              <LabeledInput label="PAN Number" value={form.panNumber} editing={editing} mono onChange={(v) => setForm((f) => ({ ...f, panNumber: v.toUpperCase() }))} />
              <LabeledSelect label="Status" value={form.status} editing={editing} options={["Active", "Lead", "Inactive"]} onChange={(v) => setForm((f) => ({ ...f, status: v }))} />
              <LabeledInput label="Assigned Salesperson" value={form.salesPerson} editing={editing} onChange={(v) => setForm((f) => ({ ...f, salesPerson: v }))} />
            </div>
          </Section>

          <Section title="Primary Contact Person">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LabeledInput label="Contact Name" value={form.contactPerson.name} editing={editing} onChange={(v) => setContact("name", v)} />
              <LabeledInput label="Designation" value={form.contactPerson.designation} editing={editing} onChange={(v) => setContact("designation", v)} />
              <LabeledInput label="Phone / Mobile" value={form.contactPerson.phone} editing={editing} onChange={(v) => setContact("phone", v)} />
              <LabeledInput label="Email Address" type="email" value={form.contactPerson.email} editing={editing} onChange={(v) => setContact("email", v)} />
            </div>
          </Section>

          <Section title="Billing & Works Address">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <LabeledInput label="Street / Factory Address" value={form.address.street} editing={editing} onChange={(v) => setAddr("street", v)} />
              </div>
              <LabeledInput label="Area / Industrial Zone" value={form.area} editing={editing} onChange={(v) => setForm((f) => ({ ...f, area: v }))} />
              <LabeledInput label="City" value={form.address.city} editing={editing} onChange={(v) => setAddr("city", v)} />
              <LabeledInput label="State" value={form.address.state} editing={editing} onChange={(v) => setAddr("state", v)} />
              <LabeledInput label="PIN Code" value={form.address.pinCode} editing={editing} onChange={(v) => setAddr("pinCode", v)} />
            </div>
          </Section>

          <Section title="Commercial Terms">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LabeledSelect label="Default Payment Terms" value={form.paymentTerms} editing={editing} options={PAYMENT_TERMS} onChange={(v) => setForm((f) => ({ ...f, paymentTerms: v }))} />
              <LabeledInput label="Credit Limit (₹)" type="number" value={form.creditLimit} editing={editing} onChange={(v) => setForm((f) => ({ ...f, creditLimit: Number(v) || 0 }))} />
            </div>
          </Section>

          <Section title="Notes">
            <textarea
              readOnly={!editing}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={4}
              placeholder="Internal notes about this customer…"
              className={`${inputCls(editing)} resize-none`}
            />
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Quotations" description={docsLoading ? "Loading…" : `${quotations.length} record(s)`}>
            <DocList docs={quotations} hrefBase="/quotations" valueKey="grandTotal" />
          </Section>
          <Section title="Sales Orders" description={docsLoading ? "Loading…" : `${orders.length} record(s)`}>
            <DocList docs={orders} hrefBase="/orders" valueKey="grandTotal" />
          </Section>
          <Section title="Invoices" description={docsLoading ? "Loading…" : `${invoices.length} record(s)`}>
            <DocList docs={invoices} hrefBase="/invoices" valueKey="grandTotal" />
          </Section>
        </div>
      </div>
    </>
  );
}
