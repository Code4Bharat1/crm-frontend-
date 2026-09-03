"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Bot, CheckCircle2, Mail, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Field, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


const SAMPLE = "Customer needs 20 controllers by next month and wants quotation. Site is at Chakan MIDC, contact Sachin Patil 9822xxxxx. Budget around 4 lakh.";

export default function AiPage() {
  const [text, setText] = useState(SAMPLE);
  const [emailDetails, setEmailDetails] = useState(null);
  const [extracted, setExtracted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leadData, setLeadData] = useState(null);
  const [leadCreated, setLeadCreated] = useState(false); // hides button after lead is added
  const [formData, setFormData] = useState({
    customer: "Sai Precision Auto",
    contactPerson: "Sachin Patil",
    product: "Compact PLC CPU Module (controller)",
    quantity: "20 nos",
    expectedValue: "₹4,00,000",
    expectedDate: "30 Sep 2026",
    area: "Chakan MIDC",
    suggestedStage: "Potential",
    suggestedPriority: "High",
    suggestedFollowUp: "16 Aug 2026"
  });

  // On page load, check if the latest email already has a lead in DB
  useEffect(() => {
    fetch("http://localhost:5245/api/sales/leads")
      .then(r => r.json())
      .then(leads => {
        if (Array.isArray(leads) && leads.some(l => l.source === "Email Inquiry" && l.sourceEmailId)) {
          // If there's at least one Email Inquiry lead with an email UID,
          // we check after extraction whether THIS specific email is covered.
          // Store the set of known UIDs in a ref for use in handleExtract.
          window.__existingLeadEmailIds = new Set(leads.map(l => l.sourceEmailId).filter(Boolean));
        }
      })
      .catch(() => {});
  }, []);

  const handleExtract = async () => {
    setLoading(true);
    toast.info("Fetching and analysing latest email...");
    try {
      const res = await fetch("http://localhost:5245/api/ai/extract-lead", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Extraction failed");
        setLoading(false);
        return;
      }

      const { email: fetchedEmail, lead } = data;

      // Show the fetched email in the message preview
      if (fetchedEmail) {
        setEmailDetails(fetchedEmail);
        setText(fetchedEmail.text || text);

        // Check if a lead was already created from this exact email
        const knownIds = window.__existingLeadEmailIds || new Set();
        if (fetchedEmail.uid && knownIds.has(fetchedEmail.uid)) {
          setLeadCreated(true);
          toast.info("A lead already exists for this email.");
          setLoading(false);
          return;
        }
      }

      // Populate the lead form from AI response
      if (lead) {
        setLeadData(lead);
        // Helper: treat "N/A", "null", "none", empty as missing
        const val = (v) => (!v || ['n/a','null','none','not specified','unknown',''].includes(v.toLowerCase().trim()) ? '' : v);

        // Fallback sender name when AI can't identify company
        const senderName = fetchedEmail
          ? (fetchedEmail.from || '').split('<')[0].trim() || fetchedEmail.from
          : '';

        setFormData({
          customer: val(lead.customer) || senderName,
          contactPerson: val(lead.contactPerson) || senderName,
          product: val(lead.product) || 'Not specified',
          quantity: val(lead.quantity) || 'Not specified',
          expectedValue: val(lead.expectedValue) || '',
          expectedDate: val(lead.expectedDate) || '',
          area: val(lead.area) || 'Not specified',
          suggestedStage: val(lead.suggestedStage) || 'Potential',
          suggestedPriority: val(lead.suggestedPriority) || 'Medium',
          suggestedFollowUp: val(lead.suggestedFollowUp) || '',
        });
        setExtracted(true);
        toast.success("Lead extracted successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not connect to server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      const senderName = emailDetails
        ? (emailDetails.from || '').split('<')[0].trim() || emailDetails.from
        : 'Unknown Customer';

      // Use sender name as fallback when AI returned N/A/empty
      const isBlank = (v) => !v || ['n/a','null','none','not specified','unknown',''].includes(v.toLowerCase?.().trim());

      const payload = {
        id: `LD-${Math.floor(Math.random() * 9000) + 1000}`,
        customerName: isBlank(formData.customer) ? senderName : formData.customer,
        source: "Email Inquiry",
        stage: ["New", "Contacted", "Potential", "Hot", "Quotation Sent", "Negotiation", "Won", "Lost", "On Hold"].includes(formData.suggestedStage) ? formData.suggestedStage : "New",
        priority: ["Low", "Medium", "High", "Critical"].includes(formData.suggestedPriority) ? formData.suggestedPriority : "Medium",
        value: parseInt((formData.expectedValue || "0").toString().replace(/[^0-9]/g, "")) || 0,
        salesperson: "System AI",
        area: isBlank(formData.area) ? "Online" : formData.area,
        notes: `Requirement: ${leadData?.requirementSummary || "Generated from AI email parsing"}\n\nEmail Message: ${text}`,
        sourceEmailId: emailDetails?.uid || null,
      };

      const res = await fetch("http://localhost:5245/api/sales/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Lead created", { description: "Added to lead page successfully." });
        setLeadCreated(true);
        setExtracted(false);
        setLeadData(null);
        if (emailDetails?.uid) {
          window.__existingLeadEmailIds = window.__existingLeadEmailIds || new Set();
          window.__existingLeadEmailIds.add(emailDetails.uid);
          // Mark email as read → removes it from inbox on the Email page
          fetch(`http://localhost:5245/api/ai/emails/${emailDetails.uid}/read`, { method: 'PUT' }).catch(() => {});
        }
        window.location.href = '/leads';
      } else if (res.status === 409) {
        const errorData = await res.json();
        toast.warning(errorData.message || "Lead already exists for this email.", {
          description: "Redirecting to leads page."
        });
        setLeadCreated(true);
        setExtracted(false);
        if (emailDetails?.uid) {
          fetch(`http://localhost:5245/api/ai/emails/${emailDetails.uid}/read`, { method: 'PUT' }).catch(() => {});
        }
        setTimeout(() => { window.location.href = '/leads'; }, 1200);
      } else {
        const errorData = await res.json();
        toast.error("Failed to create lead", { description: errorData.message || "Unknown error" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server");
    }
  };


  return (
    <>
      <PageHeader
        breadcrumb="CRM / AI Processing"
        title="AI Lead & Message Processing"
        subtitle="Messages are fetched automatically from connected WhatsApp and email channels. The engine proposes a structured lead — you review, edit and confirm."
      />
      

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Incoming message" description="Fetched automatically from WhatsApp & Email — no manual entry">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 font-semibold text-success">
              <MessageCircle className="size-3.5" /> WhatsApp Business — connected
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              <Mail className="size-3.5" /> Email inbox — syncing
            </span>
          </div>
          <div className="mt-3 rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{emailDetails ? `Email · ${emailDetails.from} · ${emailDetails.subject}` : 'WhatsApp · +91 98220 41188 · Sachin Patil'}</span>
              <span>{emailDetails ? new Date(emailDetails.date).toLocaleString() : 'Auto-fetched 16 Aug 2026, 10:12 am'}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{text}</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Messages arrive from connected WhatsApp and email channels only. Nothing is typed in manually here.
          </p>
          {leadCreated ? (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-4 py-2.5 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4 shrink-0" />
              Lead added to Leads page —{" "}
              <a href="/leads" className="underline underline-offset-2 hover:opacity-80">View leads</a>
            </div>
          ) : (
            <Button disabled={loading} className="mt-3 gap-2 bg-accent font-bold text-accent-foreground hover:bg-accent/90" onClick={handleExtract}>
              <Sparkles className="size-4" /> {loading ? "Extracting..." : "Extract structured lead"}
            </Button>
          )}
        </Section>

        <Section title="Proposed lead (review → edit → confirm)">
          {extracted ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Customer"><Input value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} /></Field>
                <Field label="Contact person"><Input value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} /></Field>
                <Field label="Product"><Input value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} /></Field>
                <Field label="Quantity"><Input value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} /></Field>
                <Field label="Expected value"><Input value={formData.expectedValue} onChange={e => setFormData({...formData, expectedValue: e.target.value})} /></Field>
                <Field label="Expected date"><Input value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} /></Field>
                <Field label="Area"><Input value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} /></Field>
                <Field label="Suggested stage"><Input value={formData.suggestedStage} onChange={e => setFormData({...formData, suggestedStage: e.target.value})} /></Field>
                <Field label="Suggested priority"><Input value={formData.suggestedPriority} onChange={e => setFormData({...formData, suggestedPriority: e.target.value})} /></Field>
                <Field label="Suggested follow-up"><Input value={formData.suggestedFollowUp} onChange={e => setFormData({...formData, suggestedFollowUp: e.target.value})} /></Field>
              </div>
              <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
                Requirement summary: {leadData?.requirementSummary || "20 controllers required within a month, quotation requested. Next action — prepare quotation with commercial terms and share on WhatsApp."}
              </div>
              <Button onClick={handleConfirm} className="w-full bg-accent font-bold text-accent-foreground hover:bg-accent/90">
                Confirm & create lead
              </Button>

            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <Bot className="size-8 text-primary/60" />
              Run extraction to see the proposed structured record.
            </div>
          )}
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="What AI is allowed to do">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Propose leads, follow-up dates, priority and next actions.</li>
            <li>Summarise long communication chains.</li>
            <li>Suggest matching customer and product.</li>
          </ul>
        </Section>
        <Section title="What always needs confirmation">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Quotation, proforma and invoice creation.</li>
            <li>Payment allocation and bank reconciliation.</li>
            <li>Any change to financial values or customer credit terms.</li>
          </ul>
        </Section>
        <Section title="Processing queue">
          <ul className="space-y-2 text-sm">
            {[["WhatsApp — 4 messages", "Pending"], ["Email — 2 threads", "Pending"], ["Voice notes — 1", "Needs Review"]].map(([label, st]) => (
              <li key={label} className="flex items-center justify-between rounded-md border border-border p-2.5">
                <span>{label}</span>
                <StatusBadge value={st} />
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
