"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Bell, Calendar, MessageCircle, Check } from "lucide-react";
import type { Database } from "@/types/database";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export default function DoctorNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctor } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctor) { router.push("/doctor/signup"); return; }
      if (!doctor.is_onboarded) { router.push("/doctor/onboarding"); return; }
      setDoctorId(doctor.id);

      const { data: notifs } = await supabase.from("notifications").select("*").eq("user_id", doctor.id).eq("user_type", "doctor").order("created_at", { ascending: false }).limit(50);
      if (notifs) setNotifications(notifs);
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  const markAsRead = async (notificationId: string) => {
    await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", notificationId);
    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!doctorId) return;
    await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", doctorId).eq("user_type", "doctor").eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Stay updated on appointments and messages</p>
        </div>
        {notifications.some((n) => !n.is_read) && (
          <button onClick={markAllAsRead} className="text-sm font-medium hover:underline" style={{ color: "#36d1cf" }}>Mark all as read</button>
        )}
      </div>

      {notifications.length > 0 ? (
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
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#36d1cf" }} />
                  )}
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
  );
}
