"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Calendar, MessageSquare } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname.startsWith("/doctor")) {
    return null;
  }

  const navItems = [
    { href: "/patient", label: "Home", icon: Home },
    { href: "/patient/search", label: "Find", icon: Search },
    { href: "/patient/appointments", label: "Bookings", icon: Calendar },
    { href: "/patient/chats", label: "Chats", icon: MessageSquare },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-gray-100 safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2 max-w-xl mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/patient"
              ? pathname === "/patient"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all ${
                isActive ? "text-cyan-500 font-semibold" : "text-gray-400 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110 text-cyan-500" : ""}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
