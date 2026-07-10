"use client";

import Link from "next/link";
import { Stethoscope, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RefundPolicyPage() {
  const router = useRouter();

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
          <nav className="flex items-center gap-6">
            <Link href="/patient" className="text-gray-600 hover:text-gray-900">Find Doctors</Link>
            <Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">Refund Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose prose-lg max-w-none text-gray-600">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Subscription Refunds</h2>
            <p className="mb-4">DocFind offers subscription plans for healthcare providers. Our refund policy for these plans is as follows:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Free Trial:</strong> No payment is required during the 14-day free trial. You may cancel at any time during the trial period with no obligation.</li>
              <li><strong>Monthly Plans:</strong> You may cancel your subscription at any time. Your access will continue until the end of the current billing period. No prorated refunds are provided for partial months.</li>
              <li><strong>Annual Plans:</strong> Annual subscriptions may be cancelled within 14 days of purchase for a full refund. After 14 days, cancellations will take effect at the end of the billing year with no refund.</li>
              <li><strong>Featured Listing Add-on:</strong> Refunds for Featured Listing add-ons are available within 7 days of purchase if the feature has not been actively used to promote your profile.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Appointment Booking Fees</h2>
            <p className="mb-4">DocFind does not charge patients for booking appointments through the platform. Consultation fees are set by individual healthcare providers and are paid directly to the clinic. Any refund requests for consultation fees should be directed to the specific healthcare provider.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Service Issues</h2>
            <p className="mb-4">If you experience significant service issues that prevent you from using DocFind as intended, please contact our support team. We will work with you to resolve the issue or provide appropriate compensation, which may include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Extension of your subscription period</li>
              <li>Service credits</li>
              <li>Partial or full refund at our discretion</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How to Request a Refund</h2>
            <p className="mb-4">To request a refund, please contact our support team through one of the following methods:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email: support@docbook.health</li>
              <li>Contact form: <Link href="/contact" className="underline" style={{ color: "#36d1cf" }}>Contact Page</Link></li>
            </ul>
            <p className="mb-4">Please include your account email, subscription details, and reason for the refund request. Refund requests are typically processed within 5-7 business days.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Chargebacks</h2>
            <p className="mb-4">If you initiate a chargeback with your bank or credit card provider, your DocFind account may be suspended pending resolution. We encourage you to contact us directly to resolve any billing disputes.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Changes to This Policy</h2>
            <p>We reserve the right to modify this refund policy at any time. Changes will be communicated via email to current subscribers and posted on this page. Continued use of the service after changes constitutes acceptance of the new policy.</p>
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Questions?</h3>
            <p className="text-gray-600">If you have any questions about our refund policy, please <Link href="/contact" className="underline" style={{ color: "#36d1cf" }}>contact us</Link>. We're here to help.</p>
          </section>
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">DocFind</span>
              </Link>
              <p className="text-gray-400">Your trusted healthcare booking platform.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/patient" className="hover:text-white transition-colors">Find a Doctor</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Doctors</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/doctor/signup" className="hover:text-white transition-colors">Join as Doctor</Link></li>
                <li><Link href="/doctor/login" className="hover:text-white transition-colors">Doctor Login</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">© 2026 DocFind. All rights reserved.</p>
            <p className="text-gray-400 text-sm">Developed by <span className="font-semibold text-white">Sheraz Khan</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
