"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const SECURITY_SALT = "ClinicBook_Secret_Key_2026_!@#";

function VerifyContent() {
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState<"verifying" | "valid" | "tampered" | "error">("verifying");
  const [appointmentData, setAppointmentData] = useState<any>(null);

  useEffect(() => {
    const verifySecurity = async () => {
      try {
        const encodedData = searchParams.get("data");
        const providedSignature = searchParams.get("sig");

        if (!encodedData || !providedSignature) {
          setStatus("error");
          return;
        }

        // 1. Recalculate Signature to verify integrity
        const messageToHash = encodedData + SECURITY_SALT;
        const msgUint8 = new TextEncoder().encode(messageToHash);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        // 2. Security Check: Did someone tamper with the URL?
        if (calculatedSignature !== providedSignature) {
          setStatus("tampered");
          return;
        }

        // 3. If Safe, Decode the Data
        const jsonString = decodeURIComponent(escape(atob(encodedData)));
        const parsedData = JSON.parse(jsonString);
        
        setAppointmentData(parsedData);
        setStatus("valid");

      } catch (error) {
        setStatus("error");
      }
    };

    verifySecurity();
  }, [searchParams]);

  // UI RENDERING BASED ON SECURITY STATUS
  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-600 font-bold animate-pulse">Running Cryptographic Verification...</p>
      </div>
    );
  }

  if (status === "tampered" || status === "error") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-red-500">
          <div className="bg-red-500 p-8 text-center flex flex-col items-center">
             <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
             </div>
             <h1 className="text-2xl font-black text-white uppercase tracking-wider">Security Alert</h1>
          </div>
          <div className="p-6 text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Tampered QR Code Detected</h2>
            <p className="text-sm text-slate-600 mb-6 font-medium">
              The cryptographic signature of this pass is invalid. The data (like fees or dates) has been manually altered. <b>Do not process this patient.</b>
            </p>
            <button className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all">
              Report Incident
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VALID APPOINTMENT UI
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Verification Success Header */}
        <div className="bg-emerald-500 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner relative z-10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight relative z-10">Verified & Authentic</h1>
          <div className="inline-flex items-center gap-1.5 mt-2 bg-emerald-600 px-2.5 py-0.5 rounded text-[10px] text-white font-mono uppercase tracking-widest relative z-10">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            SHA-256 Secured
          </div>
        </div>

        {/* Scan Results */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <span className="text-sm text-slate-500 font-medium">Reference ID</span>
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">{appointmentData?.ref}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <span className="text-sm text-slate-500 font-medium">Patient</span>
            <span className="font-bold text-slate-800">{appointmentData?.pt}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <span className="text-sm text-slate-500 font-medium">Doctor</span>
            <span className="font-bold text-slate-800">{appointmentData?.dr}</span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <span className="text-sm text-slate-500 font-medium">Schedule</span>
            <span className="font-bold text-slate-800 text-right">{appointmentData?.dt}<br/><span className="text-xs text-slate-500">{appointmentData?.tm}</span></span>
          </div>

          {/* Locked Fee Collection Block */}
          <div className="mt-6 bg-[#f0fdf4] border border-[#a7f3d0] rounded-xl p-5 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                Amount To Collect
              </p>
              <p className="text-[28px] font-black text-slate-900 leading-none">{appointmentData?.fee}</p>
            </div>
            <div className="bg-emerald-500 p-3 rounded-xl shadow-md shadow-emerald-500/20">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Reception Action Buttons */}
        <div className="p-6 pt-0 space-y-3">
          <button className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-md transition-all text-[15px]">
            Confirm Arrival & Payment
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyAppointmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-500">Initializing Core...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
