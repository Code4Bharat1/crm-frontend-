"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
const GROUPS = [
  { group: "Customer-wise", reports: ["Sales", "Quotations", "Products purchased", "Visits", "Communication", "Projects", "Service", "Outstanding", "Payments"] },
  { group: "Product-wise", reports: ["Quotations", "Customers quoted", "Orders", "Sales", "Conversion rate", "Stock movement"] },
  { group: "Salesperson-wise", reports: ["Leads", "Visits", "Quotations", "Orders", "Revenue", "Target achievement"] },
  { group: "Visit-wise", reports: ["Employee", "Customer", "Date", "Area", "Outcome", "Follow-up"] },
  { group: "Quotation-wise", reports: ["Customer", "Product", "Value", "Status", "Salesperson", "Conversion"] },
  { group: "Finance", reports: ["Outstanding", "Payments", "Overdue invoices", "Customer ledger", "Bank reconciliation", "GST register"] },
  { group: "Project", reports: ["Revenue", "Costs", "Profit", "Margin", "Suppliers", "Employee effort"] },
  { group: "Service", reports: ["Requests", "Warranty", "Engineer effort", "Parts consumed", "Service revenue"] },
];

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Administration / Reports" title="Reports" subtitle="Centralised reporting across customers, products, salespeople, visits, quotations, finance, projects and service — with filters, search and Excel/PDF export." />
      
      <div className="mt-2 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {GROUPS.map((g) => (
          <Section key={g.group} title={g.group}>
            <ul className="space-y-1.5 text-sm">
              {g.reports.map((r) => (
                <li key={r} className="flex items-center justify-between rounded-md border border-border px-2.5 py-2">
                  <span>{r}</span>
                  <span className="flex gap-1"><Button size="sm" variant="outline">Excel</Button><Button size="sm" variant="outline">PDF</Button></span>
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
    </>
  );
}
