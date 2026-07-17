"use client";

import { useId } from "react";
import { Building2, User, FileText } from "lucide-react";
import SpecializationDropdown from "@/components/SpecializationDropdown";
import { OTHER_SPECIALIZATION } from "@/lib/data/specializations";
import { BasicInfoData } from "@/lib/validation/onboarding-group1";

interface BasicInfoStepProps {
  data: BasicInfoData;
  onChange: (updates: Partial<BasicInfoData>) => void;
  errors: Record<string, string>;
}

export default function BasicInfoStep({ data, onChange, errors }: BasicInfoStepProps) {
  const clinicId = useId();
  const doctorId = useId();
  const qualificationId = useId();
  const expId = useId();
  const regId = useId();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Basic Information</h2>
        <p className="text-sm text-gray-500">Provide details about your clinical presence and credentials.</p>
      </div>

      <div className="space-y-4">
        {/* Clinic Name */}
        <div>
          <label htmlFor={clinicId} className="block text-sm font-semibold text-gray-700 mb-1.5">
            Clinic Name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              id={clinicId}
              type="text"
              value={data.clinicName}
              onChange={(e) => onChange({ clinicName: e.target.value })}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.clinicName ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="HealthCare Medical Center"
            />
          </div>
          {errors.clinicName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.clinicName}</p>}
        </div>

        {/* Doctor Name */}
        <div>
          <label htmlFor={doctorId} className="block text-sm font-semibold text-gray-700 mb-1.5">
            Doctor Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              id={doctorId}
              type="text"
              value={data.doctorName}
              onChange={(e) => onChange({ doctorName: e.target.value })}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.doctorName ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="Dr. John Smith"
            />
          </div>
          {errors.doctorName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.doctorName}</p>}
        </div>

        {/* Specialization */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Specialization</label>
          <SpecializationDropdown
            value={data.specialization}
            customValue={data.customSpecialization || ""}
            onChange={(val) => onChange({ specialization: val })}
            onCustomChange={(val) => onChange({ customSpecialization: val })}
          />
          {errors.specialization && <p className="text-xs text-red-500 mt-1 font-medium">{errors.specialization}</p>}
          {data.specialization === OTHER_SPECIALIZATION && errors.customSpecialization && (
            <p className="text-xs text-red-500 mt-1 font-medium">{errors.customSpecialization}</p>
          )}
        </div>

        {/* Qualification & Experience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={qualificationId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Qualification
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id={qualificationId}
                type="text"
                value={data.qualification}
                onChange={(e) => onChange({ qualification: e.target.value })}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.qualification ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
                }`}
                placeholder="MBBS, MD"
              />
            </div>
            {errors.qualification && <p className="text-xs text-red-500 mt-1 font-medium">{errors.qualification}</p>}
          </div>

          <div>
            <label htmlFor={expId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Experience (Years)
            </label>
            <input
              id={expId}
              type="number"
              min="0"
              max="80"
              value={data.experienceYears}
              onChange={(e) => onChange({ experienceYears: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.experienceYears ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="10"
            />
            {errors.experienceYears && <p className="text-xs text-red-500 mt-1 font-medium">{errors.experienceYears}</p>}
          </div>
        </div>

        {/* License Number */}
        <div>
          <label htmlFor={regId} className="block text-sm font-semibold text-gray-700 mb-1.5">
            Registration / License Number
          </label>
          <input
            id={regId}
            type="text"
            value={data.registrationNumber}
            onChange={(e) => onChange({ registrationNumber: e.target.value })}
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
              errors.registrationNumber ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
            }`}
            placeholder="MD-12345"
          />
          {errors.registrationNumber && <p className="text-xs text-red-500 mt-1 font-medium">{errors.registrationNumber}</p>}
        </div>
      </div>
    </div>
  );
}
