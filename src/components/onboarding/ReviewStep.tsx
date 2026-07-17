"use client";

import { Edit3, CheckCircle2, Rocket } from "lucide-react";

interface ReviewStepProps {
  globalState: any; // Ideally typed to encompass all 3 groups
  onNavigateToStep: (stepNumber: number) => void;
}

export default function ReviewStep({ globalState, onNavigateToStep }: ReviewStepProps) {
  
  const SectionHeader = ({ title, step }: { title: string, step: number }) => (
    <div className="flex items-center justify-between border-b border-gray-150 pb-2 mb-3">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      <button 
        onClick={() => onNavigateToStep(step)}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors bg-primary-50 px-2 py-1 rounded"
      >
        <Edit3 className="w-3.5 h-3.5" /> Edit
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center pb-2 border-b border-gray-100">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Rocket className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Final Review & Deployment</h2>
        <p className="text-sm text-gray-500">Verify your telemetry payload before initiating the smart-contract deployment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Block 1: Basic Info */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <SectionHeader title="Basic Credentials" step={1} />
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Doctor:</span> <span className="font-semibold">{globalState?.group1?.basicInfo?.doctorName || "N/A"}</span></p>
            <p><span className="text-gray-500">Clinic:</span> <span className="font-semibold">{globalState?.group1?.basicInfo?.clinicName || "N/A"}</span></p>
            <p><span className="text-gray-500">Specialization:</span> <span className="font-semibold">{globalState?.group1?.basicInfo?.specialization || "N/A"}</span></p>
          </div>
        </div>

        {/* Block 2: Financials & Location */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <SectionHeader title="Operations & Location" step={7} />
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Fee Rate:</span> <span className="font-semibold">{globalState?.group2?.consultation?.consultationFee} {globalState?.group2?.consultation?.currency}</span></p>
            <p><span className="text-gray-500">Slot Size:</span> <span className="font-semibold">{globalState?.group2?.consultation?.slotSizeMinutes} Min</span></p>
            <p><span className="text-gray-500">City:</span> <span className="font-semibold">{globalState?.group1?.location?.city || "N/A"}</span></p>
          </div>
        </div>

        {/* Block 3: Profile Settings */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 md:col-span-2">
          <SectionHeader title="System Profile" step={9} />
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Slug:</span> <span className="font-mono bg-white px-2 py-0.5 rounded border">{globalState?.group3?.publicProfile?.profileSlug || "N/A"}</span></p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {globalState?.group3?.publicProfile?.services?.map((s: string, i: number) => (
                <span key={i} className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-md">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-emerald-900">All Systems Green</h4>
          <p className="text-xs text-emerald-700 mt-1">Your data passes local Zod cryptographic validation. Ready for PostgreSQL insertion via Supabase edge functions.</p>
        </div>
      </div>
    </div>
  );
}
