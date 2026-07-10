"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Stethoscope, MapPin, Phone, Clock, Calendar, DollarSign, Star, MessageCircle, User, Loader2, Globe, QrCode, Share2, ExternalLink } from "lucide-react";
import { DoctorStructuredData } from "@/components/StructuredData";
import { generateDoctorQRCodeUrl, downloadQRCode } from "@/lib/qr-code";

interface ClinicInfo {
  id: string;
  doctor_id: string;
  name: string;
  slug: string | null;
  address: string;
  city: string;
  phone: string | null;
  logo_url: string | null;
  gallery_images: string[] | null;
  consultation_fee: number;
  slot_duration_minutes: number;
  booking_mode: string;
  doctors: {
    id: string;
    full_name: string;
    specialization: string;
    profile_image_url: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    linkedin_url: string | null;
    website_url: string | null;
    is_verified: boolean;
  } | null;
}

interface Slot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export default function ClinicPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatStep, setChatStep] = useState<"form" | "chat">("form");
  const [chatName, setChatName] = useState("");
  const [chatPhone, setChatPhone] = useState("");
  const [chatMessages, setChatMessages] = useState<{content: string; sender_type: string}[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchClinic = async () => {
      const { data, error } = await supabase.from("clinics").select(`*, doctors (id, full_name, specialization, profile_image_url, facebook_url, instagram_url, linkedin_url, website_url, is_verified)`).eq("slug", slug).eq("is_active", true).single();
      if (!error && data) setClinic(data);
      setLoading(false);
    };
    if (slug) fetchClinic();
  }, [slug, supabase]);

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!clinic || !selectedDate) return;
      setSlotsLoading(true);
      try {
        const res = await fetch(`/api/slots?clinic_id=${clinic.id}&date=${selectedDate}`);
        const data = await res.json();
        setSlots(data.slots || []);
      } catch {
        setSlots([]);
      }
      setSlotsLoading(false);
    };
    fetchSlots();
  }, [clinic, selectedDate]);

  const handleStartChat = async () => {
    if (!chatName.trim() || !chatPhone.trim() || !clinic) return;
    const res = await fetch("/api/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_id: clinic.doctor_id,
        clinic_id: clinic.id,
        patient_name: chatName,
        patient_phone: chatPhone,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setConversationId(data.conversation_id);
      if (data.welcome_message) setChatMessages([{ content: data.welcome_message, sender_type: "doctor" }]);
      setChatStep("chat");
      if (typeof window !== "undefined") localStorage.setItem(`chat_session_${clinic.id}`, JSON.stringify({ conversation_id: data.conversation_id, patient_name: chatName, patient_phone: chatPhone }));
    }
  };

  const handleSendChatMessage = async () => {
    if (!newMessage.trim() || !conversationId || !clinic?.doctors?.id) return;
    setChatSending(true);
    const patientData = localStorage.getItem(`chat_session_${clinic.id}`);
    const patientId = patientData ? JSON.parse(patientData).patient_id : null;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, sender_id: patientId, sender_type: "patient", content: newMessage }),
    });
    setChatMessages((prev) => [...prev, { content: newMessage, sender_type: "patient" }]);
    setNewMessage("");
    setChatSending(false);
  };

  const handleBookSlot = (slot: Slot) => {
    if (!clinic || !slot.is_available) return;
    const params = new URLSearchParams({
      doctor_id: clinic.doctors?.id || "",
      clinic_id: clinic.id,
      date: selectedDate,
      start_time: slot.start_time,
      end_time: slot.end_time,
    });
    router.push(`/booking/new?${params}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;
  if (!clinic) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Clinic not found</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <DoctorStructuredData
        name={clinic.doctors?.full_name || "Doctor"}
        specialization={clinic.doctors?.specialization || "Healthcare"}
        clinicName={clinic.name}
        address={clinic.address}
        city={clinic.city}
        phone={clinic.phone}
        consultationFee={clinic.consultation_fee}
        profileImageUrl={clinic.doctors?.profile_image_url}
        isVerified={clinic.doctors?.is_verified || false}
      />
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">DocFind</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/patient" className="text-gray-600 hover:text-gray-900">Find Doctors</a>
            <a href="/doctor/login" className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: "#36d1cf" }}>Doctor Login</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
          <div className="h-48 relative" style={{ backgroundColor: "#e6faf9" }}>
            {clinic.logo_url && <img src={clinic.logo_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="p-8">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center -mt-16 border-4 border-white bg-white shadow-lg overflow-hidden">
                {clinic.doctors?.profile_image_url ? (
                  <img src={clinic.doctors.profile_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{clinic.doctors?.full_name}</h1>
                  {clinic.doctors?.is_verified && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>Verified</span>
                  )}
                </div>
                <p className="text-gray-600">{clinic.doctors?.specialization}</p>
                <div className="flex items-center gap-4 mt-2">
                  {clinic.doctors?.facebook_url && <a href={clinic.doctors.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600"><Globe className="w-5 h-5" /></a>}
                  {clinic.doctors?.instagram_url && <a href={clinic.doctors.instagram_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600"><Globe className="w-5 h-5" /></a>}
                  {clinic.doctors?.linkedin_url && <a href={clinic.doctors.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600"><Globe className="w-5 h-5" /></a>}
                  {clinic.doctors?.website_url && <a href={clinic.doctors.website_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600"><Globe className="w-5 h-5" /></a>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowChat(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: "#36d1cf" }}>
                  <MessageCircle className="w-4 h-4" /> Chat Now
                </button>
                <button
                  onClick={() => {
                    const qrUrl = generateDoctorQRCodeUrl(clinic.doctor_id || "", clinic.slug || "");
                    downloadQRCode(qrUrl, `${clinic.slug || "doctor"}-qrcode.png`);
                  }}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  title="Download QR Code"
                >
                  <QrCode className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/clinic/${clinic.slug}`;
                    navigator.clipboard.writeText(url);
                    alert("Profile link copied to clipboard!");
                  }}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  title="Share Profile"
                >
                  <Share2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                  <MapPin className="w-6 h-6" style={{ color: "#36d1cf" }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{clinic.name}</p>
                  <p className="text-sm text-gray-500">{clinic.address}, {clinic.city}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                  <DollarSign className="w-6 h-6" style={{ color: "#36d1cf" }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">${clinic.consultation_fee}</p>
                  <p className="text-sm text-gray-500">Consultation Fee</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                  <Clock className="w-6 h-6" style={{ color: "#36d1cf" }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{clinic.slot_duration_minutes} min</p>
                  <p className="text-sm text-gray-500">Per Appointment</p>
                </div>
              </div>
            </div>

            {/* Map Section */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
              <div className="rounded-xl overflow-hidden border border-gray-200 h-64 bg-gray-100">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(clinic.address + ', ' + clinic.city)}&layer=mapnik&marker=${encodeURIComponent(clinic.address + ', ' + clinic.city)}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Clinic Location"
                />
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address + ', ' + clinic.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-sm text-primary-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Book an Appointment</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2" style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties} />
              </div>
              {slotsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#36d1cf" }} /></div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {slots.filter(s => s.is_available).map((slot) => (
                    <button key={slot.start_time} onClick={() => handleBookSlot(slot)} className="py-3 px-2 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors text-sm font-medium text-gray-700 hover:bg-gray-50">
                      {slot.start_time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No available slots for this date</p>
              )}
            </div>

            {clinic.gallery_images && clinic.gallery_images.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Gallery</h2>
                <div className="grid grid-cols-3 gap-4">
                  {clinic.gallery_images.map((img, i) => (
                    <div key={i} className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
              <div className="space-y-4">
                {clinic.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600">{clinic.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">{clinic.address}, {clinic.city}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
          <div className="p-4 flex items-center justify-between" style={{ backgroundColor: "#36d1cf" }}>
            <div>
              <p className="font-semibold text-white">{clinic.doctors?.full_name}</p>
              <p className="text-xs text-white/80">Chat with us</p>
            </div>
            <button onClick={() => setShowChat(false)} className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors">✕</button>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {chatStep === "form" ? (
              <div className="space-y-4">
                <input type="text" value={chatName} onChange={(e) => setChatName(e.target.value)} placeholder="Your name" className="w-full px-4 py-2 border border-gray-200 rounded-lg" />
                <input type="tel" value={chatPhone} onChange={(e) => setChatPhone(e.target.value)} placeholder="Your phone" className="w-full px-4 py-2 border border-gray-200 rounded-lg" />
                <button onClick={handleStartChat} className="w-full py-2 rounded-lg text-white font-medium" style={{ backgroundColor: "#36d1cf" }}>Start Chat</button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender_type === "patient" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-2 rounded-xl ${msg.sender_type === "patient" ? "text-white" : "bg-gray-100 text-gray-900"}`} style={msg.sender_type === "patient" ? { backgroundColor: "#36d1cf" } : {}}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-4 py-2 border border-gray-200 rounded-lg" onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()} />
                  <button onClick={handleSendChatMessage} disabled={chatSending} className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#36d1cf" }}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
