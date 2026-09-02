"use client";

import React, { useState, useEffect } from "react";
import { calcItem, fmtINR, getProducts } from "@/services/documentService";

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["Nos", "Pcs", "Set", "Pair", "Box", "Kg", "Mtr", "Ltr", "Roll", "Lot"];

const emptyItem = {
  productCode: "",
  description: "",
  hsnCode: "",
  qty: 1,
  unit: "Nos",
  rate: 0,
  discount: 0,
  gstRate: 18,
  taxableAmount: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  totalAmount: 0,
};

export function LineItemsEditor({ items, onChange, isInterState = false, isDelivery = false }) {
  const [productList, setProductList] = useState([]);

  useEffect(() => {
    getProducts()
      .then((prods) => setProductList(Array.isArray(prods) ? prods : []))
      .catch(() => {});
  }, []);

  const updateItem = (index, field, value) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item, [field]: value };
      return isDelivery ? newItem : calcItem(newItem, isInterState);
    });
    onChange(updated);
  };

  const handleProductSelect = (index, prodIdOrCode) => {
    if (!prodIdOrCode) return;
    const prod = productList.find(p => p._id === prodIdOrCode || p.itemCode === prodIdOrCode || p.name === prodIdOrCode);
    if (!prod) return;

    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const newItem = {
        ...item,
        productCode: prod.itemCode || "",
        description: prod.name || "",
        hsnCode: prod.hsnCode || "8537",
        unit: prod.unit || "Nos",
        rate: prod.price || 0,
        gstRate: prod.gstRate ?? 18,
      };
      return isDelivery ? newItem : calcItem(newItem, isInterState);
    });
    onChange(updated);
  };

  const addItem = () => onChange([...items, { ...emptyItem }]);

  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  const tdStyle = { padding: "5px 6px", verticalAlign: "middle" };
  const inputClass = "w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400";

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-xs" style={{ minWidth: isDelivery ? 650 : 950 }}>
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase border-b" style={{ fontSize: "9.5px", letterSpacing: "0.5px" }}>
              <th style={{ ...tdStyle, width: 28 }}>#</th>
              <th style={tdStyle}>Product / Description</th>
              {!isDelivery && <th style={{ ...tdStyle, width: 95 }}>SKU / Code</th>}
              {!isDelivery && <th style={{ ...tdStyle, width: 75 }}>HSN</th>}
              <th style={{ ...tdStyle, width: 65 }}>Qty</th>
              <th style={{ ...tdStyle, width: 70 }}>Unit</th>
              {!isDelivery && <th style={{ ...tdStyle, width: 90 }}>Rate (₹)</th>}
              {!isDelivery && <th style={{ ...tdStyle, width: 55 }}>Disc%</th>}
              {!isDelivery && <th style={{ ...tdStyle, width: 65 }}>GST%</th>}
              {!isDelivery && <th style={{ ...tdStyle, width: 90 }}>Taxable</th>}
              {!isDelivery && !isInterState && <th style={{ ...tdStyle, width: 75 }}>CGST</th>}
              {!isDelivery && !isInterState && <th style={{ ...tdStyle, width: 75 }}>SGST</th>}
              {!isDelivery && isInterState && <th style={{ ...tdStyle, width: 90 }}>IGST</th>}
              {!isDelivery && <th style={{ ...tdStyle, width: 90 }}>Total</th>}
              {isDelivery && <th style={tdStyle}>Serial Numbers</th>}
              {isDelivery && <th style={tdStyle}>Remarks</th>}
              <th style={{ ...tdStyle, width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                <td style={tdStyle} className="text-gray-400 text-center font-mono">{i + 1}</td>
                <td style={tdStyle}>
                  <div className="space-y-1">
                    {productList.length > 0 && (
                      <select
                        className="w-full border border-blue-200 bg-blue-50/50 rounded px-2 py-0.5 text-[11px] text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-0.5"
                        value={item.productCode || ""}
                        onChange={e => handleProductSelect(i, e.target.value)}
                      >
                        <option value="">⚡ Select from Product Master…</option>
                        {productList.map(p => (
                          <option key={p._id || p.itemCode} value={p.itemCode}>
                            {p.name} ({p.itemCode}) — ₹{p.price} [Stock: {p.stock}]
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      className={inputClass}
                      value={item.description || ""}
                      onChange={e => updateItem(i, "description", e.target.value)}
                      placeholder="Product description"
                      required
                    />
                  </div>
                </td>
                {!isDelivery && (
                  <td style={tdStyle}>
                    <input
                      className={`${inputClass} font-mono`}
                      value={item.productCode || ""}
                      onChange={e => updateItem(i, "productCode", e.target.value)}
                      placeholder="SKU"
                    />
                  </td>
                )}
                {!isDelivery && (
                  <td style={tdStyle}>
                    <input
                      className={`${inputClass} font-mono`}
                      value={item.hsnCode || ""}
                      onChange={e => updateItem(i, "hsnCode", e.target.value)}
                      placeholder="HSN"
                    />
                  </td>
                )}
                <td style={tdStyle}>
                  <input
                    className={`${inputClass} text-right font-semibold`}
                    type="number"
                    min="0"
                    step="any"
                    value={item.qty}
                    onChange={e => updateItem(i, "qty", e.target.value)}
                  />
                </td>
                <td style={tdStyle}>
                  <select className={inputClass} value={item.unit || "Nos"} onChange={e => updateItem(i, "unit", e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </td>
                {!isDelivery && (
                  <td style={tdStyle}>
                    <input
                      className={`${inputClass} text-right font-medium`}
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={e => updateItem(i, "rate", e.target.value)}
                    />
                  </td>
                )}
                {!isDelivery && (
                  <td style={tdStyle}>
                    <input
                      className={`${inputClass} text-right`}
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount || 0}
                      onChange={e => updateItem(i, "discount", e.target.value)}
                    />
                  </td>
                )}
                {!isDelivery && (
                  <td style={tdStyle}>
                    <select
                      className={inputClass}
                      value={item.gstRate ?? 18}
                      onChange={e => updateItem(i, "gstRate", Number(e.target.value))}
                    >
                      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </td>
                )}
                {!isDelivery && (
                  <td style={tdStyle} className="text-right font-semibold text-gray-800">{fmtINR(item.taxableAmount || 0)}</td>
                )}
                {!isDelivery && !isInterState && (
                  <td style={tdStyle} className="text-right text-gray-500 font-medium">{fmtINR(item.cgst || 0)}</td>
                )}
                {!isDelivery && !isInterState && (
                  <td style={tdStyle} className="text-right text-gray-500 font-medium">{fmtINR(item.sgst || 0)}</td>
                )}
                {!isDelivery && isInterState && (
                  <td style={tdStyle} className="text-right text-gray-500 font-medium">{fmtINR(item.igst || 0)}</td>
                )}
                {!isDelivery && (
                  <td style={tdStyle} className="text-right font-bold text-gray-900">{fmtINR(item.totalAmount || 0)}</td>
                )}
                {isDelivery && (
                  <td style={tdStyle}>
                    <input
                      className={inputClass}
                      value={Array.isArray(item.serialNumbers) ? item.serialNumbers.join(", ") : (item.serialNumbers || "")}
                      onChange={e => updateItem(i, "serialNumbers", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                      placeholder="e.g. SN-001, SN-002"
                    />
                  </td>
                )}
                {isDelivery && (
                  <td style={tdStyle}>
                    <input className={inputClass} value={item.remarks || ""} onChange={e => updateItem(i, "remarks", e.target.value)} placeholder="Condition / notes" />
                  </td>
                )}
                <td style={tdStyle} className="text-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="text-gray-300 hover:text-red-600 transition-colors text-sm px-1"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-2.5">
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
        >
          <span>+ Add Line Item</span>
        </button>
        <span className="text-[11px] text-gray-400">
          Tip: Selecting a product from master auto-fills SKU, HSN, Unit, Price & GST
        </span>
      </div>
    </div>
  );
}
