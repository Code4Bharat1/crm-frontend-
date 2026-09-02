"use client";

import Link from "next/link";
import { useState } from "react";
import { Paperclip, Mic, Send, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { communications, customers, fmtDateTime } from "@/lib/crm-data";


const TEMPLATES = [
  "Quotation shared — kindly review",
  "Gentle payment reminder",
  "Engineer visit confirmation",
  "Dispatch details with LR number",
  "Warranty / AMC renewal reminder",
];

export default function WhatsAppPage() {
  const threads = [
    {
      id: "cust-target",
      name: "Target Lead",
      contacts: [{ name: "Target Lead", phone: "89763 22917" }]
    }
  ];
  const [active, setActive] = useState(threads[0].id);
  const cust = threads[0];
  // Make sure we have a direction for the initial static messages
  const initialMsgs = communications.filter((c) => c.channel === "WhatsApp").slice(0, 6).map((m, i) => ({
    ...m,
    direction: i % 2 === 0 ? "Incoming" : "Outgoing"
  }));

  const [chatMsgs, setChatMsgs] = useState(initialMsgs);
  const [messageText, setMessageText] = useState("");

  const handleSend = () => {
    if (!messageText.trim()) return;
    
    const newMsg = {
      id: `msg-${Date.now()}`,
      preview: messageText,
      date: new Date().toISOString(),
      channel: "WhatsApp",
      direction: "Outgoing"
    };

    setChatMsgs(prev => [...prev, newMsg]);
    setMessageText("");
  };

  return (
    <>
      <PageHeader
        breadcrumb="CRM / WhatsApp"
        title="WhatsApp Inbox"
        subtitle="Conversations auto-associate with customers by phone number. Create leads, follow-ups or quotations directly from a message."
      />
      <NotBuiltNotice>
        WhatsApp Business API is not connected in this prototype — messages shown are sample data. Connect the WhatsApp Business API to enable live send/receive.
      </NotBuiltNotice>

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr_260px]">
        <Section title="Conversations">
          <ul className="space-y-1">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setActive(t.id)}
                  className={`w-full rounded-md border p-2.5 text-left text-sm ${active === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                >
                  <p className="font-semibold">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.contacts[0].phone}</p>
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={cust.name} description={`${cust.contacts[0].name} · ${cust.contacts[0].phone}`}>
          <div className="space-y-3">
            {chatMsgs.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-lg border p-3 text-sm ${m.direction === "Outgoing" ? "ml-auto border-success/30 bg-success/10" : "border-border bg-muted"}`}>
                <p>{m.preview}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{fmtDateTime(m.date)} · {m.direction === "Outgoing" ? "CONTECH" : cust.contacts[0].name}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="icon"><Paperclip className="size-4" /></Button>
            <Button variant="outline" size="icon"><Mic className="size-4" /></Button>
            <Input 
              placeholder="Type a message…" 
              className="h-11" 
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button className="h-11 gap-2 bg-accent font-bold text-accent-foreground hover:bg-accent/90" onClick={handleSend}>
              <Send className="size-4" /> Send
            </Button>
          </div>
        </Section>

        <div className="space-y-4">
          <Section title="Actions from message">
            <div className="space-y-2">
              <Button className="w-full gap-2" variant="outline" onClick={() => toast.info("AI extraction", { description: "Review the extracted lead before confirming." })}>
                <UserPlus className="size-4" /> Create lead via AI
              </Button>
              <Button className="w-full" variant="outline">Add follow-up</Button>
              <Button className="w-full" variant="outline">Attach to quotation</Button>
              <Button className="w-full" variant="outline">Log outcome</Button>
            </div>
          </Section>
          <Section title="Approved templates">
            <ul className="space-y-2 text-sm">
              {TEMPLATES.map((t) => (
                <li key={t} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                  <span>{t}</span>
                  <StatusBadge value="Pending" />
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
