"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

import {
  getBankStatus,
  getBankTransactions,
  addBankTransaction,
  syncHdfcTransactions,
  reconcileTransaction,
  dismissTransaction,
  deleteBankTransaction,
  getPaymentsLedger,
} from "@/services/documentService";
import { DataTable, Kpi, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { inr, inrShort, fmtDate } from "@/lib/crm-data";

const emptyForm = { date: new Date().toISOString().split("T")[0], amount: "", senderName: "", reference: "", bankAccount: "" };

export default function Page() {
  const [hdfcConfigured, setHdfcConfigured] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [status, txns, ledger] = await Promise.all([
        getBankStatus().catch(() => ({ hdfcConfigured: false })),
        getBankTransactions().catch(() => []),
        getPaymentsLedger().catch(() => []),
      ]);
      setHdfcConfigured(!!status?.hdfcConfigured);
      setTransactions(Array.isArray(txns) ? txns : []);
      setPayments(Array.isArray(ledger) ? ledger : []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncHdfcTransactions();
      showToast(`Synced from HDFC — ${res.fetched} fetched, ${res.created} new.`);
      await load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.date || !form.amount) return showToast("Date and amount are required", "error");
    setSaving(true);
    try {
      await addBankTransaction({ ...form, amount: Number(form.amount) });
      showToast("Transaction added and matched against open invoices.");
      setShowAddModal(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReconcile = async (txn) => {
    if (!txn.suggestedInvoiceId) {
      return showToast("No suggested invoice to reconcile against — dismiss this row or add a matching invoice first.", "error");
    }
    if (!confirm(`Reconcile ${inr(txn.amount)} from "${txn.senderName}" against invoice ${txn.suggestedInvoiceNo}? This records it as a real payment.`)) return;
    try {
      await reconcileTransaction(txn._id);
      showToast(`Reconciled against ${txn.suggestedInvoiceNo}.`);
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDismiss = async (txn) => {
    try {
      await dismissTransaction(txn._id);
      showToast("Marked as reviewed, no match.");
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (txn) => {
    if (!confirm(`Delete this bank transaction row? This can't be undone.`)) return;
    try {
      await deleteBankTransaction(txn._id);
      showToast("Transaction deleted");
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl ${toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
            }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleAdd} className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Bank Transaction</h2>
              <p className="text-xs text-gray-500">Manual entry — for statement rows until HDFC sync is configured, or to log a credit the API missed.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Date *</label>
                <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Amount (₹) *</label>
                <input type="number" min="0" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">Sender name (as shown in bank statement)</label>
              <input type="text" placeholder="e.g. SHAKTI ENGG" value={form.senderName} onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Reference / UTR</label>
                <input type="text" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Bank account</label>
                <input type="text" placeholder="HDFC-XXXX1234" value={form.bankAccount} onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setForm(emptyForm); }}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">
                {saving ? "Adding..." : "Add & Match"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <PageHeader
        breadcrumb="Finance / Banking"
        title="Bank Reconciliation"
        subtitle="Incoming credits are matched to open invoices by name and amount, with a confidence score. Nothing is auto-finalised — every match needs a human to reconcile it."
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="text-xs h-8.5 px-2.5 sm:px-3 bg-card shadow-xs cursor-pointer">
              + Add Transaction
            </Button>
            <Button size="sm" onClick={handleSync} disabled={syncing} className="bg-accent font-bold text-accent-foreground hover:bg-accent/90 text-xs h-8.5 px-2.5 sm:px-3 cursor-pointer">
              {syncing ? "Syncing…" : "Sync from HDFC"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <Kpi label="Credits fetched" value={transactions.length} />
        <Kpi label="Suggested matches" value={transactions.filter((t) => t.status === "Suggested").length} tone="success" />
        <Kpi label="Needs review" value={transactions.filter((t) => t.status === "Needs Review").length} tone="warning" />
        <Kpi label="Unmatched" value={transactions.filter((t) => t.status === "Unmatched").length} tone="danger" />
      </div>

      <div className="mt-4">
        {hdfcConfigured ? (
          <NotBuiltNotice>HDFC API is configured — use "Sync from HDFC" to pull the latest statement.</NotBuiltNotice>
        ) : (
          <NotBuiltNotice>
            HDFC API is not connected yet (no HDFC_API_BASE_URL / credentials in the backend .env). "Sync from HDFC" will tell you
            that clearly rather than fail silently. Until then, use "+ Add Transaction" to enter statement rows manually — matching,
            review and reconciliation all work the same either way.
          </NotBuiltNotice>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : (
          <DataTable
            rows={transactions}
            columns={[
              { header: "Date", cell: (r) => fmtDate(r.date) },
              { header: "Sender name in bank", cell: (r) => <span className="font-medium">{r.senderName}</span> },
              { header: "Amount", cell: (r) => <span className="font-semibold">{inr(r.amount)}</span> },
              { header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.reference || "—"}</span> },
              { header: "Source", cell: (r) => <StatusBadge value={r.source} /> },
              { header: "Suggested invoice", cell: (r) => r.suggestedInvoiceNo || "—" },
              { header: "Suggested customer", cell: (r) => r.suggestedCustomerName || "—" },
              { header: "Confidence", cell: (r) => `${Math.round((r.confidence || 0) * 100)}%` },
              { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
              {
                header: "",
                cell: (r) =>
                  r.status === "Reconciled" ? (
                    <span className="text-xs text-muted-foreground">Reconciled → {r.reconciledInvoiceNo}</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleDismiss(r)}>Dismiss</Button>
                      <Button
                        size="sm"
                        disabled={!r.suggestedInvoiceId}
                        onClick={() => handleReconcile(r)}
                        className="bg-accent font-bold text-accent-foreground hover:bg-accent/90"
                      >
                        Reconcile
                      </Button>
                      {r.source === "Manual" && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(r)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  ),
              },
            ]}
            searchKeys={["senderName", "reference", "suggestedInvoiceNo", "suggestedCustomerName", "status"]}
            emptyLabel="No bank transactions yet — sync from HDFC or add one manually."
          />
        )}
      </div>

      <div className="mt-4">
        <Section title="Controls on banking operations">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Matching is by customer-name similarity plus an exact-amount bonus against each open invoice's outstanding balance — never auto-finalised.</li>
            <li>Reconciling a transaction records it as a real payment on the matched invoice, updating its balance and status immediately.</li>
            <li>Sender name mismatch (e.g. "SHAKTI ENGG" vs registered name) is tolerated by the matcher — it scores word overlap, not exact string equality.</li>
            <li>Every match, dismissal and reconciliation is a real database write, auditable via the invoice's payment history.</li>
          </ul>
        </Section>
      </div>

      <div className="mt-5">
        <Section
          title="All received payments"
          description={`${payments.length} recorded receipts · ${inrShort(totalReceived)} total — includes payments recorded here and directly on Sales Invoices.`}
        >
          <DataTable
            rows={payments}
            columns={[
              { header: "Date", cell: (r) => fmtDate(r.date) },
              {
                header: "Invoice",
                cell: (r) => (
                  <Link href={`/invoices/${r.invoiceNo}`} className="font-medium text-primary hover:underline">
                    {r.invoiceNo}
                  </Link>
                ),
              },
              { header: "Customer", cell: (r) => r.customerName },
              { header: "Amount", cell: (r) => <span className="font-semibold text-success">{inr(r.amount)}</span> },
              { header: "Mode", cell: (r) => <StatusBadge value={r.mode} /> },
              { header: "Reference", cell: (r) => <span className="font-mono text-xs">{r.reference || "—"}</span> },
              { header: "Recorded by", cell: (r) => r.recordedBy || "—" },
            ]}
            searchKeys={["invoiceNo", "customerName", "reference", "mode"]}
            emptyLabel="No payments recorded yet."
          />
        </Section>
      </div>
    </>
  );
}
