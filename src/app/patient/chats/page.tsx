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
  ShieldCheck 
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import type { Database } from "@/types/database";

type Message = Database["public"]["Tables"]["messages"]["Row"];

function PatientChatsContent() {
  const [step, setStep] = useState<"chats" | "chat">("chats");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
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
  const router = useRouter();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  // Automatic Authentication & Patient Profile Lookup
  useEffect(() => {
    const initializeSecureChats = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          
          // Lookup patient profile by User ID or linked Email
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
            setError("No profile associated with this account. Please create your profile first.");
          }
        } else {
          setError("No authenticated session found.");
        }
      } catch (err) {
        console.error("Auth & Lookup Error:", err);
        setError("Something went wrong establishing a secure connection.");
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
      .select("id, doctor_id, clinic_id, status, created_at, doctors (full_name, profile_image_url), clinics (name)")
      .eq("patient_id", pId)
      .order("created_at", { ascending: false });
    
    if (convError) {
      setError("Unable to load active chats.");
    } else if (data) {
      setConversations(data);
    }
    setLoading(false);
  };

  const openConversation = async (conv: any) => {
    setSelectedConversation(conv);
    setStep("chat");
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !patientId) return;
    setSending(true);
    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation.id,
        sender_type: "patient",
        sender_id: patientId,
        content: newMessage.trim(),
      })
      .select();
    
    if (!sendError && data) {
      setMessages((prev) => [...prev, data[0]]);
      setNewMessage("");
    }
    setSending(false);
  };

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

  const handleBlockUser = async () => {
    if (!selectedConversation || !patientId || !selectedConversation.doctor_id) return;
    if (!confirm("Are you sure you want to block this doctor? You won't be able to message them anymore.")) return;
    try {
      const response = await fetch("/api/user/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          blocker_type: "patient",
          blocker_id: patientId,
          blocked_user_id: selectedConversation.doctor_id,
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
        alert("Report submitted successfully. Our team will review it shortly.");
      }
    } catch (err) {
      console.error("Error submitting report:", err);
    }
    setSubmittingReport(false);
  };

  const handleCreateBooking = () => {
    if (!selectedConversation) return;
    router.push(`/clinic/${selectedConversation.clinics?.slug || selectedConversation.clinic_id}?doctor=${selectedConversation.doctor_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#36d1cf" }} />
        <p className="mt-4 text-sm font-semibold text-gray-500 uppercase tracking-wider animate-pulse">
          Syncing Chats Securely...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/patient")} className="flex items-center gap-2">
              <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </button>
            <button onClick={() => router.push("/patient")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              <User className="w-4 h-4" /> Find Doctors
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {step === "chats" && (
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Conversations</h1>
                {currentUser && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                    <Mail className="w-4 h-4" /> {currentUser.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 bg-teal-50 text-[#36d1cf] px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> Safe Connection
              </div>
            </div>

            {conversations.length > 0 ? (
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <div key={conv.id} onClick={() => openConversation(conv)} className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-teal-50">
                        {conv.doctors?.profile_image_url ? (
                          <img src={conv.doctors.profile_image_url} alt="" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User className="w-6 h-6 text-[#36d1cf]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{conv.doctors?.full_name || "Doctor"}</p>
                        <p className="text-sm text-gray-500">{conv.clinics?.name || "Clinic"}</p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${conv.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {conv.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !error && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-700 font-bold">No chats active yet</p>
                  <p className="text-sm text-gray-500 mt-1">Book an appointment or query a clinic to start consulting!</p>
                </div>
              )
            )}
          </div>
        )}

        {step === "chat" && selectedConversation && (
          <div>
            <button onClick={() => { setStep("chats"); setSelectedConversation(null); setShowMenu(false); setShowReportModal(false); }} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 font-semibold">
              <ArrowLeft className="w-5 h-5" /> Back to Chats
            </button>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-50">
                    {selectedConversation.doctors?.profile_image_url ? (
                      <img src={selectedConversation.doctors.profile_image_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User className="w-5 h-5 text-[#36d1cf]" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedConversation.doctors?.full_name}</p>
                    <p className="text-xs text-gray-500">{selectedConversation.clinics?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCreateBooking} className="flex items-center gap-2 px-3 py-1.5 text-white text-sm font-bold rounded-lg transition-colors shadow-sm hover:bg-teal-600" style={{ backgroundColor: "#36d1cf" }}>
                    <Calendar className="w-4 h-4" />Book
                  </button>
                  <div className="relative" ref={menuRef}>
                    <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                        <button onClick={isBlocked ? handleUnblockUser : handleBlockUser} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 text-red-600 font-semibold">
                          {isBlocked ? <><X className="w-4 h-4" /> Unblock Doctor</> : <><Ban className="w-4 h-4" /> Block Doctor</>}
                        </button>
                        <button onClick={() => { setShowMenu(false); setShowReportModal(true); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 text-orange-600 border-t border-gray-100 font-semibold">
                          <Flag className="w-4 h-4" /> Report Doctor
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === "patient" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs px-4 py-2.5 rounded-2xl shadow-sm ${msg.sender_type === "patient" ? "text-white" : "bg-white border border-gray-200 text-gray-900"}`} style={msg.sender_type === "patient" ? { backgroundColor: "#36d1cf" } : {}}>
                      <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] text-right mt-1 font-semibold ${msg.sender_type === "patient" ? "text-white/80" : "text-gray-400"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 flex gap-2 bg-white">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message safely..." className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#36d1cf]" />
                <button type="submit" disabled={sending || !newMessage.trim()} className="p-3 rounded-xl text-white disabled:opacity-50 transition-transform active:scale-95 flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Report Doctor</h3>
                <p className="text-xs text-gray-500">Submit a secure report about this doctor</p>
              </div>
            </div>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#36d1cf] bg-white font-medium text-sm text-gray-700"
                >
                  <option value="">Select a reason</option>
                  <option value="inappropriate_behavior">Inappropriate Behavior</option>
                  <option value="spam">Spam or Harassment</option>
                  <option value="fake_profile">Fake Profile</option>
                  <option value="unprofessional">Unprofessional Conduct</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  placeholder="Provide additional context details..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#36d1cf] text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowReportModal(false); setReportReason(""); setReportDescription(""); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport || !reportReason.trim()}
                  className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {submittingReport ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Submit Report"}
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
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
        </div>
      }>
        <PatientChatsContent />
      </Suspense>
    </AuthGuard>
  );
}
