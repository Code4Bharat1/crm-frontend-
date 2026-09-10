"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getProducts, createProduct, updateProduct, deleteProduct, adjustProductStock,
  getProductCategories, createProductCategory, deleteProductCategory,
  getSuppliers, fmtINR
} from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";

const DEFAULT_CATEGORIES = ["Automation", "Switchgear", "Motors", "Sensors", "Cables", "Drives", "Pneumatics", "General"];
const UNITS = ["Nos", "Pcs", "Set", "Pair", "Box", "Kg", "Mtr", "Ltr", "Roll", "Lot"];
const GST_RATES = [0, 5, 12, 18, 28];

const emptyForm = {
  itemCode: "",
  name: "",
  description: "",
  category: "Automation",
  brand: "",
  hsnCode: "8537",
  unit: "Nos",
  price: "",
  costPrice: "",
  gstRate: 18,
  stock: "",
  minStock: "",
  location: "Main Warehouse - Bay 1",
  supplier: { id: "", name: "" },
  warrantyMonths: "",
  serialTracked: false,
  status: "Active",
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustData, setAdjustData] = useState({ delta: "", reason: "Manual Stock Adjustment" });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, sups, cats] = await Promise.all([
        getProducts().catch(() => []),
        getSuppliers().catch(() => []),
        getProductCategories().catch(() => []),
      ]);
      const prodsList = Array.isArray(prods) ? prods : [];
      setProducts(prodsList);
      setSuppliers(Array.isArray(sups) ? sups : []);

      const catNamesFromDb = Array.isArray(cats)
        ? cats.map(c => (typeof c === "string" ? c : c.name)).filter(Boolean)
        : [];
      const catNamesFromProducts = prodsList.map(p => p.category).filter(Boolean);
      const mergedCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...catNamesFromDb, ...catNamesFromProducts]));
      setCategories(mergedCategories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("action") === "create" || p.get("create") === "true") {
        openCreate();
      } else if (p.get("action") === "add-category" || p.get("category") === "true") {
        setShowCategoryModal(true);
      }
    }
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      ...emptyForm,
      ...p,
      price: p.price !== undefined && p.price !== null ? p.price : "",
      costPrice: p.costPrice !== undefined && p.costPrice !== null ? p.costPrice : "",
      stock: p.stock !== undefined && p.stock !== null ? p.stock : "",
      minStock: p.minStock !== undefined && p.minStock !== null ? p.minStock : "",
      warrantyMonths: p.warrantyMonths !== undefined && p.warrantyMonths !== null ? p.warrantyMonths : "",
      supplier: {
        id: p.supplier?.id || "",
        name: p.supplier?.name || (typeof p.supplier === "string" ? p.supplier : ""),
      },
    });
    setEditingId(p.itemCode || p._id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.name) return showToast("Product Name is required", "error");
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        costPrice: Number(form.costPrice) || 0,
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
        gstRate: Number(form.gstRate) ?? 18,
        warrantyMonths: Number(form.warrantyMonths) || 12,
        supplier: {
          id: form.supplier?.id || "",
          name: form.supplier?.name || "",
        },
      };
      if (editingId) {
        await updateProduct(editingId, payload);
        showToast("Product updated successfully");
      } else {
        await createProduct(payload);
        showToast("Product created successfully");
      }
      setShowForm(false);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      showToast("Product deleted");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleAddCategory = async (e) => {
    e?.preventDefault();
    const trimmed = categoryForm.name?.trim();
    if (!trimmed) return showToast("Category name is required", "error");
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      return showToast(`Category "${trimmed}" already exists`, "error");
    }
    setSavingCategory(true);
    try {
      await createProductCategory({ name: trimmed, description: categoryForm.description });
      setCategories(prev => [...prev, trimmed]);
      setForm(f => ({ ...f, category: trimmed }));
      showToast(`Category "${trimmed}" added successfully`);
      setCategoryForm({ name: "", description: "" });
      setShowCategoryModal(false);
    } catch (err) {
      showToast(err.message || "Failed to add category", "error");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (catName) => {
    if (DEFAULT_CATEGORIES.includes(catName)) {
      return showToast("Cannot delete system default categories", "error");
    }
    const inUseCount = products.filter(p => p.category?.toLowerCase() === catName.toLowerCase()).length;
    if (inUseCount > 0) {
      return showToast(`Cannot delete: ${inUseCount} product(s) currently use "${catName}"`, "error");
    }
    if (!confirm(`Delete category "${catName}"?`)) return;
    try {
      await deleteProductCategory(catName);
      setCategories(prev => prev.filter(c => c !== catName));
      if (selectedCategory === catName) setSelectedCategory("All");
      showToast(`Category "${catName}" removed`);
    } catch (err) {
      showToast(err.message || "Failed to delete category", "error");
    }
  };

  const handleAdjustStock = async (e) => {
    e?.preventDefault();
    if (!adjustModal) return;
    try {
      await adjustProductStock(adjustModal.itemCode || adjustModal._id, {
        delta: Number(adjustData.delta) || 0,
        reason: adjustData.reason,
      });
      showToast(`Stock updated for ${adjustModal.name}`);
      setAdjustModal(null);
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const filteredProducts = selectedCategory === "All"
    ? products
    : products.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());

  const totalValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const serialTrackedCount = products.filter(p => p.serialTracked).length;

  const columns = [
    {
      header: "Item Code / SKU",
      cell: (r) => <span className="font-mono text-xs font-bold text-blue-600">{r.itemCode}</span>,
    },
    {
      header: "Product Name",
      cell: (r) => (
        <div>
          <div className="font-semibold text-gray-900">{r.name}</div>
          {r.description && <div className="text-[11px] text-gray-400 line-clamp-1">{r.description}</div>}
        </div>
      ),
    },
    {
      header: "Category",
      cell: (r) => <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium">{r.category}</span>,
    },
    { header: "Brand", cell: (r) => r.brand || "—" },
    {
      header: "Supplier",
      cell: (r) => (
        <span className="text-xs font-medium text-gray-700">
          {r.supplier?.name || (typeof r.supplier === "string" ? r.supplier : "—")}
        </span>
      ),
    },
    {
      header: "HSN",
      cell: (r) => <span className="font-mono text-xs text-gray-600">{r.hsnCode}</span>,
    },
    {
      header: "Price",
      cell: (r) => <span className="font-bold text-gray-900">{fmtINR(r.price)}</span>,
    },
    {
      header: "GST",
      cell: (r) => <span className="text-xs font-semibold text-gray-600">{r.gstRate}%</span>,
    },
    {
      header: "Stock",
      cell: (r) => (
        <span
          className={`font-bold px-2 py-0.5 rounded text-xs ${
            r.stock === 0
              ? "bg-red-100 text-red-700"
              : r.stock <= r.minStock
              ? "bg-amber-100 text-amber-800"
              : "bg-green-50 text-green-700"
          }`}
        >
          {r.stock} {r.unit}
        </span>
      ),
    },
    {
      header: "Serial",
      cell: (r) => <StatusBadge value={r.serialTracked ? "Tracked" : "Not tracked"} />,
    },
    {
      header: "Actions",
      cell: (r) => (
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            onClick={() => {
              setAdjustModal(r);
              setAdjustData({ delta: 0, reason: "Manual Stock Adjustment" });
            }}
            className="px-2 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 rounded font-medium transition-colors"
            title="Adjust Stock Quantity"
          >
            ± Stock
          </button>
          <button
            onClick={() => openEdit(r)}
            className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-medium transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(r.itemCode || r._id)}
            className="px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-red-600 rounded font-medium transition-colors"
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
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border animate-in fade-in zoom-in duration-150">
            <h3 className="font-bold text-lg text-gray-900 mb-1">Adjust Product Stock</h3>
            <p className="text-xs text-gray-500 mb-4">
              {adjustModal.name} · Current Stock: <strong className="text-blue-600 font-bold">{adjustModal.stock} {adjustModal.unit}</strong>
            </p>
            <form onSubmit={handleAdjustStock} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity to Add (+) or Deduct (-)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. +10 or -5"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  value={adjustData.delta}
                  onChange={e => setAdjustData(d => ({ ...d, delta: e.target.value }))}
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  New stock will be: {Math.max(0, (adjustModal.stock || 0) + (Number(adjustData.delta) || 0))} {adjustModal.unit}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory count correction"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={adjustData.reason}
                  onChange={e => setAdjustData(d => ({ ...d, reason: e.target.value }))}
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModal(null)}
                  className="flex-1 border rounded-lg py-2 text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-2 text-xs font-bold shadow"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border my-auto">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-bold text-lg text-gray-900">
                {editingId ? "Edit Product" : "Add New Product to Master"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siemens V20 VFD Drive 5.5kW"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty (e.g. PRD-001)"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    value={form.itemCode}
                    onChange={e => setForm(f => ({ ...f, itemCode: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Brand / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Siemens, Schneider, ABB, L&T"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  />
                </div>

                {/* Supplier Sourcing */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier / Sourced From</label>
                  {suppliers.length > 0 && (
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 mb-1.5"
                      value={form.supplier?.id || suppliers.find(s => s.name === form.supplier?.name)?._id || suppliers.find(s => s.name === form.supplier?.name)?.supplierNo || ""}
                      onChange={e => {
                        const supId = e.target.value;
                        const s = suppliers.find(s => s._id === supId || s.supplierNo === supId);
                        if (s) {
                          setForm(f => ({ ...f, supplier: { id: s.supplierNo || s._id, name: s.name } }));
                        } else {
                          setForm(f => ({ ...f, supplier: { id: "", name: "" } }));
                        }
                      }}
                    >
                      <option value="">Select from Supplier Master…</option>
                      {suppliers.map(s => (
                        <option key={s._id || s.supplierNo} value={s._id || s.supplierNo}>
                          {s.name} ({s.supplierNo || "SUP"})
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="Supplier name"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.supplier?.name || ""}
                    onChange={e => setForm(f => ({ ...f, supplier: { ...f.supplier, name: e.target.value } }))}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">HSN Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8537"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    value={form.hsnCode}
                    onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit of Measurement</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  >
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="Unit selling price"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-gray-900"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Cost price"
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700"
                    value={form.costPrice}
                    onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GST Tax Rate</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                    value={form.gstRate}
                    onChange={e => setForm(f => ({ ...f, gstRate: Number(e.target.value) }))}
                  >
                    {GST_RATES.map(r => <option key={r} value={r}>{r}% GST</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Warehouse Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Warehouse A - Bay 3"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-blue-600"
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Minimum Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5"
                    className="w-full border rounded-lg px-3 py-2 text-sm text-amber-700"
                    value={form.minStock}
                    onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Warranty (Months)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="12"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.warrantyMonths}
                    onChange={e => setForm(f => ({ ...f, warrantyMonths: e.target.value }))}
                  />
                </div>

                <div className="col-span-2 flex items-center pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-blue-600"
                      checked={form.serialTracked}
                      onChange={e => setForm(f => ({ ...f, serialTracked: e.target.checked }))}
                    />
                    <span className="text-xs font-semibold text-gray-700">Track Individual Serial Numbers</span>
                  </label>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Technical Specs</label>
                  <textarea
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Technical specifications, features, model details"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-medium border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow disabled:opacity-60"
                >
                  {saving ? "Saving…" : editingId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Manage Categories</h3>
                  <p className="text-xs text-gray-500">Create new product category or inspect catalog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowCategoryModal(false); setCategoryForm({ name: "", description: "" }); }}
                className="text-gray-400 hover:text-gray-600 text-lg p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instrumentation, Robotics, Hydraulics"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief notes about products in this category"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={categoryForm.description}
                  onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCategoryModal(false); setCategoryForm({ name: "", description: "" }); }}
                  className="flex-1 border rounded-lg py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !categoryForm.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {savingCategory ? "Adding…" : "+ Add Category"}
                </button>
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="mt-5 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Existing Categories ({categories.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {categories.map(cat => {
                  const count = products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
                  const isDefault = DEFAULT_CATEGORIES.includes(cat);
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                    >
                      <span>{cat}</span>
                      <span className="text-[10px] text-gray-500 font-bold bg-white px-1.5 py-0.2 rounded-full border border-gray-200">
                        {count}
                      </span>
                      {!isDefault && count === 0 && (
                        <button
                          type="button"
                          title="Delete unused category"
                          onClick={() => handleDeleteCategory(cat)}
                          className="hover:text-red-600 text-gray-400 transition-colors ml-0.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        breadcrumb="Products & Inventory / Product Master"
        title="Product Master"
        subtitle="Central catalog with SKU, HSN codes, GST rates, supplier sourcing, stock levels, warehouse locations and serial tracking"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              + Add Category
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              + Add Product
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Products" value={products.length} sub="In catalog" />
        <Kpi label="Stock Value" value={fmtINR(totalValue)} tone="success" sub="Selling valuation" />
        <Kpi label="Low Stock Alerts" value={lowStockCount} tone="danger" sub="Below minimum threshold" />
        <Kpi label="Serial Tracked" value={serialTrackedCount} tone="accent" sub="Units with serial numbers" />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
        {["All", ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {cat} {cat !== "All" && `(${products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length})`}
          </button>
        ))}
      </div>

      <div className="mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          </div>
        ) : (
          <DataTable
            rows={filteredProducts}
            columns={columns}
            searchKeys={["itemCode", "name", "category", "brand", "supplier.name", "hsnCode", "location"]}
          />
        )}
      </div>
    </>
  );
}
