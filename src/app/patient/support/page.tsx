"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  HeadphonesIcon, Send, Loader2, CheckCircle, AlertCircle,
  User, Mail, MessageSquare, FileText, ChevronRight
} from "lucide-react";

const categories = [
  "Appointment Issue",
  "Billing Question",
  "Technical Problem",
  "Doctor Feedback",
  "General Inquiry",
  "Other",
];

const priorities = [
  { value: "low", label: "Low", description: "General question or minor issue" },
  { value: "normal", label: "Normal", description: "Standard support request" },
  { value: "high", label: "High", description: "Urgent issue requiring attention" },
  { value: "urgent", label: "Urgent", description: "Critical issue requiring immediate help" },
];

export default function PatientSupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requester_type: "guest",
          requester_name: name,
          requester_email: email,
          subject,
          category,
          message,
          priority,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTicketId(data.ticket?.id || null);
      } else {
        setError(data.error || "Failed to submit support ticket");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ticket Submitted</h1>
          <p className="text-gray-600 mb-4">
            Your support request has been received. We&apos;ll get back to you within 24-48 hours.
          </p>
          {ticketId && (
            <p className="text-sm text-gray-500 mb-6">
              Ticket ID: <span className="font-mono font-medium">{ticketId}</span>
            </p>
          )}
          <p className="text-sm text-gray-500 mb-4">
            A confirmation email has been sent to {email}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/patient")}
              className="px-6 py-3 text-white rounded-lg font-medium"
              style={{ backgroundColor: "#36d1cf" }}
            >
              Back to Patient Portal
            </button>
            <button
              onClick={() => { setSuccess(false); setName(""); setEmail(""); setSubject(""); setCategory(""); setMessage(""); setPriority("normal"); }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Submit Another Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
            <HeadphonesIcon className="w-8 h-8" style={{ color: "#36d1cf" }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">How Can We Help?</h1>
          <p className="text-gray-600 mt-1">Submit a support request and we&apos;ll get back to you shortly</p>
        </div>

        {/* FAQs Quick Links */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <p className="text-sm text-gray-500 mb-3">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/faq")}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" /> View FAQs
            </button>
            <button
              onClick={() => router.push("/contact")}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" /> Contact Us
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Brief description of your issue"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    priority === p.value
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  style={priority === p.value ? { borderColor: "#36d1cf", backgroundColor: "#e6faf9" } : {}}
                >
                  <p className="font-medium text-gray-900 text-sm">{p.label}</p>
                  <p className="text-xs text-gray-500">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[150px]"
              placeholder="Please describe your issue or question in detail..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 20 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading || !name || !email || !subject || !category || message.length < 20}
            className="w-full py-3 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#36d1cf" }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Submit Support Request</>}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By submitting this form, you agree to our <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </form>
      </div>
    </div>
  );
}
