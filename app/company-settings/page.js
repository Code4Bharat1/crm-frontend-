"use client";

import React, { useState, useEffect } from "react";
import { getCompany, updateCompany } from "@/services/documentService";
import { PageHeader } from "@/components/crm-ui";

export default function CompanySettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    getCompany().then(c => { setForm(c); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setAddr = (field, value) => setForm(f => ({ ...f, address: { ...f.address, [field]: value } }));
  const setBank = (field, value) => setForm(f => ({ ...f, bankDetails: { ...f.bankDetails, [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    try { await updateCompany(form); showToast("Company settings saved"); }
    catch (e) { showToast(e.message, "error"); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" /></div>;
  if (!form) return null;

  const FieldGroup = ({ title, children }) => (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</div>
      <div className="p-6">{children}</div>
    </div>
  );
  const Field = ({ label, children }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
  const inp = (value, onChange, placeholder = "", type = "text") => (
    <input type={type} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={value || ""} onChange={onChange} placeholder={placeholder} />
  );

  return (
    <>
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>{toast.msg}</div>}

      <PageHeader breadcrumb="Settings / Company" title="Company Settings" subtitle="Configure letterhead, bank details, and footer text for all printed business documents" />

      <div className="max-w-3xl space-y-5">
        <FieldGroup title="Company Identity">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company Name">{inp(form.name, e => set("name", e.target.value), "Nexcore Alliance Pvt. Ltd.")}</Field>
            <Field label="Tagline">{inp(form.tagline, e => set("tagline", e.target.value), "Automation & Industrial Solutions")}</Field>
            <Field label="Phone">{inp(form.phone, e => set("phone", e.target.value), "+91 20...")}</Field>
            <Field label="Email">{inp(form.email, e => set("email", e.target.value), "info@company.com", "email")}</Field>
            <Field label="Website">{inp(form.website, e => set("website", e.target.value), "www.company.com")}</Field>
            <Field label="GST Number">{inp(form.gstNumber, e => set("gstNumber", e.target.value), "27AABCN...")}</Field>
            <Field label="PAN Number">{inp(form.panNumber, e => set("panNumber", e.target.value), "AABCN...")}</Field>
            <Field label="CIN Number">{inp(form.cinNumber, e => set("cinNumber", e.target.value), "U12345MH...")}</Field>
          </div>
        </FieldGroup>

        <FieldGroup title="Address">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Address Line 1">{inp(form.address?.line1, e => setAddr("line1", e.target.value), "123, Industrial Area...")}</Field></div>
            <div className="col-span-2"><Field label="Address Line 2">{inp(form.address?.line2, e => setAddr("line2", e.target.value), "Bhosari, Pune - 411026")}</Field></div>
            <Field label="City">{inp(form.address?.city, e => setAddr("city", e.target.value))}</Field>
            <Field label="State">{inp(form.address?.state, e => setAddr("state", e.target.value))}</Field>
            <Field label="PIN Code">{inp(form.address?.pinCode, e => setAddr("pinCode", e.target.value))}</Field>
            <Field label="Country">{inp(form.address?.country, e => setAddr("country", e.target.value))}</Field>
          </div>
        </FieldGroup>

        <FieldGroup title="Bank Details (shown on invoices)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Bank Name">{inp(form.bankDetails?.bankName, e => setBank("bankName", e.target.value))}</Field>
            <Field label="Branch">{inp(form.bankDetails?.branch, e => setBank("branch", e.target.value))}</Field>
            <Field label="Account Name">{inp(form.bankDetails?.accountName, e => setBank("accountName", e.target.value))}</Field>
            <Field label="Account Number">{inp(form.bankDetails?.accountNumber, e => setBank("accountNumber", e.target.value))}</Field>
            <Field label="IFSC Code">{inp(form.bankDetails?.ifscCode, e => setBank("ifscCode", e.target.value))}</Field>
          </div>
        </FieldGroup>

        <FieldGroup title="Document Footer">
          <div className="space-y-4">
            <Field label="Authorised Signatory Text">
              {inp(form.signatureText, e => set("signatureText", e.target.value), "For Nexcore Alliance Pvt. Ltd.")}
            </Field>
            <Field label="Footer Note (printed at bottom of every document)">
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={form.footerNote || ""} onChange={e => set("footerNote", e.target.value)} placeholder="This is a computer generated document. No signature required." />
            </Field>
            <Field label="Default Terms & Conditions (pre-filled in all documents)">
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={5} value={form.termsAndConditions || ""} onChange={e => set("termsAndConditions", e.target.value)} placeholder="1. Payment due within 30 days..." />
            </Field>
          </div>
        </FieldGroup>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all disabled:opacity-60">
            {saving ? "Saving…" : "💾 Save Settings"}
          </button>
        </div>
      </div>
    </>
  );
}
