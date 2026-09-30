"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, Download, Package, AlertTriangle, MapPin } from "lucide-react";
import { getProducts, adjustProductStock, fmtINR } from "@/services/documentService";
import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [mobileSearch, setMobileSearch] = useState("");
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustData, setAdjustData] = useState({ mode: "add", qty: "", reason: "Physical inventory audit" });
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

  const filteredProducts = products.filter((p) => {
    if (filter === "low") return p.stock <= p.minStock && p.stock > 0;
    if (filter === "out") return p.stock === 0;
    if (filter === "ok") return p.stock > p.minStock;
    return true;
  });

  const displayedMobileProducts = useMemo(() => {
    if (!mobileSearch.trim()) return filteredProducts;
    const terms = mobileSearch.toLowerCase().split(/\s+/).filter(Boolean);
    return filteredProducts.filter((p) => {
      const hay = `${p.itemCode || ""} ${p.name || ""} ${p.location || ""} ${p.category || ""} ${p.brand || ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [filteredProducts, mobileSearch]);

  const totalStockValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const locationsCount = new Set(products.map((p) => p.location).filter(Boolean)).size || 1;

  const handleMobileExport = () => {
    if (!displayedMobileProducts || displayedMobileProducts.length === 0) {
      showToast("No data to export", "error");
      return;
    }
    const headers = ["itemCode", "name", "category", "brand", "location", "stock", "minStock", "price"];
    const csvContent = [
      headers.join(","),
      ...displayedMobileProducts.map(row => headers.map(key => `"${String(row[key] ?? '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Data downloaded as CSV.");
  };

  const columns = [
    {
      header: "ITEM CODE",
      cell: (r) => <span className="font-mono text-xs font-bold text-blue-600">{r.itemCode}</span>,
    },
    {
      header: "PRODUCT NAME",
      cell: (r) => (
        <div>
          <div className="font-semibold text-gray-900">{r.name}</div>
          <div className="text-[11px] text-gray-400">{r.category} · {r.brand}</div>
        </div>
      ),
    },
    {
      header: "LOCATION",
      cell: (r) => <span className="text-xs font-medium text-gray-700">{r.location || "Main Warehouse"}</span>,
    },
    {
      header: "ON HAND",
      cell: (r) => (
        <span className="font-bold text-sm text-gray-900">
          {r.stock} {r.unit || "Nos"}
        </span>
      ),
    },
    {
      header: "MINIMUM",
      cell: (r) => <span className="text-xs text-gray-500">{r.minStock || 0} {r.unit || "Nos"}</span>,
    },
    {
      header: "UNIT VALUE",
      cell: (r) => <span className="text-xs font-medium text-gray-800">{fmtINR(r.price)}</span>,
    },
    {
      header: "TOTAL STOCK VALUE",
      cell: (r) => <span className="font-bold text-xs text-emerald-700">{fmtINR(r.price * r.stock)}</span>,
    },
    {
      header: "ALERT",
      cell: (r) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${r.stock === 0
              ? "bg-red-100 text-red-700"
              : r.stock <= (r.minStock || 0)
                ? "bg-amber-100 text-amber-800"
                : "bg-green-100 text-green-800"
            }`}
        >
          {r.stock === 0 ? "Out of Stock" : r.stock <= (r.minStock || 0) ? "Below Minimum" : "Optimal Stock"}
        </span>
      ),
    },
    {
      header: "ACTIONS",
      cell: (r) => (
        <button
          onClick={() => {
            setAdjustModal(r);
            setAdjustData({ mode: "add", qty: "", reason: "Physical inventory audit" });
          }}
          className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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
            <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1">Adjust Inventory Stock</h3>
            <p className="text-xs text-gray-500 mb-4">
              {adjustModal.name} · Currently On Hand: <strong className="text-blue-600 font-bold">{adjustModal.stock} {adjustModal.unit || "Nos"}</strong>
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
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          adjustData.mode === "add"
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
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          adjustData.mode === "deduct"
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
                        // Prevent entering negative signs or non-numeric symbols
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Movement Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Purchase receipt, Scrap, Physical audit"
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

      <PageHeader
        breadcrumb="Products & Inventory / Inventory"
        title="Inventory & Stock"
        subtitle="Live warehouse stock levels, threshold alerts, and inventory adjustments."
        actions={
          <Link
            href="/products"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            📦 Product Master
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Kpi
          label="Stock Value"
          value={fmtINR(totalStockValue)}
          tone="default"
          sub="+12% vs last month"
          icon={Package}
        />
        <Kpi
          label="Low Stock"
          value={lowStockCount}
          tone="danger"
          sub="Items below threshold"
          icon={AlertTriangle}
        />
        <Kpi
          label="Out of Stock"
          value={outOfStockCount}
          tone="warning"
          sub="Items unavailable"
          icon={Package}
        />
        <Kpi
          label="Locations"
          value={locationsCount}
          tone="success"
          sub="Active locations"
          icon={MapPin}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-4">
        {[
          { id: "all", label: "All Items", count: products.length },
          { id: "low", label: "Below Minimum", count: lowStockCount },
          { id: "out", label: "Out of Stock", count: outOfStockCount },
          { id: "ok", label: "Healthy Stock", count: products.filter(p => p.stock > p.minStock).length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${filter === t.id
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Desktop Table View (Full 9 Columns for PC) */}
      <div className="hidden md:block mt-2">
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
            <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full" />
          </div>
        ) : displayedMobileProducts.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted-foreground">
            No inventory records found
          </div>
        ) : (
          displayedMobileProducts.map((r, i) => (
            <div key={r.itemCode || r._id || i} className="panel p-3.5 space-y-2.5 bg-white border border-gray-200/80 rounded-xl shadow-xs">
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
                  {r.stock === 0 ? "Out of Stock" : r.stock <= (r.minStock || 0) ? "Below Minimum" : "Optimal Stock"}
                </span>
              </div>

              <div className="text-[11px] text-gray-500 flex items-center gap-1">
                <span>📍 {r.location || "Main Warehouse"}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-center">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">On Hand</div>
                  <div className="font-bold text-xs text-gray-900 mt-0.5">{r.stock} {r.unit || "Nos"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Minimum</div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.minStock || 0} {r.unit || "Nos"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Total Value</div>
                  <div className="font-bold text-xs text-emerald-700 mt-0.5 font-mono">{fmtINR(r.price * r.stock)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                <span className="text-gray-500 text-[11px]">
                  Unit Value: <strong className="text-gray-800 font-mono">{fmtINR(r.price)}</strong>
                </span>
                <button
                  onClick={() => {
                    setAdjustModal(r);
                    setAdjustData({ mode: "add", qty: "", reason: "Physical inventory audit" });
                  }}
                  className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <span>± Adjust</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
