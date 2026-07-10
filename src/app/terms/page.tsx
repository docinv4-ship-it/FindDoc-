"use client";

import Link from "next/link";
import { Stethoscope } from "lucide-react";

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms & Conditions</h1>
        <p className="text-gray-600 mb-8">Last updated: January 2026</p>

        <div className="prose prose-lg max-w-none text-gray-600">
          <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>By accessing or using DocFind, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our service.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">2. Description of Service</h2>
          <p>DocFind is a healthcare appointment booking platform that connects patients with healthcare providers. We facilitate booking but do not provide medical advice or treatment.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">3. User Accounts</h2>
          <p>To use certain features, you may need to create an account. You are responsible for maintaining the security of your account and all activities under it. You must provide accurate and complete information.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">4. Guest Bookings</h2>
          <p>You may book appointments as a guest without creating an account. Guest bookings require valid contact information. You are responsible for providing accurate phone numbers and email addresses.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">5. Healthcare Provider Content</h2>
          <p>Information about healthcare providers, including availability, is provided by the providers themselves. DocFind does not verify medical qualifications beyond basic verification. We are not responsible for the medical services provided.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">6. Appointments & Cancellations</h2>
          <p>Appointment policies, including cancellation and rescheduling, are set by individual healthcare providers. Please review provider-specific policies before booking. Late cancellations or no-shows may result in fees.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">7. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any unlawful purpose</li>
            <li>Submit false information when booking</li>
            <li>Harass, abuse, or harm healthcare providers or other users</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with the proper functioning of the service</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">8. Payment</h2>
          <p>Some appointments may require payment. Payment terms are set by individual healthcare providers. DocFind may facilitate payment processing but is not a party to the transaction.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">9. Limitation of Liability</h2>
          <p>DocFind is not liable for any medical advice, diagnosis, or treatment provided by healthcare providers. We are not responsible for any damages arising from healthcare services received through our platform.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">10. Indemnification</h2>
          <p>You agree to indemnify DocFind against any claims arising from your use of the service or violation of these terms.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">11. Termination</h2>
          <p>We reserve the right to suspend or terminate your access to the service for any reason, including violation of these terms.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">12. Governing Law</h2>
          <p>These terms are governed by the laws of the State of New York, without regard to conflict of law principles.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">13. Contact</h2>
          <p>For questions about these terms, contact us at legal@docbook.com.</p>
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
