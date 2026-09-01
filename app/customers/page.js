"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/services/api";

import { DataTable, Kpi, PageHeader, StatusBadge, Field } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inrShort } from "@/lib/crm-data";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/customers').then(data => {
      setCustomers(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const columns = [
    {
      header: "Customer",
      cell: (c) => (
        <div>
          <Link href={`/customers/${c.id}`} className="font-semibold text-primary hover:underline">
            {c.name}
          </Link>
          <p className="text-xs text-muted-foreground">{c.id} · {c.industry}</p>
        </div>
      ),
    },
    { header: "Area", cell: (c) => c.area },
    { header: "Salesperson", cell: (c) => c.salesPerson },
    { header: "Type", cell: (c) => c.type },
    { header: "Status", cell: (c) => <StatusBadge value={c.status} /> },
    { header: "Total Sales", cell: (c) => <span className="font-semibold">{inrShort(c.totalRevenue)}</span> },
    { header: "Outstanding", cell: (c) => <span className={c.outstanding > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>{inrShort(c.outstanding)}</span> },
    { header: "", cell: (c) => (<Button size="sm" variant="outline" asChild><Link href={`/customers/${c.id}`}>360 view</Link></Button>) },
  ];

  const totalOutstanding = customers.reduce((s, c) => s + (c.outstanding || 0), 0);

  return (
    <>
      <PageHeader
        breadcrumb="CRM / Customers"
        title="Customer Master"
        subtitle="Loaded dynamically from MongoDB backend"
        actions={<Button className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">Add customer</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Customers" value={customers.length} sub="Active master records" />
        <Kpi label="Total outstanding" value={inrShort(totalOutstanding)} tone="danger" />
      </div>
      <div className="mt-5">
        {loading ? <p className="text-muted-foreground">Loading customers from backend...</p> : (
          <DataTable
            rows={customers}
            columns={columns}
            searchKeys={["name", "id", "area", "salesPerson", "industry"]}
            filters={
              <>
                <Field label="Area"><Input placeholder="e.g. Chakan MIDC" /></Field>
                <Field label="Salesperson"><Input placeholder="e.g. Kiran Jadhav" /></Field>
                <Field label="Minimum outstanding"><Input placeholder="₹" /></Field>
              </>
            }
          />
        )}
      </div>
    </>
  );
}
