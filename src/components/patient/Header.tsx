"use client";

import Link from "next/link";
import { Bell, Stethoscope, User } from "lucide-react";

export default function Header() {
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
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-500 ring-2 ring-white" />
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
