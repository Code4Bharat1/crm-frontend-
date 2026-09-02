"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, Mail, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Field, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const SAMPLE = "Customer needs 20 controllers by next month and wants quotation. Site is at Chakan MIDC, contact Sachin Patil 9822xxxxx. Budget around 4 lakh.";

export default function AiPage() {
  const [text, setText] = useState(SAMPLE);
  const [emailDetails, setEmailDetails] = useState(null);
  const [extracted, setExtracted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leadData, setLeadData] = useState(null);
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
      }

      // Populate the lead form from AI response
      if (lead) {
        setLeadData(lead);
        setFormData({
          customer: lead.customer || "",
          contactPerson: lead.contactPerson || "",
          product: lead.product || "",
          quantity: lead.quantity || "",
          expectedValue: lead.expectedValue || "",
          expectedDate: lead.expectedDate || "",
          area: lead.area || "",
          suggestedStage: lead.suggestedStage || "Potential",
          suggestedPriority: lead.suggestedPriority || "Medium",
          suggestedFollowUp: lead.suggestedFollowUp || "",
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
      const payload = {
        id: `LD-${Math.floor(Math.random() * 9000) + 1000}`,
        customerName: formData.customer || "Sai Precision Auto",
        source: "Email Inquiry",
        stage: ["New", "Contacted", "Potential", "Hot", "Quotation Sent", "Negotiation", "Won", "Lost", "On Hold"].includes(formData.suggestedStage) ? formData.suggestedStage : "New",
        priority: ["Low", "Medium", "High", "Critical"].includes(formData.suggestedPriority) ? formData.suggestedPriority : "Medium",
        value: parseInt((formData.expectedValue || "400000").toString().replace(/[^0-9]/g, "")) || 400000,
        salesperson: "System AI",
        area: formData.area || "Chakan MIDC",
        notes: `Requirement: ${leadData?.requirementSummary || "Generated from AI email parsing"}\n\nEmail Message: ${text}`
      };

      const res = await fetch("http://localhost:5245/api/sales/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Lead created", { description: "Added to lead page successfully." });
        setExtracted(false); // Reset to allow processing another email
        setLeadData(null);
        window.location.href = '/leads';
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
      <NotBuiltNotice>
        AI provider is not connected. The extraction shown below is a deterministic sample of the output structure, not a live
        model response.
      </NotBuiltNotice>

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
          <Button disabled={loading} className="mt-3 gap-2 bg-accent font-bold text-accent-foreground hover:bg-accent/90" onClick={handleExtract}>
            <Sparkles className="size-4" /> {loading ? "Extracting..." : "Extract structured lead"}
          </Button>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full bg-accent font-bold text-accent-foreground hover:bg-accent/90">Confirm & create lead</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Create lead from AI extraction?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A lead will be created and linked to Sai Precision Auto with a follow-up on 16 Aug 2026. AI never creates
                      quotations, invoices or payments without explicit approval.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
