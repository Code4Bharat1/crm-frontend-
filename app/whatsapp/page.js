"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Paperclip, Mic, Send, UserPlus } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import { AppShell } from "@/components/app-shell";
import { PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDateTime } from "@/lib/crm-data";


const TEMPLATES = [
  "Quotation shared — kindly review",
  "Gentle payment reminder",
  "Engineer visit confirmation",
  "Dispatch details with LR number",
  "Warranty / AMC renewal reminder",
];

const API_BASE = "http://localhost:5245/api/whatsapp";

export default function WhatsAppPage() {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch all conversations
  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/conversations`);
      if (res.data.success) {
        setThreads(res.data.data);
        if (res.data.data.length > 0 && !active) {
          setActive(res.data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch conversations", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for active conversation
  const fetchMessages = async (phone) => {
    if (!phone) return;
    try {
      const res = await axios.get(`${API_BASE}/messages/${phone}`);
      if (res.data.success) {
        setChatMsgs(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Poll for new messages every 5 seconds (temporary solution for "live" feel)
    const interval = setInterval(() => {
      fetchConversations();
      if (active) fetchMessages(active);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (active) {
      fetchMessages(active);
    }
  }, [active]);

  const handleSend = async () => {
    if (!messageText.trim() || !active) return;
    
    // Optimistic UI update
    const tempMsg = {
      id: `temp-${Date.now()}`,
      preview: messageText,
      date: new Date().toISOString(),
      channel: "WhatsApp",
      direction: "Outgoing"
    };
    setChatMsgs(prev => [...prev, tempMsg]);
    const textToSend = messageText;
    setMessageText("");

    try {
      // Assuming Nexcore API allows text_message for freeform, 
      // otherwise it needs to be mapped to a template based on your logic.
      await axios.post(`${API_BASE}/send-message`, {
        phone_number: active,
        message_body: textToSend
      });
      // Re-fetch to get actual DB record
      fetchMessages(active);
    } catch (error) {
      console.error("Failed to send", error);
      toast.error("Failed to send message");
      // Revert optimistic update
      setChatMsgs(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  };

  const handleTemplateSend = async (templateName) => {
      if(!active) return;
      
      const TEMPLATE_MAP = {
        "Quotation shared — kindly review": "quotation_shared",
        "Gentle payment reminder": "payment_reminder",
        "Engineer visit confirmation": "engineer_visit",
        "Dispatch details with LR number": "dispatch_details",
        "Warranty / AMC renewal reminder": "warranty_renewal",
      };
      
      const validTemplateName = TEMPLATE_MAP[templateName] || "default_template";

      try {
        await axios.post(`${API_BASE}/send-message`, {
            phone_number: active,
            template_name: validTemplateName,
            template_language: "en"
        });
        toast.success(`Template ${templateName} sent`);
        fetchMessages(active);
      } catch (error) {
        console.error("Failed to send template", error);
        toast.error("Failed to send template");
      }
  }

  const cust = threads.find(t => t.id === active) || { name: "Loading...", contacts: [{ phone: "", name: "" }] };

  return (
    <>
      <PageHeader
        breadcrumb="CRM / WhatsApp"
        title="WhatsApp Inbox"
        subtitle="Conversations auto-associate with customers by phone number. Create leads, follow-ups or quotations directly from a message."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr_260px]">
        <Section title="Conversations">
          {loading && threads.length === 0 ? (
             <p className="text-sm text-muted-foreground p-2">Loading...</p>
          ) : threads.length === 0 ? (
             <p className="text-sm text-muted-foreground p-2">No active conversations</p>
          ) : (
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
          )}
        </Section>

        <Section title={cust.name} description={`${cust.contacts[0]?.name || ''} · ${cust.contacts[0]?.phone || ''}`}>
          <div className="space-y-3 min-h-[300px] max-h-[60vh] overflow-y-auto pr-2">
            {chatMsgs.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center mt-10">No messages yet.</p>
            )}
            {chatMsgs.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-lg border p-3 text-sm ${m.direction === "Outgoing" ? "ml-auto border-success/30 bg-success/10" : "border-border bg-muted"}`}>
                <p>{m.preview}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{fmtDateTime(m.date)} · {m.direction === "Outgoing" ? "You" : cust.contacts[0]?.name || cust.id}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t pt-4">
            <Button variant="outline" size="icon"><Paperclip className="size-4" /></Button>
            <Button variant="outline" size="icon"><Mic className="size-4" /></Button>
            <Input 
              placeholder="Type a message…" 
              className="h-11" 
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={!active}
            />
            <Button className="h-11 gap-2 bg-accent font-bold text-accent-foreground hover:bg-accent/90" onClick={handleSend} disabled={!active}>
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
                <li key={t} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-muted" onClick={() => handleTemplateSend(t)}>
                  <span className="truncate" title={t}>{t}</span>
                  <StatusBadge value="Send" />
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
