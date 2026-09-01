"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchApi } from "@/services/api";

import { DataTable, Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { inr, inrShort, fmtDate } from "@/lib/crm-data";

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/sales/documents?type=Sales Order').then(data => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  const totalValue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  const columns = [
    { header: "Sales order", cell: (s) => (<Link href={`/orders/${s.id}`} className="font-semibold text-primary hover:underline">{s.id}</Link>) },
    { header: "Customer", cell: (s) => s.customerName },
    { header: "Salesperson", cell: (s) => s.salesperson },
    { header: "Date", cell: (s) => fmtDate(s.date) },
    { header: "Value", cell: (s) => inr(s.totalAmount) },
    { header: "Status", cell: (s) => <StatusBadge value={s.status} /> },
  ];

  return (
    <>
      <PageHeader breadcrumb="Sales / Sales Orders" title="Sales Orders" subtitle="Every order references its quotation and proforma, and drives deliveries, invoices, payments and project execution." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Sales orders" value={orders.length} />
        <Kpi label="Order value" value={inrShort(totalValue)} tone="success" />
      </div>
      <div className="mt-5">
        {loading ? <p className="text-muted-foreground">Loading sales orders from backend...</p> : (
          <DataTable
            rows={orders}
            columns={columns}
            searchKeys={["id", "customerName", "status", "salesperson"]}
          />
        )}
      </div>
    </>
  );
}
