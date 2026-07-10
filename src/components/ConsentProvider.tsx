"use client";

import { useEffect, useState } from "react";
import { X, Shield, FileText } from "lucide-react";
import Link from "next/link";

const CONSENT_KEY = "docfind_consent_accepted";
const CURRENT_VERSION = "1.0";

interface ConsentBannerState {
  accepted: boolean;
  version: string;
  timestamp: string;
}

function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const state = JSON.parse(stored) as ConsentBannerState;
        if (state.accepted && state.version === CURRENT_VERSION) {
          return;
        }
      } catch {}
    }
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const acceptConsent = async () => {
    const state: ConsentBannerState = {
      accepted: true,
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    setVisible(false);

    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent_type: "cookies",
          source_action: "banner_accept",
          version: CURRENT_VERSION,
        }),
      });
    } catch {}
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e6faf9" }}>
              <Shield className="w-5 h-5" style={{ color: "#36d1cf" }} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Your Privacy Matters</h3>
              <p className="text-sm text-gray-600 mt-1">
                We use cookies to improve your experience. By continuing, you agree to our{" "}
                <Link href="/privacy" className="underline hover:no-underline" style={{ color: "#36d1cf" }}>Privacy Policy</Link> and{" "}
                <Link href="/terms" className="underline hover:no-underline" style={{ color: "#36d1cf" }}>Terms of Service</Link>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:flex-shrink-0">
            <Link
              href="/terms"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <FileText className="w-4 h-4" /> View Terms
            </Link>
            <button
              onClick={acceptConsent}
              className="px-6 py-2 text-white text-sm font-medium rounded-lg transition-colors"
              style={{ backgroundColor: "#36d1cf" }}
            >
              Accept
            </button>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="absolute top-2 right-2 md:static p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsentProvider() {
  return <ConsentBanner />;
}
