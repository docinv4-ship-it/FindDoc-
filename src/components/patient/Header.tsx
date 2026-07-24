"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Stethoscope, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestAndSaveFCMToken } from "@/lib/fcm";

export default function Header() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const supabase = createClient();

  useEffect(() => {
    let channel: any;

    const setupRealtimeNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Automatically register FCM token on page load if permission allowed
      requestAndSaveFCMToken();

      // Fetch Initial Unread Count
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setUnreadCount(count || 0);

      // Realtime Listener for Instant Bell Badge Updates
      channel = supabase
        .channel("realtime_notifications_bell")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Re-fetch exact unread count on any change
            supabase
              .from("notifications")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("is_read", false)
              .then(({ count: updatedCount }) => {
                setUnreadCount(updatedCount || 0);
              });
          }
        )
        .subscribe();
    };

    setupRealtimeNotifications();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-5 py-3.5 flex justify-between items-center">
      {/* Brand Logo */}
      <Link href="/patient" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-cyan-500 flex items-center justify-center text-white shadow-sm shadow-cyan-200">
          <Stethoscope className="w-5 h-5" />
        </div>
        <span className="font-bold text-gray-900 text-lg tracking-tight">DocFind</span>
      </Link>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/patient/notifications"
          className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

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
