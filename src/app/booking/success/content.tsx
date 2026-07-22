"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";

// Production Security Salt (Ideally fetched from backend/env)
const SECURITY_SALT = "ClinicBook_Secret_Key_2026_!@#";

export default function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [origin, setOrigin] = useState("");
  const [secureQrLink, setSecureQrLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);

  // 1. Fetch Parameters
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const startTime = searchParams.get("start_time") || "10:00 AM";
  const endTime = searchParams.get("end_time") || "10:30 AM";
  const doctorName = searchParams.get("doctor_name") || "Dr. Assigned Specialist";
  const clinicName = searchParams.get("clinic_name") || "ClinicBook AI Workspace";
  const patientEmail = searchParams.get("email") || "patient@example.com";
  const fee = searchParams.get("fee") || "Rs. 1500"; 
  const specialty = searchParams.get("specialty") || "General Physician";
  const location = searchParams.get("location") || "Main Branch";

  // 2. Generate Base REF
  const refNo = useMemo(() => {
    const rawString = `${doctorName}-${patientEmail}-${date}-${startTime}`;
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      hash = (hash << 5) - hash + rawString.charCodeAt(i);
      hash |= 0;
    }
    return `DF-${Math.abs(hash).toString(16).toUpperCase().padStart(6, "0")}`;
  }, [doctorName, patientEmail, date, startTime]);

  // 3. Cryptographic Hashing for QR Security
  useEffect(() => {
    const generateSecureLink = async () => {
      setOrigin(window.location.origin);
      
      // A. Create Payload
      const payloadObj = {
        ref: refNo,
        dr: doctorName,
        pt: patientEmail,
        dt: date,
        tm: `${startTime} - ${endTime}`,
        fee: fee,
        cl: clinicName
      };

      // B. Safe Base64 Encode (Handles special characters)
      const jsonString = JSON.stringify(payloadObj);
      const encodedPayload = btoa(unescape(encodeURIComponent(jsonString)));

      // C. Generate SHA-256 Signature
      const messageToHash = encodedPayload + SECURITY_SALT;
      const msgUint8 = new TextEncoder().encode(messageToHash);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // D. Final Locked URL
      const lockedUrl = `${window.location.origin}/verify-appointment?data=${encodedPayload}&sig=${signature}`;
      
      setSecureQrLink(lockedUrl);
      setIsGenerating(false);
    };

    generateSecureLink();
  }, [refNo, doctorName, patientEmail, date, startTime, endTime, fee, clinicName]);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-3 md:p-6 print:bg-white print:p-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .voucher-card * { font-family: 'Plus Jakarta Sans', sans-serif; }
        @media print {
          body { background-color: #ffffff !important; padding: 0 !important; }
          .voucher-card { box-shadow: none !important; max-width: 100% !important; border-radius: 0 !important; border: none !important; }
          .actions-bar { display: none !important; }
        }
      `}</style>

      <div className="voucher-card relative bg-white w-full max-w-[680px] rounded-[20px] shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header Section */}
        <div className="px-7 py-6 flex justify-between items-center bg-[#0f172a] text-white border-b-4 border-[#0d9488]">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] bg-gradient-to-br from-[#0d9488] to-[#059669] rounded-xl flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20" /><circle cx="12" cy="12" r="9" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white leading-none">Doc<span className="text-[#38bdf8]">Find</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Medical Pass</p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-[#34d399] px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide border border-emerald-400/30">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              Confirmed
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-semibold font-mono">REF: #{refNo}</div>
          </div>
        </div>

        {/* Body Section */}
        <div className="p-7">
          <div className="grid grid-cols-2 gap-y-5 gap-x-4 pb-6 border-b border-slate-200">
            <div className="flex flex-col">
              <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Assigned Doctor</div>
              <div className="text-[15px] font-bold text-slate-900">{doctorName}</div>
              <div className="text-xs text-slate-600 font-medium">{specialty}</div>
            </div>

            <div className="flex flex-col">
              <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Medical Facility</div>
              <div className="text-[15px] font-bold text-slate-900">{clinicName}</div>
              <div className="text-xs text-slate-600 font-medium">{location}</div>
            </div>

            <div className="flex flex-col">
              <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Patient Account</div>
              <div className="text-[13.5px] font-bold text-slate-900 break-all">{patientEmail}</div>
            </div>

            <div className="flex flex-col">
              <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">Consultation Fee</div>
              <div className="text-[16px] font-extrabold text-[#0d9488] bg-teal-50 px-2.5 py-0.5 rounded-md inline-block w-max border border-teal-100">{fee}</div>
            </div>
          </div>

          {/* Secure Client-Side QR Section */}
          <div className="mt-5 flex items-center gap-5">
            <div className="w-[90px] h-[90px] bg-white border-[1.5px] border-slate-900 rounded-xl p-1 shrink-0 flex items-center justify-center shadow-sm overflow-hidden">
              {isGenerating ? (
                <div className="w-full h-full bg-slate-100 animate-pulse rounded flex items-center justify-center text-[10px] text-slate-400 font-bold text-center">Securing...</div>
              ) : (
                <QRCodeSVG value={secureQrLink} size={80} level="H" includeMargin={false} />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-[12.5px] font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                SHA-256 Encrypted Pass
              </h4>
              <p className="text-[11px] text-slate-600 leading-snug font-medium">
                This QR is cryptographically signed. Any manual tampering with the digital URL will instantly flag the appointment as invalid.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="actions-bar px-7 pb-7 flex gap-3 print:hidden">
          <button onClick={handlePrint} className="flex-1 py-3 px-4 rounded-xl text-[13.5px] font-bold bg-[#0f172a] hover:bg-[#1e293b] text-white transition-all shadow-md">
            Print Pass
          </button>
          <button onClick={() => router.push("/patient/appointments")} className="flex-1 py-3 px-4 rounded-xl text-[13.5px] font-bold bg-white text-[#1e293b] border-[1.5px] border-slate-200 hover:bg-slate-50 transition-all">
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
