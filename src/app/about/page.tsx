"use client";

import Link from "next/link";
import { Stethoscope, Heart, Users, Shield } from "lucide-react";

export default function AboutPage() {
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
            <Link href="/patient" className="text-gray-600">Find Doctors</Link>
            <Link href="/contact" className="text-gray-600">Contact</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">About DocFind</h1>

        <div className="prose prose-lg max-w-none text-gray-600">
          <p className="text-xl mb-8">DocFind is a next-generation healthcare SaaS platform designed to simplify the way patients connect with healthcare providers. Our mission is to make quality healthcare accessible, convenient, and transparent for everyone.</p>

          <div className="grid md:grid-cols-2 gap-8 my-12">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "#e6faf9" }}>
                <Heart className="w-6 h-6" style={{ color: "#36d1cf" }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Mission</h3>
              <p>To democratize healthcare access by connecting patients with verified doctors through a seamless, modern booking experience.</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "#e6faf9" }}>
                <Users className="w-6 h-6" style={{ color: "#36d1cf" }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Vision</h3>
              <p>A world where finding and booking a doctor is as easy as ordering a ride—simple, transparent, and instant.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What We Offer</h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: "#36d1cf" }}>
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </div>
              <span><strong className="text-gray-900">Real-Time Booking:</strong> See available slots instantly and book appointments in seconds.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: "#36d1cf" }}>
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </div>
              <span><strong className="text-gray-900">Verified Doctors:</strong> All healthcare providers on our platform are verified and credentialed.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: "#36d1cf" }}>
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </div>
              <span><strong className="text-gray-900">Direct Communication:</strong> Chat with clinics before booking for any questions.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ backgroundColor: "#36d1cf" }}>
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </div>
              <span><strong className="text-gray-900">No Registration Required:</strong> Book appointments as a guest without creating an account.</span>
            </li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Meet the Developer</h2>
          <div className="bg-gray-50 p-8 rounded-xl border border-gray-100">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                <span className="text-3xl font-bold text-white">SK</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Sheraz Khan</h3>
                <p className="text-gray-500 mb-4">Founder & Lead Developer</p>
                <p className="text-gray-600">Sheraz Khan is a passionate software developer dedicated to building solutions that make healthcare more accessible. With years of experience in full-stack development, Sheraz created DocFind to bridge the gap between patients and healthcare providers using modern technology.</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Our Commitment</h2>
          <p>We are committed to maintaining the highest standards of data privacy and security. Your health information is sensitive, and we treat it with the utmost care and protection. Our platform uses enterprise-grade security measures to ensure your data is always safe.</p>
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
