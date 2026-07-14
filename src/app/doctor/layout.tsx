"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Stethoscope, LayoutDashboard, Calendar, Clock, Settings, LogOut, Menu, X, User, Inbox, CalendarDays, Bell, Users, Star, TrendingUp, Lock, Eye, FileText, CreditCard } from "lucide-react";
import SessionTimeoutProvider from "@/components/SessionTimeoutProvider";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [doctor, setDoctor] = useState<{ full_name: string; specialization: string; is_verified: boolean } | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  // 🔥 Identify if this is an explicit doctor dashboard/portal route
  const portalRoutes = [
    "/doctor/dashboard",
    "/doctor/agenda",
    "/doctor/appointments",
    "/doctor/inbox",
    "/doctor/patients",
    "/doctor/reviews",
    "/doctor/analytics",
    "/doctor/availability",
    "/doctor/breaks",
    "/doctor/holidays",
    "/doctor/notifications",
    "/doctor/prescriptions",
    "/doctor/records",
    "/doctor/profile-preview",
    "/doctor/settings",
    "/doctor/billing",
    "/doctor/password"
  ];

  const isAuthPage = pathname === "/doctor/login" || pathname === "/doctor/signup";
  const isStrictPortalRoute = portalRoutes.some((route) => pathname.startsWith(route));

  // 🔥 100% FIXED: If it's a patient viewing a public doctor profile, stop everything immediately and just render children!
  if (!isAuthPage && !isStrictPortalRoute) {
    return <>{children}</>;
  }

  // 🔥 100% FIXED: If it's a simple login or signup page, bypass hooks and render
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Next hooks will only run for authenticated doctor dashboard routes
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ email: user.email || "" });
        const { data: doctorData } = await supabase.from("doctors").select("full_name, specialization, is_verified").eq("user_id", user.id).single();
        if (doctorData) setDoctor(doctorData);
      }
    };
    getUser();
  }, [supabase]);

  useEffect(() => {
    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: doctorData } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (!doctorData) return;
      const { data: convos } = await supabase.from("conversations").select("id").eq("doctor_id", doctorData.id);
      if (convos && convos.length > 0) {
        const { count } = await supabase.from("messages").select("*", { count: "exact", head: true })
          .in("conversation_id", convos.map((c: { id: string }) => c.id))
          .eq("sender_type", "patient").eq("is_read", false);
        setUnreadMessages(count || 0);
      }
      const { count: notifCount } = await supabase.from("notifications").select("*", { count: "exact", head: true })
        .eq("user_id", doctorData.id).eq("user_type", "doctor").eq("is_read", false);
      setUnreadNotifs(notifCount || 0);
    };
    fetchUnread();
  }, [supabase, pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/doctor/login");
    router.refresh();
  };

  const navItems = [
    { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
    { name: "Today", href: "/doctor/agenda", icon: CalendarDays },
    { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
    { name: "Inbox", href: "/doctor/inbox", icon: Inbox, badge: unreadMessages },
    { name: "Patients", href: "/doctor/patients", icon: Users },
    { name: "Reviews", href: "/doctor/reviews", icon: Star },
    { name: "Analytics", href: "/doctor/analytics", icon: TrendingUp },
    { name: "Availability", href: "/doctor/availability", icon: Clock },
    { name: "Breaks", href: "/doctor/breaks", icon: Clock },
    { name: "Holidays", href: "/doctor/holidays", icon: CalendarDays },
    { name: "Notifications", href: "/doctor/notifications", icon: Bell, badge: unreadNotifs },
    { name: "Prescriptions", href: "/doctor/prescriptions", icon: FileText },
    { name: "Medical Records", href: "/doctor/records", icon: FileText },
    { name: "Profile Preview", href: "/doctor/profile-preview", icon: Eye },
    { name: "Settings", href: "/doctor/settings", icon: Settings },
    { name: "Billing", href: "/doctor/billing", icon: CreditCard },
    { name: "Change Password", href: "/doctor/password", icon: Lock },
  ];

  return (
    <SessionTimeoutProvider>
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">DocFind</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${pathname.startsWith(item.href) ? "" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`} style={pathname.startsWith(item.href) ? { backgroundColor: "#e6faf9", color: "#239999" } : {}}>
                <item.icon className="w-5 h-5" />
                {item.name}
                {item.badge && item.badge > 0 && (<span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">{item.badge}</span>)}
              </Link>
            ))}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                <User className="w-5 h-5" style={{ color: "#36d1cf" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doctor?.full_name || "Doctor"}</p>
                <p className="text-xs text-gray-500 truncate">{doctor?.specialization || "Specialist"}</p>
              </div>
            </div>
            <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />Sign Out
            </button>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16">
          <div className="flex items-center justify-between h-full px-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100"><Menu className="w-6 h-6 text-gray-600" /></button>
            <div className="flex-1" />
            {doctor?.is_verified && (
              <span className="px-2 py-1 rounded-full text-xs font-medium mr-3" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
                <Star className="w-3 h-3 inline mr-1 fill-current" />Verified
              </span>
            )}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{doctor?.full_name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
    </SessionTimeoutProvider>
  );
}
