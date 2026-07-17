"use client";

import { useState, useEffect } from "react";
import { ZodError } from "zod";
import {
  AvailabilitySchema,
  PublicProfileSchema,
  DocumentsSchema,
  GroupThreeState,
} from "@/lib/validation/onboarding-group3";
import AvailabilityStep from "./AvailabilityStep";
import PublicProfileStep from "./PublicProfileStep";
import DocumentsStep from "./DocumentsStep";
import ReviewStep from "./ReviewStep";

const GROUP3_DRAFT_KEY = "doctor_onboarding_group3_draft";

const defaultDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const defaultSchedule = defaultDays.map(day => ({
  day,
  isAvailable: day !== "Sunday",
  slots: day !== "Sunday" ? [{ id: `init-${day}`, startTime: "09:00", endTime: "17:00" }] : [],
}));

const defaultGroupThreeState: GroupThreeState = {
  availability: { schedule: defaultSchedule },
  publicProfile: { profileSlug: "", bio: "", services: [], tags: [] },
  documents: { medicalLicense: "", idProof: "", clinicRegistration: "" },
};

interface GroupThreeControllerProps {
  currentStep: number; // 8, 9, 10, 11
  globalStatePayload: any; // Full state object passed from parent DoctorOnboardingPage
  onStepComplete: (groupData: GroupThreeState) => void;
  onStepBack: () => void;
  onNavigateToStep: (step: number) => void;
  onSubmitToBackend: () => void; // Trigger DB deployment
}

export default function GroupThreeController({
  currentStep,
  globalStatePayload,
  onStepComplete,
  onStepBack,
  onNavigateToStep,
  onSubmitToBackend,
}: GroupThreeControllerProps) {
  const [state, setState] = useState<GroupThreeState>(defaultGroupThreeState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GROUP3_DRAFT_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed) setState(parsed);
    } catch (e) {
      console.error("Failed to restore Group 3 draft", e);
    }
  }, []);

  useEffect(() => {
    if (state !== defaultGroupThreeState) {
      localStorage.setItem(GROUP3_DRAFT_KEY, JSON.stringify(state));
    }
  }, [state]);

  const updateAvailability = (updates: Partial<GroupThreeState["availability"]>) => {
    setState((prev) => ({ ...prev, availability: { ...prev.availability, ...updates } }));
    setErrors({});
  };

  const updateProfile = (updates: Partial<GroupThreeState["publicProfile"]>) => {
    setState((prev) => ({ ...prev, publicProfile: { ...prev.publicProfile, ...updates } }));
    setErrors((prev) => { const copy = { ...prev }; Object.keys(updates).forEach((k) => delete copy[k]); return copy; });
  };

  const updateDocs = (updates: Partial<GroupThreeState["documents"]>) => {
    setState((prev) => ({ ...prev, documents: { ...prev.documents, ...updates } }));
    setErrors((prev) => { const copy = { ...prev }; Object.keys(updates).forEach((k) => delete copy[k]); return copy; });
  };

  const triggerValidationSequence = () => {
    setErrors({});
    try {
      if (currentStep === 8) AvailabilitySchema.parse(state.availability);
      else if (currentStep === 9) PublicProfileSchema.parse(state.publicProfile);
      else if (currentStep === 10) DocumentsSchema.parse(state.documents);
      
      onStepComplete(state);
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path.length > 0) fieldErrors[e.path[0].toString()] = e.message;
        });
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {currentStep === 8 && <AvailabilityStep data={state.availability} onChange={updateAvailability} errors={errors} />}
      {currentStep === 9 && <PublicProfileStep data={state.publicProfile} onChange={updateProfile} errors={errors} />}
      {currentStep === 10 && <DocumentsStep data={state.documents} onChange={updateDocs} errors={errors} />}
      {currentStep === 11 && <ReviewStep globalState={{...globalStatePayload, group3: state}} onNavigateToStep={onNavigateToStep} />}

      <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
        <button type="button" onClick={onStepBack} className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          Back
        </button>
        <button
          type="button"
          onClick={currentStep === 11 ? onSubmitToBackend : triggerValidationSequence}
          className={`px-6 py-2.5 text-white text-sm font-bold rounded-lg transition-all shadow-sm ${
            currentStep === 11 ? "bg-emerald-600 hover:bg-emerald-700 active:scale-98" : "bg-primary-500 hover:bg-primary-600 active:scale-98"
          }`}
        >
          {currentStep === 11 ? "Confirm & Launch System" : "Continue"}
        </button>
      </div>
    </div>
  );
}
