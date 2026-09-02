"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Field, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { communications, fmtDateTime } from "@/lib/crm-data";


export default function EmailPage() {
  const router = useRouter();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extractingId, setExtractingId] = useState(null);

  // Load saved emails from MongoDB
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/emails`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const formatted = data.map(d => ({
            id: d.uid || `email-${Math.random()}`,
            channel: "Email",
            subject: d.subject,
            direction: d.direction || "Incoming",
            preview: (d.text || "").substring(0, 150) + ((d.text || "").length > 150 ? "..." : ""),
            fullText: d.text,
            customerName: (d.from || "").split("<")[0].trim() || d.from,
            contact: (d.from || "").match(/<([^>]+)>/)?.[1] || d.from,
            date: new Date(d.date).toISOString(),
            hasAttachment: false,
            read: d.read || false,
            followedUp: d.followedUp || false
          }));
          setEmails(formatted);
        }
      })
      .catch(err => console.error("Error loading emails:", err));
  }, []);

  const handleFetch = async () => {
    setLoading(true);
    toast.info("Fetching latest email...");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/fetch-email`);
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.message || "Failed to fetch email");
        setLoading(false);
        return;
      }

      const newEmails = data.emails.map(d => ({
        id: `email-${Date.now()}-${Math.random()}`,
        channel: "Email",
        subject: d.subject,
        direction: d.direction || "Incoming",
        preview: (d.text || "").substring(0, 150) + ((d.text || "").length > 150 ? "..." : ""),
        fullText: d.text,
        customerName: (d.from || "").split("<")[0].trim() || d.from,
        contact: (d.from || "").match(/<([^>]+)>/)?.[1] || d.from,
        date: new Date(d.date).toISOString(),
        hasAttachment: false,
        read: false,
        followedUp: d.followedUp || false
      }));

      setEmails(prev => [...newEmails, ...prev]);
      toast.success("Fetched latest email successfully");
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    // Optimistic update to remove it from UI immediately
    setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/emails/${id}/read`, {
        method: 'PUT'
      });
      if (res.ok) {
        toast.success("Message marked as read and seen in Gmail");
      } else {
        toast.error("Failed to mark as read in Gmail");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error marking as read in Gmail");
    }
  };

  const handleCreateLead = async (email) => {
    setExtractingId(email.id);
    toast.info("Extracting structured lead...");
    try {
      const extractRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/extract-lead-from-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const extractData = await extractRes.json();
      
      if (!extractRes.ok) {
        toast.error(extractData.message || "Failed to extract lead");
        setExtractingId(null);
        return;
      }

      const leadData = extractData.lead;

      const payload = {
        id: `LD-${Math.floor(Math.random() * 9000) + 1000}`,
        customerName: leadData.customer || email.customerName || "Unknown Customer",
        source: "Email Inquiry",
        stage: email.direction === 'Outgoing' ? "Contacted" : "New",
        priority: ["Low", "Medium", "High", "Critical"].includes(leadData.suggestedPriority) ? leadData.suggestedPriority : "Medium",
        value: parseInt((leadData.expectedValue || "0").toString().replace(/[^0-9]/g, "")) || 0,
        salesperson: "System AI",
        area: leadData.area || "Online",
        notes: `Requirement: ${leadData.requirementSummary || "Generated from AI email parsing"}\n\nEmail Message: ${email.fullText || email.preview}`,
        sourceEmailId: email.id, // used for deduplication
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/sales/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Lead created! Redirecting to leads page...");
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/emails/${email.id}/read`, { method: 'PUT' }).catch(() => {});
        setTimeout(() => router.push('/leads'), 800);
      } else if (res.status === 409) {
        // Duplicate — lead already exists, just navigate there
        const dupData = await res.json();
        toast.warning(dupData.message || "This lead already exists.", {
          description: "Redirecting to the leads page."
        });
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e));
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/emails/${email.id}/read`, { method: 'PUT' }).catch(() => {});
        setTimeout(() => router.push('/leads'), 1200);
      } else {
        const errorData = await res.json();
        toast.error("Failed to create lead", { description: errorData.message });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating lead");
    } finally {
      setExtractingId(null);
    }
  };

  const handleFollowUp = async (emailObj) => {
    toast.info("Sending follow-up email...");
    // Optimistic update to remove it from UI (both Inbox and Sent sections)
    setEmails(prev => prev.map(e => e.id === emailObj.id ? { ...e, followedUp: true, read: true } : e));
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/ai/emails/${emailObj.id}/follow-up`, {
        method: 'POST'
      });
      if (res.ok) {
        toast.success("Follow-up email sent successfully");

        const targetStage = "Contacted";

        // Automatically create lead
        const payload = {
          id: `LD-${Math.floor(Math.random() * 9000) + 1000}`,
          customerName: emailObj.customerName || "Unknown Customer",
          source: "Email Inquiry",
          stage: targetStage,
          priority: "Medium",
          value: 0,
          salesperson: "System AI",
          area: "Online",
          notes: `Follow-up sent to ${emailObj.contact}.\nOriginal Subject: ${emailObj.subject}`
        };

        const leadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/sales/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (leadRes.ok) {
          toast.success(`Lead automatically added to ${targetStage} section`);
        } else {
          toast.error(`Failed to add lead to ${targetStage} section`);
        }
      } else {
        const errorData = await res.json();
        toast.error("Failed to send follow-up", { description: errorData.message });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error sending follow-up email");
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb="CRM / Email"
        title="Email Integration"
        subtitle="Complete threads — not just the latest message — attached to the right customer, lead and transaction."
        actions={<Button disabled={loading} variant="outline" className="gap-2" onClick={handleFetch}><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? "Fetching..." : "Fetch now"}</Button>}
      />
      <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success flex items-center gap-2">
        <Mail className="size-4" /> Email provider is securely connected via backend credentials. Fetching is active.
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Section title="Inbox (Incoming)">
            <ul className="space-y-2">
              {emails.filter(e => e.direction === "Incoming" && !e.read).map((e) => {
                const isContacted = emails.some(sent => sent.direction === "Outgoing" && sent.contact === e.contact);
                
                return (
                  <li key={e.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{e.subject}</p>
                      <StatusBadge value={e.direction} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{e.preview}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.customerName} · {e.contact} · {fmtDateTime(e.date)}{e.hasAttachment ? " · 1 attachment" : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {!isContacted ? (
                        <Button size="sm" variant="outline" disabled={extractingId === e.id} onClick={() => handleCreateLead(e)}>
                          {extractingId === e.id ? "Creating..." : "Create Lead"}
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" disabled>
                          Already in Contacted Leads
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => markAsRead(e.id)}>Mark as read</Button>
                      {!e.followedUp && (
                        <Button size="sm" variant="outline" onClick={() => handleFollowUp(e)}>Add follow-up</Button>
                      )}
                      <Button size="sm" variant="outline">Link to quotation</Button>
                    </div>
                  </li>
                );
              })}
              {emails.filter(e => e.direction === "Incoming" && !e.read).length === 0 && (
                <p className="text-sm text-muted-foreground italic">No new incoming messages.</p>
              )}
            </ul>
          </Section>

          <Section title="Contacted (Sent)">
            <ul className="space-y-2">
              {emails.filter(e => e.direction === "Outgoing").map((e) => (
                <li key={e.id} className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{e.subject}</p>
                    <StatusBadge value={e.direction} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{e.preview}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    To: {e.customerName} · {e.contact} · {fmtDateTime(e.date)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!e.followedUp ? (
                      <Button size="sm" variant="outline" onClick={() => handleFollowUp(e)}>Add follow-up</Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled>Follow-up Sent</Button>
                    )}
                  </div>
                </li>
              ))}
              {emails.filter(e => e.direction === "Outgoing").length === 0 && (
                <p className="text-sm text-muted-foreground italic">No sent messages found.</p>
              )}
            </ul>
          </Section>
        </div>

        <Section title="Provider configuration">
          <div className="space-y-3">
            <Field label="Provider">
              <Select defaultValue="gmail">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Google Workspace / Gmail (OAuth)</SelectItem>
                  <SelectItem value="m365">Microsoft 365 (OAuth)</SelectItem>
                  <SelectItem value="imap">Generic IMAP / SMTP</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mailbox"><Input placeholder="sales@contech-automation.in" /></Field>
            <Field label="IMAP host"><Input placeholder="imap.gmail.com:993" /></Field>
            <Field label="SMTP host"><Input placeholder="smtp.gmail.com:587" /></Field>
            <Field label="Credential"><Input type="password" placeholder="Stored encrypted server-side" /></Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => toast.error("Connection failed", { description: "No credentials configured for this mailbox." })}>Test connection</Button>
              <Button variant="outline" className="gap-2" onClick={() => toast.error("Test email not sent", { description: "Provider not connected." })}><Mail className="size-4" /> Send test email</Button>
            </div>
            <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              Credentials are stored server-side secrets and never exposed to the browser. Access is limited to
              the Admin Manager and Director roles.
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

