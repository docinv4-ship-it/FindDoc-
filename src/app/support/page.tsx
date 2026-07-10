"use client";

import Link from "next/link";
import { Stethoscope, Book, MessageCircle, Mail, HelpCircle, BookOpen } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">DocFind</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Support Center</h1>
        <p className="text-gray-600 text-lg mb-12">We're here to help. Choose an option below.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/faq" className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow block">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: "#e6faf9" }}>
              <HelpCircle className="w-7 h-7" style={{ color: "#36d1cf" }} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">FAQ</h3>
            <p className="text-gray-600">Find answers to commonly asked questions about booking, cancellations, and more.</p>
          </Link>

          <Link href="/help" className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow block">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: "#e6faf9" }}>
              <BookOpen className="w-7 h-7" style={{ color: "#36d1cf" }} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Help Center</h3>
            <p className="text-gray-600">Browse our guides, tutorials, and troubleshooting articles.</p>
          </Link>

          <Link href="/contact" className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow block">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: "#e6faf9" }}>
              <MessageCircle className="w-7 h-7" style={{ color: "#36d1cf" }} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact Us</h3>
            <p className="text-gray-600">Send us a message and we'll respond within 24 hours.</p>
          </Link>

          <Link href="/privacy" className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow block">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: "#e6faf9" }}>
              <Book className="w-7 h-7" style={{ color: "#36d1cf" }} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Privacy Policy</h3>
            <p className="text-gray-600">Learn how we protect and handle your personal information.</p>
          </Link>

          <Link href="/terms" className="bg-gray-50 p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow block">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: "#e6faf9" }}>
              <Book className="w-7 h-7" style={{ color: "#36d1cf" }} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
            <p className="text-gray-600">Read our terms of service and policies.</p>
          </Link>
        </div>

        <div className="mt-12 p-8 bg-gray-900 rounded-xl text-white">
          <h3 className="text-xl font-semibold mb-4">Need immediate assistance?</h3>
          <p className="text-gray-300 mb-6">Our support team is available to help you with any issues.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="mailto:support@docbook.com" className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium" style={{ backgroundColor: "#36d1cf" }}>
              <Mail className="w-4 h-4" /> Email Support
            </a>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2026 DocFind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
