"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  Stethoscope, 
  MapPin, 
  Phone, 
  Clock, 
  DollarSign, 
  MessageCircle, 
  User, 
  Loader2, 
  Globe, 
  QrCode, 
  Share2, 
  Layers,
  Lock,
  Mail
} from "lucide-react";
import { DoctorStructuredData } from "@/components/StructuredData";
import { generateDoctorQRCodeUrl, downloadQRCode } from "@/lib/qr-code";

interface ClinicInfo {
  id: string;
  doctor_id: string;
  name: string;
  slug: string | null;
  address: string;
  city: string;
  latitude: number | string | null;
  longitude: number | string | null;
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
  
  // Map State
  const [mapMode, setMapMode] = useState<"satellite" | "roadmap">("satellite");
  const [mapLoaded, setMapLoaded] = useState(false);

  // Auth & Chat State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [showChat, setShowChat] = useState(false);
  const [chatStep, setChatStep] = useState<"form" | "chat">("form");
  const [chatName, setChatName] = useState("");
  const [chatEmail, setChatEmail] = useState("");
  const [chatMessages, setChatMessages] = useState<{ content: string; sender_type: string }[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch Current User Auth Session
  useEffect(() => {
    const fetchUser = async () => {
      setAuthChecking(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        if (user.email) setChatEmail(user.email);
        const fetchedName = user.user_metadata?.full_name || user.user_metadata?.name || "";
        if (fetchedName) setChatName(fetchedName);
      }
      setAuthChecking(false);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        if (session.user.email) setChatEmail(session.user.email);
        const fetchedName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "";
        if (fetchedName) setChatName(fetchedName);
      } else {
        setCurrentUser(null);
        setChatEmail("");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const fetchClinic = async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select(`*, doctors (id, full_name, specialization, profile_image_url, facebook_url, instagram_url, linkedin_url, website_url, is_verified)`)
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (!error && data) setClinic(data as ClinicInfo);
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

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.href : undefined,
      },
    });
  };

