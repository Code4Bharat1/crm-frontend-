"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  UserPlus,
  Calendar,
  RefreshCw,
  Mail,
  CheckCircle2,
  Send,
  FileText,
  Search,
  ChevronRight,
  User,
  ExternalLink,
  Sparkles,
  Phone,
  Eye,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/services/api";
import { getQuotations, getCompany, fmtINR } from "@/services/documentService";
import { DocumentPrintView } from "@/components/DocumentPrintView";

import { Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate, LEAD_STAGES } from "@/lib/crm-data";

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [company, setCompany] = useState(null);
  const [viewingQuotation, setViewingQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Email modal state
  const [selectedLead, setSelectedLead] = useState(null);
  const [emailType, setEmailType] = useState("followup");
  const [targetStage, setTargetStage] = useState("Contacted");
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadLeads = useCallback(async () => {
    try {
      const [leadsData, quotesData, compData] = await Promise.all([
        fetchApi("/sales/leads"),
        getQuotations().catch(() => []),
        getCompany().catch(() => null),
      ]);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setQuotations(Array.isArray(quotesData) ? quotesData : []);
      setCompany(compData);
    } catch (err) {
      console.error("Error loading leads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const leadQuotationMap = useMemo(() => {
    const map = {};
    if (!quotations.length || !leads.length) return map;

    leads.forEach((l) => {
      const cleanName = (l.customerName || "")
        .trim()
        .toLowerCase()
        .replace(/^["'\s]+|["'\s]+$/g, "");
      const cleanEmail = (l.customerEmail || "").trim().toLowerCase();
      const leadId = (l.id || "").trim().toLowerCase();

      // Find matching quotation (most recent first)
      const matched = quotations.find((q) => {
        const qCustName = (q.customer?.name || "")
          .trim()
          .toLowerCase()
          .replace(/^["'\s]+|["'\s]+$/g, "");
        const qCustEmail = (q.customer?.email || "").trim().toLowerCase();
        const qNotes = (q.notes || "").toLowerCase();
        const qSubject = (q.subject || "").toLowerCase();
        const lNotes = (l.notes || "").toLowerCase();

        // Check if leadId is referenced
        if (leadId && (qNotes.includes(leadId) || qSubject.includes(leadId))) return true;

        // Check if quotation number is in lead notes
        if (q.quotationNo && lNotes.includes(q.quotationNo.toLowerCase())) return true;

        // Check email match
        if (cleanEmail && qCustEmail && cleanEmail === qCustEmail) return true;

        // Check customer name match
        if (
          cleanName &&
          qCustName &&
          (cleanName === qCustName ||
            cleanName.includes(qCustName) ||
            qCustName.includes(cleanName))
        )
          return true;

        return false;
      });

      if (matched) {
        map[l.id] = matched;
      }
    });

    return map;
  }, [quotations, leads]);

  const handleQuotationAction = useCallback(
    (lead, forceCreate = false) => {
      const existingQuotation = leadQuotationMap[lead.id];
      if (existingQuotation && !forceCreate) {
        // Show existing quotation directly in print / view modal
        setViewingQuotation(existingQuotation);
        return;
      }

      // Direct show create quotation form with lead pre-filled parameters
      const cleanCustomerName = (lead.customerName || "")
        .replace(/^["'\s]+|["'\s]+$/g, "")
        .trim();
      let reqSnippet = "";
      if (lead.notes) {
        const match = lead.notes.match(/Requirement:\s*([\s\S]*?)(?:\n\n|$)/i);
        reqSnippet = match ? match[1].trim() : lead.notes.split("\n\n[")[0].trim();
      }

      const params = new URLSearchParams({
        action: "create",
        customerName: cleanCustomerName,
        email: lead.customerEmail || "",
        phone: lead.phone || lead.customerPhone || "",
        subject: lead.source ? `Quotation for ${lead.source}` : `Quotation for ${cleanCustomerName}`,
        notes: reqSnippet || (lead.id ? `Ref Lead: ${lead.id}` : ""),
        leadId: lead.id || "",
      });

      router.push(`/quotations?${params.toString()}`);
    },
    [leadQuotationMap, router]
  );

  const handleSyncGmail = useCallback(
    async (isSilent = false) => {
      setSyncing(true);
      if (!isSilent) toast.info("Checking Gmail for replies...");

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/sync-gmail`
        );
        const data = await res.json();

        if (res.ok) {
          const contactedLeads = (data.progressions || []).filter(
            (p) => p.nextStage === "Contacted"
          );
          if (contactedLeads.length > 0) {
            contactedLeads.forEach((p) => {
              toast.success(`Lead "${p.customerName}" moved to Contacted!`, {
                description: "Outgoing reply detected in Gmail.",
              });
            });
            await loadLeads();
          } else if (!isSilent) {
            toast.success("Gmail is up to date", {
              description: "No new unlinked replies found.",
            });
            await loadLeads();
          }
        } else if (!isSilent) {
          toast.error(data.message || "Failed to sync Gmail");
        }
      } catch (err) {
        console.error("Error syncing Gmail:", err);
        if (!isSilent) toast.error("Could not connect to Gmail sync service");
      } finally {
        setSyncing(false);
      }
    },
    [loadLeads]
  );

  const openEmailModal = (lead, defaultType = "followup") => {
    let recipientEmail = lead.customerEmail || "";
    if (!recipientEmail && lead.notes) {
      const match = lead.notes.match(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
      );
      if (match) recipientEmail = match[1];
    }

    setSelectedLead(lead);
    setEmailType(defaultType);

    if (defaultType === "meeting") {
      setTargetStage("Potential");
      setEmailForm({
        to: recipientEmail,
        subject: `Meeting Request: Discussion with ${lead.customerName}`,
        message: `Hi ${lead.customerName},\n\nWe would love to schedule a brief 15-minute call to understand your timeline and project specifications better.\n\nWould tomorrow morning or afternoon work for you?\n\nBest regards,\nSales Team`,
      });
    } else {
      setTargetStage("Contacted");
      setEmailForm({
        to: recipientEmail,
        subject: `Regarding Inquiry - ${lead.customerName}`,
        message: `Hi ${lead.customerName},\n\nThank you for reaching out to us. Regarding your inquiry, we would be pleased to assist you with your requirements.\n\nPlease let us know if you have any questions or when would be a convenient time to discuss.\n\nBest regards,\nSales Team`,
      });
    }
  };

  const applyTemplate = (type) => {
    if (!selectedLead) return;
    setEmailType(type);

    if (type === "followup") {
      setTargetStage("Contacted");
      setEmailForm((f) => ({
        ...f,
        subject: `Following up: ${selectedLead.customerName} - Inquiry`,
        message: `Hi ${selectedLead.customerName},\n\nJust following up on your inquiry. Please let us know if you need any additional specifications, pricing, or product demonstrations.\n\nLooking forward to hearing from you.\n\nBest regards,\nSales Team`,
      }));
    } else if (type === "meeting") {
      setTargetStage("Potential");
      setEmailForm((f) => ({
        ...f,
        subject: `Meeting Request: Discussion with ${selectedLead.customerName}`,
        message: `Hi ${selectedLead.customerName},\n\nWe would love to schedule a brief 15-minute call to understand your timeline and project specifications better.\n\nWould tomorrow morning or afternoon work for you?\n\nBest regards,\nSales Team`,
      }));
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm.to || !emailForm.subject || !emailForm.message) {
      toast.error("Please fill in recipient email, subject, and message.");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: emailForm.to,
            subject: emailForm.subject,
            message: emailForm.message,
            leadId: selectedLead?.id,
            emailType,
            targetStage,
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        const destinationStage = targetStage || data.stage || "Contacted";
        toast.success(`Email sent to ${emailForm.to}!`, {
          description: `Lead moved to "${destinationStage}" section.`,
        });
        setSelectedLead(null);
        await loadLeads();
        setActiveTab(destinationStage);
      } else {
        toast.error(data.message || "Failed to send email");
      }
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error("Error sending email through server");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleUpdateStage = async (leadId, newStage, customerName = "Lead") => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/sales/leads/${leadId}/stage`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        if (data.conversion?.customer) {
          const { customer, created } = data.conversion;
          toast.success(
            created
              ? `Lead "${customerName}" won — customer ${customer.id} created!`
              : `Lead "${customerName}" won — linked to existing customer ${customer.id}.`
          );
        } else {
          toast.success(`Lead "${customerName}" moved to "${newStage}"!`);
        }
        await loadLeads();
        setActiveTab(newStage);
      } else {
        toast.error(data.message || "Failed to update stage");
      }
    } catch (err) {
      console.error("Error updating stage:", err);
      toast.error("Could not update lead stage");
    }
  };

  useEffect(() => {
    loadLeads();
    handleSyncGmail(true);
  }, [loadLeads, handleSyncGmail]);

  // Filter leads based on active stage and search query
  const getFilteredLeads = (stageTab) => {
    return leads.filter((l) => {
      const matchesStage = stageTab === "all" || l.stage === stageTab;
      if (!matchesStage) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (l.customerName || "").toLowerCase();
      const email = (l.customerEmail || "").toLowerCase();
      const id = (l.id || "").toLowerCase();
      const source = (l.source || "").toLowerCase();
      const notes = (l.notes || "").toLowerCase();
      const salesperson = (l.salesperson || "").toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        id.includes(q) ||
        source.includes(q) ||
        notes.includes(q) ||
        salesperson.includes(q)
      );
    });
  };

  return (
    <>
      <PageHeader
        breadcrumb="CRM / Leads"
        title="Lead Management"
        subtitle="Every lead is bound to a customer record. Replies from Gmail automatically advance leads to Contacted."
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 gap-1.5 text-xs font-medium sm:h-8 sm:flex-initial sm:text-sm"
              onClick={() => handleSyncGmail(false)}
              disabled={syncing}
            >
              <RefreshCw
                className={`size-3.5 ${syncing ? "animate-spin text-primary" : ""}`}
              />
              {syncing ? "Syncing..." : "Sync Gmail"}
            </Button>
            <Button
              size="sm"
              className="h-9 flex-1 bg-accent text-xs font-bold text-accent-foreground hover:bg-accent/90 sm:h-8 sm:flex-initial sm:text-sm"
              onClick={() => (window.location.href = "/ai-processing")}
            >
              <Sparkles className="size-3.5 mr-1" /> New via AI
            </Button>
          </div>
        }
      />

      {/* KPI Cards: Responsive 2 cols on mobile, 3 on tablet, 6 on desktop */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
        <Kpi label="Total leads" value={leads.length} icon={UserPlus} />
        <Kpi
          label="New"
          value={leads.filter((l) => l.stage === "New").length}
          tone="accent"
        />
        <Kpi
          label="Contacted"
          value={leads.filter((l) => l.stage === "Contacted").length}
          tone="accent"
          icon={Mail}
        />
        <Kpi
          label="Hot"
          value={leads.filter((l) => l.stage === "Hot").length}
          tone="danger"
          icon={Flame}
        />
        <Kpi
          label="Quotation Sent"
          value={leads.filter((l) => l.stage === "Quotation Sent").length}
          tone="primary"
          icon={FileText}
        />
        <Kpi
          label="Won"
          value={leads.filter((l) => l.stage === "Won").length}
          tone="success"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 sm:mt-6">
        {/* Search & Tabs Header Bar */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-9 w-max items-center justify-start rounded-lg bg-muted/80 p-1 text-muted-foreground">
              <TabsTrigger
                value="all"
                className="gap-1.5 px-2.5 py-1 text-xs sm:px-3 sm:text-sm"
              >
                All Leads ({leads.length})
              </TabsTrigger>
              {LEAD_STAGES.map((stage) => {
                const count = leads.filter((l) => l.stage === stage).length;
                return (
                  <TabsTrigger
                    key={stage}
                    value={stage}
                    className="gap-1.5 px-2.5 py-1 text-xs sm:px-3 sm:text-sm"
                  >
                    <span>{stage}</span>
                    {count > 0 && (
                      <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[10px] font-semibold">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Quick Filter / Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs sm:text-sm bg-card"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {["all", ...LEAD_STAGES].map((tab) => {
          const filteredLeads = getFilteredLeads(tab);
          return (
            <TabsContent key={tab} value={tab} className="mt-3 sm:mt-4">
              {loading ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  <RefreshCw className="mx-auto mb-2 size-5 animate-spin text-primary" />
                  Loading leads...
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? `No leads matching "${searchQuery}" in "${tab}" stage.`
                      : `No leads found in the "${tab}" stage.`}
                  </p>
                  {tab === "Contacted" && !searchQuery && (
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      When you reply to a customer from Gmail or send a follow-up, their lead will automatically show up here.
                    </p>
                  )}
                  {tab === "Quotation Sent" && !searchQuery && (
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      When you send a Quotation to a lead, it will automatically show up here.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* MOBILE VIEW: High-performance touch cards (Visible on < md) */}
                  <div className="space-y-3 block md:hidden">
                    {filteredLeads.map((l) => {
                      const initials = (l.salesperson || "AI")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();
                      const firstName = (l.salesperson || "AI").split(" ")[0];
                      const isRepliedViaGmail =
                        (l.notes && l.notes.includes("[Replied via Gmail]")) ||
                        l.lastRepliedAt;
                      const cleanCustomerName = (l.customerName || "Unnamed Lead").replace(
                        /^["'\s]+|["'\s]+$/g,
                        ""
                      );

                      const reqSnippet = (() => {
                        if (!l.notes) return null;
                        const match = l.notes.match(
                          /Requirement:\s*([\s\S]*?)(?:\n\n|$)/i
                        );
                        return match ? match[1].trim() : l.notes.split("\n\n[")[0];
                      })();

                      return (
                        <div
                          key={l.id}
                          className="panel relative overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-xs transition-all hover:border-primary/40"
                        >
                          {/* Top Row: Customer Name & Stage / Priority Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/customers/${l.customerId || "CUST-1001"}`}
                                className="font-semibold text-primary hover:underline line-clamp-1 text-sm inline-flex items-center gap-1"
                              >
                                {cleanCustomerName}
                                <ExternalLink className="size-3 opacity-60 shrink-0" />
                              </Link>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="font-mono font-medium">{l.id}</span>
                                <span>·</span>
                                <span className="truncate">{l.source || "Inquiry"}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <StatusBadge value={l.stage} className="text-[11px] px-1.5 py-0.5" />
                              <StatusBadge value={l.priority} className="text-[10px] px-1.5 py-0" />
                            </div>
                          </div>

                          {/* Email & Special State Tags */}
                          {(l.customerEmail || l.stage === "Quotation Sent" || leadQuotationMap[l.id] || isRepliedViaGmail) && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {l.customerEmail && (
                                <a
                                  href={`mailto:${l.customerEmail}`}
                                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground bg-muted/50 rounded px-1.5 py-0.5 border border-border/40 truncate max-w-full"
                                >
                                  <Mail className="size-3 shrink-0 text-primary" />
                                  <span className="truncate">{l.customerEmail}</span>
                                </a>
                              )}
                              {leadQuotationMap[l.id] ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingQuotation(leadQuotationMap[l.id])}
                                  className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/25 hover:bg-blue-500/20 transition-all cursor-pointer"
                                  title="Click to view quotation document"
                                >
                                  <FileText className="size-3" />
                                  <span>{leadQuotationMap[l.id].quotationNo}</span>
                                  {leadQuotationMap[l.id].grandTotal ? (
                                    <span className="font-bold text-foreground">
                                      · {fmtINR(leadQuotationMap[l.id].grandTotal)}
                                    </span>
                                  ) : null}
                                  <span className="text-[10px] uppercase font-bold text-blue-500">
                                    ({leadQuotationMap[l.id].status || "Sent"})
                                  </span>
                                </button>
                              ) : l.stage === "Quotation Sent" ? (
                                <Link
                                  href="/quotations"
                                  className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                >
                                  <FileText className="size-3" /> Quotation Active
                                </Link>
                              ) : null}
                              {isRepliedViaGmail && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="size-3" /> Replied via Gmail
                                </span>
                              )}
                            </div>
                          )}

                          {/* Requirements Snippet */}
                          {reqSnippet && (
                            <div className="mt-2.5 rounded-lg bg-muted/30 p-2 text-xs text-foreground/85 border border-border/40 leading-relaxed">
                              <p className="line-clamp-3">{reqSnippet}</p>
                            </div>
                          )}

                          {/* Gmail Reply Activity Snippet */}
                          {isRepliedViaGmail && (
                            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-emerald-500/5 p-2 text-[11px] text-muted-foreground border border-emerald-500/20">
                              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <div className="line-clamp-2">
                                <span className="font-semibold text-foreground/90">Gmail Activity: </span>
                                {(() => {
                                  const replyMatch = l.notes?.match(
                                    /\[Replied via Gmail\]\s*([\s\S]*?)(?:\n\n\[|$)/i
                                  );
                                  return replyMatch
                                    ? replyMatch[1].trim()
                                    : l.lastRepliedAt
                                    ? `Reply on ${fmtDate(l.lastRepliedAt)}`
                                    : "Replied via Gmail";
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Meta & Touch Action Bar */}
                          <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="size-3 text-muted-foreground" />
                                <span>{fmtDate(l.date)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground/80">{firstName}</span>
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
                                  {initials}
                                </div>
                              </div>
                            </div>

                            {/* Mobile Quick Action Buttons & Stage Select */}
                            <div className="grid grid-cols-3 gap-1.5 pt-1">
                              {/* Stage Selector */}
                              <div className="relative col-span-1">
                                <select
                                  value={l.stage}
                                  onChange={(e) =>
                                    handleUpdateStage(l.id, e.target.value, l.customerName)
                                  }
                                  className="w-full h-8 rounded-lg border border-border bg-background px-2 text-[11px] font-semibold text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                                >
                                  {LEAD_STAGES.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Follow-up Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-[11px] font-semibold text-primary border-primary/30 hover:bg-primary/10 px-2 cursor-pointer"
                                onClick={() => openEmailModal(l, "followup")}
                              >
                                <Send className="size-3 shrink-0" /> Follow-up
                              </Button>

                              {/* Quotation Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className={`h-8 gap-1 text-[11px] font-semibold px-2 cursor-pointer ${
                                  leadQuotationMap[l.id]
                                    ? "text-blue-600 dark:text-blue-400 border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100"
                                    : "text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                                }`}
                                onClick={() => handleQuotationAction(l)}
                              >
                                <FileText className="size-3 shrink-0" />
                                <span className="truncate">
                                  {leadQuotationMap[l.id] ? "View Quotation" : "Quotation"}
                                </span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP VIEW: Structured Table (Visible on md+) */}
                  <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Lead Details</th>
                          <th className="px-4 py-3 font-semibold text-right">Activity & Owner</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredLeads.map((l) => {
                          const initials = (l.salesperson || "AI")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase();
                          const firstName = (l.salesperson || "AI").split(" ")[0];
                          const isRepliedViaGmail =
                            (l.notes && l.notes.includes("[Replied via Gmail]")) ||
                            l.lastRepliedAt;

                          const cleanCustomerName = (l.customerName || "Unnamed Lead").replace(
                            /^["'\s]+|["'\s]+$/g,
                            ""
                          );

                          return (
                            <tr key={l.id} className="transition-colors hover:bg-muted/30">
                              <td className="p-4 align-top">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Link
                                      href={`/customers/${l.customerId || "CUST-1001"}`}
                                      className="text-sm font-semibold text-primary hover:underline"
                                    >
                                      {cleanCustomerName}
                                    </Link>
                                    <StatusBadge value={l.stage} />
                                    <StatusBadge value={l.priority} />
                                    {leadQuotationMap[l.id] ? (
                                      <button
                                        type="button"
                                        onClick={() => setViewingQuotation(leadQuotationMap[l.id])}
                                        className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/25 hover:bg-blue-500/20 transition-all cursor-pointer"
                                        title="Click to view quotation document"
                                      >
                                        <FileText className="size-3" />
                                        <span>{leadQuotationMap[l.id].quotationNo}</span>
                                        {leadQuotationMap[l.id].grandTotal ? (
                                          <span className="font-bold text-foreground">
                                            · {fmtINR(leadQuotationMap[l.id].grandTotal)}
                                          </span>
                                        ) : null}
                                        <span className="text-[10px] uppercase font-bold text-blue-500">
                                          ({leadQuotationMap[l.id].status || "Sent"})
                                        </span>
                                      </button>
                                    ) : l.stage === "Quotation Sent" ? (
                                      <Link
                                        href="/quotations"
                                        className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                        title="View in Quotations module"
                                      >
                                        <FileText className="size-3" /> Quotation Active
                                      </Link>
                                    ) : null}
                                    {isRepliedViaGmail && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                        <Mail className="size-3" /> Replied via Gmail
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-medium text-foreground">
                                    <span className="text-muted-foreground">{l.id}</span> ·{" "}
                                    {l.source || "No subject"}
                                    {l.customerEmail && (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        · {l.customerEmail}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm leading-relaxed text-foreground/90 max-w-3xl">
                                    {(() => {
                                      if (!l.notes) return "-";
                                      const match = l.notes.match(
                                        /Requirement:\s*([\s\S]*?)(?:\n\n|$)/i
                                      );
                                      return match
                                        ? match[1].trim()
                                        : l.notes.split("\n\n[")[0];
                                    })()}
                                  </p>
                                  {isRepliedViaGmail && (
                                    <div className="mt-1 flex items-start gap-1.5 rounded bg-muted/40 p-2 text-xs text-muted-foreground border border-border/40 max-w-3xl">
                                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="font-semibold text-foreground/80">
                                          Gmail Reply Activity:{" "}
                                        </span>
                                        {(() => {
                                          const replyMatch = l.notes?.match(
                                            /\[Replied via Gmail\]\s*([\s\S]*?)(?:\n\n\[|$)/i
                                          );
                                          return replyMatch
                                            ? replyMatch[1].trim()
                                            : l.lastRepliedAt
                                            ? `Reply recorded on ${fmtDate(l.lastRepliedAt)}`
                                            : "Replied via Gmail";
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 align-top text-right">
                                <div className="flex flex-col items-end gap-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                    {/* Quick Stage / Section selector */}
                                    <select
                                      value={l.stage}
                                      onChange={(e) =>
                                        handleUpdateStage(l.id, e.target.value, l.customerName)
                                      }
                                      className="h-7 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                      title="Move directly to another section"
                                    >
                                      {LEAD_STAGES.map((s) => (
                                        <option key={s} value={s}>
                                          {s}
                                        </option>
                                      ))}
                                    </select>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 h-7 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 hover:border-primary cursor-pointer"
                                      onClick={() => openEmailModal(l, "followup")}
                                      title="Send Follow-up Email (advances to Contacted)"
                                    >
                                      <Send className="size-3" /> Follow-up
                                    </Button>

                                    {leadQuotationMap[l.id] ? (
                                      <div className="inline-flex items-center rounded-md border border-blue-500/30 shadow-2xs overflow-hidden">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1 h-7 text-xs font-semibold text-blue-600 dark:text-blue-400 border-0 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/80 rounded-none px-2.5 cursor-pointer"
                                          onClick={() => handleQuotationAction(l)}
                                          title={`View sent quotation ${leadQuotationMap[l.id].quotationNo}`}
                                        >
                                          <FileText className="size-3" /> View Quotation
                                        </Button>
                                        <button
                                          type="button"
                                          onClick={() => handleQuotationAction(l, true)}
                                          className="h-7 px-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100/90 dark:bg-blue-900/60 hover:bg-blue-200 border-l border-blue-500/25 cursor-pointer"
                                          title="Create another new quotation for this lead"
                                        >
                                          +
                                        </button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 h-7 text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500 cursor-pointer"
                                        onClick={() => handleQuotationAction(l)}
                                        title="Create itemized Quotation for this Lead"
                                      >
                                        <FileText className="size-3" /> Create Quotation
                                      </Button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="size-3.5" />
                                    <span>{fmtDate(l.date)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground/80">
                                      {firstName}
                                    </span>
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                                      {initials}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Compose & Send Email Dialog (Fully Mobile Responsive) */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Mail className="size-5 text-primary" /> Send Email to &quot;{selectedLead.customerName}&quot;
              </DialogTitle>
              <DialogDescription className="text-xs">
                Send an email directly through your connected Gmail. This lead will automatically advance to the{" "}
                <span className="font-bold text-primary underline underline-offset-2">
                  {targetStage}
                </span>{" "}
                section.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              {/* Type / Destination Section Pill Buttons */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Select Email Type & Destination Section:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate("followup")}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                      emailType === "followup"
                        ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Follow-up</span>
                    <span className="text-[10px] font-normal opacity-80 mt-0.5">→ Contacted</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTemplate("meeting")}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all ${
                      emailType === "meeting"
                        ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>Meeting</span>
                    <span className="text-[10px] font-normal opacity-80 mt-0.5">→ Potential</span>
                  </button>
                </div>
              </div>

              {/* Destination Section selector dropdown */}
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 border border-border/50 text-xs">
                <span className="text-muted-foreground font-medium">Destination Section:</span>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {LEAD_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Recipient (To)</label>
                <Input
                  value={emailForm.to}
                  onChange={(e) => setEmailForm((f) => ({ ...f, to: e.target.value }))}
                  placeholder="customer@example.com"
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                <Input
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Subject line"
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground">Message</label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground">Templates:</span>
                    <button
                      type="button"
                      className={`font-semibold hover:underline ${
                        emailType === "followup" ? "text-primary underline" : "text-muted-foreground"
                      }`}
                      onClick={() => applyTemplate("followup")}
                    >
                      Follow-up
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      className={`font-semibold hover:underline ${
                        emailType === "meeting" ? "text-primary underline" : "text-muted-foreground"
                      }`}
                      onClick={() => applyTemplate("meeting")}
                    >
                      Meeting
                    </button>
                  </div>
                </div>
                <Textarea
                  rows={5}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Type your message here..."
                  className="mt-1 font-sans text-xs leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-9 text-xs sm:text-sm"
                onClick={() => setSelectedLead(null)}
                disabled={sendingEmail}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailForm.to || !emailForm.subject || !emailForm.message}
                className="w-full sm:w-auto h-9 gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" /> Send Email via Gmail
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Direct Quotation Document Print / Details Modal */}
      {viewingQuotation && (
        <DocumentPrintView
          doc={viewingQuotation}
          type="Quotation"
          company={company}
          onClose={() => setViewingQuotation(null)}
        />
      )}
    </>
  );
}


