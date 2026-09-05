"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { getAuditLogs, getAuditStats } from "@/lib/api";
import { Clock, RotateCw } from "lucide-react";

export default function Page() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ entries: 0, critical: 0, warnings: 0, retention: '7 years' });
  const [loading, setLoading] = useState(true);
  const [currentTimeIST, setCurrentTimeIST] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, logsData] = await Promise.all([
        getAuditStats(),
        getAuditLogs({ limit: 100 }) // fetching 100 recent logs for the table
      ]);
      setStats(statsData);
      setLogs(logsData.auditLogs || []);
    } catch (error) {
      console.error("Failed to load audit logs", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTimeIST(
        new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        }).format(new Date())
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <PageHeader
        breadcrumb="Administration / Audit Logs"
        title="Audit Logs"
        subtitle="Who did what, when and from where — all timestamps recorded and displayed in Indian Standard Time (IST / UTC+05:30)."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs shadow-sm">
              <Clock className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Live IST:</span>
              <span className="font-mono font-bold text-foreground">{currentTimeIST || "09:15 AM"}</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">UTC+05:30</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Entries" value={stats.entries} />
        <Kpi label="Critical" value={stats.critical} tone="danger" />
        <Kpi label="Warnings" value={stats.warnings} tone="warning" />
        <Kpi label="Retention" value={stats.retention} />
        <Kpi label="Timezone" value="IST" sub="Asia/Kolkata (+5:30)" tone="accent" />
      </div>
      <div className="mt-5">
        {loading ? (
          <div className="text-sm text-gray-500">Loading audit logs...</div>
        ) : (
          <DataTable
            rows={logs}
            columns={[
              {
                header: "When (IST)",
                cell: (r) => (
                  <div className="flex flex-col whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {fmtDateTime(r.createdAt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      IST (UTC+05:30)
                    </span>
                  </div>
                )
              },
              { header: "User", cell: (r) => <span className="font-semibold">{r.userName || r.userId}</span> },
              { header: "Action", cell: (r) => `${r.action} ${r.resourceType || ''} ${r.resourceId || ''} - ${r.description}` },
              { header: "IP address", cell: (r) => <span className="font-mono text-xs">{r.ipAddress}</span> },
              { header: "Severity", cell: (r) => <StatusBadge value={r.severity === 'CRITICAL' ? 'Critical' : r.severity === 'WARNING' ? 'Warning' : 'Info'} /> },
            ]}
            searchKeys={["userName", "action", "description", "module"]}
          />
        )}
      </div>
    </>
  );
}
