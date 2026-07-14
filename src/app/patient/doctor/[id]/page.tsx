"use client";

// 1. ✅ Next.js ko force kiya ke build-time par is page ko static na banaye
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation"; 
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { User, MapPin, Phone, Clock, DollarSign, Calendar, ChevronLeft, ChevronRight, Loader2, Check, AlertCircle, MessageCircle, X, Send, Star } from "lucide-react";

interface DoctorInfo { id: string; full_name: string; specialization: string; phone: string | null; email: string; }
interface ClinicInfo { id: string; name: string; address: string; city: string; state: string | null; phone: string | null; consultation_fee: number; slot_duration_minutes: number; booking_mode: string; }
interface Slot { start_time: string; end_time: string; is_available: boolean; }

function DoctorDetailContent() {
  const searchParams = useSearchParams();
  const params = useParams(); 
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [clinics, setClinics] = useState<ClinicInfo[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<ClinicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showChat, setShowChat] = useState(false);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; created_at: string; patients: { full_name: string } | null }[]>([]);
  const [reviewStats, setReviewStats] = useState({ avg: 0, count: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const doctorId = typeof params.id === "string" ? params.id : "";
  const clinicParam = searchParams.get("clinic");

  useEffect(() => {
    const fetchData = async () => {
      if (!doctorId) return;
      const { data: doctorData } = await supabase.from("doctors").select("*").eq("id", doctorId).single();
      if (doctorData) {
        setDoctor(doctorData);
        const { data: clinicData } = await supabase.from("clinics").select("*").eq("doctor_id", doctorId).eq("is_active", true);
        if (clinicData && clinicData.length > 0) {
          setClinics(clinicData);
          const clinic = clinicParam ? clinicData.find((c: ClinicInfo) => c.id === clinicParam) || clinicData[0] : clinicData[0];
          setSelectedClinic(clinic);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [doctorId, clinicParam, supabase]);

  useEffect(() => {
    const today = new Date();
    setSelectedDate(today.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedClinic || !selectedDate) return;
      setSlotsLoading(true); setSlotsError(null); setSlots([]);
      try {
        const response = await fetch(`/api/slots?clinic_id=${selectedClinic.id}&date=${selectedDate}`);
        const data = await response.json();
        if (!response.ok) { setSlotsError(data.error || "Failed to load slots"); }
        else { setSlots((data.slots || []).filter((s: Slot) => s.is_available)); }
      } catch { setSlotsError("Failed to load available slots"); }
      finally { setSlotsLoading(false); }
    };
    fetchSlots();
  }, [selectedClinic, selectedDate]);

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const isDateSelectable = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const formatDateForSelect = (date: Date) => date.toISOString().split("T")[0];

  const formatDisplayDate = (date: string) => new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const handleSlotSelect = (slot: Slot) => {
    if (!doctor || !selectedClinic || !selectedDate) return;
    const params = new URLSearchParams({ doctor_id: doctor.id, clinic_id: selectedClinic.id, date: selectedDate, start_time: slot.start_time, end_time: slot.end_time });
    router.push(`/booking/new?${params.toString()}`);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  if (!doctor) return <div className="text-center py-12"><AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" /><h2 className="text-xl font-semibold text-gray-900 mb-2">Doctor not found</h2><Link href="/patient" className="text-primary-600 hover:underline">Browse all doctors</Link></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/patient" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">DocFind</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/patient/favorites" className="text-sm text-gray-600 hover:text-gray-900">Favorites</Link>
              <Link href="/patient/chats" className="text-sm text-gray-600 hover:text-gray-900">Chats</Link>
              <Link href="/patient/appointments" className="text-sm font-medium" style={{ color: "#36d1cf" }}>My Appointments</Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/patient" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-6"><ChevronLeft className="w-4 h-4" />Back to search</Link>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center"><User className="w-8 h-8 text-primary-600" /></div>
                <div><h1 className="text-xl font-bold text-gray-900">Dr. {doctor.full_name}</h1><p className="text-primary-600 font-medium">{doctor.specialization}</p></div>
              </div>
              {doctor.phone && <div className="flex items-center gap-2 text-sm text-gray-600 mt-4"><Phone className="w-4 h-4" /><span>{doctor.phone}</span></div>}
            </div>
            {selectedClinic && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">{selectedClinic.name}</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm"><MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" /><div><p className="text-gray-900">{selectedClinic.address}</p><p className="text-gray-500">{selectedClinic.city}{selectedClinic.state ? `, ${selectedClinic.state}` : ""}</p></div></div>
                  {selectedClinic.phone && <div className="flex items-center gap-3 text-sm"><Phone className="w-5 h-5 text-gray-400" /><span className="text-gray-700">{selectedClinic.phone}</span></div>}
                  <div className="flex items-center gap-3 text-sm pt-3 border-t border-gray-100"><DollarSign className="w-5 h-5 text-primary-600" /><div><span className="text-2xl font-bold text-gray-900">${selectedClinic.consultation_fee}</span><span className="text-gray-500"> per visit</span></div></div>
                  <div className="flex items-center gap-3 text-sm"><Clock className="w-5 h-5 text-gray-400" /><span className="text-gray-700">{selectedClinic.slot_duration_minutes} min appointments</span></div>
                  <div className="pt-3 border-t border-gray-100">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${selectedClinic.booking_mode === "auto" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {selectedClinic.booking_mode === "auto" ? <><Check className="w-4 h-4" />Instant Booking</> : <><Clock className="w-4 h-4" />Approval Required</>}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {selectedClinic && doctor && <button onClick={() => setShowChat(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"><MessageCircle className="w-5 h-5" />Chat with Clinic</button>}
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Select a Date</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { const prev = new Date(currentMonth); prev.setMonth(prev.getMonth() - 1); setCurrentMonth(prev); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                  <span className="font-medium text-gray-900 min-w-[140px] text-center">{currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                  <button onClick={() => { const next = new Date(currentMonth); next.setMonth(next.getMonth() + 1); setCurrentMonth(next); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (<div key={day} className="text-center text-xs font-medium text-gray-500 py-2">{day}</div>))}</div>
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth().map((date, index) => (
                  <div key={index} className="aspect-square">
                    {date ? (
                      <button disabled={!isDateSelectable(date)} onClick={() => setSelectedDate(formatDateForSelect(date))} className={`w-full h-full flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${selectedDate === formatDateForSelect(date) ? "bg-primary-500 text-white" : isDateSelectable(date) ? "hover:bg-gray-100 text-gray-900" : "text-gray-300 cursor-not-allowed"}`}>{date.getDate()}</button>
                    ) : null}
                  </div>
                ))}
              </div>
              {selectedDate && <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary-600" /><span className="font-medium text-gray-900">{formatDisplayDate(selectedDate)}</span></div>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Available Time Slots</h2>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
              ) : slotsError ? (
                <div className="text-center py-8"><AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-600">{slotsError}</p></div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {slots.map((slot) => (<button key={slot.start_time} onClick={() => handleSlotSelect(slot)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600 transition-colors">{slot.start_time}</button>))}
                </div>
              ) : selectedDate ? (
                <div className="text-center py-8"><Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-600">No available slots for this date</p></div>
              ) : (
                <div className="text-center py-8"><Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-600">Select a date to see available slots</p></div>
              )}
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Patient Reviews</h2>
                {reviewStats.count > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-4 h-4 ${star <= Math.round(reviewStats.avg) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{reviewStats.avg.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">({reviewStats.count})</span>
                  </div>
                )}
              </div>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">{review.patients?.full_name || "Anonymous"}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Star className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600">No reviews yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {showChat && selectedClinic && doctor && <ChatWindow doctorId={doctor.id} clinicId={selectedClinic.id} doctorName={doctor.full_name} clinicName={selectedClinic.name} onClose={() => setShowChat(false)} />}
    </div>
  );
}

function ChatWindow({ doctorId, clinicId, doctorName, clinicName, onClose }: { doctorId: string; clinicId: string; doctorName: string; clinicName: string; onClose: () => void }) {
  const [step, setStep] = useState<"form" | "chat">("form");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender_type: string; content: string; created_at: string }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const sessionKey = `chat_session_${clinicId}`;
    const stored = localStorage.getItem(sessionKey);
    if (stored) { try { const session = JSON.parse(stored); setConversationId(session.conversationId); setPatientId(session.patientId); setStep("chat"); } catch { localStorage.removeItem(sessionKey); } }
  }, [clinicId]);

  useEffect(() => {
    if (!conversationId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchMessages = async () => {
      const response = await fetch(`/api/messages?conversation_id=${conversationId}`);
      const data = await response.json();
      if (data.messages) setMessages(data.messages);
    };
    fetchMessages();
    const channel = supabase.channel(`messages:${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload: any) => { setMessages((prev) => { if (prev.some((m) => m.id === payload.new.id)) return prev; return [...prev, payload.new]; }); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, supabase]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!patientName.trim() || !patientPhone.trim()) { setFormError("Name and phone are required"); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/chat/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctor_id: doctorId, clinic_id: clinicId, patient_name: patientName, patient_phone: patientPhone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start conversation");
      setConversationId(data.conversation_id);
      setPatientId(data.patient_id);
      localStorage.setItem(`chat_session_${clinicId}`, JSON.stringify({ conversationId: data.conversation_id, patientId: data.patient_id }));
      setStep("chat");
      if (data.welcome_message) setMessages([{ id: "welcome", sender_type: "doctor", content: data.welcome_message, created_at: new Date().toISOString() }]);
    } catch (err) { setFormError(err instanceof Error ? err.message : "An error occurred"); }
    finally { setLoading(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !patientId) return;
    setSending(true);
    try {
      const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversation_id: conversationId, sender_id: patientId, sender_type: "patient", content: newMessage.trim() }) });
      const data = await response.json();
      if (response.ok && data.message) { setMessages((prev) => { if (prev.some((m) => m.id === data.message.id)) return prev; return [...prev, data.message]; }); setNewMessage(""); }
    } catch (err) { console.error("Error sending message:", err); }
    finally { setSending(false); }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: "500px" }}>
      <div className="flex items-center justify-between px-4 py-3 bg-primary-500 text-white">
        <div><p className="font-semibold">{clinicName}</p><p className="text-xs text-primary-100">Chat with Dr. {doctorName}</p></div>
        <button onClick={onClose} className="p-1 hover:bg-primary-600 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
      </div>
      {step === "form" ? (
        <div className="flex-1 p-4">
          <p className="text-sm text-gray-600 mb-4">Start a conversation with the clinic. We&apos;ll need some basic info to help you.</p>
          <form onSubmit={handleStartConversation} className="space-y-3">
            {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>}
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Your Name</label><input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="John Doe" required /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label><input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="+1 (555) 123-4567" required /></div>
            <button type="submit" disabled={loading} className="w-full py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Chat"}</button>
          </form>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_type === "patient" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${msg.sender_type === "patient" ? "bg-primary-500 text-white rounded-br-md" : "bg-gray-100 text-gray-900 rounded-bl-md"}`}>
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.sender_type === "patient" ? "text-primary-100" : "text-gray-400"}`}>{formatTime(msg.created_at)}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-4 py-3 border-t border-gray-200">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <button type="submit" disabled={sending || !newMessage.trim()} className="p-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-full transition-colors">{sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
          </form>
        </>
      )}
    </div>
  );
}

export default function DoctorDetailPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>}><DoctorDetailContent /></Suspense>;
}
