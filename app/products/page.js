"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  Layers,
  Boxes,
  Barcode,
  SlidersHorizontal,
  Pencil,
  Trash2,
  Plus,
  Factory,
  TrendingUp,
  AlertTriangle,
  Search,
  Download
} from "lucide-react";
import {
  getProducts, createProduct, updateProduct, deleteProduct, adjustProductStock,
  getProductCategories, createProductCategory, deleteProductCategory,
  getSuppliers, fmtINR
} from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [mobileSearch, setMobileSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustData, setAdjustData] = useState({ mode: "add", qty: "", reason: "Manual Stock Adjustment" });
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

      let localCustom = [];
      if (typeof window !== "undefined") {
        try {
          localCustom = JSON.parse(localStorage.getItem("crm_custom_categories") || "[]");
        } catch { /* ignore */ }
      }

      const catNamesFromDb = Array.isArray(cats)
        ? cats.map(c => (typeof c === "string" ? c : c.name)).filter(Boolean)
        : [];
      const catNamesFromProducts = prodsList.map(p => p.category).filter(Boolean);
      const mergedCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...catNamesFromDb, ...localCustom, ...catNamesFromProducts]));
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
        price: Math.max(0, Number(form.price) || 0),
        costPrice: Math.max(0, Number(form.costPrice) || 0),
        stock: Math.max(0, Number(form.stock) || 0),
        minStock: Math.max(0, Number(form.minStock) || 0),
        gstRate: Number(form.gstRate) ?? 18,
        warrantyMonths: Math.max(0, Number(form.warrantyMonths) || 12),
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
      setCategories(prev => Array.from(new Set([...prev, trimmed])));
      setForm(f => ({ ...f, category: trimmed }));
      showToast(`Category "${trimmed}" added successfully`);
      setCategoryForm({ name: "", description: "" });
      setShowCategoryModal(false);
    } catch (err) {
      console.warn("Backend category sync note:", err);
      // Resilient local persistence so users are never blocked even during live deployments
      setCategories(prev => Array.from(new Set([...prev, trimmed])));
      setForm(f => ({ ...f, category: trimmed }));
      try {
        const local = JSON.parse(localStorage.getItem("crm_custom_categories") || "[]");
        localStorage.setItem("crm_custom_categories", JSON.stringify(Array.from(new Set([...local, trimmed]))));
      } catch { /* ignore */ }
      showToast(`Category "${trimmed}" added (saved locally)`, "warning");
      setCategoryForm({ name: "", description: "" });
      setShowCategoryModal(false);
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
    } catch { /* ignore if not in backend */ }
    setCategories(prev => prev.filter(c => c !== catName));
    if (selectedCategory === catName) setSelectedCategory("All");
    try {
      const local = JSON.parse(localStorage.getItem("crm_custom_categories") || "[]");
      localStorage.setItem("crm_custom_categories", JSON.stringify(local.filter(c => c !== catName)));
    } catch { /* ignore */ }
    showToast(`Category "${catName}" removed`);
  };

  const handleAdjustStock = async (e) => {
    e?.preventDefault();
    if (!adjustModal) return;
    const currentStock = Math.max(0, Number(adjustModal.stock) || 0);
    const qtyNum = Math.max(0, Number(adjustData.qty) || 0);
    if (qtyNum <= 0) {
      showToast("Please enter a valid quantity greater than 0", "error");
      return;
    }
    const delta = adjustData.mode === "deduct" ? -qtyNum : qtyNum;
    const resultingStock = currentStock + delta;
    if (resultingStock < 0) {
      showToast(`Stock cannot be negative. Max deduction allowed is ${currentStock} ${adjustModal.unit || "Nos"}`, "error");
      return;
    }
    try {
      await adjustProductStock(adjustModal.itemCode || adjustModal._id, {
        delta,
        reason: adjustData.reason || (adjustData.mode === "add" ? "Stock Inward" : "Stock Outward"),
      });
      showToast(`Stock ${adjustData.mode === "add" ? "increased" : "reduced"} for ${adjustModal.name}`);
      setAdjustModal(null);
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const filteredProducts = selectedCategory === "All"
    ? products
    : products.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());

  const displayedMobileProducts = useMemo(() => {
    if (!mobileSearch.trim()) return filteredProducts;
    const terms = mobileSearch.toLowerCase().split(/\s+/).filter(Boolean);
    return filteredProducts.filter((p) => {
      const hay = `${p.itemCode || ""} ${p.name || ""} ${p.category || ""} ${p.brand || ""} ${p.supplier?.name || ""} ${p.hsnCode || ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [filteredProducts, mobileSearch]);

  const totalValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const serialTrackedCount = products.filter(p => p.serialTracked).length;

  const handleMobileExport = () => {
    if (!displayedMobileProducts || displayedMobileProducts.length === 0) {
      showToast("No data to export", "error");
      return;
    }
    const headers = ["itemCode", "name", "category", "brand", "supplier", "hsnCode", "price", "gstRate", "stock", "serialTracked"];
    const csvContent = [
      headers.join(","),
      ...displayedMobileProducts.map(row => [
        row.itemCode ?? '',
        row.name ?? '',
        row.category ?? '',
        row.brand ?? '',
        row.supplier?.name ?? (typeof row.supplier === 'string' ? row.supplier : ''),
        row.hsnCode ?? '',
        row.price ?? 0,
        row.gstRate ?? 0,
        row.stock ?? 0,
        row.serialTracked ? 'Yes' : 'No'
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Data downloaded as CSV.");
  };

  const columns = [
    {
      header: "ITEM CODE / SKU",
      cell: (r) => <span className="font-mono text-xs font-bold text-blue-600">{r.itemCode}</span>,
    },
    {
      header: "PRODUCT NAME",
      cell: (r) => (
        <div>
          <div className="font-bold text-gray-900 text-xs">{r.name}</div>
          <div className="text-[11px] text-gray-400">{r.description || r.name}</div>
        </div>
      ),
    },
    {
      header: "CATEGORY",
      cell: (r) => <span className="text-xs text-gray-800">{r.category || "-"}</span>,
    },
    {
      header: "BRAND",
      cell: (r) => <span className="text-xs text-gray-800">{r.brand || "-"}</span>,
    },
    {
      header: "SUPPLIER",
      cell: (r) => <span className="text-xs text-gray-800">{r.supplier?.name || (typeof r.supplier === "string" ? r.supplier : "") || "-"}</span>,
    },
    {
      header: "HSN",
      cell: (r) => <span className="text-xs text-gray-700">{r.hsnCode || "-"}</span>,
    },
    {
      header: "PRICE",
      cell: (r) => <span className="font-bold text-xs text-gray-900">{fmtINR(r.price)}</span>,
    },
    {
      header: "GST",
      cell: (r) => <span className="text-xs text-gray-700">{r.gstRate ? `${r.gstRate}%` : "0%"}</span>,
    },
    {
      header: "STOCK",
      cell: (r) => (
        <span className={`font-bold text-xs ${r.stock === 0 ? "text-red-600" : "text-emerald-700"}`}>
          {r.stock} {r.unit || "Nos"}
        </span>
      ),
    },
    {
      header: "SERIAL",
      cell: (r) => (
        r.serialTracked ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Tracked
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
            Not tracked
          </span>
        )
      ),
    },
    {
      header: "ACTIONS",
      className: "whitespace-nowrap",
      cell: (r) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <button
            onClick={() => {
              setAdjustModal(r);
              setAdjustData({ mode: "add", qty: "", reason: "Manual Stock Adjustment" });
            }}
            className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/90 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            title="Adjust Stock Quantity"
          >
            <span>± Stock</span>
          </button>
          <button
            onClick={() => openEdit(r)}
            className="px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/90 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            title="Edit Product Details"
          >
            <Pencil className="size-3 text-blue-600" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => handleDelete(r.itemCode || r._id)}
            className="px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/90 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            title="Delete Product"
          >
            <Trash2 className="size-3 text-red-600" />
            <span>Del</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all ${toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
            }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6 border animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1">Adjust Product Stock</h3>
            <p className="text-xs text-gray-500 mb-4">
              {adjustModal.name} · Current Stock: <strong className="text-blue-600 font-bold">{adjustModal.stock} {adjustModal.unit || "Nos"}</strong>
            </p>
            {(() => {
              const currentStock = Math.max(0, Number(adjustModal.stock) || 0);
              const qtyNum = adjustData.qty === "" ? 0 : Math.max(0, Number(adjustData.qty) || 0);
              const delta = adjustData.mode === "deduct" ? -qtyNum : qtyNum;
              const resultingStock = Math.max(0, currentStock + delta);
              const isInvalid = adjustData.qty === "" || qtyNum <= 0 || (adjustData.mode === "deduct" && qtyNum > currentStock);

              return (
                <form onSubmit={handleAdjustStock} className="space-y-3.5">
                  {/* Mode Selector Tabs */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Adjustment Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustData(d => ({ ...d, mode: "add" }))}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${adjustData.mode === "add"
                            ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <span className="text-base font-bold leading-none">+</span>
                        <span>Add Stock (In)</span>
                      </button>
                      <button
                        type="button"
                        disabled={currentStock === 0}
                        onClick={() => setAdjustData(d => ({ ...d, mode: "deduct" }))}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${adjustData.mode === "deduct"
                            ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        <span className="text-base font-bold leading-none">-</span>
                        <span>Deduct Stock (Out)</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {adjustData.mode === "add" ? "Quantity to Add" : "Quantity to Deduct"}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max={adjustData.mode === "deduct" ? currentStock : undefined}
                      placeholder={adjustData.mode === "deduct" ? `0 to ${currentStock}` : "Enter quantity (e.g. 10)"}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={adjustData.qty}
                      onKeyDown={(e) => {
                        if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          setAdjustData(d => ({ ...d, qty: "" }));
                          return;
                        }
                        const val = Math.max(0, parseInt(raw, 10) || 0);
                        if (adjustData.mode === "deduct" && val > currentStock) {
                          setAdjustData(d => ({ ...d, qty: currentStock }));
                          showToast(`Capped deduction at current stock (${currentStock})`, "warning");
                        } else {
                          setAdjustData(d => ({ ...d, qty: val }));
                        }
                      }}
                    />

                    {/* Resulting Stock Display */}
                    <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Resulting Stock:</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-gray-400 line-through font-normal">{currentStock}</span>
                        <span className="text-gray-400">→</span>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-800">
                          {resultingStock} {adjustModal.unit || "Nos"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reason Note */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Physical count audit, Scrap, Customer return"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                      value={adjustData.reason}
                      onChange={e => setAdjustData(d => ({ ...d, reason: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setAdjustModal(null)}
                      className="flex-1 border border-gray-300 bg-white rounded-lg py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isInvalid}
                      className="flex-1 disabled:opacity-40 disabled:cursor-not-allowed bg-gray-900 hover:bg-black text-white rounded-lg py-2 text-xs font-bold shadow-xs cursor-pointer transition-all"
                    >
                      {adjustData.mode === "add" ? "Add to Stock" : "Deduct from Stock"}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Create / Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4 overflow-y-auto py-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-gray-200 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-lg text-gray-900">
                {editingId ? "Edit Product" : "Add New Product to Master"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Siemens V20 VFD Drive 5.5kW"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-semibold text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty (e.g. PRD-001)"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-mono text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
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
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium cursor-pointer underline"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
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
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  />
                </div>

                {/* Supplier Sourcing */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier / Sourced From</label>
                  {suppliers.length > 0 && (
                    <select
                      className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all mb-2"
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
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
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
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-mono text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.hsnCode}
                    onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unit of Measurement</label>
                  <select
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
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
                    min="0"
                    step="any"
                    placeholder="Unit selling price"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.price}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault();
                    }}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0) }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Cost price"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.costPrice}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault();
                    }}
                    onChange={e => setForm(f => ({ ...f, costPrice: e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">GST Tax Rate</label>
                  <select
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
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
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
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
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.stock}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === ".") e.preventDefault();
                    }}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Minimum Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.minStock}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === ".") e.preventDefault();
                    }}
                    onChange={e => setForm(f => ({ ...f, minStock: e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Warranty (Months)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="12"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.warrantyMonths}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === ".") e.preventDefault();
                    }}
                    onChange={e => setForm(f => ({ ...f, warrantyMonths: e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  />
                </div>

                <div className="col-span-2 flex items-center pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-gray-200"
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
                    className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Technical specifications, features, model details"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm disabled:opacity-60 transition-all cursor-pointer"
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gray-100 text-gray-800 rounded-xl">
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
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm font-medium text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief notes about products in this category"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none hover:border-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                  value={categoryForm.description}
                  onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCategoryModal(false); setCategoryForm({ name: "", description: "" }); }}
                  className="flex-1 border border-gray-300 bg-white rounded-lg py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all"
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

      <div className="pt-1">
        <PageHeader
          breadcrumb="Products & Inventory / Product Master"
          title="Product Master"
          subtitle="Central catalog with SKU, HSN codes, GST rates, supplier sourcing, stock levels, warehouse locations and serial tracking"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Add Category</span>
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Add Product</span>
              </button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Kpi label="Total Products" value={products.length} sub="In catalog" tone="success" />
        <Kpi label="Stock Value" value={fmtINR(totalValue)} tone="success" sub="Selling valuation" />
        <Kpi label="Low Stock Alerts" value={lowStockCount} tone="danger" sub="Below minimum threshold" />
        <Kpi label="Serial Tracked" value={serialTrackedCount} tone="accent" sub="Units with serial numbers" />
      </div>

      {/* Category Filter Bar */}
      <div className="relative mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {["All", ...categories].map(cat => {
            const count = cat === "All"
              ? products.length
              : products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <span>{cat}</span>
                {cat !== "All" && (
                  <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View (Full 11 Columns for PC) */}
      <div className="hidden md:block mt-2">
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

      {/* Mobile Responsive Cards View (Tailored for Phones & Small Screens) */}
      <div className="md:hidden mt-2 space-y-3">
        {/* Mobile Search & Export Toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              placeholder="Search records…"
              className="h-9 pl-8 text-xs bg-white"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5 px-3 text-xs shrink-0"
            onClick={handleMobileExport}
          >
            <Download className="size-3.5" />
            <span>Export</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
          </div>
        ) : displayedMobileProducts.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted-foreground">
            No products found
          </div>
        ) : (
          displayedMobileProducts.map((r, i) => (
            <div key={r.itemCode || r._id || i} className="panel p-3.5 space-y-2.5 bg-white border border-gray-200/80 rounded-xl shadow-xs">
              {/* Header: Name + Stock Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">{r.name}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                    <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded text-[11px]">
                      {r.itemCode}
                    </span>
                    {r.category && <span>· {r.category}</span>}
                    {r.brand && <span className="text-gray-400">({r.brand})</span>}
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.stock === 0
                      ? "bg-red-100 text-red-700"
                      : r.stock <= (r.minStock || 0)
                        ? "bg-amber-100 text-amber-800"
                        : "bg-green-100 text-green-800"
                    }`}
                >
                  {r.stock === 0 ? "Out of Stock" : `${r.stock} ${r.unit || "Nos"}`}
                </span>
              </div>

              {/* Metadata row: Location, Supplier, Serial */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500">
                <span className="truncate">📍 {r.location || "Main Warehouse"}</span>
                {r.serialTracked ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Tracked
                  </span>
                ) : null}
              </div>

              {/* 3-Column Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Price</div>
                  <div className="font-bold text-xs text-gray-900 mt-0.5">{fmtINR(r.price)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">GST / HSN</div>
                  <div className="text-xs text-gray-600 mt-0.5">{r.gstRate || 0}% · {r.hsnCode || "-"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Stock Value</div>
                  <div className="font-bold text-xs text-emerald-700 mt-0.5 font-mono">{fmtINR(r.price * r.stock)}</div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                <span className="text-gray-500 text-[11px] truncate max-w-[150px]">
                  Supplier: {r.supplier?.name || (typeof r.supplier === "string" ? r.supplier : "") || "Direct"}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setAdjustModal(r);
                      setAdjustData({ mode: "add", qty: "", reason: "Manual Stock Adjustment" });
                    }}
                    className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/90 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <span>± Stock</span>
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/90 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Pencil className="size-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(r.itemCode || r._id)}
                    className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/90 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Trash2 className="size-3" />
                    <span>Del</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
