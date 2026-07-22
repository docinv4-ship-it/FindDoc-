"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  MessageCircle, 
  User, 
  Phone, 
  Send, 
  Loader2, 
  Calendar, 
  Check, 
  CheckCheck, 
  X, 
  Ban, 
  Flag, 
  MoreVertical, 
  AlertTriangle, 
  Paperclip, 
  FileText, 
  Download, 
  Sparkles,
  Info
} from "lucide-react";
import { formatChatTimestamp, formatFullTime, DOCTOR_QUICK_REPLIES } from "@/lib/supabase/chat-helpers";

export default function DoctorInboxPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; type: string } | null>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      
      const { data: doctor } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctor) { router.push("/doctor/signup"); return; }
      if (!doctor.is_onboarded) { router.push("/doctor/onboarding"); return; }
      setDoctorId(doctor.id);

      const { data: conversationsData } = await supabase
        .from("conversations")
        .select(`*, patients (*)`)
        .eq("doctor_id", doctor.id)
        .order("last_message_at", { ascending: false });

      if (conversationsData) setConversations(conversationsData);
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  useEffect(() => {
    if (!selectedConversation || !doctorId) return;
    fetchMessages();
    markMessagesAsRead();

    const channel = supabase
      .channel(`doctor_messages:${selectedConversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation.id}` },
        (payload: any) => { 
          setMessages((prev) => { 
            if (prev.some((m) => m.id === payload.new.id)) return prev; 
            return [...prev, payload.new]; 
          }); 
        })
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setSelectedFile({
          url: data.url,
          name: data.name,
          type: data.attachment_type,
        });
      }
    } catch (err) {
      console.error("Doctor file upload error:", err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !doctorId) return;

    setSending(true);
    try {
      const response = await fetch("/api/messages", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          conversation_id: selectedConversation.id, 
          sender_id: doctorId, 
          sender_type: "doctor", 
          content: newMessage.trim(),
          attachment_url: selectedFile?.url || null,
          attachment_type: selectedFile?.type || null,
          attachment_name: selectedFile?.name || null,
        }) 
      });

      const data = await response.json();
      if (response.ok && data.message) {
        setMessages((prev) => { if (prev.some((m) => m.id === data.message.id)) return prev; return [...prev, data.message]; });
        setNewMessage("");
        setSelectedFile(null);
        setConversations((prev) => prev.map((c) => c.id === selectedConversation.id ? { ...c, last_message_at: new Date().toISOString(), last_message_preview: newMessage.trim() || "Attached a file" } : c));
      }
    } catch (err) { console.error("Error sending message:", err); }
    finally { setSending(false); }
  };

  const handleBlockUser = async () => {
    if (!selectedConversation || !doctorId || !selectedConversation.patient_id) return;
    if (!confirm("Are you sure you want to block this patient?")) return;
    try {
      const response = await fetch("/api/user/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          blocker_type: "doctor",
          blocker_id: doctorId,
          blocked_user_id: selectedConversation.patient_id,
          reason: "User blocked via doctor workspace",
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
        alert("Report submitted successfully.");
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;

  return (
    <div className="h-[calc(100vh-6rem)] bg-white rounded-2xl border border-slate-200 flex overflow-hidden shadow-xs">
      {/* Left List */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="font-extrabold text-slate-900 text-sm">Clinical Consultations</h2>
          <p className="text-xs text-slate-500 font-medium">{conversations.length} active patient thread{conversations.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.length > 0 ? conversations.map((conv) => (
            <button 
              key={conv.id} 
              onClick={() => setSelectedConversation(conv)} 
              className={`w-full text-left p-3.5 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer ${selectedConversation?.id === conv.id ? "bg-teal-50/80 border-l-4 border-l-[#36d1cf]" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-teal-100/80 text-teal-800 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {conv.patients?.full_name?.[0] || "P"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-bold text-slate-900 text-xs truncate">{conv.patients?.full_name || conv.patient_name}</p>
                    <span className="text-[10px] font-semibold text-slate-400">{formatChatTimestamp(conv.last_message_at)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-medium">{conv.patients?.phone || conv.patient_email || "Patient Portal"}</p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{conv.last_message_preview || "Open conversation thread"}</p>
                </div>
              </div>
            </button>
          )) : (
            <div className="p-8 text-center my-auto">
              <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-800 font-bold text-xs">No Patient Messages</p>
            </div>
          )}
        </div>
      </div>

      {/* Middle Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-100/80 text-teal-800 rounded-full flex items-center justify-center font-extrabold text-xs">
                  {selectedConversation.patients?.full_name?.[0] || "P"}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{selectedConversation.patients?.full_name || selectedConversation.patient_name}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Phone className="w-3 h-3 text-slate-400" /> {selectedConversation.patients?.phone || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.push(`/doctor/appointments?conversation=${selectedConversation.id}&patient=${selectedConversation.patient_id}`)} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#36d1cf] hover:bg-teal-600 text-white text-xs font-bold rounded-lg transition-colors border-0 cursor-pointer shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5" /> Appointment
                </button>

                <div className="relative" ref={menuRef}>
                  <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors border-0 bg-transparent cursor-pointer">
                    <MoreVertical className="w-4 h-4 text-slate-600" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
                      <button onClick={isBlocked ? handleUnblockUser : handleBlockUser} className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-left hover:bg-slate-50 text-rose-600 font-bold bg-transparent border-0 cursor-pointer">
                        {isBlocked ? <><X className="w-3.5 h-3.5" /> Unblock Patient</> : <><Ban className="w-3.5 h-3.5" /> Block Patient</>}
                      </button>
                      <button onClick={() => { setShowMenu(false); setShowReportModal(true); }} className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-left hover:bg-slate-50 text-amber-600 border-t border-slate-100 font-bold bg-transparent cursor-pointer">
                        <Flag className="w-3.5 h-3.5" /> Report Patient
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Doctor Canned Replies Bar */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-[#36d1cf]" /> Quick Responses:
              </span>
              {DOCTOR_QUICK_REPLIES.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => setNewMessage(reply)}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:border-teal-300 text-slate-700 text-[11px] font-medium rounded-full flex-shrink-0 cursor-pointer transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
              {messages.map((msg) => {
                const isDoctor = msg.sender_type === "doctor";
                return (
                  <div key={msg.id} className={`flex ${isDoctor ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] sm:max-w-md px-3.5 py-2 rounded-2xl shadow-2xs ${isDoctor ? "bg-[#36d1cf] text-white rounded-br-none" : "bg-white border border-slate-200 text-slate-900 rounded-bl-none"}`}>
                      {msg.attachment_url && (
                        <div className="mb-2">
                          {msg.attachment_type === "image" ? (
                            <img src={msg.attachment_url} alt="Attached Medical File" className="max-w-full rounded-lg max-h-48 object-cover border border-white/20" />
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold underline ${isDoctor ? "bg-white/20 text-white" : "bg-slate-100 text-slate-800"}`}>
                              <FileText className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate flex-1">{msg.attachment_name || "Download Report PDF"}</span>
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}

                      {msg.content && <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                      <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 font-semibold ${isDoctor ? "text-white/80" : "text-slate-400"}`}>
                        <span>{formatFullTime(msg.created_at)}</span>
                        {isDoctor && (
                          msg.is_read ? <CheckCheck className="w-3 h-3 text-white" /> : <Check className="w-3 h-3 text-white/80" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected File Preview Bar */}
            {selectedFile && (
              <div className="px-4 py-2 bg-teal-50 border-t border-teal-100 flex items-center justify-between text-xs text-teal-800">
                <span className="font-bold truncate">Attachment: {selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-rose-600 bg-transparent border-0 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,application/pdf"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 bg-transparent border-0 cursor-pointer disabled:opacity-50"
              >
                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin text-[#36d1cf]" /> : <Paperclip className="w-4 h-4" />}
              </button>

              <input 
                type="text" 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                placeholder={isBlocked ? "Blocked by user" : "Type clinical response..."} 
                disabled={isBlocked}
                className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#36d1cf]" 
              />

              <button 
                type="submit" 
                disabled={sending || isBlocked || (!newMessage.trim() && !selectedFile)} 
                className="p-2 bg-[#36d1cf] hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl transition-colors border-0 cursor-pointer"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50/30">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-bold text-xs">Select a patient thread to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Patient Clinical Card */}
      {selectedConversation && (
        <div className="w-72 border-l border-slate-200 bg-white p-4 hidden lg:flex flex-col">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Info className="w-4 h-4 text-[#36d1cf]" />
            <h3 className="font-extrabold text-slate-900 text-xs">Patient Summary</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Full Name</p>
              <p className="font-extrabold text-slate-800">{selectedConversation.patients?.full_name || selectedConversation.patient_name}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Contact Number</p>
              <p className="font-medium text-slate-700">{selectedConversation.patients?.phone || "N/A"}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Email Address</p>
              <p className="font-medium text-slate-700 truncate">{selectedConversation.patient_email || selectedConversation.patients?.email || "N/A"}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Status</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded uppercase tracking-wider">
                {selectedConversation.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedConversation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Report Patient</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium bg-white" required>
                  <option value="">Select reason</option>
                  <option value="spam">Spam or nuisance messages</option>
                  <option value="harassment">Abusive language</option>
                  <option value="fraud">Fraudulent request</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Details</label>
                <textarea value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none" placeholder="Provide extra context..." />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowReportModal(false)} className="flex-1 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl bg-transparent cursor-pointer">Cancel</button>
                <button type="submit" disabled={submittingReport || !reportReason.trim()} className="flex-1 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl border-0 cursor-pointer flex items-center justify-center gap-1.5">
                  {submittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
