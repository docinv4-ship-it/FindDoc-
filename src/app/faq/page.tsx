"use client";

import Link from "next/link";
import { Stethoscope, ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  { q: "How do I book an appointment?", a: "Simply browse doctors, select one, choose an available time slot, and fill in your details. No account required for booking." },
  { q: "Do I need to create an account?", a: "No, you can book as a guest using just your name and phone number. However, creating an account helps you manage appointments and access more features." },
  { q: "How do I cancel or reschedule?", a: "Go to My Appointments, verify your phone with OTP, and you can cancel or reschedule any upcoming appointment." },
  { q: "Are the doctors verified?", a: "Yes, all doctors on DocFind go through a verification process to ensure they are licensed healthcare providers." },
  { q: "Is my information secure?", a: "We use industry-standard encryption and security measures. Your health information is protected and never shared without consent." },
  { q: "Can I chat with the doctor before booking?", a: "Yes, you can start a chat directly from the clinic page or doctor profile to ask questions before booking." },
  { q: "What payment methods are accepted?", a: "Payment methods vary by clinic. Some offer online payment, while others accept payment at the clinic." },
  { q: "How do I find my booking history?", a: "Use the My Appointments page and verify your phone number with OTP to view all your past and upcoming appointments." },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);

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

      <main className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
        <p className="text-gray-600 text-lg mb-12">Find answers to common questions about DocFind.</p>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-6 text-left">
                <span className="font-semibold text-gray-900">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-6 pb-6 text-gray-600">{faq.a}</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-xl text-center" style={{ backgroundColor: "#e6faf9" }}>
          <h3 className="font-semibold text-gray-900 mb-2">Still have questions?</h3>
          <p className="text-gray-600 mb-4">Can't find the answer you're looking for? Please contact our support team.</p>
          <Link href="/contact" className="inline-block px-6 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: "#36d1cf" }}>Contact Support</Link>
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
