"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader, Kpi, StatusBadge } from "@/components/crm-ui";
import { fmtDateTime } from "@/lib/crm-data";
import { getNotifications, markNotificationAsRead } from "@/services/notificationService";
import { Bell, CheckCircle2, ArrowRight } from "lucide-react";

export default function Page() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifs = async () => {
    try {
      const res = await getNotifications();
      if (res?.notifications) {
        setItems(res.notifications);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setItems((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      setItems((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const [filterType, setFilterType] = useState("All");

  const unreadCount = items.filter((n) => !n.read).length;
  const criticalCount = items.filter((n) => n.severity === "danger").length;
  const projectCount = items.filter((n) => n.type === "Project").length;
  const serviceCount = items.filter((n) => n.type === "Service").length;

  const filteredItems = items.filter((n) => {
    if (filterType === "All") return true;
    if (filterType === "Unread") return !n.read;
    return n.type === filterType;
  });

  return (
    <>
      <PageHeader
        breadcrumb="Administration / Notifications"
        title="Notification Centre"
        subtitle="Live notifications for technician dispatches, project manager assignments, appointments, overdue follow-ups, and team alerts."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Unread" value={unreadCount} tone="accent" />
        <Kpi label="Technician Dispatches" value={serviceCount} tone="success" sub="Field service tickets" />
        <Kpi label="Project Alerts" value={projectCount} sub="PM Assignments" />
        <Kpi label="Total Alerts" value={items.length} />
      </div>

      {/* Filter Tabs */}
      <div className="mt-4 flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-2xs w-fit text-xs font-semibold">
        {["All", "Service", "Project", "Unread"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterType(tab)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === tab
                ? "bg-blue-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            {tab === "Service" ? `Technician Dispatch (${serviceCount})` : tab === "Project" ? `Project Manager (${projectCount})` : tab}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {filteredItems.length === 0 ? (
          <div className="panel p-8 text-center bg-white rounded-xl border border-gray-200">
            <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <h4 className="text-sm font-bold text-gray-700">No notifications found</h4>
            <p className="text-xs text-gray-400 mt-1">
              {loading ? "Loading updates..." : "You have no active notifications or assignment alerts at this time."}
            </p>
          </div>
        ) : (
          filteredItems.map((n) => (
            <div
              key={n._id || n.id}
              className={`panel flex flex-wrap items-start justify-between gap-3 p-4 transition-colors ${
                !n.read ? "bg-blue-50/50 border-blue-200" : ""
              }`}
            >
              <div className="flex-1 min-w-[280px]">
                <div className="flex items-center gap-2">
                  <StatusBadge value={n.type} />
                  <span className="text-sm font-semibold text-gray-900">{n.title}</span>
                  {n.recipient && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      To: {n.recipient}
                    </span>
                  )}
                  {!n.read && (
                    <span className="size-2 rounded-full bg-blue-600 animate-pulse" />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.detail}</p>
                {n.link && (
                  <div className="mt-2">
                    <Link
                      href={n.link}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                    >
                      Open Assigned Project Execution <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {n.at ? fmtDateTime(new Date(n.at)) : ""}
                </span>
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n._id || n.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
