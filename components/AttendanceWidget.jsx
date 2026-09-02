"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getToken } from "@/lib/authUtils";
import { API_BASE_URL } from "@/lib/api";

export function AttendanceWidget() {
  const [status, setStatus] = useState("LOADING");
  const [loading, setLoading] = useState(true);
  const [punchData, setPunchData] = useState(null);

  const fetchStatus = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus(data.data.status);
        setPunchData(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handlePunchIn = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/punch-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Punched in successfully!");
        fetchStatus();
      } else {
        toast.error(data.message || "Failed to punch in");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/punch-out`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Punched out successfully!");
        fetchStatus();
      } else {
        toast.error(data.message || "Failed to punch out");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (loading && status === "LOADING") return <div className="h-16 flex items-center px-4">Loading attendance...</div>;

  return (
    <div className="rounded-md border border-border bg-card p-4 flex items-center justify-between mb-4">
      <div>
        <h3 className="font-semibold text-sm">Attendance Today</h3>
        <div className="text-xs text-muted-foreground mt-1">
          {status === "NOT_PUNCHED_IN" && "You haven't punched in yet."}
          {status === "WORKING" && `Punched in at: ${new Date(punchData?.checkIn).toLocaleTimeString()}`}
          {status === "COMPLETED" && `Worked: ${Math.floor(punchData?.workedMinutes / 60)}h ${punchData?.workedMinutes % 60}m`}
        </div>
      </div>
      <div>
        {status === "NOT_PUNCHED_IN" && (
          <Button onClick={handlePunchIn} disabled={loading} size="sm">Punch In</Button>
        )}
        {status === "WORKING" && (
          <Button onClick={handlePunchOut} disabled={loading} variant="destructive" size="sm">Punch Out</Button>
        )}
        {status === "COMPLETED" && (
          <Button disabled size="sm" variant="secondary">Completed</Button>
        )}
      </div>
    </div>
  );
}
