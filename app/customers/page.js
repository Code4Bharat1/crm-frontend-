"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/services/documentService";
import { getEmployees } from "@/services/employeeService";
import { DataTable, Kpi, PageHeader, StatusBadge, Field } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inrShort } from "@/lib/crm-data";

const emptyForm = {
  name: "",
  type: "End User",
  status: "Active",
  industry: "Industrial Automation",
  area: "",
  salesPerson: "",
  contactPerson: { name: "", phone: "", email: "", designation: "" },
  address: { street: "", city: "Pune", state: "Maharashtra", pinCode: "", country: "India" },
  gstNumber: "",
  panNumber: "",
  paymentTerms: "30 Days Net",
  creditLimit: 0,
  notes: "",
};

const TYPES = ["OEM", "End User", "System Integrator", "EPC", "Trader"];
const INDUSTRIES = ["Automotive", "Industrial Automation", "Robotics", "Packaging", "Pharma", "Food & Beverage", "Engineering", "Electronics", "Other"];
const PAYMENT_TERMS = ["Immediate", "7 Days Net", "15 Days Net", "30 Days Net", "45 Days Net", "60 Days Net"];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [createdCustomerModal, setCreatedCustomerModal] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getEmployees({ limit: 100 })
      .then((res) => setEmployees(res?.data?.employees || res?.employees || (Array.isArray(res) ? res : [])))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (c) => {
    setForm({
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
        city: c.address?.city || "Pune",
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
    setEditingId(c.id || c._id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) {
      return showToast("Customer Name is required", "error");
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateCustomer(editingId, form);
        showToast("Customer updated successfully!");
        setShowModal(false);
        load();
      } else {
        const created = await createCustomer(form);
        showToast(`Customer ${created.name} (${created.id}) created!`);
        setShowModal(false);
        setCreatedCustomerModal(created);
        load();
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return;
    try {
      await deleteCustomer(id);
      showToast("Customer deleted");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const setContact = (field, val) => setForm(f => ({ ...f, contactPerson: { ...f.contactPerson, [field]: val } }));
  const setAddr = (field, val) => setForm(f => ({ ...f, address: { ...f.address, [field]: val } }));

  const columns = [
    {
      header: "Customer",
      cell: (c) => (
        <div>
          <Link href={`/customers/${c.id || c._id}`} className="font-bold text-primary hover:underline text-sm">
            {c.name}
          </Link>
          <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
            <span className="font-mono font-medium text-blue-600">{c.id}</span>
            <span>·</span>
            <span>{c.industry || c.type}</span>
            {c.gstNumber && (
              <>
                <span>·</span>
                <span className="font-mono text-gray-400">{c.gstNumber}</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Contact Person",
      cell: (c) => (
        <div className="text-xs">
          <div className="font-medium text-gray-800">{c.contactPerson?.name || "—"}</div>
          {c.contactPerson?.phone && <div className="text-gray-500">📞 {c.contactPerson.phone}</div>}
          {c.contactPerson?.email && <div className="text-gray-400">✉ {c.contactPerson.email}</div>}
        </div>
      ),
    },
    { header: "Area / City", cell: (c) => c.area || c.address?.city || "—" },
    { header: "Type", cell: (c) => <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 rounded-md">{c.type}</span> },
    { header: "Status", cell: (c) => <StatusBadge value={c.status} /> },
    { header: "Total Sales", cell: (c) => <span className="font-semibold">{inrShort(c.totalRevenue)}</span> },
    { header: "Outstanding", cell: (c) => <span className={c.outstanding > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>{inrShort(c.outstanding)}</span> },
    {
      header: "Actions",
      cell: (c) => (
        <div className="flex gap-1.5 flex-wrap">
          <Link
            href={`/quotations?customerId=${c._id || c.id}&customerName=${encodeURIComponent(c.name)}`}
            className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors inline-flex items-center gap-1 shadow-sm"
          >
            + Quotation
          </Link>
          <button
            onClick={() => openEdit(c)}
            className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            Edit
          </button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
            <Link href={`/customers/${c.id || c._id}`}>360°</Link>
          </Button>
          <button
            onClick={() => handleDelete(c.id || c._id, c.name)}
            className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            Del
          </button>
        </div>
      ),
    },
  ];

  const totalOutstanding = customers.reduce((s, c) => s + (c.outstanding || 0), 0);
  const activeCount = customers.filter(c => c.status === "Active").length;

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all flex items-center gap-2 ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Post-Creation Action Modal */}
      {createdCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border text-center animate-in fade-in zoom-in duration-150">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
              ✓
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Customer Created Successfully!</h3>
            <p className="text-sm text-gray-600 mb-6">
              <strong>{createdCustomerModal.name}</strong> has been saved to the database with Code:{" "}
              <span className="font-mono font-bold text-blue-600">{createdCustomerModal.id}</span>.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                href={`/quotations?customerId=${createdCustomerModal._id || createdCustomerModal.id}&customerName=${encodeURIComponent(createdCustomerModal.name)}`}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow transition-all flex items-center justify-center gap-2"
              >
                📝 Make Quotation for this Customer Now
              </Link>
              <button
                onClick={() => setCreatedCustomerModal(null)}
                className="w-full py-2 px-4 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Close & View All Customers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 bg-black/60 overflow-y-auto py-6 flex items-start justify-center px-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div>
                <h2 className="text-lg font-bold">{editingId ? "Edit Customer Record" : "Add New Customer"}</h2>
                <p className="text-xs text-blue-100">
                  {editingId ? "Update details in MongoDB" : "Register a customer to immediately generate Quotations & Orders"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-base transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* 1. Basic Details */}
              <div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">1. Business Identity</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bharat Forge Ltd / Acme Automation"
                      className="w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Customer Type</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    >
                      {TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Industry Sector</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.industry}
                      onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    >
                      {INDUSTRIES.map((ind) => (
                        <option key={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">GST Number</label>
                    <input
                      type="text"
                      placeholder="27AABCN1234F1Z5"
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.gstNumber}
                      onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      placeholder="AABCN1234F"
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.panNumber}
                      onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="Active">Active</option>
                      <option value="Lead">Lead</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Salesperson</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.salesPerson}
                      onChange={(e) => setForm((f) => ({ ...f, salesPerson: e.target.value }))}
                    >
                      <option value="">
                        {employees.length > 0 ? "-- Select Salesperson --" : "No employees yet -- add one in HR first"}
                      </option>
                      {employees.map((emp) => (
                        <option key={emp._id || emp.employeeCode} value={emp.fullName}>
                          {emp.fullName} {emp.role ? `(${emp.role})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Primary Contact */}
              <div className="border-t pt-4">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">2. Primary Contact Person</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Patil"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.contactPerson.name}
                      onChange={(e) => setContact("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Purchase Manager"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.contactPerson.designation}
                      onChange={(e) => setContact("designation", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone / Mobile</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.contactPerson.phone}
                      onChange={(e) => setContact("phone", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="rajesh@company.com"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.contactPerson.email}
                      onChange={(e) => setContact("email", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Address & Location */}
              <div className="border-t pt-4">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">3. Billing & Works Address</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Street / Factory Address</label>
                    <input
                      type="text"
                      placeholder="Plot No. G-12, Sector 10, MIDC Industrial Area"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.address.street}
                      onChange={(e) => setAddr("street", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Area / Industrial Zone</label>
                    <input
                      type="text"
                      placeholder="e.g. Chakan MIDC / Bhosari"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.area}
                      onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="Pune"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.address.city}
                      onChange={(e) => setAddr("city", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">State (Controls CGST/SGST vs IGST)</label>
                    <input
                      type="text"
                      placeholder="Maharashtra"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.address.state}
                      onChange={(e) => setAddr("state", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PIN Code</label>
                    <input
                      type="text"
                      placeholder="410501"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.address.pinCode}
                      onChange={(e) => setAddr("pinCode", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Commercial Terms */}
              <div className="border-t pt-4">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">4. Commercial Terms</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Default Payment Terms</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.paymentTerms}
                      onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                    >
                      {PAYMENT_TERMS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Credit Limit (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.creditLimit}
                      onChange={(e) => setForm((f) => ({ ...f, creditLimit: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium border rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header with Functional Add Customer Button */}
      <PageHeader
        breadcrumb="CRM / Customers"
        title="Customer Master"
        subtitle="Manage customer database, contacts, GST profiles, and generate quotations instantly"
        actions={
          <Button
            onClick={openCreate}
            className="bg-accent font-bold text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-lg transition-all"
          >
            + Add customer
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Customers" value={customers.length} sub="Active master records" />
        <Kpi label="Active Customers" value={activeCount} tone="success" />
        <Kpi label="Total Outstanding" value={inrShort(totalOutstanding)} tone="danger" />
        <Kpi label="Customer Types" value={new Set(customers.map(c => c.type).filter(Boolean)).size} tone="accent" />
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          </div>
        ) : (
          <DataTable
            rows={customers}
            columns={columns}
            searchKeys={["name", "id", "area", "salesPerson", "industry", "contactPerson.name", "gstNumber"]}
          />
        )}
      </div>
    </>
  );
}
