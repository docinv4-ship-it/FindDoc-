"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  Bell, 
  Calendar, 
  MessageCircle, 
  Stethoscope, 
  User, 
  Mail, 
  ShieldCheck, 
  AlertCircle, 
  CheckSquare,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

interface NotificationItem {
  id: string;
  user_id: string;
  appointment_id?: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function PatientNotificationsContent() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let channel: any;

    const initializeNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("No authenticated session found.");
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        await fetchNotifications(user.id);

        // Realtime Subscription for live notifications feed
        channel = supabase
          .channel("notifications_page_feed")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const newNotification = payload.new as NotificationItem;
              setNotifications((prev) => [newNotification, ...prev]);
            }
          )
          .subscribe();

      } catch (err) {
        console.error("Initialization error:", err);
        setError("Something went wrong establishing a secure connection.");
      } finally {
        setLoading(false);
      }
    };

    initializeNotifications();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  const fetchNotifications = async (userId: string) => {
    const { data, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      setError("Failed to sync your notifications inbox.");
    } else if (data) {
      setNotifications(data as NotificationItem[]);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      setNotifications((prev) => 
        prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser || notifications.length === 0) return;
    setMarkingAll(true);
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("id", unreadIds);

        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const getIcon = (type: string) => {
    if (type.includes("visit") || type.includes("appointment")) return Calendar;
    if (type.includes("review") || type.includes("completed")) return CheckCircle2;
    if (type.includes("dispute") || type.includes("alert")) return AlertTriangle;
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

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#36d1cf" }} />
        <p className="mt-4 text-sm font-semibold text-gray-500 uppercase tracking-wider animate-pulse">
          Syncing Notifications Inbox...
        </p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/patient")} className="flex items-center gap-2">
              <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </button>
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/patient/chats")} className="text-sm text-gray-600 hover:text-gray-900">Chats</button>
              <button onClick={() => router.push("/patient")} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors hover:bg-teal-600 shadow-sm" style={{ backgroundColor: "#36d1cf" }}>
                <User className="w-4 h-4" /> Find Doctors
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-rose-100 text-rose-600 text-xs px-2.5 py-1 rounded-full font-bold">
                  {unreadCount} New
                </span>
              )}
            </h1>
            {currentUser && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <Mail className="w-4 h-4 text-gray-400" /> {currentUser.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-teal-50 text-[#36d1cf] px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Auto Sync
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {notifications.length > 0 && (
          <div className="flex justify-end mb-4">
            <button 
              onClick={markAllAsRead} 
              disabled={unreadCount === 0 || markingAll} 
              className="text-xs font-bold text-[#36d1cf] hover:text-teal-600 transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
              Mark all as read
            </button>
          </div>
        )}

        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <div 
                  key={notification.id} 
                  onClick={() => !notification.is_read && markAsRead(notification.id)} 
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                    notification.is_read 
                      ? "border-gray-200 shadow-sm" 
                      : "border-l-4 border-gray-200 shadow-md hover:shadow-lg"
                  }`} 
                  style={!notification.is_read ? { borderLeftColor: "#36d1cf" } : undefined}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" 
                      style={{ backgroundColor: notification.is_read ? "#f3f4f6" : "#e6faf9" }}
                    >
                      <Icon className="w-5 h-5" style={{ color: notification.is_read ? "#9ca3af" : "#36d1cf" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <p className={`font-bold truncate text-sm sm:text-base ${notification.is_read ? "text-gray-600" : "text-gray-900"}`}>
                          {notification.title}
                        </p>
                        <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap flex-shrink-0">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{notification.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loading && !error && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-700 font-bold">No notifications yet</p>
              <p className="text-sm text-gray-500 mt-1">We'll alert you here when doctor status updates or chat messages arrive.</p>
              <button 
                onClick={() => router.push("/patient")} 
                className="mt-6 px-6 py-2.5 text-white font-bold text-sm rounded-xl shadow-md transition-colors hover:bg-teal-600" 
                style={{ backgroundColor: "#36d1cf" }}
              >
                Find Doctors
              </button>
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default function PatientNotificationsPage() {
  return (
    <AuthGuard currentPath="/patient/notifications">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
        </div>
      }>
        <PatientNotificationsContent />
      </Suspense>
    </AuthGuard>
  );
}
