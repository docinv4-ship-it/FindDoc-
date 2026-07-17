"use client";

import { useState, useEffect } from "react";
import { ZodError } from "zod";
import {
  LocationOpsSchema,
  ClinicDetailsSchema,
  ConsultationSchema,
  GroupTwoState,
} from "@/lib/validation/onboarding-group2";
import LocationOpsStep from "./LocationOpsStep";
import ClinicDetailsStep from "./ClinicDetailsStep";
import ConsultationStep from "./ConsultationStep";

const GROUP2_DRAFT_KEY = "doctor_onboarding_group2_draft";

const defaultGroupTwoState: GroupTwoState = {
  locationOps: {
    latitude: 0,
    longitude: 0,
    resolvedAddress: "",
    isManualOverride: false,
  },
  clinicDetails: {
    images: [],
    languages: ["English"],
  },
  consultation: {
    currency: "USD",
    consultationFee: 0,
    slotSizeMinutes: "30",
  },
};

interface GroupTwoControllerProps {
  currentStep: number; // Expects values 5, 6, or 7
  onStepComplete: (groupData: GroupTwoState) => void;
  onStepBack: () => void;
  initialServerData?: Partial<GroupTwoState>;
}

export default function GroupTwoController({
  currentStep,
  onStepComplete,
  onStepBack,
  initialServerData,
}: GroupTwoControllerProps) {
  const [state, setState] = useState<GroupTwoState>(defaultGroupTwoState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GROUP2_DRAFT_KEY);
      const parsed = stored ? JSON.parse(stored) : null;

      setState({
        locationOps: {
          ...defaultGroupTwoState.locationOps,
          ...(initialServerData?.locationOps || {}),
          ...(parsed?.locationOps || {}),
        },
        clinicDetails: {
          ...defaultGroupTwoState.clinicDetails,
          ...(initialServerData?.clinicDetails || {}),
          ...(parsed?.clinicDetails || {}),
        },
        consultation: {
          ...defaultGroupTwoState.consultation,
          ...(initialServerData?.consultation || {}),
          ...(parsed?.consultation || {}),
        },
      });
    } catch (e) {
      console.error("Failed to restore Group 2 draft footprint", e);
    }
  }, [initialServerData]);

  useEffect(() => {
    if (state !== defaultGroupTwoState) {
      localStorage.setItem(GROUP2_DRAFT_KEY, JSON.stringify(state));
    }
  }, [state]);

  const updateLocationOps = (updates: Partial<GroupTwoState["locationOps"]>) => {
    setState((prev) => ({ ...prev, locationOps: { ...prev.locationOps, ...updates } }));
    setErrors((prev) => {
      const copy = { ...prev };
      Object.keys(updates).forEach((k) => delete copy[k]);
      return copy;
    });
  };

  const updateClinicDetails = (updates: Partial<GroupTwoState["clinicDetails"]>) => {
    setState((prev) => ({ ...prev, clinicDetails: { ...prev.clinicDetails, ...updates } }));
    setErrors((prev) => {
      const copy = { ...prev };
      Object.keys(updates).forEach((k) => delete copy[k]);
      return copy;
    });
  };

  const updateConsultation = (updates: Partial<GroupTwoState["consultation"]>) => {
    setState((prev) => ({ ...prev, consultation: { ...prev.consultation, ...updates } }));
    setErrors((prev) => {
      const copy = { ...prev };
      Object.keys(updates).forEach((k) => delete copy[k]);
      return copy;
    });
  };

  const triggerValidationSequence = () => {
    setErrors({});
    try {
      if (currentStep === 5) {
        LocationOpsSchema.parse(state.locationOps);
      } else if (currentStep === 6) {
        ClinicDetailsSchema.parse(state.clinicDetails);
      } else if (currentStep === 7) {
        ConsultationSchema.parse(state.consultation);
      }
      onStepComplete(state);
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path.length > 0) {
            fieldErrors[e.path[0].toString()] = e.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {currentStep === 5 && (
        <LocationOpsStep data={state.locationOps} onChange={updateLocationOps} errors={errors} />
      )}
      {currentStep === 6 && (
        <ClinicDetailsStep data={state.clinicDetails} onChange={updateClinicDetails} errors={errors} />
      )}
      {currentStep === 7 && (
        <ConsultationStep data={state.consultation} onChange={updateConsultation} errors={errors} />
      )}

      <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
        <button
          type="button"
          onClick={onStepBack}
          className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={triggerValidationSequence}
          className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 active:scale-98 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
        >
          {currentStep === 7 ? "Complete Group 2 Setup" : "Continue"}
        </button>
      </div>
    </div>
  );
}
