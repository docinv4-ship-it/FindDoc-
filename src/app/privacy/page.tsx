"use client";

import Link from "next/link";
import { Stethoscope } from "lucide-react";

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: January 2026</p>

        <div className="prose prose-lg max-w-none text-gray-600">
          <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create an account, book an appointment, or contact us. This may include your name, email address, phone number, and health-related information relevant to your appointments.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Facilitate appointment bookings between patients and healthcare providers</li>
            <li>Send appointment confirmations, reminders, and updates</li>
            <li>Enable real-time chat between patients and doctors</li>
            <li>Improve our services and develop new features</li>
            <li>Respond to your inquiries and provide customer support</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">3. Information Sharing</h2>
          <p>We do not sell your personal information. We may share your information with:</p>
          <ul>
            <li>Healthcare providers you book appointments with</li>
            <li>Service providers who assist in our operations</li>
            <li>Legal authorities when required by law</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">4. Data Security</h2>
          <p>We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access and update your personal information</li>
            <li>Request deletion of your data</li>
            <li>Opt out of marketing communications</li>
            <li>Request a copy of your data</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">6. Cookies</h2>
          <p>We use cookies and similar technologies to improve your experience, analyze usage, and personalize content. You can manage cookie preferences through your browser settings.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">7. Children's Privacy</h2>
          <p>Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">8. Changes to This Policy</h2>
          <p>We may update this policy periodically. We will notify you of material changes by posting the updated policy on this page.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">9. Contact Us</h2>
          <p>If you have questions about this privacy policy, please contact us at privacy@docbook.com.</p>
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
