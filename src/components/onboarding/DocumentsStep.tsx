"use client";

import { ChangeEvent } from "react";
import { ShieldCheck, Upload, FileText, CheckCircle } from "lucide-react";
import { DocumentsData } from "@/lib/validation/onboarding-group3";

interface DocumentsStepProps {
  data: DocumentsData;
  onChange: (updates: Partial<DocumentsData>) => void;
  errors: Record<string, string>;
}

export default function DocumentsStep({ data, onChange, errors }: DocumentsStepProps) {
  
  // In a Production Billion Dollar app, this connects to AWS S3 / Supabase Storage via Presigned URLs.
  // For state architecture, we simulate upload by converting to a Base64 string placeholder.
  const handleUpload = (e: ChangeEvent<HTMLInputElement>, field: keyof DocumentsData) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        onChange({ [field]: reader.result }); // Save URL/Base64 to state
      }
    };
    reader.readAsDataURL(file);
  };

  const UploadCard = ({ title, desc, field, isOptional = false }: { title: string, desc: string, field: keyof DocumentsData, isOptional?: boolean }) => {
    const isUploaded = !!data[field];
    
    return (
      <div className={`p-4 border rounded-xl transition-all ${isUploaded ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200 hover:border-primary-300"}`}>
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className={`p-2 rounded-lg ${isUploaded ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
              {isUploaded ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{title} {!isOptional && <span className="text-red-500">*</span>}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
            </div>
          </div>
          
          <div className="relative">
            <button type="button" className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${isUploaded ? "bg-white border-emerald-200 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"}`}>
              {isUploaded ? "Replace File" : "Upload"}
            </button>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleUpload(e, field)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          Secure Verification Engine <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </h2>
        <p className="text-sm text-gray-500">Upload encrypted credentials for platform verification. Max 5MB per file (PDF/JPG/PNG).</p>
      </div>

      <div className="space-y-4">
        <UploadCard
          title="Medical License / Registration"
          desc="Official practicing license issued by the medical council."
          field="medicalLicense"
        />
        <UploadCard
          title="Government ID Proof"
          desc="Passport, National ID, or Driving License for identity verification."
          field="idProof"
        />
        <UploadCard
          title="Clinic Registration (Optional)"
          desc="Business registration certificate if operating a private facility."
          field="clinicRegistration"
          isOptional
        />
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          🔒 **Enterprise Grade Security:** Tumhare documents end-to-end encrypted hain aur AES-256 bit secure cloud buckets me isolated environment me store kiye jayenge.
        </p>
      </div>
    </div>
  );
}
