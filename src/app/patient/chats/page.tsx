"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MessageCircle, Phone, Lock, Send, User, Stethoscope, ArrowLeft, Calendar, MoreVertical, Ban, Flag, X, AlertTriangle } from "lucide-react";
import type { Database } from "@/types/database";

type Message = Database["public"]["Tables"]["messages"]["Row"];

function PatientChatsContent() {
  const [step, setStep] = useState<"phone" | "otp" | "chats" | "chat">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingOtp(true);
    setError(null);
    try {
      const response = await fetch("/api/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim(), purpose: "lookup" }) });
      const data = await response.json();
      if (response.ok) { setVerificationId(data.verification_id); setStep("otp"); }
      else { setError(data.error || "Failed to send OTP"); }
    } catch { setError("An error occurred"); }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingOtp(true);
    setError(null);
    try {
      const response = await fetch("/api/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verification_id: verificationId, otp: otp.trim() }) });
      if (response.ok) {
        const { data: patient } = await supabase.from("patients").select("id").eq("phone", phone.trim()).single();
        if (patient) { setPatientId(patient.id); await fetchConversations(patient.id); setStep("chats"); }
        else { setError("Patient not found"); }
      } else { setError("Invalid OTP"); }
    } catch { setError("An error occurred"); }
    setVerifyingOtp(false);
  };

  const fetchConversations = async (pId: string) => {
    setLoading(true);
    const { data } = await supabase.from("conversations").select("id, doctor_id, clinic_id, status, created_at, doctors (full_name, profile_image_url), clinics (name)").eq("patient_id", pId).order("created_at", { ascending: false });
    if (data) setConversations(data);
    setLoading(false);
  };

  const openConversation = async (conv: any) => {
    setSelectedConversation(conv);
    setStep("chat");
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !patientId) return;
    setSending(true);
    const { data, error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id,
      sender_type: "patient",
      sender_id: patientId,
      content: newMessage.trim(),
    }).select();
    if (!error && data) {
      setMessages((prev) => [...prev, data[0]]);
      setNewMessage("");
    }
    setSending(false);
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
        {step === "phone" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
                <MessageCircle className="w-8 h-8" style={{ color: "#36d1cf" }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Chat History</h1>
              <p className="text-gray-600 mt-2">Verify your phone to access chats</p>
            </div>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg" required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={sendingOtp || !phone.trim()} className="w-full py-3 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                {sendingOtp ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Continue"}
              </button>
            </form>
          </div>
        )}

        {step === "otp" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
                <Lock className="w-8 h-8" style={{ color: "#36d1cf" }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Verify</h1>
              <p className="text-gray-600 mt-2">Code sent to {phone}</p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter code" maxLength={6} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest" required />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={verifyingOtp || !otp.trim()} className="w-full py-3 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                {verifyingOtp ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify"}
              </button>
            </form>
          </div>
        )}

        {step === "chats" && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Chats</h1>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>
            ) : conversations.length > 0 ? (
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <div key={conv.id} onClick={() => openConversation(conv)} className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                        {conv.doctors?.profile_image_url ? <img src={conv.doctors.profile_image_url} alt="" className="w-full h-full object-cover rounded-full" /> : <User className="w-6 h-6" style={{ color: "#36d1cf" }} />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{conv.doctors?.full_name || "Doctor"}</p>
                        <p className="text-sm text-gray-500">{conv.clinics?.name || "Clinic"}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${conv.status === "active" ? "" : "bg-gray-100 text-gray-600"}`} style={conv.status === "active" ? { backgroundColor: "#e6faf9", color: "#239999" } : {}}>{conv.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No conversations yet</p>
              </div>
            )}
          </div>
        )}

        {step === "chat" && selectedConversation && (
          <div>
            <button onClick={() => { setStep("chats"); setSelectedConversation(null); setShowMenu(false); setShowReportModal(false); }} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                    {selectedConversation.doctors?.profile_image_url ? <img src={selectedConversation.doctors.profile_image_url} alt="" className="w-full h-full object-cover rounded-full" /> : <User className="w-5 h-5" style={{ color: "#36d1cf" }} />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedConversation.doctors?.full_name}</p>
                    <p className="text-xs text-gray-500">{selectedConversation.clinics?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleCreateBooking} className="flex items-center gap-2 px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors" style={{ backgroundColor: "#36d1cf" }}>
                    <Calendar className="w-4 h-4" />Book
                  </button>
                  <div className="relative" ref={menuRef}>
                    <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                        <button onClick={isBlocked ? handleUnblockUser : handleBlockUser} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 text-red-600">
                          {isBlocked ? <><X className="w-4 h-4" /> Unblock Doctor</> : <><Ban className="w-4 h-4" /> Block Doctor</>}
                        </button>
                        <button onClick={() => { setShowMenu(false); setShowReportModal(true); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 text-orange-600 border-t border-gray-100">
                          <Flag className="w-4 h-4" /> Report Doctor
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-96 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === "patient" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs px-4 py-2 rounded-xl ${msg.sender_type === "patient" ? "text-white" : "bg-gray-100 text-gray-900"}`} style={msg.sender_type === "patient" ? { backgroundColor: "#36d1cf" } : {}}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender_type === "patient" ? "text-white/80" : "text-gray-400"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-4 py-2 border border-gray-200 rounded-lg" />
                <button type="submit" disabled={sending || !newMessage.trim()} className="p-2 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Report Doctor</h3>
                <p className="text-sm text-gray-500">Submit a report about this doctor</p>
              </div>
            </div>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  placeholder="Provide additional details..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowReportModal(false); setReportReason(""); setReportDescription(""); }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport || !reportReason.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
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
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>}>
      <PatientChatsContent />
    </Suspense>
  );
}
