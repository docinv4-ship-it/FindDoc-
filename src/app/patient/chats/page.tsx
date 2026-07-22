"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  MessageCircle, 
  Send, 
  User, 
  Stethoscope, 
  ArrowLeft, 
  Calendar, 
  MoreVertical, 
  Ban, 
  Flag, 
  X, 
  AlertTriangle, 
  Mail, 
  ShieldCheck,
  Paperclip,
  Check,
  CheckCheck,
  FileText,
  Search,
  Download
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { formatChatTimestamp, formatFullTime } from "@/lib/supabase/chat-helpers";

const FIND_DOCTORS_ROUTE = "/patient/search";

export function PatientChatsContent() {
  const [step, setStep] = useState<"chats" | "chat">("chats");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
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
    const initializeSecureChats = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          let patientProfile = null;

          const { data: profileById } = await supabase
            .from("patients")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          patientProfile = profileById;

          if (!patientProfile && user.email) {
            const { data: profileByEmail } = await supabase
              .from("patients")
              .select("id")
              .eq("email", user.email)
              .maybeSingle();
            patientProfile = profileByEmail;
          }

          if (patientProfile) {
            setPatientId(patientProfile.id);
            await fetchConversations(patientProfile.id);
          } else {
            setError("No patient profile linked with this account.");
          }
        } else {
          setError("No authenticated session found.");
        }
      } catch (err) {
        console.error("Auth Exception:", err);
        setError("Connection failed.");
      } finally {
        setLoading(false);
      }
    };

    initializeSecureChats();
  }, [supabase]);

  const fetchConversations = async (pId: string) => {
    setLoading(true);
    const { data, error: convError } = await supabase
      .from("conversations")
      .select("id, doctor_id, clinic_id, status, last_message_at, last_message_preview, created_at, doctors (full_name, profile_image_url), clinics (name)")
      .eq("patient_id", pId)
      .order("last_message_at", { ascending: false });

    if (convError) {
      setError("Unable to load conversations.");
    } else if (data) {
      setConversations(data);
    }
    setLoading(false);
  };

  const openConversation = async (conv: any) => {
    setSelectedConversation(conv);
    setStep("chat");
    fetchMessages(conv.id);

    // Mark doctor messages as read
    if (patientId) {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conv.id, reader_id: patientId }),
      });
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/messages?conversation_id=${convId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  // REALTIME SUPABASE LISTENERS
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`realtime_chat:${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload: any) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedConversation || !patientId) return;
    const checkBlockStatus = async () => {
      const { data: blockRecord } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("conversation_id", selectedConversation.id)
        .eq("blocker_id", patientId)
        .eq("blocked_user_id", selectedConversation.doctor_id)
        .maybeSingle();
      setIsBlocked(!!blockRecord);
    };
    checkBlockStatus();
  }, [selectedConversation, patientId, supabase]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      } else {
        alert(data.error || "File upload failed.");
      }
    } catch (err) {
      console.error("File upload error:", err);
    } finally {
      setUploadingFile(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !patientId) return;

    setSending(true);
    try {
      const payload = {
        conversation_id: selectedConversation.id,
        sender_type: "patient",
        sender_id: patientId,
        content: newMessage.trim(),
        attachment_url: selectedFile?.url || null,
        attachment_type: selectedFile?.type || null,
        attachment_name: selectedFile?.name || null,
      };

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setNewMessage("");
        setSelectedFile(null);
      } else {
        alert(data.error || "Failed to send message.");
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConversation || !patientId || !selectedConversation.doctor_id) return;
    if (!confirm("Are you sure you want to block this doctor?")) return;
    try {
      const response = await fetch("/api/user/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          blocker_type: "patient",
          blocker_id: patientId,
          blocked_user_id: selectedConversation.doctor_id,
          reason: "User blocked via chat interface",
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
    if (!selectedConversation || !patientId || !selectedConversation.doctor_id) return;
    try {
      const response = await fetch(`/api/user/block?blocker_type=patient&blocker_id=${patientId}&blocked_user_id=${selectedConversation.doctor_id}`, {
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
    if (!selectedConversation || !patientId || !selectedConversation.doctor_id || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      const response = await fetch("/api/user/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter_type: "patient",
          reporter_id: patientId,
          reported_entity_type: "doctor",
          reported_entity_id: selectedConversation.doctor_id,
          reason: reportReason.trim(),
          description: reportDescription.trim() || null,
        }),
      });
      if (response.ok) {
        setShowReportModal(false);
        setReportReason("");
        setReportDescription("");
        alert("Report submitted successfully. Our team will review it.");
      }
    } catch (err) {
      console.error("Error submitting report:", err);
    }
    setSubmittingReport(false);
  };

  const filteredConversations = conversations.filter((c) =>
    c.doctors?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.clinics?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-[#36d1cf]" />
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Connecting Encrypted Patient Portal...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/patient")} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center border border-teal-100">
              <Stethoscope className="w-5 h-5 text-[#36d1cf]" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">DocFind <span className="text-[#36d1cf] text-xs uppercase px-1.5 py-0.5 bg-teal-50 rounded font-bold border border-teal-100">Care</span></span>
          </button>

          <button 
            onClick={() => router.push(FIND_DOCTORS_ROUTE)} 
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border-0 cursor-pointer"
          >
            <User className="w-3.5 h-3.5" /> Find Doctors
          </button>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 flex flex-col">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-3 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "chats" && (
          <div className="flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">My Consultations</h1>
                {currentUser && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {currentUser.email}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-teal-50 text-[#14b8a6] px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-teal-100">
                <ShieldCheck className="w-3.5 h-3.5" /> HIPAA Encrypted
              </div>
            </div>

            {/* Search Filter */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctors or clinic name..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#36d1cf]"
              />
            </div>

            {filteredConversations.length > 0 ? (
              <div className="space-y-2.5">
                {filteredConversations.map((conv) => (
                  <div key={conv.id} onClick={() => openConversation(conv)} className="bg-white rounded-xl border border-slate-200 p-3.5 cursor-pointer hover:border-teal-300 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-teal-50 border border-teal-100 flex-shrink-0 relative">
                        {conv.doctors?.profile_image_url ? (
                          <img src={conv.doctors.profile_image_url} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User className="w-5 h-5 text-[#36d1cf]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-bold text-slate-900 text-sm truncate">{conv.doctors?.full_name || "Doctor"}</p>
                          <span className="text-[10px] font-semibold text-slate-400">{formatChatTimestamp(conv.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate">{conv.clinics?.name || "Clinic Portal"}</p>
                        <p className="text-xs text-slate-400 truncate mt-1">{conv.last_message_preview || "Click to open conversation thread"}</p>
                      </div>

                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${conv.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-600"}`}>
                        {conv.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !error && (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs my-auto">
                  <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-800 font-extrabold text-sm">No Active Consultations</p>
                  <p className="text-xs text-slate-500 mt-1">Book an appointment with a clinic doctor to initiate live consultation chat.</p>
                </div>
              )
            )}
          </div>
        )}

        {step === "chat" && selectedConversation && (
          <div className="flex-1 flex flex-col h-full">
            <button onClick={() => { setStep("chats"); setSelectedConversation(null); setShowMenu(false); setShowReportModal(false); }} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 mb-3 bg-transparent border-0 cursor-pointer w-fit">
              <ArrowLeft className="w-4 h-4" /> Back to Consultations
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex-1 flex flex-col min-h-[550px]">
              {/* Header */}
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-50 border border-teal-100 flex-shrink-0">
                    {selectedConversation.doctors?.profile_image_url ? (
                      <img src={selectedConversation.doctors.profile_image_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User className="w-5 h-5 text-[#36d1cf]" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">{selectedConversation.doctors?.full_name || "Doctor"}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{selectedConversation.clinics?.name || "Clinic Consultation Room"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => router.push(`/clinic/${selectedConversation.clinics?.slug || selectedConversation.clinic_id}?doctor=${selectedConversation.doctor_id}`)} className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-lg shadow-2xs hover:bg-teal-600 border-0 cursor-pointer transition-colors" style={{ backgroundColor: "#36d1cf" }}>
                    <Calendar className="w-3.5 h-3.5" /> Book
                  </button>

                  <div className="relative" ref={menuRef}>
                    <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors border-0 bg-transparent cursor-pointer">
                      <MoreVertical className="w-4 h-4 text-slate-600" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
                        <button onClick={isBlocked ? handleUnblockUser : handleBlockUser} className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-left hover:bg-slate-50 text-rose-600 font-bold bg-transparent border-0 cursor-pointer">
                          {isBlocked ? <><X className="w-3.5 h-3.5" /> Unblock Doctor</> : <><Ban className="w-3.5 h-3.5" /> Block Doctor</>}
                        </button>
                        <button onClick={() => { setShowMenu(false); setShowReportModal(true); }} className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-left hover:bg-slate-50 text-amber-600 border-t border-slate-100 font-bold bg-transparent cursor-pointer">
                          <Flag className="w-3.5 h-3.5" /> Report Doctor
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 max-h-[420px]">
                {messages.map((msg) => {
                  const isPatient = msg.sender_type === "patient";
                  return (
                    <div key={msg.id} className={`flex ${isPatient ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] sm:max-w-md px-3.5 py-2.5 rounded-2xl shadow-2xs ${isPatient ? "text-white rounded-br-none" : "bg-white border border-slate-200 text-slate-900 rounded-bl-none"}`} style={isPatient ? { backgroundColor: "#36d1cf" } : {}}>
                        {msg.attachment_url && (
                          <div className="mb-2">
                            {msg.attachment_type === "image" ? (
                              <img src={msg.attachment_url} alt="Attached Medical File" className="max-w-full rounded-lg max-h-48 object-cover border border-white/20" />
                            ) : (
                              <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold underline ${isPatient ? "bg-white/20 text-white" : "bg-slate-100 text-slate-800"}`}>
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate flex-1">{msg.attachment_name || "Download Report PDF"}</span>
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        )}

                        {msg.content && <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                        <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 font-semibold ${isPatient ? "text-white/80" : "text-slate-400"}`}>
                          <span>{formatFullTime(msg.created_at)}</span>
                          {isPatient && (
                            msg.is_read ? <CheckCheck className="w-3 h-3 text-white" /> : <Check className="w-3 h-3 text-white/80" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Bar */}
              {selectedFile && (
                <div className="px-4 py-2 bg-teal-50/80 border-t border-teal-100 flex items-center justify-between text-xs text-teal-800">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-4 h-4 text-[#36d1cf]" />
                    <span className="font-bold truncate">{selectedFile.name}</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-rose-600 bg-transparent border-0 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Footer Input */}
              <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 flex items-center gap-2 bg-white">
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
                  className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 border-0 bg-transparent cursor-pointer disabled:opacity-50 transition-colors"
                  title="Attach Medical Report / Image"
                >
                  {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin text-[#36d1cf]" /> : <Paperclip className="w-4 h-4" />}
                </button>

                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  placeholder={isBlocked ? "Messaging disabled due to active block" : "Type a secure message..."} 
                  disabled={isBlocked}
                  className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#36d1cf] disabled:bg-slate-100" 
                />

                <button 
                  type="submit" 
                  disabled={sending || isBlocked || (!newMessage.trim() && !selectedFile)} 
                  className="p-2.5 rounded-xl text-white disabled:opacity-50 flex items-center justify-center border-0 cursor-pointer transition-transform active:scale-95" 
                  style={{ backgroundColor: "#36d1cf" }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Report Doctor</h3>
                <p className="text-[11px] text-slate-500">File an encrypted violation report</p>
              </div>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Violation Category</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#36d1cf] bg-white text-xs font-medium text-slate-800"
                >
                  <option value="">Select reason</option>
                  <option value="inappropriate_behavior">Inappropriate Conduct</option>
                  <option value="spam">Spam / Unsolicited Ads</option>
                  <option value="unprofessional">Unprofessional Advice</option>
                  <option value="other">Other Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Details (Optional)</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your concern clearly..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#36d1cf] text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowReportModal(false); setReportReason(""); setReportDescription(""); }}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-xs bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport || !reportReason.trim()}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs disabled:opacity-50 flex items-center justify-center border-0 cursor-pointer"
                >
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

export default function PatientChatsPage() {
  return (
    <AuthGuard currentPath="/patient/chats">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-[#36d1cf]" />
        </div>
      }>
        <PatientChatsContent />
      </Suspense>
    </AuthGuard>
  );
}
