"use client";

import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="text-[120px] font-bold leading-none" style={{ color: "#36d1cf" }}>404</div>
          <div className="w-24 h-1 mx-auto mt-4 rounded" style={{ backgroundColor: "#36d1cf" }} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: "#36d1cf" }}
          >
            <Home className="w-5 h-5" /> Go Home
          </Link>
          {/* ✅ Ye path '/search' se badal kar '/patient' kar diya hai */}
          <Link
            href="/patient"
            className="px-6 py-3 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" /> Find Doctors
          </Link>
        </div>

        <button
          onClick={() => window.history.back()}
          className="mt-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    </div>
  );
}
