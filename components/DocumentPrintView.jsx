"use client";

/**
 * DocumentPrintView — Professional letterhead document for all business document types.
 * Used by: Quotations, Proforma Invoices, Sales Orders, Delivery Notes, Sales Invoices, Purchase Orders.
 *
 * Props:
 *   doc       — the document object from the API
 *   type      — 'Quotation' | 'Proforma Invoice' | 'Sales Order' | 'Delivery Note' | 'Sales Invoice' | 'Purchase Order'
 *   company   — company settings object
 *   onClose   — callback to close the print modal
 */

import React, { useRef } from "react";
import { fmtDate, fmtINR } from "@/services/documentService";

const docTypeConfig = {
  "Quotation":        { color: "#2563eb", accent: "#dbeafe", label: "QUOTATION",        noField: "quotationNo" },
  "Proforma Invoice": { color: "#7c3aed", accent: "#ede9fe", label: "PROFORMA INVOICE",  noField: "proformaNo" },
  "Sales Order":      { color: "#059669", accent: "#d1fae5", label: "SALES ORDER",       noField: "soNo" },
  "Delivery Note":    { color: "#d97706", accent: "#fef3c7", label: "DELIVERY NOTE",     noField: "dnNo" },
  "Sales Invoice":    { color: "#dc2626", accent: "#fee2e2", label: "TAX INVOICE",       noField: "invoiceNo" },
  "Purchase Order":   { color: "#0891b2", accent: "#cffafe", label: "PURCHASE ORDER",    noField: "poNo" },
};

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image')) {
    return url;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';
  const backendBase = apiBase.replace(/\/api$/, '');
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export function DocumentPrintView({ doc, type, company, onClose }) {
  const printRef = useRef();
  const cfg = docTypeConfig[type] || docTypeConfig["Quotation"];
  const docNo = doc[cfg.noField] || doc.id || "—";

  const party = type === "Purchase Order" ? doc.supplier : doc.customer;
  const partyLabel = type === "Purchase Order" ? "Supplier" : "Bill To";

  const isDelivery = type === "Delivery Note";
  const isInvoice = type === "Sales Invoice";
  const isPO = type === "Purchase Order";

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>${cfg.label} — ${docNo}</title>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; font-size: 11px; color: #111; background: #fff; }
        .doc-wrap { max-width: 210mm; margin: 0 auto; padding: 12mm 14mm; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 5px 8px; text-align: left; border: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }
        .text-sm { font-size: 10px; }
        .text-xs { font-size: 9px; }
        .text-lg { font-size: 14px; }
        .text-xl { font-size: 18px; }
        .text-2xl { font-size: 22px; }
        .mt-4 { margin-top: 16px; }
        .mt-2 { margin-top: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .p-2 { padding: 8px; }
        .border { border: 1px solid #e2e8f0; }
        .rounded { border-radius: 6px; }
        .bg-gray { background: #f8fafc; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        img { max-width: 100%; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      </style>
      </head><body>
      <div class="doc-wrap">${content}</div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-6 px-2">
      {/* Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between bg-gray-900 px-6 py-3 shadow-lg no-print" style={{ printVisibility: 'hidden' }}>
        <span className="text-white font-semibold text-sm">{cfg.label} — {docNo}</span>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🖨️ Print / Download PDF
          </button>
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Document */}
      <div
        ref={printRef}
        className="bg-white w-full max-w-4xl shadow-2xl rounded-xl mt-14 print:mt-0 print:shadow-none overflow-hidden"
        style={{ fontFamily: "'Arial', sans-serif", fontSize: "12px", color: "#111" }}
      >
        {/* ─── LETTERHEAD ─────────────────────────────────────────── */}
        <div style={{ borderTop: `6px solid ${cfg.color}`, padding: "24px 32px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* Company Info & Logo */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", maxWidth: "68%" }}>
              {company?.logoUrl && (
                <div style={{ flexShrink: 0, marginTop: "2px" }}>
                  <img
                    src={resolveMediaUrl(company.logoUrl)}
                    alt={company?.name || "Company Logo"}
                    style={{ maxHeight: "68px", maxWidth: "150px", objectFit: "contain", borderRadius: "4px" }}
                  />
                </div>
              )}
              <div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: cfg.color, letterSpacing: "-0.5px", lineHeight: "1.2" }}>
                  {company?.name || "Nexcore Alliance Pvt. Ltd."}
                </div>
                {company?.tagline && (
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {company.tagline}
                  </div>
                )}
                <div style={{ fontSize: "10px", color: "#475569", marginTop: "6px", lineHeight: "1.5" }}>
                  {company?.address?.line1 && <div>{company.address.line1}</div>}
                  {company?.address?.line2 && <div>{company.address.line2}</div>}
                  {(company?.address?.city || company?.address?.state || company?.address?.pinCode || company?.address?.country) && (
                    <div>
                      {[
                        company?.address?.city,
                        company?.address?.state,
                        company?.address?.pinCode ? `- ${company.address.pinCode}` : null,
                        company?.address?.country
                      ].filter(Boolean).join(", ")}
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "3px" }}>
                    {company?.phone && <span>📞 {company.phone}</span>}
                    {company?.email && <span>✉ {company.email}</span>}
                    {company?.website && <span>🌐 {company.website}</span>}
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {company?.gstNumber && <span>GSTIN: <strong>{company.gstNumber}</strong></span>}
                  {company?.panNumber && <span>PAN: <strong>{company.panNumber}</strong></span>}
                  {company?.cinNumber && <span>CIN: <strong>{company.cinNumber}</strong></span>}
                </div>
              </div>
            </div>
            {/* Document Badge */}
            <div style={{ textAlign: "right" }}>
              <div style={{
                background: cfg.color, color: "#fff", fontSize: "13px", fontWeight: "800",
                letterSpacing: "1.5px", padding: "6px 16px", borderRadius: "6px", display: "inline-block"
              }}>
                {cfg.label}
              </div>
              <div style={{ marginTop: "8px", fontSize: "11px", color: "#374151" }}>
                <div><strong>No:</strong> {docNo}</div>
                <div><strong>Date:</strong> {fmtDate(doc.date)}</div>
                {doc.validUntil && <div><strong>Valid Until:</strong> {fmtDate(doc.validUntil)}</div>}
                {doc.dueDate && <div style={{ color: "#dc2626" }}><strong>Due Date:</strong> {fmtDate(doc.dueDate)}</div>}
                {doc.expectedDelivery && <div><strong>Expected Delivery:</strong> {fmtDate(doc.expectedDelivery)}</div>}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: `linear-gradient(to right, ${cfg.color}, #e2e8f0)`, margin: "16px 0" }} />

          {/* ─── PARTY & DOCUMENT META ──────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            {/* Bill To / Supplier */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "9px", fontWeight: "700", color: cfg.color, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>
                {partyLabel}
              </div>
              <div style={{ fontWeight: "700", fontSize: "13px" }}>{party?.name}</div>
              {party?.address && <div style={{ color: "#475569", fontSize: "10px", marginTop: "4px" }}>{party.address}</div>}
              {party?.gstNumber && <div style={{ fontSize: "10px", marginTop: "4px" }}>GST: <strong>{party.gstNumber}</strong></div>}
              {party?.contactPerson && <div style={{ fontSize: "10px", color: "#6b7280" }}>Attn: {party.contactPerson}</div>}
              {party?.phone && <div style={{ fontSize: "10px", color: "#6b7280" }}>📞 {party.phone}</div>}
              {party?.email && <div style={{ fontSize: "10px", color: "#6b7280" }}>✉ {party.email}</div>}
            </div>

            {/* Ship To / Cross References */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
              {(doc.deliveryAddress || doc.shippingAddress) && (
                <>
                  <div style={{ fontSize: "9px", fontWeight: "700", color: cfg.color, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>
                    {isDelivery || isPO ? "Delivery Address" : "Ship To"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#475569" }}>{doc.deliveryAddress || doc.shippingAddress}</div>
                </>
              )}
              <div style={{ fontSize: "9px", fontWeight: "700", color: "#6b7280", letterSpacing: "1px", textTransform: "uppercase", marginTop: "8px", marginBottom: "4px" }}>
                Reference
              </div>
              {doc.quotationRef && <div style={{ fontSize: "10px" }}>Quotation: <strong>{doc.quotationRef}</strong></div>}
              {doc.proformaRef && <div style={{ fontSize: "10px" }}>Proforma: <strong>{doc.proformaRef}</strong></div>}
              {doc.soRef && <div style={{ fontSize: "10px" }}>Sales Order: <strong>{doc.soRef}</strong></div>}
              {doc.dnRef && <div style={{ fontSize: "10px" }}>Delivery Note: <strong>{doc.dnRef}</strong></div>}
              {doc.poReference && <div style={{ fontSize: "10px" }}>Customer PO: <strong>{doc.poReference}</strong></div>}
              {doc.salesperson && <div style={{ fontSize: "10px", marginTop: "4px" }}>Salesperson: <strong>{doc.salesperson}</strong></div>}
            </div>
          </div>

          {doc.subject && (
            <div style={{ background: cfg.accent, borderLeft: `4px solid ${cfg.color}`, padding: "8px 12px", borderRadius: "4px", marginBottom: "12px", fontSize: "11px" }}>
              <strong>Subject:</strong> {doc.subject}
            </div>
          )}
        </div>

        {/* ─── LINE ITEMS TABLE ────────────────────────────────────── */}
        <div style={{ padding: "0 32px" }}>
          {isDelivery ? (
            <DeliveryItemsTable items={doc.items || []} color={cfg.color} />
          ) : (
            <GSTItemsTable items={doc.items || []} color={cfg.color} isInterState={doc.isInterState} />
          )}
        </div>

        {/* ─── TOTALS ──────────────────────────────────────────────── */}
        <div style={{ padding: "0 32px 24px" }}>
          {!isDelivery && (
            <TotalsSection doc={doc} color={cfg.color} accent={cfg.accent} isInvoice={isInvoice} />
          )}

          {/* Transport info for Delivery Notes */}
          {isDelivery && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "16px" }}>
              {[
                ["Transporter", doc.transporter],
                ["Vehicle No.", doc.vehicleNumber],
                ["LR Number", doc.lrNumber],
                ["Dispatch Date", fmtDate(doc.dispatchDate)],
                ["Expected Delivery", fmtDate(doc.expectedDelivery)],
                ["Received By", doc.receivedBy],
              ].map(([label, val]) => val ? (
                <div key={label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px" }}>
                  <div style={{ fontSize: "9px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
                  <div style={{ fontWeight: "600", fontSize: "11px", marginTop: "2px" }}>{val}</div>
                </div>
              ) : null)}
            </div>
          )}

          {/* Invoice Payments History */}
          {isInvoice && doc.payments?.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", marginBottom: "6px", color: "#374151" }}>Payment History</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date", "Mode", "Reference", "Amount"].map(h => (
                      <th key={h} style={{ padding: "5px 8px", border: "1px solid #e2e8f0", textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {doc.payments.map((p, i) => (
                    <tr key={i}>
                      <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0" }}>{fmtDate(p.date)}</td>
                      <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0" }}>{p.mode}</td>
                      <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0" }}>{p.reference || "—"}</td>
                      <td style={{ padding: "5px 8px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "600", color: "#059669" }}>{fmtINR(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Terms */}
          {(doc.termsAndConditions || company?.termsAndConditions) && (
            <div style={{ marginTop: "20px", fontSize: "10px" }}>
              <div style={{ fontWeight: "700", marginBottom: "4px", color: "#374151" }}>Terms & Conditions</div>
              <div style={{ color: "#6b7280", whiteSpace: "pre-line", lineHeight: "1.6" }}>
                {doc.termsAndConditions || company?.termsAndConditions}
              </div>
            </div>
          )}

          {doc.notes && (
            <div style={{ marginTop: "12px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px", fontSize: "10px" }}>
              <strong>Note:</strong> {doc.notes}
            </div>
          )}

          {/* ─── FOOTER / SIGNATURE ─────────────────────────────── */}
          <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px", alignItems: "flex-end" }}>
            {/* Bank Details */}
            {company?.bankDetails && !isDelivery ? (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "9px", fontWeight: "700", color: cfg.color, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>
                  Bank Details
                </div>
                <div style={{ fontSize: "10px", lineHeight: "1.8" }}>
                  {company.bankDetails.bankName && <div><strong>Bank:</strong> {company.bankDetails.bankName}</div>}
                  {company.bankDetails.accountName && <div><strong>A/C Name:</strong> {company.bankDetails.accountName}</div>}
                  {company.bankDetails.accountNumber && <div><strong>A/C No:</strong> {company.bankDetails.accountNumber}</div>}
                  {company.bankDetails.ifscCode && <div><strong>IFSC:</strong> {company.bankDetails.ifscCode}</div>}
                  {company.bankDetails.branch && <div><strong>Branch:</strong> {company.bankDetails.branch}</div>}
                  {company.bankDetails.swiftCode && <div><strong>SWIFT / BIC:</strong> {company.bankDetails.swiftCode}</div>}
                  {company.bankDetails.upiId && <div><strong>UPI ID:</strong> {company.bankDetails.upiId}</div>}
                </div>
              </div>
            ) : <div />}

            {/* Authorised Signatory & Stamp */}
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontSize: "10px", color: "#374151", fontWeight: "600", marginBottom: "6px" }}>
                {company?.signatureText || "For Nexcore Alliance Pvt. Ltd."}
              </div>

              {/* Stamp & Signature container */}
              <div style={{
                position: "relative",
                minHeight: "75px",
                width: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "4px"
              }}>
                {company?.stampUrl && (
                  <img
                    src={resolveMediaUrl(company.stampUrl)}
                    alt="Official Stamp"
                    style={{
                      maxHeight: "70px",
                      maxWidth: "110px",
                      objectFit: "contain",
                      opacity: 0.88,
                      position: company?.signatureUrl ? "absolute" : "relative",
                      right: company?.signatureUrl ? "50px" : "auto",
                      pointerEvents: "none"
                    }}
                  />
                )}
                {company?.signatureUrl && (
                  <img
                    src={resolveMediaUrl(company.signatureUrl)}
                    alt="Authorised Signature"
                    style={{
                      maxHeight: "55px",
                      maxWidth: "140px",
                      objectFit: "contain",
                      zIndex: 1,
                      position: "relative"
                    }}
                  />
                )}
                {!company?.stampUrl && !company?.signatureUrl && (
                  <div style={{ height: "45px" }} />
                )}
              </div>

              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "5px", width: "190px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#1e293b" }}>Authorised Signatory</div>
              </div>
            </div>
          </div>

          {/* Footer bar */}
          <div style={{
            marginTop: "24px", borderTop: `3px solid ${cfg.color}`, paddingTop: "8px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: "9px", color: "#94a3b8"
          }}>
            <span>{company?.footerNote || "This is a computer generated document."}</span>
            <span>{company?.website || company?.email || ""}</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GSTItemsTable({ items, color, isInterState }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
        <thead>
          <tr style={{ background: color, color: "#fff" }}>
            {["#", "Description / HSN", "Qty", "Unit", "Rate", "Disc%", "Taxable", "GST%",
              isInterState ? "IGST" : "CGST", isInterState ? "" : "SGST", "Total"
            ].filter(Boolean).map((h, i) => (
              <th key={i} style={{
                padding: "7px 8px", textAlign: ["Taxable", "IGST", "CGST", "SGST", "Total", "Rate"].includes(h) ? "right" : "left",
                fontWeight: "600", fontSize: "9.5px", letterSpacing: "0.3px"
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", color: "#6b7280" }}>{i + 1}</td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: "600" }}>{item.description}</div>
                {item.productCode && <div style={{ fontSize: "9px", color: "#9ca3af" }}>{item.productCode}</div>}
                {item.hsnCode && <div style={{ fontSize: "9px", color: "#6b7280" }}>HSN: {item.hsnCode}</div>}
              </td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", textAlign: "right" }}>{item.qty}</td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>{item.unit || "Nos"}</td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmtINR(item.rate)}</td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", textAlign: "right" }}>{item.discount || 0}%</td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmtINR(item.taxableAmount)}</td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", textAlign: "right" }}>{item.gstRate || 18}%</td>
              {isInterState ? (
                <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmtINR(item.igst)}</td>
              ) : (
                <>
                  <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmtINR(item.cgst)}</td>
                  <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", textAlign: "right" }}>{fmtINR(item.sgst)}</td>
                </>
              )}
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "700" }}>{fmtINR(item.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeliveryItemsTable({ items, color }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
        <thead>
          <tr style={{ background: color, color: "#fff" }}>
            {["#", "Description / HSN", "Qty", "Unit", "Serial Numbers", "Remarks"].map((h, i) => (
              <th key={i} style={{ padding: "7px 8px", textAlign: "left", fontWeight: "600", fontSize: "9.5px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", color: "#6b7280" }}>{i + 1}</td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: "600" }}>{item.description}</div>
                {item.hsnCode && <div style={{ fontSize: "9px", color: "#6b7280" }}>HSN: {item.hsnCode}</div>}
              </td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>{item.qty}</td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0" }}>{item.unit || "Nos"}</td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", fontFamily: "monospace", fontSize: "9px" }}>
                {item.serialNumbers?.join(", ") || "—"}
              </td>
              <td style={{ padding: "6px 8px", border: "1px solid #e2e8f0", color: "#6b7280" }}>{item.remarks || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TotalsSection({ doc, color, accent, isInvoice }) {
  const rows = [
    ["Subtotal", doc.subtotal],
    doc.totalDiscount > 0 && ["Discount", -doc.totalDiscount],
    !doc.isInterState && doc.totalCgst > 0 && [`CGST`, doc.totalCgst],
    !doc.isInterState && doc.totalSgst > 0 && [`SGST`, doc.totalSgst],
    doc.isInterState && doc.totalIgst > 0 && [`IGST`, doc.totalIgst],
    doc.roundOff && ["Round Off", doc.roundOff],
  ].filter(Boolean);

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
      <div style={{ minWidth: "280px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td style={{ padding: "5px 12px", border: "1px solid #e2e8f0", color: "#6b7280" }}>{label}</td>
                <td style={{ padding: "5px 12px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: "500" }}>
                  {fmtINR(value)}
                </td>
              </tr>
            ))}
            <tr style={{ background: color }}>
              <td style={{ padding: "8px 12px", color: "#fff", fontWeight: "700", fontSize: "12px" }}>Grand Total</td>
              <td style={{ padding: "8px 12px", color: "#fff", textAlign: "right", fontWeight: "800", fontSize: "13px" }}>
                {fmtINR(doc.grandTotal)}
              </td>
            </tr>
            {isInvoice && doc.advanceAdjusted > 0 && (
              <tr>
                <td style={{ padding: "5px 12px", border: "1px solid #e2e8f0", color: "#059669" }}>Advance Adjusted</td>
                <td style={{ padding: "5px 12px", border: "1px solid #e2e8f0", textAlign: "right", color: "#059669", fontWeight: "600" }}>
                  — {fmtINR(doc.advanceAdjusted)}
                </td>
              </tr>
            )}
            {isInvoice && doc.receivedAmount > 0 && (
              <tr>
                <td style={{ padding: "5px 12px", border: "1px solid #e2e8f0", color: "#059669" }}>Amount Received</td>
                <td style={{ padding: "5px 12px", border: "1px solid #e2e8f0", textAlign: "right", color: "#059669", fontWeight: "600" }}>
                  — {fmtINR(doc.receivedAmount)}
                </td>
              </tr>
            )}
            {isInvoice && (
              <tr style={{ background: doc.balanceAmount > 0 ? "#fee2e2" : "#d1fae5" }}>
                <td style={{ padding: "7px 12px", fontWeight: "700", color: doc.balanceAmount > 0 ? "#dc2626" : "#059669" }}>
                  {doc.balanceAmount > 0 ? "Balance Due" : "PAID ✓"}
                </td>
                <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: "800", color: doc.balanceAmount > 0 ? "#dc2626" : "#059669" }}>
                  {fmtINR(doc.balanceAmount || 0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Amount in Words */}
        {doc.amountInWords && (
          <div style={{ marginTop: "8px", background: accent, border: `1px solid ${color}40`, borderRadius: "6px", padding: "8px 12px", fontSize: "10px" }}>
            <strong>Amount in Words:</strong> {doc.amountInWords}
          </div>
        )}
        {/* Proforma advance section */}
        {doc.advanceRequired > 0 && (
          <div style={{ marginTop: "8px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "6px", padding: "8px 12px", fontSize: "10px" }}>
            <div><strong>Advance Required:</strong> {fmtINR(doc.advanceRequired)}</div>
            {doc.advanceReceived > 0 && <div style={{ color: "#059669" }}><strong>Advance Received:</strong> {fmtINR(doc.advanceReceived)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
