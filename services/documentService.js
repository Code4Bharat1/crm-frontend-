const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';

const req = async (path, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...options.headers },
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Request failed'); }
  return res.json();
};

// ─── Company ────────────────────────────────────────────────────────────────
export const getCompany = () => req('/company');
export const updateCompany = (data) => req('/company', { method: 'PUT', body: JSON.stringify(data) });
export const uploadCompanyMedia = (data) => req('/company/upload', { method: 'POST', body: JSON.stringify(data) });

// ─── Customers ──────────────────────────────────────────────────────────────
export const getCustomers = (params = {}) => req('/customers?' + new URLSearchParams(params));
export const getCustomer = (id) => req(`/customers/${id}`);
export const createCustomer = (data) => req('/customers', { method: 'POST', body: JSON.stringify(data) });
export const updateCustomer = (id, data) => req(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCustomer = (id) => req(`/customers/${id}`, { method: 'DELETE' });

// ─── Suppliers ───────────────────────────────────────────────────────────────
export const getSuppliers = (params = {}) => req('/suppliers?' + new URLSearchParams(params));
export const getSupplier = (id) => req(`/suppliers/${id}`);
export const createSupplier = (data) => req('/suppliers', { method: 'POST', body: JSON.stringify(data) });
export const updateSupplier = (id, data) => req(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSupplier = (id) => req(`/suppliers/${id}`, { method: 'DELETE' });

// ─── Quotations ──────────────────────────────────────────────────────────────
export const getQuotations = (params = {}) => req('/quotations?' + new URLSearchParams(params));
export const getQuotation = (id) => req(`/quotations/${id}`);
export const createQuotation = (data) => req('/quotations', { method: 'POST', body: JSON.stringify(data) });
export const updateQuotation = (id, data) => req(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteQuotation = (id) => req(`/quotations/${id}`, { method: 'DELETE' });
export const convertQuotationToProforma = (id, data = {}) => req(`/quotations/${id}/convert-to-proforma`, { method: 'POST', body: JSON.stringify(data) });
export const convertQuotationToSO = (id, data) => req(`/quotations/${id}/convert-to-so`, { method: 'POST', body: JSON.stringify(data) });

// ─── Proforma Invoices ───────────────────────────────────────────────────────
export const getProformas = (params = {}) => req('/proformas?' + new URLSearchParams(params));
export const getProforma = (id) => req(`/proformas/${id}`);
export const createProforma = (data) => req('/proformas', { method: 'POST', body: JSON.stringify(data) });
export const updateProforma = (id, data) => req(`/proformas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProforma = (id) => req(`/proformas/${id}`, { method: 'DELETE' });
export const recordProformaAdvance = (id, data) => req(`/proformas/${id}/record-advance`, { method: 'POST', body: JSON.stringify(data) });
export const convertProformaToSO = (id, data) => req(`/proformas/${id}/convert-to-so`, { method: 'POST', body: JSON.stringify(data) });

// ─── Sales Orders ────────────────────────────────────────────────────────────
export const getSalesOrders = (params = {}) => req('/sales-orders?' + new URLSearchParams(params));
export const getSalesOrder = (id) => req(`/sales-orders/${id}`);
export const createSalesOrder = (data) => req('/sales-orders', { method: 'POST', body: JSON.stringify(data) });
export const updateSalesOrder = (id, data) => req(`/sales-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSalesOrder = (id) => req(`/sales-orders/${id}`, { method: 'DELETE' });
export const createDNFromSO = (id, data) => req(`/sales-orders/${id}/create-delivery-note`, { method: 'POST', body: JSON.stringify(data) });
export const createInvoiceFromSO = (id, data) => req(`/sales-orders/${id}/create-invoice`, { method: 'POST', body: JSON.stringify(data) });
export const createPOFromSO = (id, data) => req(`/sales-orders/${id}/create-purchase-order`, { method: 'POST', body: JSON.stringify(data) });

// ─── Delivery Notes ──────────────────────────────────────────────────────────
export const getDeliveryNotes = (params = {}) => req('/delivery-notes?' + new URLSearchParams(params));
export const getDeliveryNote = (id) => req(`/delivery-notes/${id}`);
export const createDeliveryNote = (data) => req('/delivery-notes', { method: 'POST', body: JSON.stringify(data) });
export const updateDeliveryNote = (id, data) => req(`/delivery-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDeliveryNote = (id) => req(`/delivery-notes/${id}`, { method: 'DELETE' });
export const markDelivered = (id, data) => req(`/delivery-notes/${id}/mark-delivered`, { method: 'POST', body: JSON.stringify(data) });
export const createInvoiceFromDN = (id, data = {}) => req(`/delivery-notes/${id}/create-invoice`, { method: 'POST', body: JSON.stringify(data) });

// ─── Sales Invoices ──────────────────────────────────────────────────────────
export const getInvoices = (params = {}) => req('/invoices?' + new URLSearchParams(params));
export const getInvoice = (id) => req(`/invoices/${id}`);
export const createInvoice = (data) => req('/invoices', { method: 'POST', body: JSON.stringify(data) });
export const updateInvoice = (id, data) => req(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteInvoice = (id) => req(`/invoices/${id}`, { method: 'DELETE' });
export const recordPayment = (id, data) => req(`/invoices/${id}/record-payment`, { method: 'POST', body: JSON.stringify(data) });

// ─── Purchase Orders ─────────────────────────────────────────────────────────
export const getPurchaseOrders = (params = {}) => req('/purchase-orders?' + new URLSearchParams(params));
export const getPurchaseOrder = (id) => req(`/purchase-orders/${id}`);
export const createPurchaseOrder = (data) => req('/purchase-orders', { method: 'POST', body: JSON.stringify(data) });
export const updatePurchaseOrder = (id, data) => req(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePurchaseOrder = (id) => req(`/purchase-orders/${id}`, { method: 'DELETE' });
export const markPOReceived = (id, data) => req(`/purchase-orders/${id}/mark-received`, { method: 'POST', body: JSON.stringify(data) });

// ─── Products & Inventory ───────────────────────────────────────────────────
export const getProducts = (params = {}) => req('/products?' + new URLSearchParams(params));
export const getProduct = (id) => req(`/products/${id}`);
export const createProduct = (data) => req('/products', { method: 'POST', body: JSON.stringify(data) });
export const updateProduct = (id, data) => req(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProduct = (id) => req(`/products/${id}`, { method: 'DELETE' });
export const adjustProductStock = (id, data) => req(`/products/${id}/adjust-stock`, { method: 'POST', body: JSON.stringify(data) });

// ─── Serial Numbers ──────────────────────────────────────────────────────────
export const getSerialNumbers = (params = {}) => req('/serial-numbers?' + new URLSearchParams(params));
export const getSerialNumber = (id) => req(`/serial-numbers/${id}`);
export const createSerialNumber = (data) => req('/serial-numbers', { method: 'POST', body: JSON.stringify(data) });
export const updateSerialNumber = (id, data) => req(`/serial-numbers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSerialNumber = (id) => req(`/serial-numbers/${id}`, { method: 'DELETE' });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Calculate line item totals with CGST/SGST or IGST split */
export const calcItem = (item, isInterState = false) => {
  const qty = parseFloat(item.qty) || 0;
  const rate = parseFloat(item.rate) || 0;
  const discount = parseFloat(item.discount) || 0;
  const gstRate = parseFloat(item.gstRate) || 18;
  const taxableAmount = Math.round((qty * rate * (1 - discount / 100)) * 100) / 100;
  const gstAmount = Math.round(taxableAmount * gstRate / 100 * 100) / 100;
  const cgst = isInterState ? 0 : Math.round(gstAmount / 2 * 100) / 100;
  const sgst = isInterState ? 0 : Math.round(gstAmount / 2 * 100) / 100;
  const igst = isInterState ? gstAmount : 0;
  const totalAmount = Math.round((taxableAmount + gstAmount) * 100) / 100;
  return { ...item, taxableAmount, cgst, sgst, igst, totalAmount };
};

/** Recalculate document totals from items array */
export const calcTotals = (items, isInterState = false) => {
  const subtotal = items.reduce((s, i) => s + (i.taxableAmount || 0), 0);
  const totalDiscount = items.reduce((s, i) => s + ((parseFloat(i.qty) * parseFloat(i.rate) * (parseFloat(i.discount) / 100)) || 0), 0);
  const totalCgst = items.reduce((s, i) => s + (i.cgst || 0), 0);
  const totalSgst = items.reduce((s, i) => s + (i.sgst || 0), 0);
  const totalIgst = items.reduce((s, i) => s + (i.igst || 0), 0);
  const grandTotal = Math.round((subtotal + totalCgst + totalSgst + totalIgst) * 100) / 100;
  return { subtotal, totalDiscount, totalCgst, totalSgst, totalIgst, grandTotal, isInterState };
};

export const fmtINR = (n = 0) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
