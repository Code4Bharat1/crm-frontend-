"use client";

import React, { useState } from "react";
import { Truck, Receipt, ShoppingCart, Loader2 } from "lucide-react";

/**
 * Formats currency in INR format (e.g. ₹1,23,456.00)
 */
const fmtINR = (val) => {
  if (val === undefined || val === null || isNaN(val)) return null;
  return "₹" + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export function ConvertNotificationModal({
  isOpen,
  onClose,
  title,
  sourceDocNo,
  customerName,
  targetType = "Delivery Note", // "Delivery Note" | "Sales Invoice" | "Sales Order"
  amount,
  advanceRequired,
  advanceReceived,
  balanceAmount,
  onConfirm,
}) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAction = async () => {
    try {
      setSubmitting(true);
      await onConfirm?.();
      onClose();
    } catch (err) {
      console.error("Conversion error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const isDelivery = targetType.toLowerCase().includes("delivery");
  const isInvoice = targetType.toLowerCase().includes("invoice");
  const isOrder = targetType.toLowerCase().includes("order");

  let themeIcon = "🛒";
  let themeBadgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  let confirmBtnClass = "bg-emerald-600 hover:bg-emerald-700 text-white";
  let shortTarget = "SO";

  if (isDelivery) {
    themeIcon = "🚚";
    themeBadgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    confirmBtnClass = "bg-amber-600 hover:bg-amber-700 text-white";
    shortTarget = "DN";
  } else if (isInvoice) {
    themeIcon = "🧾";
    themeBadgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    confirmBtnClass = "bg-emerald-600 hover:bg-emerald-700 text-white";
    shortTarget = "Invoice";
  }

  const modalHeading = title || `Convert to ${targetType}?`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 w-[94vw] max-w-sm sm:max-w-md shadow-2xl animate-in fade-in zoom-in duration-150">
        
        {/* Centered Circular Icon Badge */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-3.5 border ${themeBadgeClass}`}>
          {themeIcon}
        </div>

        {/* Centered Heading */}
        <h3 className="font-bold text-lg sm:text-xl text-foreground text-center mb-1.5">
          {modalHeading}
        </h3>

        {/* Centered Subtitle */}
        <p className="text-xs sm:text-sm text-muted-foreground text-center mb-5 leading-relaxed">
          Are you sure you want to convert <strong className="text-foreground font-bold">{sourceDocNo}</strong> into a confirmed <strong className="text-foreground font-bold">{targetType}</strong>?
        </p>

        {/* Summary Info Card */}
        <div className="bg-muted/40 border border-border/70 rounded-2xl p-4 mb-6 space-y-2.5 text-xs sm:text-[13px]">
          {customerName && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-[240px] text-right">{customerName}</span>
            </div>
          )}

          {amount !== undefined && amount !== null && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Grand Total:</span>
              <span className="font-bold text-foreground text-right">{fmtINR(amount)}</span>
            </div>
          )}

          {advanceRequired > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Advance Required:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400 text-right">{fmtINR(advanceRequired)}</span>
            </div>
          )}

          {advanceReceived > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Advance Received:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-right">{fmtINR(advanceReceived)}</span>
            </div>
          )}

          {balanceAmount !== undefined && balanceAmount !== null && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Balance Payable:</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 text-right">{fmtINR(balanceAmount)}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="flex-1 py-2.5 sm:py-3 px-4 border border-border rounded-xl text-xs sm:text-sm font-semibold hover:bg-muted text-foreground transition-all cursor-pointer disabled:opacity-50"
          >
            No, Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleAction}
            className={`flex-1 py-2.5 sm:py-3 px-4 ${confirmBtnClass} rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50`}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              `Yes, Convert to ${shortTarget}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

