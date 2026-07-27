"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { MessageCircle, User, Phone, Send, Loader2, Calendar, Check, CheckCheck, X, Ban, Flag, MoreVertical, Paperclip, FileText, Download, Sparkles, Info, Search } from "lucide-react";
import { formatChatTimestamp, formatFullTime, DOCTOR_QUICK_REPLIES } from "@/lib/supabase/chat-helpers";
import { ChatFileUpload, FilePreview } from "@/components/ChatFileUpload";

export default function DoctorInboxPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"image" | "document" | "audio" | null>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/doctor/login");
      const { data: doctor } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctor) return router.push("/doctor/signup");
      if (!doctor.is_onboarded) return router.push("/doctor/onboarding");
      setDoctorId(doctor.id);

      const { data: convData } = await supabase.from("conversations").select(`*, patients (*)`).eq("doctor_id", doctor.id).order("last_message_at", { ascending: false });
      if (convData) setConversations(convData);
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  useEffect(() => {
    if (!selectedConversation || !doctorId) return;
    fetchMessages();
    markMessagesAsRead();
    const channel = supabase.channel(`doc_msg_${selectedConversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConversation.id}` },
        (payload: any) => setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation, doctorId, supabase]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchMessages = async () => {
    if (!selectedConversation) return;
    const res = await fetch(`/api/messages?conversation_id=${selectedConversation.id}`);
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
  };

  const markMessagesAsRead = async () => {
    if (!selectedConversation || !doctorId) return;
    await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: selectedConversation.id, reader_id: doctorId }) });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !doctorId) return;
    setSending(true);
    try {
      let attachmentUrl = null; let attachmentName = null; let attachmentType = null;
      if (selectedFile) {
        const formData = new FormData(); formData.append("file", selectedFile);
        const upRes = await fetch("/api/chat/upload", { method: "POST", body: formData });
        const upData = await upRes.json();
        if (upRes.ok) { attachmentUrl = upData.url; attachmentName = upData.name; attachmentType = upData.attachment_type; }
      }

      const res = await fetch("/api/messages", { 
        method: "POST", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ conversation_id: selectedConversation.id, sender_id: doctorId, sender_type: "doctor", content: newMessage.trim(), attachment_url: attachmentUrl, attachment_type: attachmentType, attachment_name: attachmentName }) 
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setNewMessage(""); setSelectedFile(null); setFileType(null);
        setConversations((prev) => prev.map((c) => c.id === selectedConversation.id ? { ...c, last_message_at: new Date().toISOString(), last_message_preview: newMessage.trim() || "Sent an attachment" } : c));
      }
    } catch (err) { console.error(err); } finally { setSending(false); }
  };

  const filteredConversations = conversations.filter(c => (c.patients?.full_name || c.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>;

  return (
    <div className="h-[calc(100vh-5rem)] bg-white rounded-2xl flex overflow-hidden shadow-xl border border-gray-200 m-4">
      {/* Sidebar List */}
      <div className="w-[380px] border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-lg">Inbox</h2>
            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full">{conversations.length} Active</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search patients..." className="w-full bg-gray-100 border-none rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
            <button key={conv.id} onClick={() => setSelectedConversation(conv)} className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 flex items-center gap-3 ${selectedConversation?.id === conv.id ? "bg-teal-50/40" : ""}`}>
              <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 relative">
                {conv.patients?.full_name?.[0] || "P"}
                {conv.status === 'active' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-bold text-gray-900 text-sm truncate">{conv.patients?.full_name || conv.patient_name}</p>
                  <span className="text-xs font-medium text-gray-400">{formatChatTimestamp(conv.last_message_at)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{conv.last_message_preview || "Tap to view conversation"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area - WhatsApp Style */}
      <div className="flex-1 flex flex-col bg-[#EFEAE2] relative">
        {/* Chat Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: '400px' }}></div>

        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {selectedConversation.patients?.full_name?.[0] || "P"}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-[15px]">{selectedConversation.patients?.full_name || selectedConversation.patient_name}</p>
                  <p className="text-[12px] text-gray-500 font-medium">Patient Patient • ID: #{selectedConversation.patient_id.substring(0,6)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => router.push(`/doctor/appointments?patient=${selectedConversation.patient_id}`)} className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 text-sm font-bold rounded-xl transition-colors">
                  View Medical Profile
                </button>
              </div>
            </div>

            {/* Quick Replies */}
            <div className="px-6 py-2 bg-white/60 backdrop-blur-md border-b border-gray-200/50 flex items-center gap-2 overflow-x-auto z-10 no-scrollbar">
              <Sparkles className="w-4 h-4 text-teal-500 flex-shrink-0 mr-1" />
              {DOCTOR_QUICK_REPLIES.map((reply, idx) => (
                <button key={idx} onClick={() => setNewMessage(reply)} className="px-3 py-1.5 bg-white border border-gray-200 hover:border-teal-400 hover:text-teal-700 text-gray-600 text-[12px] font-medium rounded-full flex-shrink-0 transition-all shadow-sm">
                  {reply}
                </button>
              ))}
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10">
              {messages.map((msg, index) => {
                const isDoctor = msg.sender_type === "doctor";
                return (
                  <div key={msg.id} className={`flex ${isDoctor ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-[14.5px] leading-relaxed ${isDoctor ? "bg-[#dcf8c6] text-gray-900 rounded-tr-none" : "bg-white text-gray-900 rounded-tl-none border border-gray-100"}`}>
                      {msg.attachment_url && (
                        <div className="mb-2 mt-1">
                          {msg.attachment_type === "image" ? (
                            <a href={msg.attachment_url} target="_blank"><img src={msg.attachment_url} className="max-w-xs rounded-lg max-h-60 object-cover cursor-pointer" /></a>
                          ) : (
                            <a href={msg.attachment_url} target="_blank" className="flex items-center gap-3 p-3 bg-black/5 rounded-xl text-sm font-semibold hover:bg-black/10 transition-colors">
                              <FileText className="w-5 h-5 text-gray-600" />
                              <span className="truncate flex-1 max-w-[150px]">{msg.attachment_name || "Document"}</span>
                              <Download className="w-4 h-4 text-gray-500" />
                            </a>
                          )}
                        </div>
                      )}
                      {msg.content && <p className="whitespace-pre-wrap pr-12">{msg.content}</p>}
                      <div className="absolute right-3 bottom-1.5 flex items-center gap-1 text-[10px] font-medium text-gray-500">
                        <span>{formatFullTime(msg.created_at)}</span>
                        {isDoctor && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> : <Check className="w-3.5 h-3.5" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#F0F2F5] z-10 relative">
               {selectedFile && fileType && (
                 <FilePreview file={selectedFile} type={fileType} onRemove={() => { setSelectedFile(null); setFileType(null); }} />
               )}
               <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                 <div className="bg-white rounded-full px-2 flex items-center flex-1 shadow-sm border border-gray-200">
                   <ChatFileUpload onFileSelect={(f, t) => { setSelectedFile(f); setFileType(t); }} disabled={sending || isBlocked} />
                   <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." disabled={isBlocked} className="flex-1 px-3 py-3.5 bg-transparent text-[15px] focus:outline-none placeholder-gray-400" />
                 </div>
                 <button type="submit" disabled={sending || isBlocked || (!newMessage.trim() && !selectedFile)} className="w-12 h-12 bg-teal-500 hover:bg-teal-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-colors shadow-md">
                   {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                 </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center z-10 opacity-70">
            <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6 shadow-sm"><MessageCircle className="w-10 h-10 text-teal-600" /></div>
            <h3 className="text-2xl font-bold text-gray-800">Clinic Web Dashboard</h3>
            <p className="text-gray-500 font-medium mt-2">Select a patient from the list to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
}
