"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";

const emptyForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  gstNumber: "",
  panNumber: "",
  paymentTerms: "30 Days Net",
  creditLimit: 0,
  status: "Active",
  notes: "",
  address: { street: "", city: "", state: "", pinCode: "", country: "India" },
  bankDetails: { bankName: "", accountNumber: "", ifscCode: "", accountName: "", branch: "" },
};

// Validation regular expressions
const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+91[\-\s]?)?[6-9]\d{9}$|^\d{10}$/,
  GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  PIN: /^[1-9][0-9]{5}$/,
  ACCOUNT: /^\d{9,18}$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Validation function for entire form or single field
  const validateForm = (data) => {
    const errs = {};

    // 1. Supplier Name (Required, min 2 chars)
    if (!data.name || !data.name.trim()) {
      errs.name = "Supplier Name is required";
    } else if (data.name.trim().length < 2) {
      errs.name = "Supplier Name must be at least 2 characters";
    }

    // 2. Contact Person (Optional, min 2 chars if provided)
    if (data.contactPerson && data.contactPerson.trim()) {
      if (data.contactPerson.trim().length < 2) {
        errs.contactPerson = "Contact person name should be at least 2 characters";
      }
    }

    // 3. Phone (Optional, valid 10-digit if provided)
    if (data.phone && data.phone.trim()) {
      const cleanPhone = data.phone.replace(/[\s\-()]/g, "");
      if (!REGEX.PHONE.test(cleanPhone)) {
        errs.phone = "Enter a valid 10-digit phone number (e.g. 9876543210)";
      }
    }

    // 4. Email (Optional, valid email if provided)
    if (data.email && data.email.trim()) {
      if (!REGEX.EMAIL.test(data.email.trim())) {
        errs.email = "Enter a valid email address (e.g. contact@supplier.com)";
      }
    }

    // 5. GST Number (Optional, 15-char GSTIN if provided)
    if (data.gstNumber && data.gstNumber.trim()) {
      const upperGST = data.gstNumber.trim().toUpperCase();
      if (!REGEX.GST.test(upperGST)) {
        errs.gstNumber = "Invalid GSTIN format (e.g. 27AABCN1234F1Z5 - 15 characters)";
      }
    }

    // 6. PAN Number (Optional, 10-char PAN if provided)
    if (data.panNumber && data.panNumber.trim()) {
      const upperPAN = data.panNumber.trim().toUpperCase();
      if (!REGEX.PAN.test(upperPAN)) {
        errs.panNumber = "Invalid PAN format (e.g. AABCN1234F - 10 characters)";
      }
    }

    // 7. PIN Code (Optional, 6-digit numeric if provided)
    if (data.address?.pinCode && data.address.pinCode.trim()) {
      if (!REGEX.PIN.test(data.address.pinCode.trim())) {
        errs.pinCode = "PIN Code must be a 6-digit numeric code (e.g. 411001)";
      }
    }

    // 8. Bank Account Number (Optional, 9-18 digits numeric if provided)
    if (data.bankDetails?.accountNumber && data.bankDetails.accountNumber.trim()) {
      const cleanAcc = data.bankDetails.accountNumber.trim();
      if (!REGEX.ACCOUNT.test(cleanAcc)) {
        errs.accountNumber = "Account Number must be between 9 and 18 digits";
      }
    }

    // 9. Bank IFSC Code (Optional, 11-char IFSC if provided)
    if (data.bankDetails?.ifscCode && data.bankDetails.ifscCode.trim()) {
      const upperIFSC = data.bankDetails.ifscCode.trim().toUpperCase();
      if (!REGEX.IFSC.test(upperIFSC)) {
        errs.ifscCode = "Invalid IFSC Code (e.g. HDFC0001234 or SBIN0000456)";
      }
    }

    return errs;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
    setTouched({});
    setShowForm(true);
  };

  const openEdit = (s) => {
    setForm({
      name: s.name || "",
      contactPerson: s.contactPerson || "",
      phone: s.phone || "",
      email: s.email || "",
      gstNumber: s.gstNumber || "",
      panNumber: s.panNumber || "",
      paymentTerms: s.paymentTerms || "30 Days Net",
      creditLimit: s.creditLimit || 0,
      status: s.status || "Active",
      notes: s.notes || "",
      address: {
        street: s.address?.street || "",
        city: s.address?.city || "",
        state: s.address?.state || "",
        pinCode: s.address?.pinCode || "",
        country: s.address?.country || "India",
      },
      bankDetails: {
        bankName: s.bankDetails?.bankName || "",
        accountNumber: s.bankDetails?.accountNumber || "",
        ifscCode: s.bankDetails?.ifscCode || "",
        accountName: s.bankDetails?.accountName || "",
        branch: s.bankDetails?.branch || "",
      },
    });
    setEditingId(s._id || s.id);
    setErrors({});
    setTouched({});
    setShowForm(true);
  };

  // Smart field change handlers
  const handleNameChange = (val) => {
    setForm((f) => ({ ...f, name: val }));
    if (errors.name) {
      setErrors((e) => ({ ...e, name: undefined }));
    }
  };

  const handleGSTChange = (val) => {
    const upper = val.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    setForm((f) => {
      // Auto-extract PAN from GST if valid length and PAN is currently empty or was derived
      const autoPAN = upper.length >= 12 ? upper.slice(2, 12) : f.panNumber;
      return {
        ...f,
        gstNumber: upper,
        panNumber: !f.panNumber || f.panNumber === f.gstNumber.slice(2, 12) ? autoPAN : f.panNumber,
      };
    });
    if (errors.gstNumber) {
      setErrors((e) => ({ ...e, gstNumber: undefined }));
    }
  };

  const handlePANChange = (val) => {
    const upper = val.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 10);
    setForm((f) => ({ ...f, panNumber: upper }));
    if (errors.panNumber) {
      setErrors((e) => ({ ...e, panNumber: undefined }));
    }
  };

  const handleIFSCChange = (val) => {
    const upper = val.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 11);
    setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, ifscCode: upper } }));
    if (errors.ifscCode) {
      setErrors((e) => ({ ...e, ifscCode: undefined }));
    }
  };

  const handlePinChange = (val) => {
    const digits = val.replace(/[^0-9]/g, "").slice(0, 6);
    setForm((f) => ({ ...f, address: { ...f.address, pinCode: digits } }));
    if (errors.pinCode) {
      setErrors((e) => ({ ...e, pinCode: undefined }));
    }
  };

  const handleAccountChange = (val) => {
    const digits = val.replace(/[^0-9]/g, "").slice(0, 18);
    setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, accountNumber: digits } }));
    if (errors.accountNumber) {
      setErrors((e) => ({ ...e, accountNumber: undefined }));
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    // Mark all as touched
    setTouched({
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      gstNumber: true,
      panNumber: true,
      pinCode: true,
      accountNumber: true,
      ifscCode: true,
    });

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      showToast(firstError, "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gstNumber: form.gstNumber.trim().toUpperCase(),
        panNumber: form.panNumber.trim().toUpperCase(),
        bankDetails: {
          ...form.bankDetails,
          ifscCode: form.bankDetails.ifscCode.trim().toUpperCase(),
          accountNumber: form.bankDetails.accountNumber.trim(),
        },
      };

      if (editingId) {
        await updateSupplier(editingId, payload);
        showToast("Supplier updated successfully!");
      } else {
        await createSupplier(payload);
        showToast("Supplier created successfully!");
      }
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err.message || "Failed to save supplier", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete supplier "${name || id}"?`)) return;
    try {
      await deleteSupplier(id);
      showToast("Supplier deleted successfully");
      load();
    } catch (e) {
      showToast(e.message || "Failed to delete supplier", "error");
    }
  };

  const setAddr = (field, value) => {
    setForm((f) => ({ ...f, address: { ...f.address, [field]: value } }));
  };

  const setBank = (field, value) => {
    setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, [field]: value } }));
  };

  const active = suppliers.filter((s) => s.status === "Active").length;

  const columns = [
    {
      header: "Code",
      cell: (s) => <span className="font-mono text-xs font-bold text-cyan-700">{s.supplierCode}</span>,
    },
    {
      header: "Supplier",
      cell: (s) => (
        <Link
          href={`/suppliers/${s._id}`}
          className="font-semibold text-gray-900 hover:text-cyan-700 hover:underline text-xs"
        >
          {s.name}
        </Link>
      ),
    },
    {
      header: "Contact",
      cell: (s) => (
        <div>
          <div className="font-medium text-xs text-gray-900">{s.contactPerson || "—"}</div>
          {s.phone && <div className="text-[11px] text-gray-400 font-mono">{s.phone}</div>}
        </div>
      ),
    },
    {
      header: "City / State",
      cell: (s) => (
        <span className="text-xs text-gray-700">
          {s.address?.city ? `${s.address.city}${s.address.state ? `, ${s.address.state}` : ""}` : "—"}
        </span>
      ),
    },
    {
      header: "GSTIN",
      cell: (s) => (
        <span className="font-mono text-xs font-medium text-gray-800">
          {s.gstNumber || "—"}
        </span>
      ),
    },
    {
      header: "Payment Terms",
      cell: (s) => <span className="text-xs text-gray-700">{s.paymentTerms || "30 Days Net"}</span>,
    },
    {
      header: "Status",
      cell: (s) => <StatusBadge value={s.status} />,
    },
    {
      header: "Actions",
      cell: (s) => (
        <div className="flex gap-1.5 whitespace-nowrap">
          <button
            onClick={() => openEdit(s)}
            className="px-2.5 py-1 text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-lg font-semibold cursor-pointer transition-all active:scale-95"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(s._id || s.id, s.name)}
            className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-semibold cursor-pointer transition-all active:scale-95"
          >
            Del
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all flex items-center gap-2 ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  {editingId ? "Edit Supplier Record" : "Add New Supplier"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingId
                    ? "Update supplier contact, tax profiles, and banking details"
                    : "Register vendor for Purchase Orders, material sourcing, and inward bills"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-base transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSave} noValidate className="p-6 space-y-5 flex-1 overflow-y-auto">
              {/* 1. Basic Information */}
              <div>
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                  1. Basic Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Supplier Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Supplier Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Siemens India Ltd / Schneider Electric"
                      className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all ${
                        errors.name
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-300 hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      }`}
                      value={form.name}
                      onBlur={() => handleBlur("name")}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                    {errors.name && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <span>⚠️</span> {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Contact Person */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Contact Person <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kulkarni"
                      className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all ${
                        errors.contactPerson
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-300 hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      }`}
                      value={form.contactPerson || ""}
                      onBlur={() => handleBlur("contactPerson")}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, contactPerson: e.target.value }));
                        if (errors.contactPerson) setErrors((err) => ({ ...err, contactPerson: undefined }));
                      }}
                    />
                    {errors.contactPerson && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <span>⚠️</span> {errors.contactPerson}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Phone / Mobile <span className="text-[11px] text-gray-400 font-normal">(10 Digits)</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all ${
                        errors.phone
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-300 hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      }`}
                      value={form.phone || ""}
                      onBlur={() => handleBlur("phone")}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, phone: e.target.value }));
                        if (errors.phone) setErrors((err) => ({ ...err, phone: undefined }));
                      }}
                    />
                    {errors.phone && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <span>⚠️</span> {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Address <span className="text-[11px] text-gray-400 font-normal">(For Purchase Orders)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. sales@siemens-dist.com"
                      className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all ${
                        errors.email
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-300 hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      }`}
                      value={form.email || ""}
                      onBlur={() => handleBlur("email")}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, email: e.target.value }));
                        if (errors.email) setErrors((err) => ({ ...err, email: undefined }));
                      }}
                    />
                    {errors.email && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <span>⚠️</span> {errors.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Tax & Commercial Terms */}
              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                  2. Tax & Identification
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* GST Number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      GST Number (GSTIN) <span className="text-[11px] text-gray-400 font-normal">(15 Characters)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 27AABCN1234F1Z5"
                      className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm font-mono uppercase text-gray-800 placeholder:text-gray-400 outline-none transition-all ${
                        errors.gstNumber
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-300 hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      }`}
                      value={form.gstNumber || ""}
                      onBlur={() => handleBlur("gstNumber")}
                      onChange={(e) => handleGSTChange(e.target.value)}
                    />
                    {errors.gstNumber && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <span>⚠️</span> {errors.gstNumber}
                      </p>
                    )}
                  </div>

                  {/* PAN Number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      PAN Number <span className="text-[11px] text-gray-400 font-normal">(10 Characters)</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. AABCN1234F"
                      className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm font-mono uppercase text-gray-800 placeholder:text-gray-400 outline-none transition-all ${
                        errors.panNumber
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-300 hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      }`}
                      value={form.panNumber || ""}
                      onBlur={() => handleBlur("panNumber")}
                      onChange={(e) => handlePANChange(e.target.value)}
                    />
                    {errors.panNumber && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <span>⚠️</span> {errors.panNumber}
                      </p>
                    )}
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Terms</label>
                    <select
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.paymentTerms}
                      onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                    >
                      {[
                        "Immediate",
                        "7 Days Net",
                        "15 Days Net",
                        "30 Days Net",
                        "45 Days Net",
                        "60 Days Net",
                        "90 Days Net",
                        "Against Delivery",
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      {["Active", "Inactive", "Blacklisted"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Address */}
              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                  3. Address & Location
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Plot 42, Phase II, MIDC Industrial Area"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.address.street || ""}
                      onChange={(e) => setAddr("street", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune / Mumbai"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.address.city || ""}
                      onChange={(e) => setAddr("city", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.address.state || ""}
                      onChange={(e) => setAddr("state", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PIN Code (6 Digits)</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 411018"
                      className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm font-mono text-gray-800 placeholder:text-gray-400 outline-none transition-all ${
                        errors.pinCode
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-300 hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      }`}
                      value={form.address.pinCode || ""}
                      onBlur={() => handleBlur("pinCode")}
                      onChange={(e) => handlePinChange(e.target.value)}
                    />
                    {errors.pinCode && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <span>⚠️</span> {errors.pinCode}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.address.country || "India"}
                      onChange={(e) => setAddr("country", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Bank Details */}
              <div className="border-t border-gray-100 pt-4">
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                  4. Bank Account Details (For P.O. Payments)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank Ltd"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.bankDetails.bankName || ""}
                      onChange={(e) => setBank("bankName", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Beneficiary Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Siemens India Industrial Account"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={form.bankDetails.accountName || ""}
                      onChange={(e) => setBank("accountName", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Account Number (9 to 18 Digits)
                    </label>
                    <input
                      type="text"
                      maxLength={18}
                      placeholder="e.g. 50200012345678"
                      className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm font-mono text-gray-800 placeholder:text-gray-400 outline-none transition-all ${
                        errors.accountNumber
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-300 hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      }`}
                      value={form.bankDetails.accountNumber || ""}
                      onBlur={() => handleBlur("accountNumber")}
                      onChange={(e) => handleAccountChange(e.target.value)}
                    />
                    {errors.accountNumber && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <span>⚠️</span> {errors.accountNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      IFSC Code (11 Characters)
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="e.g. HDFC0001234"
                      className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm font-mono uppercase text-gray-800 placeholder:text-gray-400 outline-none transition-all ${
                        errors.ifscCode
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-300 hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                      }`}
                      value={form.bankDetails.ifscCode || ""}
                      onBlur={() => handleBlur("ifscCode")}
                      onChange={(e) => handleIFSCChange(e.target.value)}
                    />
                    {errors.ifscCode && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                        <span>⚠️</span> {errors.ifscCode}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Notes */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Vendor Remarks / Notes <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                  rows={2}
                  placeholder="Special procurement terms, lead time commitments, delivery notes"
                  value={form.notes || ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-xs bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-bold shadow-sm disabled:opacity-60 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving…</span>
                    </>
                  ) : editingId ? (
                    "Update Supplier"
                  ) : (
                    "Create Supplier"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        breadcrumb="Purchase / Suppliers"
        title="Suppliers"
        subtitle="Manage supplier master with contact, GST, and bank details for purchase orders"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 bg-cyan-700 hover:bg-cyan-800 text-white h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>New Supplier</span>
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
        <Kpi label="Total Suppliers" value={suppliers.length} />
        <Kpi label="Active" value={active} tone="success" />
        <div className="col-span-2 sm:col-span-1">
          <Kpi label="Inactive" value={suppliers.length - active} tone="warning" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-200 border-t-cyan-700 rounded-full" />
        </div>
      ) : (
        <DataTable
          rows={suppliers}
          columns={columns}
          searchKeys={["supplierCode", "name", "contactPerson", "gstNumber", "address.city", "phone", "email"]}
        />
      )}
    </>
  );
}
