"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, MessageCircle, Send, User, ArrowLeft, Calendar, FileText, Download, Check, CheckCheck, Clock, CheckCircle } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { formatChatTimestamp, formatFullTime } from "@/lib/supabase/chat-helpers";
import { ChatFileUpload, FilePreview } from "@/components/ChatFileUpload";

export function PatientChatsContent() {
  const [step, setStep] = useState<"chats" | "chat">("chats");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"image" | "document" | "audio" | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase: any = createClient();

  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      
      const { data: profile } = await supabase.from("patients").select("id").eq("id", user.id).maybeSingle() || 
                                await supabase.from("patients").select("id").eq("email", user.email).maybeSingle();
      if (profile) {
        setPatientId(profile.id);
        const { data } = await supabase.from("conversations").select("*, doctors (full_name, profile_image_url), clinics (name)").eq("patient_id", profile.id).order("last_message_at", { ascending: false });
        if (data) setConversations(data);
      }
      setLoading(false);
    };
    initChat();
  }, [supabase]);

  const openConversation = async (conv: any) => {
    setSelectedConversation(conv); setStep("chat");
    const res = await fetch(`/api/messages?conversation_id=${conv.id}`);
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
    if (patientId) await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: conv.id, reader_id: patientId }) });
  };

  useEffect(() => {
    if (!selectedConversation) return;
    const channel = supabase.channel(`pt_msg_${selectedConversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation.id}` },
        (payload: any) => setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation, supabase]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !patientId) return;
    setSending(true);
    try {
      let attachmentUrl = null; let attachmentName = null; let attachmentType = null;
      if (selectedFile) {
        const formData = new FormData(); formData.append("file", selectedFile);
        const upRes = await fetch("/api/chat/upload", { method: "POST", body: formData });
        const upData = await upRes.json();
        if (upRes.ok) { attachmentUrl = upData.url; attachmentName = upData.name; attachmentType = upData.attachment_type; }
      }
      const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: selectedConversation.id, sender_type: "patient", sender_id: patientId, content: newMessage.trim(), attachment_url: attachmentUrl, attachment_type: attachmentType, attachment_name: attachmentName }) });
      const data = await res.json();
      if (res.ok && data.message) { setNewMessage(""); setSelectedFile(null); setFileType(null); }
    } catch (err) { console.error(err); } finally { setSending(false); }
  };

  // NEW FEATURE: Check if patient has replied yet. If not, show the Confirmed Welcome Card
  const hasPatientReplied = messages.some(m => m.sender_type === "patient");

  if (loading) return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>;

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col pt-4">
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 h-[88vh] flex flex-col pb-4">
        
        {step === "chats" && (
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-white">
              <h1 className="text-2xl font-extrabold text-gray-900">My Consultations</h1>
              <p className="text-gray-500 text-sm mt-1">Manage your clinic chats and medical records</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {conversations.length > 0 ? conversations.map((conv) => (
                <div key={conv.id} onClick={() => openConversation(conv)} className="bg-white border border-gray-100 hover:border-teal-200 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4 group">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-50 border border-gray-200 group-hover:border-teal-200 overflow-hidden">
                    {conv.doctors?.profile_image_url ? <img src={conv.doctors.profile_image_url} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900 text-base">{conv.doctors?.full_name || "Doctor"}</h3>
                      <span className="text-xs font-semibold text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {formatChatTimestamp(conv.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-teal-600 font-bold bg-teal-50 inline-block px-2 py-0.5 rounded-md mb-1">{conv.clinics?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{conv.last_message_preview}</p>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4"><MessageCircle className="w-10 h-10 text-gray-300" /></div>
                  <h3 className="text-lg font-bold text-gray-900">No active chats</h3>
                  <p className="text-gray-500 text-sm mt-2 max-w-sm">Book an appointment with a doctor to activate your secure consultation room.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "chat" && selectedConversation && (
          <div className="flex-1 flex flex-col bg-[#EFEAE2] rounded-2xl overflow-hidden shadow-xl border border-gray-200 relative">
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: '400px' }}></div>
            
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-4 z-10 shadow-sm">
              <button onClick={() => setStep("chats")} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                  {selectedConversation.doctors?.profile_image_url ? <img src={selectedConversation.doctors.profile_image_url} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-gray-400 m-2.5" />}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm sm:text-base">{selectedConversation.doctors?.full_name || "Doctor"}</h2>
                  <p className="text-xs text-teal-600 font-semibold">{selectedConversation.clinics?.name}</p>
                </div>
              </div>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 z-10">
              
              {/* NEW AUTO REMOVING CARD LOGIC */}
              {!hasPatientReplied && (
                <div className="flex justify-center mb-6">
                  <div className="bg-white/95 backdrop-blur-md border border-teal-100 p-5 rounded-2xl shadow-sm max-w-sm text-center animate-in zoom-in duration-300">
                    <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-6 h-6 text-teal-500" />
                    </div>
                    <h3 className="text-gray-900 font-extrabold text-[17px] mb-1">Appointment Confirmed! 🎉</h3>
                    <p className="text-[13.5px] text-gray-600 font-medium leading-relaxed">
                      Your consultation room is ready. You can now chat directly with the doctor and clinic staff. <strong>Send a message below to start!</strong>
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isPatient = msg.sender_type === "patient";
                return (
                  <div key={msg.id} className={`flex ${isPatient ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm text-[14.5px] leading-relaxed ${isPatient ? "bg-[#dcf8c6] text-gray-900 rounded-tr-none" : "bg-white text-gray-900 rounded-tl-none border border-gray-100"}`}>
                      {msg.attachment_url && (
                        <div className="mb-2 mt-1">
                          {msg.attachment_type === "image" ? (
                            <a href={msg.attachment_url} target="_blank"><img src={msg.attachment_url} className="max-w-full rounded-lg max-h-60 object-cover" /></a>
                          ) : (
                            <a href={msg.attachment_url} target="_blank" className="flex items-center gap-3 p-3 bg-black/5 rounded-xl text-sm font-semibold hover:bg-black/10 transition-colors">
                              <FileText className="w-5 h-5 text-gray-600" /><span className="truncate flex-1 max-w-[150px]">{msg.attachment_name || "Document"}</span><Download className="w-4 h-4 text-gray-500" />
                            </a>
                          )}
                        </div>
                      )}
                      {msg.content && <p className="whitespace-pre-wrap pr-12">{msg.content}</p>}
                      <div className="absolute right-3 bottom-1.5 flex items-center gap-1 text-[10px] font-medium text-gray-500">
                        <span>{formatFullTime(msg.created_at)}</span>
                        {isPatient && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> : <Check className="w-3.5 h-3.5" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 sm:p-4 bg-[#F0F2F5] z-10 relative">
              {selectedFile && fileType && <FilePreview file={selectedFile} type={fileType} onRemove={() => { setSelectedFile(null); setFileType(null); }} />}
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                 <div className="bg-white rounded-3xl px-2 flex items-center flex-1 shadow-sm border border-gray-200">
                   <ChatFileUpload onFileSelect={(f, t) => { setSelectedFile(f); setFileType(t); }} disabled={sending} />
                   <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-3 py-3.5 bg-transparent text-[15px] focus:outline-none placeholder-gray-400" />
                 </div>
                 <button type="submit" disabled={sending || (!newMessage.trim() && !selectedFile)} className="w-12 h-12 flex-shrink-0 bg-teal-500 hover:bg-teal-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-colors shadow-md">
                   {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                 </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PatientChatsPage() {
  return (
    <AuthGuard currentPath="/patient/chats">
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#fafafa]"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>}>
        <PatientChatsContent />
      </Suspense>
    </AuthGuard>
  );
}
