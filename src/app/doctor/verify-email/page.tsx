"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";

function DoctorVerifyEmailContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (token_hash && type === "signup") {
      setStatus("loading");
      verifyEmail(token_hash);
    }
  }, [searchParams]);

  const verifyEmail = async (token_hash: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: "signup",
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
      } else {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
        setTimeout(() => {
          router.push("/doctor/dashboard");
        }, 3000);
      }
    } catch {
      setStatus("error");
      setMessage("An unexpected error occurred.");
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/doctor/verify-email`,
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Verification email sent! Check your inbox.");
      }
    } catch {
      setMessage("Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const getIcon = () => {
    switch (status) {
      case "loading":
        return <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />;
      case "success":
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case "error":
        return <AlertCircle className="w-8 h-8 text-red-600" />;
      default:
        return <Mail className="w-8 h-8 text-white" />;
    }
  };

  const getBackground = () => {
    if (status === "success") return "bg-green-100";
    if (status === "error") return "bg-red-100";
    return "bg-primary-100";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${getBackground()}`} style={status === "idle" || status === "loading" ? { backgroundColor: "#36d1cf" } : {}}>
            {getIcon()}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {status === "loading" ? "Verifying Email..." :
             status === "success" ? "Email Verified!" :
             status === "error" ? "Verification Failed" : "Verify Your Email"}
          </h1>
          <p className="text-gray-600 mt-1">
            {status === "success" ? message : "Follow the link sent to your email to verify your account"}
          </p>
        </div>

        {message && status !== "success" && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${
            status === "error" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
          }`}>
            {message}
          </div>
        )}

        {(status === "idle" || status === "error") && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Need a new verification email? Enter your email below:
            </p>

            <form onSubmit={handleResendVerification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="doctor@example.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resending || !email.trim()}
                className="w-full py-2.5 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: "#36d1cf" }}
              >
                {resending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Resend Verification"}
              </button>
            </form>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link href="/doctor/login" className="text-sm text-gray-600 hover:text-gray-900">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DoctorVerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    }>
      <DoctorVerifyEmailContent />
    </Suspense>
  );
}
