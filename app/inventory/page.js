"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getProducts, adjustProductStock, fmtINR } from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustData, setAdjustData] = useState({ delta: 0, reason: "Stock Count Update" });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const prods = await getProducts();
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const filteredProducts = products.filter((p) => {
    if (filter === "low") return p.stock <= p.minStock && p.stock > 0;
    if (filter === "out") return p.stock === 0;
    if (filter === "ok") return p.stock > p.minStock;
    return true;
  });

  const totalStockValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const locationsCount = new Set(products.map((p) => p.location).filter(Boolean)).size || 1;

  const columns = [
    {
      header: "Item Code",
      cell: (r) => <span className="font-mono text-xs font-bold text-blue-600">{r.itemCode}</span>,
    },
    {
      header: "Product Name",
      cell: (r) => (
        <div>
          <div className="font-semibold text-gray-900">{r.name}</div>
          <div className="text-[11px] text-gray-400">{r.category} · {r.brand}</div>
        </div>
      ),
    },
    {
      header: "Location",
      cell: (r) => <span className="text-xs font-medium text-gray-700">{r.location || "Main Warehouse"}</span>,
    },
    {
      header: "On Hand",
      cell: (r) => (
        <span className="font-bold text-sm text-gray-900">
          {r.stock} {r.unit}
        </span>
      ),
    },
    {
      header: "Minimum",
      cell: (r) => <span className="text-xs text-gray-500">{r.minStock} {r.unit}</span>,
    },
    {
      header: "Unit Value",
      cell: (r) => <span className="text-xs font-medium">{fmtINR(r.price)}</span>,
    },
    {
      header: "Total Stock Value",
      cell: (r) => <span className="font-bold text-xs text-emerald-700">{fmtINR(r.price * r.stock)}</span>,
    },
    {
      header: "Alert",
      cell: (r) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            r.stock === 0
              ? "bg-red-100 text-red-700"
              : r.stock <= r.minStock
              ? "bg-amber-100 text-amber-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {r.stock === 0 ? "Out of Stock" : r.stock <= r.minStock ? "Below Minimum" : "Optimal Stock"}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (r) => (
        <button
          onClick={() => {
            setAdjustModal(r);
            setAdjustData({ delta: 0, reason: "Physical inventory audit" });
          }}
          className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold transition-colors flex items-center gap-1"
        >
          <span>± Adjust</span>
        </button>
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
            <h3 className="font-bold text-lg text-gray-900 mb-1">Adjust Inventory Stock</h3>
            <p className="text-xs text-gray-500 mb-4">
              {adjustModal.name} · Currently On Hand: <strong className="text-blue-600">{adjustModal.stock} {adjustModal.unit}</strong>
            </p>
            <form onSubmit={handleAdjustStock} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity Adjustment (+ or -)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. +20 or -5"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  value={adjustData.delta}
                  onChange={e => setAdjustData(d => ({ ...d, delta: e.target.value }))}
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Resulting Stock: {Math.max(0, (adjustModal.stock || 0) + (Number(adjustData.delta) || 0))} {adjustModal.unit}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Movement Note</label>
                <input
                  type="text"
                  placeholder="e.g. Purchase receipt, Scrap, Audit"
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
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PageHeader
        breadcrumb="Products & Inventory / Inventory"
        title="Inventory & Stock"
        subtitle="Live warehouse stock levels, automated Sales Order deductions, minimum threshold alerts, and inventory adjustments"
        actions={
          <Link
            href="/products"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            📦 Product Master
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Total Stock Value" value={fmtINR(totalStockValue)} tone="success" sub="Selling valuation" />
        <Kpi label="Stock Alerts" value={lowStockCount} tone="warning" sub="Below minimum threshold" />
        <Kpi label="Out of Stock" value={outOfStockCount} tone="danger" sub="0 units remaining" />
        <Kpi label="Active Locations" value={locationsCount} tone="accent" sub="Warehouse zones" />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { id: "all", label: "All Items", count: products.length },
          { id: "low", label: "Below Minimum", count: lowStockCount },
          { id: "out", label: "Out of Stock", count: outOfStockCount },
          { id: "ok", label: "Healthy Stock", count: products.filter(p => p.stock > p.minStock).length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === t.id
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="mt-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full" />
          </div>
        ) : (
          <DataTable
            rows={filteredProducts}
            columns={columns}
            searchKeys={["itemCode", "name", "location", "category"]}
          />
        )}
      </div>
    </>
  );
}