  const handleStartChat = async () => {
    if (!chatName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    if (!chatEmail.trim() || !currentUser) {
      alert("Please sign in with Google to start chat.");
      return;
    }

    if (!clinic) return;

    setChatSending(true);

    try {
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: clinic.doctor_id,
          clinic_id: clinic.id,
          patient_name: chatName,
          patient_email: chatEmail,
          patient_user_id: currentUser.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setConversationId(data.conversation_id);
        if (data.welcome_message) {
          setChatMessages([{ content: data.welcome_message, sender_type: "doctor" }]);
        }
        setChatStep("chat");

        if (typeof window !== "undefined") {
          localStorage.setItem(`chat_session_${clinic.id}`, JSON.stringify({ 
            conversation_id: data.conversation_id, 
            patient_id: data.patient_id || currentUser.id, 
            patient_name: chatName, 
            patient_email: chatEmail 
          }));
        }
      } else {
        alert(data.error || "Failed to start chat. Please try again.");
      }
    } catch (err) {
      console.error("Chat Error:", err);
      alert("Something went wrong. Check your internet connection.");
    } finally {
      setChatSending(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!newMessage.trim() || !conversationId || !clinic?.doctors?.id) return;
    setChatSending(true);
    
    let patientId = currentUser?.id || null;
    if (!patientId && typeof window !== "undefined") {
      const patientData = localStorage.getItem(`chat_session_${clinic.id}`);
      patientId = patientData ? JSON.parse(patientData).patient_id : null;
    }

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          conversation_id: conversationId, 
          sender_id: patientId, 
          sender_type: "patient", 
          content: newMessage 
        }),
      });
      setChatMessages((prev) => [...prev, { content: newMessage, sender_type: "patient" }]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message", error);
    } finally {
      setChatSending(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Clinic not found</p>
      </div>
    );
  }

  const lat = clinic.latitude ? parseFloat(clinic.latitude.toString()) : null;
  const lng = clinic.longitude ? parseFloat(clinic.longitude.toString()) : null;

  const getGoogleMapEmbedUrl = () => {
    const typeParam = mapMode === "satellite" ? "&t=h" : "&t=m";
    if (lat && lng) {
      return `https://maps.google.com/maps?q=${lat},${lng}&z=17${typeParam}&ie=UTF8&iwloc=&output=embed`;
    }
    const query = encodeURIComponent(`${clinic.address}, ${clinic.city}`);
    return `https://maps.google.com/maps?q=${query}&z=16${typeParam}&ie=UTF8&iwloc=&output=embed`;
  };

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

      {/* --- HEADER --- */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">DocFind</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/patient" className="text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Find Doctors
            </Link>
            <Link href="/doctor/login" className="px-3 py-2 text-xs sm:text-sm rounded-lg text-white font-medium shadow-sm transition-all hover:opacity-90" style={{ backgroundColor: "#36d1cf" }}>
              Doctor Login
            </Link>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8 shadow-sm">
          <div className="h-48 relative" style={{ backgroundColor: "#e6faf9" }}>
            {clinic.logo_url && <img src={clinic.logo_url} alt="Clinic Header" className="w-full h-full object-cover" />}
          </div>
          
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center -mt-16 sm:-mt-20 border-4 border-white bg-white shadow-md overflow-hidden shrink-0">
                  {clinic.doctors?.profile_image_url ? (
                    <img src={clinic.doctors.profile_image_url} alt={clinic.doctors.full_name} className="w-full h-full object-cover bg-white" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{clinic.doctors?.full_name}</h1>
                    {clinic.doctors?.is_verified && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 font-medium">{clinic.doctors?.specialization}</p>
                  
                  <div className="flex items-center gap-3 mt-3">
                    {clinic.doctors?.facebook_url && <a href={clinic.doctors.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-600 transition-colors"><Globe className="w-4 h-4" /></a>}
                    {clinic.doctors?.instagram_url && <a href={clinic.doctors.instagram_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-600 transition-colors"><Globe className="w-4 h-4" /></a>}
                    {clinic.doctors?.linkedin_url && <a href={clinic.doctors.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-600 transition-colors"><Globe className="w-4 h-4" /></a>}
                    {clinic.doctors?.website_url && <a href={clinic.doctors.website_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-600 transition-colors"><Globe className="w-4 h-4" /></a>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button onClick={() => setShowChat(true)} className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm hover:opacity-90 transition-all" style={{ backgroundColor: "#36d1cf" }}>
                  <MessageCircle className="w-4 h-4" /> Chat Now
                </button>
                <button
                  onClick={() => {
                    const qrUrl = generateDoctorQRCodeUrl(clinic.doctor_id || "", clinic.slug || "");
                    downloadQRCode(qrUrl, `${clinic.slug || "doctor"}-qrcode.png`);
                  }}
                  className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
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
                  className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  title="Share Profile"
                >
                  <Share2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#e6faf9" }}>
                  <MapPin className="w-6 h-6" style={{ color: "#36d1cf" }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{clinic.name}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{clinic.address}, {clinic.city}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#e6faf9" }}>
                  <DollarSign className="w-6 h-6" style={{ color: "#36d1cf" }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">${clinic.consultation_fee}</p>
                  <p className="text-xs sm:text-sm text-gray-500">Consultation Fee</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#e6faf9" }}>
                  <Clock className="w-6 h-6" style={{ color: "#36d1cf" }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{clinic.slot_duration_minutes} mins</p>
                  <p className="text-xs sm:text-sm text-gray-500">Slot Duration</p>
                </div>
              </div>
            </div>

            {/* --- GOOGLE MAP ENGINE --- */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-cyan-500" /> Clinic Location & Map
                  </h3>
                  <p className="text-xs text-gray-500">Interactive Google HD Satellite map with exact street markers and places</p>
                </div>

                <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                  <button
                    onClick={() => {
                      if (mapMode !== "satellite") {
                        setMapLoaded(false);
                        setMapMode("satellite");
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mapMode === "satellite"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-600" /> Satellite (HD)
                  </button>
                  <button
                    onClick={() => {
                      if (mapMode !== "roadmap") {
                        setMapLoaded(false);
                        setMapMode("roadmap");
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mapMode === "roadmap"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-500" /> Standard
                  </button>
                </div>
              </div>

              {/* Map Canvas Frame */}
              <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100">
                {!mapLoaded && (
                  <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center z-10 animate-pulse">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-2" />
                    <span className="text-xs font-medium text-gray-500">Loading Map...</span>
                  </div>
                )}
                
                <iframe
                  src={getGoogleMapEmbedUrl()}
                  onLoad={() => setMapLoaded(true)}
                  className={`w-full h-full border-0 transition-opacity duration-300 ${mapLoaded ? 'opacity-100' : 'opacity-0'}`}
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google Clinic Map"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- BOOKING & GALLERY SECTION --- */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Book an Appointment</h2>
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties}
                />
              </div>

              {slotsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#36d1cf" }} />
                </div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {slots.filter(s => s.is_available).map((slot) => (
                    <button
                      key={slot.start_time}
                      onClick={() => handleBookSlot(slot)}
                      className="py-3 px-2 border border-gray-200 rounded-xl hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-xs font-semibold text-gray-700 hover:text-cyan-700"
                    >
                      {slot.start_time}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm font-medium text-gray-500">No available slots for this date</p>
                </div>
              )}
            </div>

            {clinic.gallery_images && clinic.gallery_images.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Clinic Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {clinic.gallery_images.map((img, i) => (
                    <div key={i} className="aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                      <img 
                        src={img} 
                        alt={`Gallery ${i}`} 
                        loading="lazy"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-4 text-sm">
                {clinic.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{clinic.phone}</span>
                  </div>
                )}
                <div className="flex items-start gap-3 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <span>{clinic.address}, {clinic.city}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- LIVE CHAT POPUP --- */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 flex items-center justify-between" style={{ backgroundColor: "#36d1cf" }}>
            <div>
              <p className="font-bold text-white text-sm">{clinic.doctors?.full_name}</p>
              <p className="text-xs text-white/80">Clinic Support Chat</p>
            </div>
            <button onClick={() => setShowChat(false)} className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors">✕</button>
          </div>
          
          <div className="p-4 max-h-80 overflow-y-auto">
            {chatStep === "form" ? (
              <div className="space-y-3">
                {authChecking ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                  </div>
                ) : !currentUser ? (
                  <div className="text-center py-3 space-y-3">
                    <p className="text-xs text-gray-600">Please sign in to start live consultation chat.</p>
                    <button
                      onClick={handleGoogleSignIn}
                      className="w-full py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Your Locked Email</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={chatEmail}
                          readOnly
                          disabled
                          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-100 text-gray-600 font-medium cursor-not-allowed select-none"
                        />
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <Lock className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Your Name</label>
                      <input
                        type="text"
                        value={chatName}
                        onChange={(e) => setChatName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                    </div>

                    <button
                      onClick={handleStartChat}
                      disabled={chatSending}
                      className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-all mt-2"
                      style={{ backgroundColor: "#36d1cf" }}
                    >
                      {chatSending && <Loader2 className="w-4 h-4 animate-spin" />}
                      Start Chat
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender_type === "patient" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm ${msg.sender_type === "patient" ? "text-white" : "bg-gray-100 text-gray-900"}`} style={msg.sender_type === "patient" ? { backgroundColor: "#36d1cf" } : {}}>
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 px-3.5 py-2 text-sm border border-gray-200 rounded-xl" onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()} />
                  <button onClick={handleSendChatMessage} disabled={chatSending} className="px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                    {chatSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
