"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Clock,
  Calendar,
  MessageSquare,
  Info,
  Settings,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

// --- Types ---
interface NotificationItem {
  id: string;
  user_id: string;
  user_type: string;
  type: string;
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

// --- Helper Functions ---
const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getNotificationIcon = (type: string, isRead: boolean) => {
  const color = isRead ? "#9ca3af" : "#06b6d4"; // gray-400 vs cyan-500
  
  if (type.includes("appointment") || type.includes("visit")) 
    return <Calendar className="w-4 h-4" style={{ color }} />;
  if (type.includes("chat") || type.includes("message")) 
    return <MessageSquare className="w-4 h-4" style={{ color }} />;
  if (type.includes("review") || type.includes("completed")) 
    return <CheckCircle2 className="w-4 h-4" style={{ color }} />;
  if (type.includes("alert") || type.includes("cancel")) 
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
    
  return <Info className="w-4 h-4" style={{ color }} />;
};


// --- Main Content Component ---
function PatientNotificationsContent() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let channel: any;

    const initData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Get Logged in Auth User
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error("No authenticated session found.");
        }

        // 2. Resolve Patient Profile ID (Matches your DB RLS Logic)
        const { data: patientData, error: patientError } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", session.user.id)
          .single();

        if (patientError || !patientData) {
          throw new Error("Patient profile not found.");
        }

        const pId = patientData.id;
        setPatientId(pId);

        // 3. Query Notifications for this Profile ID
        const { data, error: fetchError } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", pId)
          .eq("user_type", "patient")
          .order("created_at", { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;
        if (data) setNotifications(data);

        // 4. Realtime Subscription for Live Updates
        channel = supabase
          .channel(`patient_page_notifs_${pId}`)
          .on(
            "postgres_changes",
            {
              event: "*", // Listen to INSERT, UPDATE, DELETE
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${pId}`,
            },
            (payload) => {
              // Re-fetch to keep exact sync (best for big platforms to avoid data drift)
              supabase
                .from("notifications")
                .select("*")
                .eq("user_id", pId)
                .eq("user_type", "patient")
                .order("created_at", { ascending: false })
                .limit(50)
                .then(({ data: updatedData }) => {
                  if (updatedData) setNotifications(updatedData);
                });
            }
          )
          .subscribe();

      } catch (err: any) {
        console.error("Initialization error:", err);
        setError(err.message || "Failed to load notifications.");
      } finally {
        setLoading(false);
      }
    };

    initData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Actions
  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!patientId || notifications.length === 0) return;
    setMarkingAll(true);
    
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in("id", unreadIds)
          .eq("user_id", patientId)
          .eq("user_type", "patient");

        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Filtered Data
  const filteredNotifications = notifications.filter((item) =>
    activeTab === "unread" ? !item.is_read : true
  );
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-white pb-20 pt-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* HEADER WITH SETTINGS & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 p-2.5 rounded-xl text-white shadow-sm shadow-cyan-100">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-medium text-gray-800 tracking-tight flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-rose-50 text-rose-500 text-[10px] px-2 py-0.5 rounded-full font-medium border border-rose-100">
                  {unreadCount} New
                </span>
              )}
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Stay updated with your appointments and health records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Preferences Link */}
          <Link
            href="/patient/notifications/preferences"
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all"
            title="Notification Preferences"
          >
            <Settings className="w-4 h-4" />
          </Link>

          {/* Mark All Read Button */}
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0 || markingAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-[11px] font-medium text-gray-700 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {markingAll ? (
              <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5 text-cyan-500" />
            )}
            Mark all read
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl mb-4 flex items-center gap-2 text-[11px]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* TABS FILTER */}
      <div className="flex gap-2 mb-4 border-b border-gray-100 pb-3">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-[11px] font-medium transition-all ${
            activeTab === "all"
              ? "bg-cyan-500 text-white shadow-sm shadow-cyan-100"
              : "text-gray-600 bg-white border border-gray-200 hover:border-gray-300"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab("unread")}
          className={`px-4 py-2 rounded-xl text-[11px] font-medium transition-all ${
            activeTab === "unread"
              ? "bg-cyan-500 text-white shadow-sm shadow-cyan-100"
              : "text-gray-600 bg-white border border-gray-200 hover:border-gray-300"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* LIST AREA */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100/50 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center my-6">
          <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <Bell className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-[13px] font-medium text-gray-800 mb-1">
            {activeTab === "unread"
              ? "No unread notifications"
              : "You're all caught up!"}
          </h3>
          <p className="text-[11px] text-gray-500 max-w-xs mx-auto mb-6 leading-relaxed">
            We'll alert you here when doctor status updates or chat messages arrive.
          </p>
          <Link
            href="/patient"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-[11px] font-medium transition-all"
          >
            Find Doctors
          </Link>
        </div>
      ) : (
        /* NOTIFICATION CARDS LIST */
        <div className="space-y-2.5">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => !item.is_read && markAsRead(item.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3.5 items-start bg-white ${
                !item.is_read
                  ? "border-cyan-100 shadow-[0_2px_8px_rgb(6,182,212,0.06)]"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              {/* Dynamic Icon */}
              <div 
                className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                  item.is_read ? "bg-white border-gray-100" : "bg-cyan-50/50 border-cyan-100"
                }`}
              >
                {getNotificationIcon(item.type, item.is_read)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className={`text-[13px] font-medium truncate ${item.is_read ? "text-gray-600" : "text-gray-800"}`}>
                    {item.title}
                  </h4>
                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                  )}
                </div>
                
                <p className={`text-[12px] leading-relaxed mb-2.5 ${item.is_read ? "text-gray-400" : "text-gray-500"}`}>
                  {item.body}
                </p>
                
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>{timeAgo(item.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Page Wrapper with Auth & Suspense ---
export default function PatientNotificationsPage() {
  return (
    <AuthGuard currentPath="/patient/notifications">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider animate-pulse">
                Syncing Inbox...
              </p>
            </div>
          </div>
        }
      >
        <PatientNotificationsContent />
      </Suspense>
    </AuthGuard>
  );
}
