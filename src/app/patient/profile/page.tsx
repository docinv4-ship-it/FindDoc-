"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Heart, Star, HelpCircle, ShieldCheck, ChevronRight, LogOut } from "lucide-react";

export default function PatientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
      else setUser(user);
      setLoading(false);
    };
    fetchUser();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    );
  }

  const menuSections = [
    {
      title: "Activity",
      items: [
        { label: "Favorite Doctors", href: "/patient/favorites", icon: Heart },
        { label: "My Reviews", href: "/patient/reviews", icon: Star },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Help & Support", href: "/patient/support", icon: HelpCircle },
        { label: "Privacy & Security", href: "#", icon: ShieldCheck },
      ],
    },
  ];

  return (
    <div className="pt-6 px-5 pb-24">
      {/* User Info */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4 mb-6 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 font-bold text-lg">
          {user?.user_metadata?.full_name?.charAt(0) || "P"}
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{user?.user_metadata?.full_name || "Patient"}</h2>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Menu List */}
      <div className="space-y-6">
        {menuSections.map((section, idx) => (
          <div key={idx}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50 shadow-sm">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={handleSignOut}
          className="w-full bg-white rounded-2xl p-4 border border-rose-100 text-rose-500 hover:bg-rose-50 text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>
    </div>
  );
}
