"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/services/api";

import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { inr, inrShort, fmtDate } from "@/lib/crm-data";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/sales/documents?type=Invoice').then(data => {
      setInvoices(data);
      setLoading(false);
    });
  }, []);

  const totalValue = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalReceived = invoices.reduce((acc, i) => acc + (i.receivedAmount || 0), 0);
  const outstanding = totalValue - totalReceived;

  const columns = [
    { header: "Invoice", cell: (i) => <span className="font-semibold">{i.id}</span> },
    { header: "Customer", cell: (i) => (<Link href={`/customers/${i.customerId || "CUST-1001"}`} className="font-medium text-primary hover:underline">{i.customerName}</Link>) },
    { header: "Date", cell: (i) => fmtDate(i.date) },
    { header: "Due", cell: (i) => fmtDate(i.dueDate || i.date) },
    { header: "Subtotal", cell: (i) => inr(i.subtotal) },
    { header: "Tax", cell: (i) => inr(i.taxAmount) },
    { header: "Total", cell: (i) => <span className="font-semibold">{inr(i.totalAmount)}</span> },
    { header: "Balance", cell: (i) => <span className={i.totalAmount - i.receivedAmount > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>{inr(i.totalAmount - i.receivedAmount)}</span> },
    { header: "Status", cell: (i) => <StatusBadge value={i.status} /> },
    { header: "", cell: () => <div className="flex gap-1"><Button size="sm" variant="outline">PDF</Button><Button size="sm" variant="outline">Share</Button></div> },
  ];

  return (
    <>
      <PageHeader breadcrumb="Sales / Sales Invoices" title="Sales Invoices" subtitle="GST invoices linked to sales orders and deliveries, with due dates, outstanding balance and PDF / email / WhatsApp sharing." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Invoices" value={invoices.length} />
        <Kpi label="Outstanding" value={inrShort(outstanding)} tone="danger" />
        <Kpi label="Total Invoiced" value={inrShort(totalValue)} tone="success" />
      </div>
      <div className="mt-5">
        {loading ? <p className="text-muted-foreground">Loading invoices from backend...</p> : (
          <DataTable
            rows={invoices}
            columns={columns}
            searchKeys={["id", "customerName", "status", "salesperson"]}
          />
        )}
      </div>
    </>
  );
}
