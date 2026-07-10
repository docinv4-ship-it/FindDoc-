"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Heart, User, MapPin, Stethoscope, Phone, Lock } from "lucide-react";

const FAVORITES_KEY = "docfind_favorites";

function PatientFavoritesContent() {
  const [step, setStep] = useState<"phone" | "otp" | "favorites">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteDoctors, setFavoriteDoctors] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      try { setFavoriteIds(JSON.parse(saved)); } catch { }
    }
  }, []);

  useEffect(() => {
    if (favoriteIds.length > 0) fetchDoctors();
  }, [favoriteIds]);

  const fetchDoctors = async () => {
    setLoading(true);
    if (favoriteIds.length > 0) {
      const { data } = await supabase.from("doctors").select("id, full_name, specialization, profile_image_url, clinics (id, name, address, city, slug)").in("id", favoriteIds).eq("is_onboarded", true);
      if (data) setFavoriteDoctors(data);
    }
    setLoading(false);
  };

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
      if (response.ok) setStep("favorites");
      else setError("Invalid OTP");
    } catch { setError("An error occurred"); }
    setVerifyingOtp(false);
  };

  const removeFavorite = (doctorId: string) => {
    const newFavs = favoriteIds.filter((id) => id !== doctorId);
    setFavoriteIds(newFavs);
    setFavoriteDoctors((prev) => prev.filter((d) => d.id !== doctorId));
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
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

      <main className="max-w-3xl mx-auto px-4 py-12">
        {step === "phone" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
                <Heart className="w-8 h-8" style={{ color: "#36d1cf" }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
              <p className="text-gray-600 mt-2">Verify your phone to sync favorites</p>
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
          <div className="bg-white rounded-xl border border-gray-200 p-8">
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

        {step === "favorites" && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Favorite Doctors</h1>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>
            ) : favoriteDoctors.length > 0 ? (
              <div className="space-y-4">
                {favoriteDoctors.map((doctor) => {
                  const clinic = doctor.clinics?.[0];
                  const profileUrl = clinic?.slug ? `/clinic/${clinic.slug}` : `/doctor/${doctor.id}`;
                  return (
                    <div key={doctor.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#e6faf9" }}>
                          {doctor.profile_image_url ? <img src={doctor.profile_image_url} alt={doctor.full_name} className="w-full h-full object-cover" /> : <User className="w-7 h-7" style={{ color: "#36d1cf" }} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{doctor.full_name}</p>
                          <p className="text-sm" style={{ color: "#36d1cf" }}>{doctor.specialization}</p>
                          {clinic && <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><MapPin className="w-3 h-3" />{clinic.city}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => router.push(profileUrl)} className="px-4 py-2 text-white text-sm font-medium rounded-lg" style={{ backgroundColor: "#36d1cf" }}>Book</button>
                          <button onClick={() => removeFavorite(doctor.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Heart className="w-5 h-5 fill-red-500" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No favorite doctors yet</p>
                <button onClick={() => router.push("/patient")} className="mt-4 text-sm font-medium hover:underline" style={{ color: "#36d1cf" }}>Find doctors</button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function PatientFavoritesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>}>
      <PatientFavoritesContent />
    </Suspense>
  );
}
