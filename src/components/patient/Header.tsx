"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, Check, Stethoscope, User } from "lucide-react";
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

    const initHeaderData = async () => {
      try {
        if (typeof window !== "undefined" && "Notification" in window) {
          requestAndSaveFCMToken();
        }
      } catch (err) {
        console.warn("FCM registration skipped:", err);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const authUserId = session.user.id;

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", authUserId)
        .single();

      if (patientError || !patientData) return;

      const pId = patientData.id;
      setPatientId(pId);

      const fetchNotificationState = async () => {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", pId)
          .eq("user_type", "patient")
          .eq("is_read", false);

        setUnreadCount(count || 0);

        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", pId)
          .eq("user_type", "patient")
          .order("created_at", { ascending: false })
          .limit(5);

        if (data) setNotifications(data);
      };

      await fetchNotificationState();

      channel = supabase
        .channel(`global_header_notifs_${pId}`)
        .on(
          "postgres_changes",
          {
            event: "*", 
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${pId}`,
          },
          () => {
            fetchNotificationState();
          }
        )
        .subscribe();
    };

    initHeaderData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
  };

  const markAllAsRead = async () => {
    if (!patientId || unreadCount === 0) return;

    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", patientId)
      .eq("user_type", "patient")
      .eq("is_read", false);
  };

  // ✅ Fix: Handle Click Auto-Removes Badge instantly
  const handleNotificationClick = () => {
    setIsOpen(!isOpen);
    // Jab user dropdown open kare aur unread notifications hon, to badge foran clear kar do
    if (!isOpen && unreadCount > 0) {
      markAllAsRead(); 
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-5 py-3.5 flex justify-between items-center">
      <Link href="/patient" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center text-white shadow-sm shadow-cyan-100">
          <Stethoscope className="w-4 h-4" />
        </div>
        <span className="font-semibold text-gray-800 text-base tracking-tight">
          DocFind
        </span>
      </Link>

      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        
        {/* ✅ Fix: Bell icon visibility and precise badge positioning */}
        <button
          onClick={handleNotificationClick}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white z-10 shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3.5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[13px] text-gray-800">
                  Notifications
                </span>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-[11px] text-gray-400">
                  No notifications yet
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => !item.is_read && markAsRead(item.id)}
                    className={`p-3.5 text-xs transition-colors cursor-pointer ${
                      !item.is_read
                        ? "bg-cyan-50/30 hover:bg-cyan-50/50"
                        : "bg-white hover:bg-gray-50/80"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[12px] ${item.is_read ? 'font-normal text-gray-600' : 'font-medium text-gray-800'}`}>
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${item.is_read ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.body}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-2 block">
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 bg-gray-50/50 border-t border-gray-100 text-center">
              <Link
                href="/patient/notifications"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-medium text-cyan-600 hover:text-cyan-700 block py-1 transition-colors"
              >
                View all notifications →
              </Link>
            </div>
          </div>
        )}

        <Link
          href="/patient/profile"
          className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
        >
          <User className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
