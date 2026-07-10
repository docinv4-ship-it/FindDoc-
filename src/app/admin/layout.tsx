"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Calendar, LogOut, Stethoscope, Loader2, Star, Megaphone, Settings,
  Shield, FileCheck, CreditCard, Flag, ScrollText, Bell, HeadphonesIcon, ActivityIcon, Lock, ChevronDown,
  BarChart3, ToggleLeft, BookOpen
} from "lucide-react";

interface AdminContextType {
  adminId: string | null;
  role: string | null;
  permissions: Record<string, boolean> | null;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType>({
  adminId: null,
  role: null,
  permissions: null,
  loading: true,
});

export const useAdmin = () => useContext(AdminContext);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminData, setAdminData] = useState<AdminContextType>({
    adminId: null,
    role: null,
    permissions: null,
    loading: true,
  });
  const [expandedSection, setExpandedSection] = useState<string | null>("main");
  const router = useRouter();
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }

      try {
        const response = await fetch("/api/admin/auth");
        const data = await response.json();

        if (data.authorized) {
          setAuthorized(true);
          setAdminData({
            adminId: data.adminId,
            role: data.role,
            permissions: data.permissions,
            loading: false,
          });
        } else {
          router.push("/admin/login");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/admin/login");
        return;
      }
      setLoading(false);
    };
    checkAuth();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: "#36d1cf" }} />
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  type NavItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
    minRole?: string;
  };

  type NavSection = {
    id: string;
    label: string;
    items: NavItem[];
  };

  const navSections: NavSection[] = [
    {
      id: "main",
      label: "Main",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/admin/verification", label: "Verification Queue", icon: FileCheck, badge: "queue" },
        { href: "/admin/doctors", label: "Doctors", icon: Users },
        { href: "/admin/clinics", label: "Clinics", icon: Building2 },
      ],
    },
    {
      id: "subscriptions",
      label: "Billing",
      items: [
        { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
        { href: "/admin/featured", label: "Featured Listings", icon: Star },
      ],
    },
    {
      id: "moderation",
      label: "Moderation",
      items: [
        { href: "/admin/reports", label: "Reports & Complaints", icon: Flag },
        { href: "/admin/reviews", label: "Reviews", icon: Star },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      items: [
        { href: "/admin/bookings", label: "Bookings", icon: Calendar },
        { href: "/admin/broadcasts", label: "Broadcasts", icon: Megaphone },
        { href: "/admin/support", label: "Support Tickets", icon: HeadphonesIcon },
      ],
    },
    {
      id: "system",
      label: "System",
      items: [
        { href: "/admin/roles", label: "Roles & Permissions", icon: Shield, minRole: "admin" },
        { href: "/admin/audit", label: "Audit Trail", icon: ScrollText },
        { href: "/admin/events", label: "Event Log", icon: ActivityIcon },
        { href: "/admin/health", label: "System Health", icon: ActivityIcon },
        { href: "/admin/settings", label: "Platform Settings", icon: Settings, minRole: "admin" },
        { href: "/admin/feature-flags", label: "Feature Flags", icon: ToggleLeft, minRole: "admin" },
      ],
    },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const filteredSections = navSections.filter(section => {
    return section.items.some(item => {
      if (item.minRole && adminData.role === 'viewer') return false;
      return true;
    });
  });

  return (
    <AdminContext.Provider value={adminData}>
      <div className="min-h-screen bg-gray-100 flex">
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">DocFind</span>
                <span className="text-xs text-gray-500 block">Admin Panel</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-2 overflow-y-auto">
            {filteredSections.map((section) => (
              <div key={section.id} className="mb-2">
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  {section.label}
                  <ChevronDown className={`w-3 h-3 transition-transform ${expandedSection === section.id ? "rotate-180" : ""}`} />
                </button>
                {expandedSection === section.id && (
                  <div className="mt-1 space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <button
                          key={item.href}
                          onClick={() => router.push(item.href)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? ""
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                          style={isActive ? { backgroundColor: "#e6faf9", color: "#239999" } : {}}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                <Shield className="w-4 h-4" style={{ color: "#36d1cf" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{adminData.role?.replace("_", " ")}</p>
                <p className="text-xs text-gray-500 capitalize">{adminData.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}
