"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  Bell, 
  Calendar, 
  MessageCircle, 
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
        <p className="mt-3 text-xs font-semibold text-gray-500 uppercase tracking-wider animate-pulse">
          Syncing Notifications...
        </p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-rose-100 text-rose-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {unreadCount} New
              </span>
            )}
          </h1>

          {notifications.length > 0 && (
            <button 
              onClick={markAllAsRead} 
              disabled={unreadCount === 0 || markingAll} 
              className="text-xs font-semibold text-[#36d1cf] hover:text-teal-600 transition-colors flex items-center gap-1 disabled:opacity-40"
            >
              {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
              Mark all as read
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <div 
                  key={notification.id} 
                  onClick={() => !notification.is_read && markAsRead(notification.id)} 
                  className={`bg-white rounded-lg border p-3 cursor-pointer transition-all ${
                    notification.is_read 
                      ? "border-gray-200 shadow-none" 
                      : "border-l-4 border-gray-200 shadow-sm hover:shadow-md"
                  }`} 
                  style={!notification.is_read ? { borderLeftColor: "#36d1cf" } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" 
                      style={{ backgroundColor: notification.is_read ? "#f3f4f6" : "#e6faf9" }}
                    >
                      <Icon className="w-4 h-4" style={{ color: notification.is_read ? "#9ca3af" : "#36d1cf" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-semibold truncate text-xs sm:text-sm ${notification.is_read ? "text-gray-600" : "text-gray-900"}`}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notification.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loading && !error && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-800 font-bold">No notifications yet</p>
              <p className="text-xs text-gray-500 mt-1">We'll alert you here when doctor status updates or chat messages arrive.</p>
              <button 
                onClick={() => router.push("/patient")} 
                className="mt-5 px-5 py-2 text-white font-bold text-xs rounded-lg shadow-sm transition-colors hover:bg-teal-600" 
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
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#36d1cf" }} />
        </div>
      }>
        <PatientNotificationsContent />
      </Suspense>
    </AuthGuard>
  );
}
