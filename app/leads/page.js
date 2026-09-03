"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Flame, UserPlus, Calendar, RefreshCw, Mail, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/services/api";

import { Kpi, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate, LEAD_STAGES } from "@/lib/crm-data";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Email modal state
  const [selectedLead, setSelectedLead] = useState(null);
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);

  const loadLeads = useCallback(async () => {
    try {
      const data = await fetchApi('/sales/leads');
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading leads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSyncGmail = useCallback(async (isSilent = false) => {
    setSyncing(true);
    if (!isSilent) toast.info("Checking Gmail for replies...");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/sync-gmail`);
      const data = await res.json();

      if (res.ok) {
        const contactedLeads = (data.progressions || []).filter(p => p.nextStage === 'Contacted');
        if (contactedLeads.length > 0) {
          contactedLeads.forEach(p => {
            toast.success(
              `Lead "${p.customerName}" moved to Contacted!`,
              { description: "Outgoing reply detected in Gmail." }
            );
          });
          // Refresh leads list
          await loadLeads();
        } else if (!isSilent) {
          toast.success("Gmail is up to date", { description: "No new unlinked replies found." });
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
  }, [loadLeads]);

  const openEmailModal = (lead) => {
    let recipientEmail = lead.customerEmail || "";
    if (!recipientEmail && lead.notes) {
      const match = lead.notes.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (match) recipientEmail = match[1];
    }

    setSelectedLead(lead);
    setEmailForm({
      to: recipientEmail,
      subject: `Regarding Inquiry - ${lead.customerName}`,
      message: `Hi ${lead.customerName},\n\nThank you for reaching out to us. Regarding your inquiry, we would be pleased to assist you with your requirements.\n\nPlease let us know if you have any questions or when would be a convenient time to discuss.\n\nBest regards,\nSales Team`
    });
  };

  const applyTemplate = (type) => {
    if (!selectedLead) return;
    if (type === "followup") {
      setEmailForm(f => ({
        ...f,
        subject: `Following up: ${selectedLead.customerName} - Inquiry`,
        message: `Hi ${selectedLead.customerName},\n\nJust following up on your inquiry. Please let us know if you need any additional specifications, pricing, or product demonstrations.\n\nLooking forward to hearing from you.\n\nBest regards,\nSales Team`
      }));
    } else if (type === "quotation") {
      setEmailForm(f => ({
        ...f,
        subject: `Quotation details for ${selectedLead.customerName}`,
        message: `Hi ${selectedLead.customerName},\n\nWe have reviewed your requirements and our team has prepared the quotation for you.\n\nPlease feel free to reach out if you have any questions regarding the pricing or technical scope.\n\nBest regards,\nSales Team`
      }));
    } else if (type === "meeting") {
      setEmailForm(f => ({
        ...f,
        subject: `Meeting Request: Discussion with ${selectedLead.customerName}`,
        message: `Hi ${selectedLead.customerName},\n\nWe would love to schedule a brief 15-minute call to understand your timeline and project specifications better.\n\nWould tomorrow morning or afternoon work for you?\n\nBest regards,\nSales Team`
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailForm.to,
          subject: emailForm.subject,
          message: emailForm.message,
          leadId: selectedLead?.id
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Email sent to ${emailForm.to}!`, {
          description: "Lead automatically moved to Contacted section."
        });
        setSelectedLead(null);
        await loadLeads();
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

  useEffect(() => {
    loadLeads();
    // Auto-sync with Gmail in the background on initial page load
    handleSyncGmail(true);
  }, [loadLeads, handleSyncGmail]);

  return (
    <>
      <PageHeader
        breadcrumb="CRM / Leads"
        title="Lead Management"
        subtitle="Every lead is bound to a customer record. Replies from Gmail automatically advance leads to Contacted."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 font-medium"
              onClick={() => handleSyncGmail(false)}
              disabled={syncing}
            >
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin text-primary" : ""}`} />
              {syncing ? "Syncing Gmail..." : "Sync Gmail"}
            </Button>
            <Button
              className="bg-accent font-bold text-accent-foreground hover:bg-accent/90"
              onClick={() => window.location.href = '/ai-processing'}
            >
              New lead via AI
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total leads" value={leads.length} icon={UserPlus} />
        <Kpi label="New" value={leads.filter(l => l.stage === 'New').length} tone="accent" />
        <Kpi
          label="Contacted"
          value={leads.filter(l => l.stage === 'Contacted').length}
          tone="accent"
          icon={Mail}
        />
        <Kpi label="Hot" value={leads.filter(l => l.stage === 'Hot').length} tone="danger" icon={Flame} />
        <Kpi label="Won" value={leads.filter(l => l.stage === 'Won').length} tone="success" />
      </div>

      <Tabs defaultValue="all" className="mt-6">
        <div className="overflow-x-auto pb-2">
          <TabsList>
            <TabsTrigger value="all">All Leads ({leads.length})</TabsTrigger>
            {LEAD_STAGES.map(stage => {
              const count = leads.filter(l => l.stage === stage).length;
              return (
                <TabsTrigger key={stage} value={stage} className="gap-1.5">
                  {stage}
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

        {["all", ...LEAD_STAGES].map((tab) => {
          const filteredLeads = tab === "all" ? leads : leads.filter((l) => l.stage === tab);
          return (
            <TabsContent key={tab} value={tab} className="mt-4">
              {loading ? (
                <p>Loading leads...</p>
              ) : filteredLeads.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center">
                  <p className="text-sm text-muted-foreground">No leads found in the "{tab}" stage.</p>
                  {tab === "Contacted" && (
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      When you reply to a customer from Gmail, their lead will automatically show up here.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-border bg-card">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Lead Details</th>
                        <th className="px-4 py-3 font-semibold text-right">Activity & Owner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLeads.map((l) => {
                        const initials = (l.salesperson || "AI").split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                        const firstName = (l.salesperson || "AI").split(' ')[0];
                        const isRepliedViaGmail = (l.notes && l.notes.includes("[Replied via Gmail]")) || l.lastRepliedAt;
                        
                        return (
                          <tr key={l.id} className="transition-colors hover:bg-muted/30">
                            <td className="p-4 align-top">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link href={`/customers/${l.customerId || "CUST-1001"}`} className="text-sm font-semibold text-primary hover:underline">
                                    {l.customerName}
                                  </Link>
                                  <StatusBadge value={l.stage} />
                                  <StatusBadge value={l.priority} />
                                  {isRepliedViaGmail && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                      <Mail className="size-3" /> Replied via Gmail
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-foreground">
                                  <span className="text-muted-foreground">{l.id}</span> · {l.source || "No subject"}
                                  {l.customerEmail && (
                                    <span className="text-muted-foreground"> · {l.customerEmail}</span>
                                  )}
                                </p>
                                <p className="text-sm leading-relaxed text-foreground/90 max-w-3xl">
                                  {(() => {
                                    if (!l.notes) return "-";
                                    const match = l.notes.match(/Requirement:\s*([\s\S]*?)(?:\n\n|$)/i);
                                    return match ? match[1].trim() : l.notes.split('\n\n[')[0];
                                  })()}
                                </p>
                                {isRepliedViaGmail && (
                                  <div className="mt-1 flex items-start gap-1.5 rounded bg-muted/40 p-2 text-xs text-muted-foreground border border-border/40 max-w-3xl">
                                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-semibold text-foreground/80">Gmail Reply Activity: </span>
                                      {(() => {
                                        const replyMatch = l.notes?.match(/\[Replied via Gmail\]\s*([\s\S]*?)(?:\n\n\[|$)/i);
                                        return replyMatch ? replyMatch[1].trim() : (l.lastRepliedAt ? `Reply recorded on ${fmtDate(l.lastRepliedAt)}` : "Replied via Gmail");
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-top text-right">
                              <div className="flex flex-col items-end gap-2.5">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 h-7 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 hover:border-primary"
                                    onClick={() => openEmailModal(l)}
                                  >
                                    <Send className="size-3" /> Send Email
                                  </Button>
                                  <StatusBadge value={l.source === "Email Inquiry" ? "Pending" : "Active"} />
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Calendar className="size-3.5" />
                                  <span>{fmtDate(l.date)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground/80">{firstName}</span>
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
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Compose & Send Email Dialog */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Mail className="size-5 text-primary" /> Send Email to {selectedLead.customerName}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Send an email directly through your connected Gmail. This lead will automatically advance to the <strong>Contacted</strong> stage.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Recipient (To)</label>
                <Input
                  value={emailForm.to}
                  onChange={(e) => setEmailForm(f => ({ ...f, to: e.target.value }))}
                  placeholder="customer@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                <Input
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Subject line"
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground">Message</label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-muted-foreground">Templates:</span>
                    <button
                      type="button"
                      className="text-primary hover:underline font-semibold"
                      onClick={() => applyTemplate("followup")}
                    >
                      Follow-up
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      className="text-primary hover:underline font-semibold"
                      onClick={() => applyTemplate("quotation")}
                    >
                      Quotation
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      className="text-primary hover:underline font-semibold"
                      onClick={() => applyTemplate("meeting")}
                    >
                      Meeting
                    </button>
                  </div>
                </div>
                <Textarea
                  rows={6}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Type your message here..."
                  className="mt-1 font-sans text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSelectedLead(null)} disabled={sendingEmail}>
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailForm.to || !emailForm.subject || !emailForm.message}
                className="gap-2 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send className="size-4" /> Send Email via Gmail
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

