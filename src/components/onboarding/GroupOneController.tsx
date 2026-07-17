"use client";

import { useState, useEffect } from "react";
import { ZodError } from "zod";
import {
  BasicInfoSchema,
  ContactSchema,
  LocationSchema,
  GroupOneState,
} from "@/lib/validation/onboarding-group1";
import BasicInfoStep from "./BasicInfoStep";
import ContactStep from "./ContactStep";
import LocationStep from "./LocationStep";

const DRAFT_STORAGE_KEY = "doctor_onboarding_group1_draft";

const defaultState: GroupOneState = {
  basicInfo: {
    clinicName: "",
    doctorName: "",
    specialization: "",
    customSpecialization: "",
    qualification: "",
    experienceYears: "",
    registrationNumber: "",
  },
  contact: {
    mobile: "",
    email: "",
    website: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    whatsapp: "",
  },
  // We force the initial location structure
  location: {
    country: "Pakistan",
    countryIso: "PK",
    province: "Khyber Pakhtunkhwa",
    provinceIso: "PK-KP",
    zone: "Kohat",
    streetAddress: "",
    zipCode: "",
    latitude: 33.5889,
    longitude: 71.4429,
    currency: "PKR",
  } as any,
};

interface GroupOneControllerProps {
  currentStep: number;
  onStepComplete: (groupData: GroupOneState) => void;
  onStepBack: () => void;
  initialServerData?: Partial<GroupOneState>;
}

export default function GroupOneController({
  currentStep,
  onStepComplete,
  onStepBack,
  initialServerData,
}: GroupOneControllerProps) {
  const [state, setState] = useState<GroupOneState>(defaultState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      const parsedDraft = savedDraft ? JSON.parse(savedDraft) : null;

      setState({
        basicInfo: {
          ...defaultState.basicInfo,
          ...(initialServerData?.basicInfo || {}),
          ...(parsedDraft?.basicInfo || {}),
        },
        contact: {
          ...defaultState.contact,
          ...(initialServerData?.contact || {}),
          ...(parsedDraft?.contact || {}),
        },
        location: {
          ...defaultState.location,
          ...(initialServerData?.location || {}),
          ...(parsedDraft?.location || {}),
        } as any,
      });
    } catch (err) {
      console.error("Failed to restore onboarding draft state:", err);
    }
  }, [initialServerData]);

  useEffect(() => {
    if (state !== defaultState) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const updateBasicInfo = (updates: Partial<GroupOneState["basicInfo"]>) => {
    setState((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, ...updates } }));
    if (errors) setErrors((prev) => {
      const newErr = { ...prev };
      Object.keys(updates).forEach((k) => delete newErr[k]);
      return newErr;
    });
  };

  const updateContact = (updates: Partial<GroupOneState["contact"]>) => {
    setState((prev) => ({ ...prev, contact: { ...prev.contact, ...updates } }));
    if (errors) setErrors((prev) => {
      const newErr = { ...prev };
      Object.keys(updates).forEach((k) => delete newErr[k]);
      return newErr;
    });
  };

  const updateLocation = (updates: any) => {
    setState((prev) => ({ 
      ...prev, 
      location: { ...prev.location, ...updates } 
    }));
    if (errors) setErrors((prev) => {
      const newErr = { ...prev };
      Object.keys(updates).forEach((k) => delete newErr[k]);
      return newErr;
    });
  };

  const validateAndProceed = () => {
    setErrors({});
    try {
      if (currentStep === 1) {
        BasicInfoSchema.parse(state.basicInfo);
      } else if (currentStep === 2) {
        ContactSchema.parse(state.contact);
      } else if (currentStep === 3) {
        LocationSchema.parse(state.location);
      }
      onStepComplete(state);
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((zodErr) => {
          if (zodErr.path.length > 0) {
            fieldErrors[zodErr.path[0].toString()] = zodErr.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {currentStep === 1 && (
        <BasicInfoStep data={state.basicInfo} onChange={updateBasicInfo} errors={errors} />
      )}
      {currentStep === 2 && (
        <ContactStep data={state.contact} onChange={updateContact} errors={errors} />
      )}
      {currentStep === 3 && (
        // 🟢 FIXED: Forcing the type cast 'as any' to satisfy TypeScript build compiler
        <LocationStep 
          locationData={state.location as any} 
          setLocationData={updateLocation} 
          errors={errors} 
        />
      )}

      <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={onStepBack}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={validateAndProceed}
          className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 active:scale-98 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
        >
          {currentStep === 3 ? "Save & Proceed to Group 2" : "Continue"}
        </button>
      </div>
    </div>
  );
}
