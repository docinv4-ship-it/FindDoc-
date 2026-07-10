"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Bell, Phone, Lock, Calendar, MessageCircle, Stethoscope, User } from "lucide-react";
import type { Database } from "@/types/database";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

function PatientNotificationsContent() {
  const [step, setStep] = useState<"phone" | "otp" | "notifications">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingOtp(true);
    setError(null);
    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), purpose: "lookup" }),
      });
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
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verification_id: verificationId, otp: otp.trim() }),
      });
      if (response.ok) {
        const { data: patient } = await supabase.from("patients").select("id").eq("phone", phone.trim()).single();
        if (patient) { setPatientId(patient.id); await fetchNotifications(patient.id); setStep("notifications"); }
        else { setError("Patient not found"); }
      } else { setError("Invalid OTP"); }
    } catch { setError("An error occurred"); }
    setVerifyingOtp(false);
  };

  const fetchNotifications = async (pId: string) => {
    setLoading(true);
    const { data, error } = await supabase.from("notifications").select("*").eq("user_id", pId).eq("user_type", "patient").order("created_at", { ascending: false }).limit(50);
    if (!error && data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", notificationId);
    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n));
  };

  const getIcon = (type: string) => {
    if (type.includes("appointment")) return Calendar;
    if (type.includes("message")) return MessageCircle;
    return Bell;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
                <Bell className="w-8 h-8" style={{ color: "#36d1cf" }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600 mt-2">Enter your phone number to view notifications</p>
            </div>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg" required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={sendingOtp || !phone.trim()} className="w-full py-3 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                {sendingOtp ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Send Verification Code"}
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
              <h1 className="text-2xl font-bold text-gray-900">Verify Your Number</h1>
              <p className="text-gray-600 mt-2">We sent a verification code to {phone}</p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter verification code" maxLength={6} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl tracking-widest" required />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={verifyingOtp || !otp.trim()} className="w-full py-3 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
                {verifyingOtp ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Verify & View Notifications"}
              </button>
            </form>
          </div>
        )}

        {step === "notifications" && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>
            ) : notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification) => {
                  const Icon = getIcon(notification.type);
                  return (
                    <div key={notification.id} onClick={() => !notification.is_read && markAsRead(notification.id)} className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${notification.is_read ? "border-gray-200" : "border-l-4 border-gray-200"}`} style={!notification.is_read ? { borderLeftColor: "#36d1cf" } : undefined}>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: notification.is_read ? "#f3f4f6" : "#e6faf9" }}>
                          <Icon className="w-5 h-5" style={{ color: notification.is_read ? "#9ca3af" : "#36d1cf" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium ${notification.is_read ? "text-gray-600" : "text-gray-900"}`}>{notification.title}</p>
                            <span className="text-xs text-gray-400">{formatDate(notification.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{notification.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function PatientNotificationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>}>
      <PatientNotificationsContent />
    </Suspense>
  );
}
