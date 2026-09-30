"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Paperclip, Mic, Send, UserPlus, QrCode, ExternalLink,
  Copy, Check, Sparkles, RefreshCw, X, ShieldCheck, ArrowRight, MessageSquare,
  Smartphone, Wifi, Unlink
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

  // WhatsApp Web Client (whatsapp-web.js) State
  const [webStatus, setWebStatus] = useState({
    status: "DISCONNECTED",
    isConnected: false,
    qrCodeUrl: null
  });
  const [webLoading, setWebLoading] = useState(false);

  // QR Modal & Meta Integration State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [customGreeting, setCustomGreeting] = useState("Hello Nexcore Alliance, I would like to inquire about your automation products and solutions.");
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("wweb"); // 'wweb' | 'qr' | 'meta'


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

  // Fetch WhatsApp Web Client status
  const fetchWebStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/web-client/status`);
      if (res.data?.success) {
        setWebStatus(res.data.data);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleStartWebClient = async () => {
    setWebLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/web-client/start`);
      if (res.data?.success) {
        setWebStatus(res.data.data);
        toast.success("WhatsApp Web initializing. Generating QR code...");
      }
    } catch (err) {
      toast.error("Failed to start WhatsApp Web: " + (err.response?.data?.error || err.message));
    } finally {
      setWebLoading(false);
    }
  };

  const handleDisconnectWebClient = async () => {
    setWebLoading(true);
    try {
      await axios.post(`${API_BASE}/web-client/disconnect`);
      toast.info("WhatsApp Web client disconnected.");
      fetchWebStatus();
    } catch (err) {
      toast.error("Failed to disconnect: " + err.message);
    } finally {
      setWebLoading(false);
    }
  };

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
    fetchWebStatus();

    // Poll every 4 seconds for fresh incoming messages and web client status
    const interval = setInterval(() => {
      fetchConversations();
      fetchWebStatus();
      if (active) fetchMessages(active);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchConversations, active, fetchMessages, fetchQrAndConfig, fetchWebStatus]);


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
            {/* WhatsApp Web Live Status Badge */}
            {webStatus.isConnected ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Web Client Connected</span>
              </div>
            ) : webStatus.status === "QR_READY" ? (
              <button
                onClick={() => { setActiveModalTab("wweb"); setShowQrModal(true); }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold cursor-pointer animate-pulse hover:bg-amber-100 transition-colors"
                title="Click to view QR code"
              >
                <span className="size-2 rounded-full bg-amber-500" />
                <span>Scan Web QR to Link</span>
              </button>
            ) : null}

            {/* Link Phone via whatsapp-web.js Button */}
            <Button
              onClick={() => {
                fetchWebStatus();
                setActiveModalTab("wweb");
                setShowQrModal(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm cursor-pointer"
            >
              <Smartphone className="size-4" />
              <span>{webStatus.isConnected ? "WhatsApp Linked" : "Link Phone (Web.js)"}</span>
            </Button>

            {/* Customer Scan wa.me link */}
            <Button
              onClick={() => {
                fetchQrAndConfig();
                setActiveModalTab("qr");
                setShowQrModal(true);
              }}
              variant="outline"
              className="gap-2 font-semibold shadow-xs cursor-pointer"
            >
              <QrCode className="size-4 text-emerald-600" />
              <span>Customer QR</span>
            </Button>

            <Button
              onClick={handleSimulateScanMessage}
              disabled={simulating}
              variant="outline"
              className="gap-1.5 text-xs font-semibold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 cursor-pointer"
              title="Simulates an incoming WhatsApp message triggered by a customer QR scan"
            >
              <Sparkles className={`size-3.5 text-amber-600 ${simulating ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Simulate Scan</span>
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
              <Link
                href={active ? `/quotations?action=create&customerName=${encodeURIComponent(active.name || "")}&phone=${encodeURIComponent(active.phone || "")}` : "/quotations"}
                className="block w-full"
              >
                <Button className="w-full justify-start cursor-pointer" variant="outline" disabled={!active}>
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
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Smartphone className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">WhatsApp Integration & Phone Linking</h3>
                  <p className="text-xs text-muted-foreground">Link your phone via whatsapp-web.js or configure Meta Cloud API</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="mt-4 flex rounded-lg border p-1 bg-muted/40 text-xs">
              <button
                onClick={() => setActiveModalTab("wweb")}
                className={`flex-1 py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                  activeModalTab === "wweb" ? "bg-white text-emerald-700 shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Link Phone (Web.js)
              </button>
              <button
                onClick={() => setActiveModalTab("qr")}
                className={`flex-1 py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                  activeModalTab === "qr" ? "bg-white text-emerald-700 shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Customer QR (wa.me)
              </button>
              <button
                onClick={() => setActiveModalTab("meta")}
                className={`flex-1 py-1.5 font-semibold rounded-md transition-all cursor-pointer ${
                  activeModalTab === "meta" ? "bg-white text-emerald-700 shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Meta Cloud API
              </button>
            </div>

            {/* Tab 1: WhatsApp Web.js Phone Linking */}
            {activeModalTab === "wweb" && (
              <div className="mt-4 space-y-4">
                {webStatus.isConnected ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="size-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-900 text-sm">WhatsApp Web Connected & Synchronized</h4>
                        <p className="text-xs text-emerald-700">Your phone session is active. Messages sent from CRM will route directly through your phone.</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-emerald-200 pt-3 text-xs">
                      <span className="text-emerald-800 font-medium">Session Provider: whatsapp-web.js (Puppeteer)</span>
                      <Button
                        onClick={handleDisconnectWebClient}
                        disabled={webLoading}
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                      >
                        <Unlink className="size-3.5 mr-1" />
                        <span>Disconnect Phone</span>
                      </Button>
                    </div>
                  </div>
                ) : webStatus.status === "QR_READY" && webStatus.qrCodeUrl ? (
                  <div className="space-y-4 text-center">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                      <p className="font-bold text-amber-950 mb-1">Scan this QR Code with WhatsApp on your phone:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-left max-w-sm mx-auto text-[11px] text-amber-900">
                        <li>Open <strong className="text-foreground">WhatsApp</strong> on your mobile phone</li>
                        <li>Tap <strong className="text-foreground">Settings</strong> (iOS) or <strong className="text-foreground">⋮ (Menu)</strong> (Android)</li>
                        <li>Select <strong className="text-foreground">Linked Devices</strong> ➔ <strong className="text-foreground">Link a Device</strong></li>
                        <li>Point your phone camera at this QR code</li>
                      </ol>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <div className="p-3 bg-white rounded-2xl border border-border shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={webStatus.qrCodeUrl}
                          alt="WhatsApp Web QR Code"
                          className="size-56 rounded-lg object-contain"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full animate-pulse font-medium">
                        <span className="size-2 rounded-full bg-amber-500" />
                        <span>Waiting for scan... (Auto-detects login)</span>
                      </div>
                    </div>

                    <div className="flex justify-center gap-2 pt-1">
                      <Button
                        onClick={handleStartWebClient}
                        disabled={webLoading}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs cursor-pointer"
                      >
                        <RefreshCw className={`size-3.5 ${webLoading ? "animate-spin" : ""}`} />
                        <span>Refresh QR</span>
                      </Button>
                      <Button
                        onClick={handleDisconnectWebClient}
                        disabled={webLoading}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <span>Cancel</span>
                      </Button>
                    </div>
                  </div>
                ) : webStatus.status === "INITIALIZING" ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <RefreshCw className="size-8 animate-spin text-emerald-600" />
                    <p className="font-semibold text-foreground text-sm">Launching Headless Chromium Browser...</p>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      Connecting to web.whatsapp.com and generating your login QR code. This takes 5 to 10 seconds.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-xs">
                      <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                        <Smartphone className="size-4 text-emerald-600" />
                        <span>Direct WhatsApp Web Phone Linking</span>
                      </h4>
                      <p className="text-muted-foreground">
                        Connect any regular SIM or WhatsApp Business phone number without needing Meta business approval, developer accounts, or credit cards.
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 pt-1">
                        <li>Send and receive WhatsApp messages directly from CRM</li>
                        <li>Session is saved locally with <code className="font-bold">LocalAuth</code> (no need to scan every restart)</li>
                        <li>Incoming messages auto-link with customer and lead contacts</li>
                      </ul>
                    </div>

                    <Button
                      onClick={handleStartWebClient}
                      disabled={webLoading}
                      className="w-full h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-md"
                    >
                      <Smartphone className="size-4" />
                      <span>{webLoading ? "Initializing Browser..." : "Generate Linked Device QR Code"}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: QR Code & Chat Link (wa.me) */}
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
