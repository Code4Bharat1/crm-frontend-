"use client";

import React, { useState, useEffect, useRef } from "react";
import { getCompany, updateCompany, uploadCompanyMedia } from "@/services/documentService";
import { PageHeader } from "@/components/crm-ui";
import { DocumentPrintView } from "@/components/DocumentPrintView";
import {
  Building2,
  Image as ImageIcon,
  FileSignature,
  Stamp,
  MapPin,
  Landmark,
  FileText,
  UploadCloud,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  ExternalLink,
  Info,
  Save,
  Link2
} from "lucide-react";

// ─── STABLE MODULE-LEVEL COMPONENTS (PREVENTS CURSOR LOSS) ────────────────────

function FieldGroup({ title, subtitle, icon: Icon, children, badge }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-gray-800 tracking-wide uppercase">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {badge && (
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FormField({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700 tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder = "", type = "text", disabled = false, id, ...props }) {
  return (
    <input
      id={id}
      type={type}
      disabled={disabled}
      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:text-gray-500"
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  );
}

function TextAreaInput({ value, onChange, placeholder = "", rows = 3, id, ...props }) {
  return (
    <textarea
      id={id}
      rows={rows}
      className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors leading-relaxed"
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  );
}

// Media upload card with drag-and-drop, preview, URL toggle, and remove
function MediaUploadCard({
  title,
  subtitle,
  type,
  value,
  onUpload,
  onRemove,
  onChangeUrl,
  uploading = false,
  icon: Icon = ImageIcon,
  recommendation = "PNG or SVG format (Transparent recommended)"
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState("");

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(type, e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const resolvePreviewUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image")) {
      return url;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api";
    const backendBase = apiBase.replace(/\/api$/, "");
    return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <div className="border border-gray-200 bg-gray-50/50 rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-gray-300">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100/70 text-blue-700 rounded-lg">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">{title}</h4>
              <p className="text-[11px] text-gray-500">{subtitle}</p>
            </div>
          </div>
          {value ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          ) : (
            <span className="text-[11px] text-gray-400 italic">Not set</span>
          )}
        </div>

        {/* Preview or Upload Zone */}
        {value ? (
          <div className="space-y-3">
            <div
              className="relative h-32 w-full rounded-xl border border-gray-200 flex items-center justify-center p-3 overflow-hidden"
              style={{
                backgroundImage: `radial-gradient(#e5e7eb 1px, transparent 1px)`,
                backgroundColor: "#fafafa",
                backgroundSize: "10px 10px",
              }}
            >
              <img
                src={resolvePreviewUrl(value)}
                alt={title}
                className="max-h-full max-w-full object-contain transition-transform hover:scale-105"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${uploading ? "animate-spin" : ""}`} /> Replace
              </button>
              <button
                type="button"
                onClick={() => onRemove(type)}
                disabled={uploading}
                className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[128px] ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-gray-300 hover:border-blue-400 bg-white hover:bg-gray-50"
              }`}
            >
              <UploadCloud className={`w-8 h-8 mb-2 ${isDragging ? "text-blue-600" : "text-gray-400"}`} />
              <p className="text-xs font-semibold text-gray-700">
                {uploading ? "Uploading..." : "Click or drag & drop to upload"}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">PNG, JPG, SVG, WebP (up to 5MB)</p>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" /> {showUrlInput ? "Hide URL input" : "Or enter image URL"}
              </button>
            </div>

            {showUrlInput && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="https://..."
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  className="flex-1 text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tempUrl.trim()) {
                      onChangeUrl(type, tempUrl.trim());
                      setTempUrl("");
                      setShowUrlInput(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                >
                  Set
                </button>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/svg+xml"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onUpload(type, e.target.files[0]);
              e.target.value = "";
            }
          }}
        />
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-start gap-1.5 text-[11px] text-gray-500">
        <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
        <span>{recommendation}</span>
      </div>
    </div>
  );
}

// ─── SAMPLE DOCUMENT DATA FOR LIVE PREVIEW ────────────────────────────────────

const sampleDocData = {
  quotationNo: "QT-2026-0042",
  invoiceNo: "INV-2026-0108",
  date: new Date().toISOString(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  subject: "Supply & Commissioning of Industrial Automation Panel",
  customer: {
    name: "Tata Technologies Limited",
    address: "Plot 25, Hinjewadi Phase 1, Rajiv Gandhi Infotech Park, Pune - 411057",
    gstNumber: "27AAACT2727Q1ZT",
    contactPerson: "Mr. Rajesh Deshmukh",
    phone: "+91 98220 12345",
    email: "procurement@tatatechnologies.com"
  },
  items: [
    {
      description: "PLC Control Panel 415V 50Hz with Touch HMI Interface",
      productCode: "PLC-PANEL-X100",
      hsnCode: "85371000",
      qty: 2,
      unit: "Set",
      rate: 145000,
      discount: 5,
      taxableAmount: 275500,
      gstRate: 18,
      cgst: 24795,
      sgst: 24795,
      totalAmount: 325090
    },
    {
      description: "Industrial Frequency Drive 7.5kW (VFD-AC400)",
      productCode: "VFD-75KW-P",
      hsnCode: "85044090",
      qty: 4,
      unit: "Nos",
      rate: 28500,
      discount: 0,
      taxableAmount: 114000,
      gstRate: 18,
      cgst: 10260,
      sgst: 10260,
      totalAmount: 134520
    }
  ],
  subtotal: 389500,
  totalDiscount: 14500,
  totalCgst: 35055,
  totalSgst: 35055,
  totalIgst: 0,
  roundOff: 0.1,
  grandTotal: 459610,
  amountInWords: "Rupees Four Lakh Fifty-Nine Thousand Six Hundred Ten Only",
  isInterState: false
};

// ─── MAIN PAGE COMPONENT ──────────────────────────────────────────────────────

export default function CompanySettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [activeTab, setActiveTab] = useState("general"); // "general" | "branding" | "banking" | "terms" | "preview"
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    getCompany()
      .then((c) => {
        setForm(c || {});
        setLoading(false);
      })
      .catch((err) => {
        showToast("Failed to load company settings: " + err.message, "error");
        setLoading(false);
      });
  }, []);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setAddr = (field, value) =>
    setForm((prev) => ({
      ...prev,
      address: { ...(prev?.address || {}), [field]: value }
    }));
  const setBank = (field, value) =>
    setForm((prev) => ({
      ...prev,
      bankDetails: { ...(prev?.bankDetails || {}), [field]: value }
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateCompany(form);
      setForm(updated);
      showToast("Company settings saved successfully!");
    } catch (e) {
      showToast(e.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (type, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file (PNG, JPG, SVG, WebP)", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size exceeds 5MB limit", "error");
      return;
    }

    setUploadingField(type);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      const fieldMap = { logo: "logoUrl", signature: "signatureUrl", stamp: "stampUrl" };
      const fieldKey = fieldMap[type] || "logoUrl";

      try {
        const res = await uploadCompanyMedia({ image: base64Data, type });
        if (res && res.url) {
          set(fieldKey, res.url);
          showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
        } else {
          set(fieldKey, base64Data);
          showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} image updated!`);
        }
      } catch (err) {
        // Fallback to base64 encoding if upload endpoint encounters an issue
        set(fieldKey, base64Data);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} saved locally`);
      } finally {
        setUploadingField(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = (type) => {
    const fieldMap = { logo: "logoUrl", signature: "signatureUrl", stamp: "stampUrl" };
    set(fieldMap[type] || "logoUrl", "");
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} removed`);
  };

  const handleSetMediaUrl = (type, url) => {
    const fieldMap = { logo: "logoUrl", signature: "signatureUrl", stamp: "stampUrl" };
    set(fieldMap[type] || "logoUrl", url);
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} URL set!`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        <span className="text-sm font-medium text-gray-500">Loading company settings...</span>
      </div>
    );
  }

  if (!form) return null;

  return (
    <>
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-xl shadow-2xl text-white text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200 ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            breadcrumb="Settings / Company"
            title="Company Settings"
            subtitle="Configure company identity, registered address, tax details, branding media, bank accounts, and print letterhead."
          />
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all disabled:opacity-60 text-sm active:scale-95"
            >
              <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
              {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
          {[
            { id: "general", label: "Profile & Address", icon: Building2 },
            { id: "branding", label: "Logo, Sign & Stamp", icon: ImageIcon, badge: (form.logoUrl && form.signatureUrl && form.stampUrl) ? "All Set" : null },
            { id: "banking", label: "Bank & Payments", icon: Landmark },
            { id: "terms", label: "Signatory & Terms", icon: FileText },
            { id: "preview", label: "Live Document Preview", icon: Eye, highlight: true }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? tab.highlight
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-blue-600 text-white shadow-sm"
                    : tab.highlight
                    ? "text-purple-600 bg-purple-50 hover:bg-purple-100"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-emerald-500 text-white rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── TAB: GENERAL (PROFILE, TAX, ADDRESS) ───────────────────────── */}
        {activeTab === "general" && (
          <div className="space-y-6 max-w-4xl">
            <FieldGroup
              title="Company Identity"
              subtitle="Basic organisation details that appear on the letterhead header"
              icon={Building2}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <FormField label="Company Legal Name" required hint="Used on all invoices & legal documents">
                    <TextInput
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Nexcore Alliance Pvt. Ltd."
                    />
                  </FormField>
                </div>
                <FormField label="Tagline / Business Line">
                  <TextInput
                    value={form.tagline}
                    onChange={(e) => set("tagline", e.target.value)}
                    placeholder="e.g. Automation & Industrial Solutions"
                  />
                </FormField>
                <FormField label="Official Phone">
                  <TextInput
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+91 20 1234 5678"
                  />
                </FormField>
                <FormField label="Official Email">
                  <TextInput
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="billing@nexcorealliance.com"
                  />
                </FormField>
                <FormField label="Website">
                  <TextInput
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                    placeholder="www.nexcorealliance.com"
                  />
                </FormField>
              </div>
            </FieldGroup>

            <FieldGroup
              title="Tax & Corporate Identifiers"
              subtitle="Statutory registrations displayed on invoices, quotations and delivery notes"
              icon={FileText}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormField label="GSTIN (GST Number)" hint="15 characters">
                  <TextInput
                    value={form.gstNumber}
                    onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
                    placeholder="27AABCN1234A1Z5"
                  />
                </FormField>
                <FormField label="PAN Number" hint="10 characters">
                  <TextInput
                    value={form.panNumber}
                    onChange={(e) => set("panNumber", e.target.value.toUpperCase())}
                    placeholder="AABCN1234A"
                  />
                </FormField>
                <FormField label="CIN Number (Corporate ID)" hint="21 alphanumeric">
                  <TextInput
                    value={form.cinNumber}
                    onChange={(e) => set("cinNumber", e.target.value.toUpperCase())}
                    placeholder="U72900MH2020PTC123456"
                  />
                </FormField>
              </div>
            </FieldGroup>

            <FieldGroup
              title="Registered & Operational Address"
              subtitle="Printed under the company letterhead across all generated PDFs"
              icon={MapPin}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <FormField label="Address Line 1" required>
                    <TextInput
                      value={form.address?.line1}
                      onChange={(e) => setAddr("line1", e.target.value)}
                      placeholder="e.g. 123, Industrial Area, Phase II"
                    />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Address Line 2">
                    <TextInput
                      value={form.address?.line2}
                      onChange={(e) => setAddr("line2", e.target.value)}
                      placeholder="e.g. Bhosari MIDC, Pune - 411026"
                    />
                  </FormField>
                </div>
                <FormField label="City">
                  <TextInput
                    value={form.address?.city}
                    onChange={(e) => setAddr("city", e.target.value)}
                    placeholder="Pune"
                  />
                </FormField>
                <FormField label="State">
                  <TextInput
                    value={form.address?.state}
                    onChange={(e) => setAddr("state", e.target.value)}
                    placeholder="Maharashtra"
                  />
                </FormField>
                <FormField label="PIN Code">
                  <TextInput
                    value={form.address?.pinCode}
                    onChange={(e) => setAddr("pinCode", e.target.value)}
                    placeholder="411026"
                  />
                </FormField>
                <FormField label="Country">
                  <TextInput
                    value={form.address?.country}
                    onChange={(e) => setAddr("country", e.target.value)}
                    placeholder="India"
                  />
                </FormField>
              </div>
            </FieldGroup>
          </div>
        )}

        {/* ─── TAB: BRANDING (LOGO, SIGN, STAMP) ───────────────────────────── */}
        {activeTab === "branding" && (
          <div className="space-y-6 max-w-4xl">
            <FieldGroup
              title="Branding & Media Assets"
              subtitle="Upload high-resolution graphics for the letterhead logo, digital signature, and company stamp"
              icon={ImageIcon}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MediaUploadCard
                  title="Company Logo"
                  subtitle="Top Letterhead"
                  type="logo"
                  value={form.logoUrl}
                  onUpload={handleFileUpload}
                  onRemove={handleRemoveMedia}
                  onChangeUrl={handleSetMediaUrl}
                  uploading={uploadingField === "logo"}
                  icon={ImageIcon}
                  recommendation="Recommended: Transparent PNG, approx 300 × 120 px. Displayed at the top-left of letterhead."
                />

                <MediaUploadCard
                  title="Authorised Signature"
                  subtitle="Document Sign-off"
                  type="signature"
                  value={form.signatureUrl}
                  onUpload={handleFileUpload}
                  onRemove={handleRemoveMedia}
                  onChangeUrl={handleSetMediaUrl}
                  uploading={uploadingField === "signature"}
                  icon={FileSignature}
                  recommendation="Recommended: Clear cropped signature on transparent or white background, approx 300 × 120 px."
                />

                <MediaUploadCard
                  title="Company Official Stamp"
                  subtitle="Seal & Verification"
                  type="stamp"
                  value={form.stampUrl}
                  onUpload={handleFileUpload}
                  onRemove={handleRemoveMedia}
                  onChangeUrl={handleSetMediaUrl}
                  uploading={uploadingField === "stamp"}
                  icon={Stamp}
                  recommendation="Recommended: Circular or rectangular official seal PNG with transparent background."
                />
              </div>
            </FieldGroup>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-blue-900">How do these graphics appear on documents?</h4>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                  The <strong>Company Logo</strong> appears on the top-left of the letterhead header alongside your registered name and address.
                  The <strong>Official Stamp</strong> and <strong>Authorised Signature</strong> are rendered together at the bottom right of Quotations,
                  Proforma Invoices, Sales Orders, Delivery Notes, and Tax Invoices right above the <em>Authorised Signatory</em> line.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
                  >
                    Switch to Live Document Preview →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: BANKING & PAYMENTS ────────────────────────────────────── */}
        {activeTab === "banking" && (
          <div className="space-y-6 max-w-4xl">
            <FieldGroup
              title="Bank & Payment Details"
              subtitle="Printed on Sales Invoices, Proformas, and Quotations for client remittances"
              icon={Landmark}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField label="Bank Name" required>
                  <TextInput
                    value={form.bankDetails?.bankName}
                    onChange={(e) => setBank("bankName", e.target.value)}
                    placeholder="e.g. HDFC Bank Ltd."
                  />
                </FormField>
                <FormField label="Branch">
                  <TextInput
                    value={form.bankDetails?.branch}
                    onChange={(e) => setBank("branch", e.target.value)}
                    placeholder="e.g. Bhosari, Pune"
                  />
                </FormField>
                <FormField label="Beneficiary Account Name" required>
                  <TextInput
                    value={form.bankDetails?.accountName}
                    onChange={(e) => setBank("accountName", e.target.value)}
                    placeholder="e.g. Nexcore Alliance Pvt. Ltd."
                  />
                </FormField>
                <FormField label="Account Number" required>
                  <TextInput
                    value={form.bankDetails?.accountNumber}
                    onChange={(e) => setBank("accountNumber", e.target.value)}
                    placeholder="e.g. 50100123456789"
                  />
                </FormField>
                <FormField label="IFSC Code" required hint="11 characters">
                  <TextInput
                    value={form.bankDetails?.ifscCode}
                    onChange={(e) => setBank("ifscCode", e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                  />
                </FormField>
                <FormField label="SWIFT / BIC Code" hint="For international transfers">
                  <TextInput
                    value={form.bankDetails?.swiftCode}
                    onChange={(e) => setBank("swiftCode", e.target.value.toUpperCase())}
                    placeholder="HDFCINBBXXX"
                  />
                </FormField>
                <div className="md:col-span-2">
                  <FormField label="UPI ID / VPA" hint="For instant UPI payments">
                    <TextInput
                      value={form.bankDetails?.upiId}
                      onChange={(e) => setBank("upiId", e.target.value)}
                      placeholder="e.g. nexcorealliance@hdfcbank"
                    />
                  </FormField>
                </div>
              </div>
            </FieldGroup>
          </div>
        )}

        {/* ─── TAB: TERMS & DOCUMENT FOOTER ───────────────────────────────── */}
        {activeTab === "terms" && (
          <div className="space-y-6 max-w-4xl">
            <FieldGroup
              title="Signatory & Legal Text"
              subtitle="Configured text printed at the bottom and signature block of every document"
              icon={FileText}
            >
              <div className="space-y-5">
                <FormField
                  label="Authorised Signatory Entity Line"
                  hint="Printed above the signature and stamp in document sign-off"
                >
                  <TextInput
                    value={form.signatureText}
                    onChange={(e) => set("signatureText", e.target.value)}
                    placeholder="e.g. For Nexcore Alliance Pvt. Ltd."
                  />
                </FormField>

                <FormField
                  label="Footer Note"
                  hint="Printed at the very bottom bar of every printed document page"
                >
                  <TextAreaInput
                    rows={2}
                    value={form.footerNote}
                    onChange={(e) => set("footerNote", e.target.value)}
                    placeholder="This is a computer generated document. No physical signature required."
                  />
                </FormField>

                <FormField
                  label="Default Terms & Conditions"
                  hint="Pre-filled on all newly generated Quotations, Proformas, Orders, and Invoices"
                >
                  <TextAreaInput
                    rows={6}
                    value={form.termsAndConditions}
                    onChange={(e) => set("termsAndConditions", e.target.value)}
                    placeholder={"1. Payment due within 30 days of invoice date.\n2. Goods once sold will not be taken back.\n3. Subject to Pune jurisdiction."}
                  />
                </FormField>
              </div>
            </FieldGroup>
          </div>
        )}

        {/* ─── TAB: LIVE DOCUMENT PREVIEW ─────────────────────────────────── */}
        {activeTab === "preview" && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 text-white rounded-xl">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-purple-950">Live Letterhead Document Preview</h4>
                  <p className="text-xs text-purple-700">
                    This interactive preview uses your live company settings, logo, stamp, signature, bank info, and address.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>

            <div className="border border-gray-300 rounded-2xl overflow-hidden shadow-lg bg-gray-100 p-4">
              <DocumentPrintView
                doc={sampleDocData}
                type="Sales Invoice"
                company={form}
                onClose={() => setActiveTab("general")}
              />
            </div>
          </div>
        )}

        {/* Bottom Save bar */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 max-w-4xl">
          <div className="text-xs text-gray-500">
            {saving ? "Saving changes to database..." : "Make sure to click Save to persist any modifications."}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all disabled:opacity-60 text-sm active:scale-95"
          >
            <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
            {saving ? "Saving Changes..." : "Save Company Settings"}
          </button>
        </div>
      </div>
    </>
  );
}
