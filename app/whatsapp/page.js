"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Paperclip, Mic, Send, UserPlus, QrCode, ExternalLink,
  Copy, Check, Sparkles, RefreshCw, X, ShieldCheck, ArrowRight, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

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

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api"}/whatsapp`;
const BACKEND_ROOT = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5245/api";

export default function WhatsAppPage() {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);

  // QR Modal & Meta Integration State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [customGreeting, setCustomGreeting] = useState("Hello Nexcore Alliance, I would like to inquire about your automation products and solutions.");
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("qr"); // 'qr' | 'meta'

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
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
    } finally {
      setLoading(false);
    }
  }, [active]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (phone) => {
    if (!phone) return;
    try {
      const res = await axios.get(`${API_BASE}/messages/${phone}`);
      if (res.data.success) {
        setChatMsgs(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  }, []);

  // Fetch QR Code data & Meta config
  const fetchQrAndConfig = useCallback(async (greetingText) => {
    try {
      const [qrRes, cfgRes] = await Promise.all([
        axios.get(`${API_BASE}/qr`, { params: { message: greetingText || customGreeting } }).catch(() => null),
        axios.get(`${API_BASE}/config`).catch(() => null)
      ]);
      if (qrRes?.data?.success) setQrData(qrRes.data.data);
      if (cfgRes?.data?.success) setConfigData(cfgRes.data.data);
    } catch (err) {
      console.error("Failed to load QR / config:", err);
    }
  }, [customGreeting]);

  useEffect(() => {
    fetchConversations();
    fetchQrAndConfig();

    // Poll every 4 seconds for fresh incoming messages
    const interval = setInterval(() => {
      fetchConversations();
      if (active) fetchMessages(active);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchConversations, active, fetchMessages, fetchQrAndConfig]);

  useEffect(() => {
    if (active) {
      fetchMessages(active);
    }
  }, [active, fetchMessages]);

  // Send a regular outbound WhatsApp text message
  const handleSend = async () => {
    if (!messageText.trim() || !active) return;

    const tempMsg = {
      id: `temp-${Date.now()}`,
      preview: messageText,
      date: new Date().toISOString(),
      channel: "WhatsApp",
      direction: "Outgoing",
      status: "sending"
    };
    setChatMsgs((prev) => [...prev, tempMsg]);
    const textToSend = messageText;
    setMessageText("");

    try {
      await axios.post(`${API_BASE}/send-message`, {
        phone_number: active,
        message_body: textToSend
      });
      fetchMessages(active);
      fetchConversations();
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error(error.response?.data?.error || "Failed to send WhatsApp message");
      setChatMsgs((prev) => prev.filter((m) => m.id !== tempMsg.id));
    }
  };

  // Send a pre-approved template message
  const handleTemplateSend = async (templateName) => {
    if (!active) return;

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
      toast.success(`Template "${templateName}" sent via WhatsApp`);
      fetchMessages(active);
      fetchConversations();
    } catch (error) {
      console.error("Failed to send template", error);
      toast.error("Failed to send template message");
    }
  };

  // Simulate incoming message as if a customer scanned QR & sent a WhatsApp message
  const handleSimulateScanMessage = async () => {
    setSimulating(true);
    try {
      const res = await axios.post(`${API_BASE}/simulate-incoming`, {
        phone_number: active || "919850011223",
        sender_name: activeCust?.name && activeCust.name !== activeCust.id ? activeCust.name : "Sunil Jagtap (Bharat Forge)",
        message: "Hello! I scanned your WhatsApp QR code to get a quote for Omron Photoelectric Sensors and VFD automation panels."
      });
      if (res.data.success) {
        toast.success("Simulated Customer Message received via Meta Webhook!");
        await fetchConversations();
        if (active) await fetchMessages(active);
      }
    } catch (err) {
      toast.error("Simulation failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSimulating(false);
    }
  };

  // Create lead from conversation directly into MongoDB
  const handleCreateLeadFromChat = async () => {
    if (!activeCust) return;
    try {
      const lastText = chatMsgs.slice(-1)[0]?.preview || "WhatsApp inquiry from customer";
      const payload = {
        customerName: activeCust.name && activeCust.name !== activeCust.id ? activeCust.name : `WhatsApp Inquiry (${activeCust.id})`,
        source: "WhatsApp",
        stage: "New",
        priority: "High",
        value: 150000,
        notes: `Inquiry via WhatsApp (${activeCust.id}): "${lastText}"`,
      };
      await axios.post(`${BACKEND_ROOT}/sales/leads`, payload);
      toast.success("Lead created from WhatsApp conversation!", {
        description: `Source: WhatsApp | Contact: ${activeCust.name}`
      });
    } catch (err) {
      toast.error("Failed to create lead: " + (err.response?.data?.message || err.message));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCust = threads.find((t) => t.id === active) || {
    id: active || "",
    name: "Select a conversation",
    contacts: [{ phone: active || "", name: "" }]
  };

  return (
    <>
      <PageHeader
        breadcrumb="CRM / WhatsApp"
        title="WhatsApp Inbox"
        subtitle="Customer Scan QR ➔ Meta Cloud API ➔ Webhook ➔ Real-time CRM Ingestion & Chat."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { fetchQrAndConfig(); setShowQrModal(true); }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm cursor-pointer"
            >
              <QrCode className="size-4" />
              <span>Scan QR to Chat</span>
            </Button>
            <Button
              onClick={handleSimulateScanMessage}
              disabled={simulating}
              variant="outline"
              className="gap-1.5 text-xs font-semibold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 cursor-pointer"
              title="Simulates an incoming WhatsApp message triggered by a customer QR scan"
            >
              <Sparkles className={`size-3.5 text-amber-600 ${simulating ? "animate-spin" : ""}`} />
              <span>Simulate Customer Scan</span>
            </Button>
          </div>
        }
      />

      {/* Main Inbox 3-Column Layout */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr_270px]">
        
        {/* Column 1: Conversations List */}
        <Section title="Conversations">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{threads.length} Active chats</span>
            <button
              onClick={fetchConversations}
              className="hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
              title="Refresh conversations"
            >
              <RefreshCw className="size-3" />
              <span>Sync</span>
            </button>
          </div>
          {loading && threads.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3">Loading chats...</p>
          ) : threads.length === 0 ? (
            <div className="p-4 text-center rounded-lg border border-dashed text-muted-foreground text-xs">
              <MessageSquare className="size-6 mx-auto mb-1.5 opacity-50" />
              <p className="font-semibold">No active chats</p>
              <p className="mt-0.5">Scan the QR code to initiate a customer chat.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActive(t.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-all cursor-pointer ${
                      active === t.id
                        ? "border-emerald-500 bg-emerald-50/70 shadow-xs"
                        : "border-border hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-foreground truncate">{t.name}</p>
                      {t.unreadCount > 0 && (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{t.id}</p>
                    {t.lastMessage && (
                      <p className="truncate text-xs text-muted-foreground/80 mt-1">
                        {t.lastMessage.direction === "Outgoing" ? "You: " : ""}{t.lastMessage.body}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Column 2: Active Chat Thread */}
        <Section 
          title={activeCust.name} 
          description={`${activeCust.contacts?.[0]?.phone || activeCust.id} · WhatsApp Cloud API Connected`}
        >
          <div className="space-y-3 min-h-[360px] max-h-[58vh] overflow-y-auto pr-2">
            {chatMsgs.length === 0 && !loading && (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="size-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm font-medium">No messages yet with {activeCust.name}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Send a free-form message or template, or scan the QR code to start the chat.
                </p>
              </div>
            )}
            {chatMsgs.map((m) => {
              const isOutgoing = m.direction === "Outgoing";
              return (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl p-3.5 text-sm shadow-2xs ${
                    isOutgoing
                      ? "ml-auto border border-emerald-300 bg-emerald-50 text-emerald-950"
                      : "border border-border bg-card text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.preview}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] opacity-70">
                    <span>{fmtDateTime(m.date)}</span>
                    <span className="font-semibold">
                      {isOutgoing ? "CRM Agent" : m.senderName || activeCust.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Send Box */}
          <div className="mt-4 flex items-center gap-2 border-t pt-4">
            <Button variant="outline" size="icon" title="Attach file"><Paperclip className="size-4" /></Button>
            <Button variant="outline" size="icon" title="Voice note"><Mic className="size-4" /></Button>
            <Input
              placeholder="Type WhatsApp message…"
              className="h-11"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={!active}
            />
            <Button
              className="h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              onClick={handleSend}
              disabled={!active || !messageText.trim()}
            >
              <Send className="size-4" />
              <span>Send</span>
            </Button>
          </div>
        </Section>

        {/* Column 3: Quick Actions & Templates */}
        <div className="space-y-4">
          <Section title="Actions from message">
            <div className="space-y-2">
              <Button
                className="w-full gap-2 justify-start cursor-pointer font-semibold"
                variant="outline"
                onClick={handleCreateLeadFromChat}
                disabled={!active}
              >
                <UserPlus className="size-4 text-emerald-600" />
                <span>Create Lead from Chat</span>
              </Button>
              <Link href="/quotations" className="block w-full">
                <Button className="w-full justify-start cursor-pointer" variant="outline">
                  <span>Attach to Quotation</span>
                </Button>
              </Link>
              <Link href="/customers" className="block w-full">
                <Button className="w-full justify-start cursor-pointer" variant="outline">
                  <span>View Customer Account</span>
                </Button>
              </Link>
            </div>
          </Section>

          <Section title="Approved Templates">
            <p className="text-[11px] text-muted-foreground mb-2">Pre-registered 24h window Meta templates:</p>
            <ul className="space-y-2 text-xs">
              {TEMPLATES.map((t) => (
                <li
                  key={t}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
                  onClick={() => handleTemplateSend(t)}
                  title={`Click to send "${t}"`}
                >
                  <span className="truncate font-medium">{t}</span>
                  <StatusBadge value="Send" />
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      {/* ─── Scan WhatsApp QR & Meta Cloud API Modal ─── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <QrCode className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">Customer Scan QR to WhatsApp</h3>
                  <p className="text-xs text-muted-foreground">Scan with phone camera ➔ Meta Cloud API ➔ Webhook ➔ CRM</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Architecture Flow Banner */}
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-950">
              <p className="font-semibold text-emerald-800 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Architecture Flow:</span>
              </p>
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono text-emerald-900">
                <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold">Customer</span>
                <ArrowRight className="size-3" />
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded font-semibold">Scan QR</span>
                <ArrowRight className="size-3" />
                <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold">WhatsApp</span>
                <ArrowRight className="size-3" />
                <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold">Meta Cloud API</span>
                <ArrowRight className="size-3" />
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-semibold">Webhook</span>
                <ArrowRight className="size-3" />
                <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold">CRM Database</span>
              </div>
            </div>

            {/* Tab Selector */}
            <div className="mt-4 flex rounded-lg border p-1 bg-muted/40 text-xs">
              <button
                onClick={() => setActiveModalTab("qr")}
                className={`flex-1 py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                  activeModalTab === "qr" ? "bg-white text-emerald-700 shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Scan QR Code & Link
              </button>
              <button
                onClick={() => setActiveModalTab("meta")}
                className={`flex-1 py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                  activeModalTab === "meta" ? "bg-white text-emerald-700 shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Meta Webhook Settings
              </button>
            </div>

            {/* Tab 1: QR Code & Chat Link */}
            {activeModalTab === "qr" && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* QR Image */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-200 bg-white shadow-xs">
                    {qrData?.qrCodeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrData.qrCodeUrl}
                        alt="WhatsApp QR Code"
                        className="size-48 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="size-48 flex items-center justify-center text-xs text-muted-foreground">
                        Generating QR Code...
                      </div>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground mt-2 font-semibold">
                      +{qrData?.phoneNumber || "WhatsApp Business"}
                    </span>
                  </div>

                  {/* Actions & Instructions */}
                  <div className="space-y-3 flex-1 text-xs">
                    <div>
                      <p className="font-bold text-foreground mb-1 text-sm">How to Connect:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Open <strong className="text-foreground">WhatsApp</strong> on your mobile phone.</li>
                        <li>Tap <strong className="text-foreground">Camera</strong> or scan this QR Code.</li>
                        <li>Hit send to deliver message directly into the CRM!</li>
                      </ol>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <Button
                        onClick={() => qrData?.chatUrl && window.open(qrData.chatUrl, "_blank")}
                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                      >
                        <ExternalLink className="size-4" />
                        <span>Open Chat in WhatsApp</span>
                      </Button>

                      <Button
                        onClick={() => qrData?.chatUrl && copyToClipboard(qrData.chatUrl)}
                        variant="outline"
                        className="w-full gap-2 cursor-pointer"
                      >
                        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                        <span>{copied ? "Link Copied!" : "Copy wa.me Chat Link"}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Greeting text input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pre-filled Customer Greeting Message
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={customGreeting}
                      onChange={(e) => setCustomGreeting(e.target.value)}
                      placeholder="Enter pre-filled inquiry text..."
                      className="text-xs h-9"
                    />
                    <Button
                      onClick={() => fetchQrAndConfig(customGreeting)}
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 text-xs"
                    >
                      Update QR
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Meta Webhook Setup */}
            {activeModalTab === "meta" && (
              <div className="mt-4 space-y-3 text-xs">
                <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                  <p className="font-semibold text-foreground">Meta Developer App Configuration:</p>
                  
                  <div>
                    <span className="text-muted-foreground block text-[11px] mb-0.5">Callback URL:</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white px-2.5 py-1.5 rounded border font-mono text-[11px] text-foreground select-all">
                        {configData?.webhookUrl || `${BACKEND_ROOT}/whatsapp/webhook`}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(configData?.webhookUrl || `${BACKEND_ROOT}/whatsapp/webhook`)}
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] mb-0.5">Verify Token (hub.verify_token):</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white px-2.5 py-1.5 rounded border font-mono text-[11px] text-foreground select-all">
                        {configData?.verifyToken || "nexcore_whatsapp_verify_token_2026"}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(configData?.verifyToken || "nexcore_whatsapp_verify_token_2026")}
                      >
                        <Copy className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2 border-t mt-2 text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Webhook Events to Subscribe:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li><code className="font-bold text-foreground">messages</code> — receives incoming text, buttons, and media</li>
                      <li><code className="font-bold text-foreground">message_status</code> — tracks sent, delivered, and read receipts</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-5 flex justify-end border-t pt-3">
              <Button onClick={() => setShowQrModal(false)} variant="outline">
                Close
              </Button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
