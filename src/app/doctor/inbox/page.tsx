"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { MessageCircle, User, Phone, Send, Loader2, Calendar, Check, X, Ban, Flag, MoreVertical, AlertTriangle } from "lucide-react";
import type { Database } from "@/types/database";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type Patient = Database["public"]["Tables"]["patients"]["Row"];
type Message = Database["public"]["Tables"]["messages"]["Row"];

interface ConversationWithPatient extends Conversation {
  patients: Patient | null;
}

export default function DoctorInboxPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationWithPatient[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithPatient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctor } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctor) { router.push("/doctor/signup"); return; }
      if (!doctor.is_onboarded) { router.push("/doctor/onboarding"); return; }
      setDoctorId(doctor.id);

      const { data: conversationsData } = await supabase.from("conversations").select(`*, patients (*)`).eq("doctor_id", doctor.id).order("last_message_at", { ascending: false });
      if (conversationsData) setConversations(conversationsData as ConversationWithPatient[]);
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  useEffect(() => {
    if (!selectedConversation || !doctorId) return;
    fetchMessages();
    markMessagesAsRead();

    const channel = supabase.channel(`messages:${selectedConversation.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation.id}` },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => { setMessages((prev) => { if (prev.some((m) => m.id === payload.new.id)) return prev; return [...prev, payload.new as Message]; }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation, doctorId, supabase]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchMessages = async () => {
    if (!selectedConversation) return;
    try {
      const response = await fetch(`/api/messages?conversation_id=${selectedConversation.id}`);
      const data = await response.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) { console.error("Error fetching messages:", err); }
  };

  const markMessagesAsRead = async () => {
    if (!selectedConversation || !doctorId) return;
    await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: selectedConversation.id, reader_id: doctorId }) });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !doctorId) return;
    setSending(true);
    try {
      const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: selectedConversation.id, sender_id: doctorId, sender_type: "doctor", content: newMessage.trim() }) });
      const data = await response.json();
      if (response.ok && data.message) {
        setMessages((prev) => { if (prev.some((m) => m.id === data.message.id)) return prev; return [...prev, data.message]; });
        setNewMessage("");
        setConversations((prev) => prev.map((c) => c.id === selectedConversation.id ? { ...c, last_message_at: new Date().toISOString() } : c));
      }
    } catch (err) { console.error("Error sending message:", err); }
    finally { setSending(false); }
  };

  const handleCreateBooking = () => {
    if (!selectedConversation) return;
    router.push(`/doctor/appointments?conversation=${selectedConversation.id}&patient=${selectedConversation.patient_id}`);
  };

  const handleBlockUser = async () => {
    if (!selectedConversation || !doctorId || !selectedConversation.patient_id) return;
    if (!confirm("Are you sure you want to block this patient? They won't be able to message you anymore.")) return;
    try {
      const response = await fetch("/api/user/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          blocker_type: "doctor",
          blocker_id: doctorId,
          blocked_user_id: selectedConversation.patient_id,
          reason: "User blocked via chat",
        }),
      });
      if (response.ok) {
        setIsBlocked(true);
        setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id));
        setSelectedConversation(null);
      }
    } catch (err) {
      console.error("Error blocking user:", err);
    }
    setShowMenu(false);
  };

  const handleUnblockUser = async () => {
    if (!selectedConversation || !doctorId || !selectedConversation.patient_id) return;
    try {
      const response = await fetch(`/api/user/block?blocker_type=doctor&blocker_id=${doctorId}&blocked_user_id=${selectedConversation.patient_id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setIsBlocked(false);
      }
    } catch (err) {
      console.error("Error unblocking user:", err);
    }
    setShowMenu(false);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !doctorId || !selectedConversation.patient_id || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      const response = await fetch("/api/user/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter_type: "doctor",
          reporter_id: doctorId,
          reported_entity_type: "patient",
          reported_entity_id: selectedConversation.patient_id,
          reason: reportReason.trim(),
          description: reportDescription.trim() || null,
        }),
      });
      if (response.ok) {
        setShowReportModal(false);
        setReportReason("");
        setReportDescription("");
        alert("Report submitted successfully. Our team will review it shortly.");
      }
    } catch (err) {
      console.error("Error submitting report:", err);
    }
    setSubmittingReport(false);
  };

  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!selectedConversation || !doctorId || !selectedConversation.patient_id) return;
      const { data: blockRecord } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("conversation_id", selectedConversation.id)
        .eq("blocker_id", doctorId)
        .eq("blocked_user_id", selectedConversation.patient_id)
        .maybeSingle();
      setIsBlocked(!!blockRecord);
    };
    checkBlockStatus();
  }, [selectedConversation, doctorId, supabase]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-2xl border border-gray-200 flex overflow-hidden">
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200"><h2 className="font-semibold text-gray-900">Messages</h2><p className="text-sm text-gray-500">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p></div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 ? conversations.map((conv) => (
            <button key={conv.id} onClick={() => setSelectedConversation(conv)} className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedConversation?.id === conv.id ? "bg-primary-50" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-primary-700 font-medium">{conv.patients?.full_name?.[0] || "P"}</span></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between"><p className="font-medium text-gray-900 truncate">{conv.patients?.full_name || "Unknown"}</p><span className="text-xs text-gray-400">{formatTime(conv.last_message_at)}</span></div>
                  <p className="text-sm text-gray-500 truncate">{conv.patients?.phone}</p>
                </div>
              </div>
            </button>
          )) : (
            <div className="p-8 text-center"><MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No conversations yet</p><p className="text-sm text-gray-400 mt-1">Patient chats will appear here</p></div>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center"><span className="text-primary-700 font-medium">{selectedConversation.patients?.full_name?.[0] || "P"}</span></div>
                <div><p className="font-medium text-gray-900">{selectedConversation.patients?.full_name || "Unknown"}</p><p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{selectedConversation.patients?.phone || "N/A"}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCreateBooking} className="flex items-center gap-2 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"><Calendar className="w-4 h-4" />Book</button>
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><MoreVertical className="w-5 h-5 text-gray-600" /></button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                      <button onClick={isBlocked ? handleUnblockUser : handleBlockUser} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 text-red-600">
                        {isBlocked ? <><X className="w-4 h-4" /> Unblock User</> : <><Ban className="w-4 h-4" /> Block User</>}
                      </button>
                      <button onClick={() => { setShowMenu(false); setShowReportModal(true); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 text-orange-600 border-t border-gray-100">
                        <Flag className="w-4 h-4" /> Report User
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_type === "doctor" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${msg.sender_type === "doctor" ? "bg-primary-500 text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md"}`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_type === "doctor" ? "text-primary-100" : "text-gray-400"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                      {msg.sender_type === "doctor" && msg.is_read && <Check className="w-3 h-3 inline ml-1" />}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-4 py-3 border-t border-gray-200">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your reply..." className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button type="submit" disabled={sending || !newMessage.trim()} className="p-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-full transition-colors">{sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" /><p className="text-gray-600">Select a conversation to start messaging</p></div></div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Report User</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Report</label>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required>
                  <option value="">Select a reason</option>
                  <option value="spam">Spam or unwanted messages</option>
                  <option value="harassment">Harassment or abuse</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="fraud">Fraud or scam</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details (Optional)</label>
                <textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Provide any additional details about your report..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submittingReport || !reportReason.trim()} className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  {submittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <><AlertTriangle className="w-4 h-4" /> Submit Report</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
