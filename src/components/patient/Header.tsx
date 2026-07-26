"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, Check, Stethoscope, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestAndSaveFCMToken } from "@/lib/fcm";

export default function Header() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: any;

    const initNotifications = async () => {
      // 1. Safe FCM Push Token Registration
      try {
        if (typeof window !== "undefined" && "Notification" in window) {
          requestAndSaveFCMToken();
        }
      } catch (err) {
        console.warn("FCM registration skipped:", err);
      }

      // 2. Get Authenticated User
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const authUserId = session.user.id;

      // 3. Resolve Patient Profile ID (Matches Database RLS Structure)
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", authUserId)
        .single();

      if (patientError || !patientData) {
        console.error("Patient record not found for auth user:", authUserId);
        return;
      }

      const pId = patientData.id;
      setPatientId(pId);

      // 4. Fetch Recent Notifications
      const fetchNotifications = async () => {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", pId)
          .eq("user_type", "patient")
          .order("created_at", { ascending: false })
          .limit(10);

        if (!error && data) {
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.is_read).length);
        }
      };

      await fetchNotifications();

      // 5. Setup Realtime Listener
      channel = supabase
        .channel(`patient_header_notifs_${pId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${pId}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    };

    initNotifications();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!patientId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", patientId)
      .eq("user_type", "patient")
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-5 py-3.5 flex justify-between items-center">
      {/* Brand Logo */}
      <Link href="/patient" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-cyan-500 flex items-center justify-center text-white shadow-sm shadow-cyan-200">
          <Stethoscope className="w-5 h-5" />
        </div>
        <span className="font-bold text-gray-900 text-lg tracking-tight">
          DocFind
        </span>
      </Link>

      {/* Right Actions */}
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        {/* BELL ICON BUTTON */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* NOTIFICATION POPUP DROPDOWN */}
        {isOpen && (
          <div className="absolute right-0 top-12 w-80 sm:w-90 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No notifications yet
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => !item.is_read && markAsRead(item.id)}
                    className={`p-3.5 text-xs transition-colors cursor-pointer ${
                      !item.is_read
                        ? "bg-cyan-50/30 hover:bg-cyan-50/60"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-900">
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-gray-600 leading-snug">{item.body}</p>
                    <span className="text-[10px] text-gray-400 mt-1.5 block">
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* View All Notifications Page Link */}
            <div className="p-2.5 bg-gray-50/80 border-t border-gray-100 text-center">
              <Link
                href="/patient/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 block py-1"
              >
                View all notifications →
              </Link>
            </div>
          </div>
        )}

        {/* PROFILE LINK */}
        <Link
          href="/patient/profile"
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
        >
          <User className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
