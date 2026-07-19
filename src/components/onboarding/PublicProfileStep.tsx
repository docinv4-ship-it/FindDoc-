"use client";

import { useState } from "react";
import { Link, Tags, Stethoscope, X } from "lucide-react";
import { PublicProfileData } from "@/lib/validation/onboarding-group3";

interface PublicProfileStepProps {
  data: PublicProfileData;
  onChange: (updates: Partial<PublicProfileData>) => void;
  errors: Record<string, string>;
}

export default function PublicProfileStep({ data, onChange, errors }: PublicProfileStepProps) {
  const [serviceInput, setServiceInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  // Safe fallbacks to prevent crash if parent data is missing fields
  const currentBio = data?.bio || "";
  const servicesList = data?.services || [];
  const tagsList = data?.tags || [];

  const formatSlug = (val: string) => val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const addArrayItem = (field: "services" | "tags", value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    
    const currentArray = field === "services" ? servicesList : tagsList;
    if (currentArray.includes(trimmed)) return;

    onChange({ [field]: [...currentArray, trimmed] });
    setter("");
  };

  const removeArrayItem = (field: "services" | "tags", index: number) => {
    const currentArray = field === "services" ? servicesList : tagsList;
    onChange({ [field]: currentArray.filter((_, i) => i !== index) });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: "services" | "tags", value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addArrayItem(field, value, setter);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Public Profile Matrix</h2>
        <p className="text-sm text-gray-500">Optimize how patients discover and perceive your expertise.</p>
      </div>

      <div className="space-y-5">
        {/* Auto-Slug Generator */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Profile URL Slug</label>
          <div className="flex rounded-lg shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm">
              <Link className="w-4 h-4 mr-1.5" /> app.lumira.com/
            </span>
            <input
              type="text"
              value={data?.profileSlug || ""}
              onChange={(e) => onChange({ profileSlug: formatSlug(e.target.value) })}
              className={`flex-1 block w-full min-w-0 px-3 py-2.5 rounded-none rounded-r-lg border focus:ring-2 transition-all text-sm ${
                errors.profileSlug ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="dr-john-smith"
            />
          </div>
          {errors.profileSlug && <p className="text-xs text-red-500 mt-1 font-medium">{errors.profileSlug}</p>}
        </div>

        {/* Bio Textarea */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Professional Biography</label>
          <textarea
            value={currentBio}
            onChange={(e) => onChange({ bio: e.target.value })}
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm ${
              errors.bio ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
            }`}
            placeholder="Detail your clinical approach, background, and what makes your practice unique..."
          />
          <div className="flex justify-between mt-1">
            {errors.bio ? (
              <p className="text-xs text-red-500 font-medium">{errors.bio}</p>
            ) : (
              <p className="text-xs text-gray-400">Minimum 50 characters required.</p>
            )}
            {/* 🟢 FIXED: Safe string length tracking without risk of undefined crash */}
            <span className={`text-xs ${currentBio.length < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {currentBio.length}/1000
            </span>
          </div>
        </div>

        {/* Dynamic Services Matrix */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Stethoscope className="w-4 h-4 text-primary-500" /> Core Services Provided
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={serviceInput}
              onChange={(e) => setServiceInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "services", serviceInput, setServiceInput)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Root Canal, Skin Grafting (Press Enter)"
            />
            <button type="button" onClick={() => addArrayItem("services", serviceInput, setServiceInput)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* 🟢 FIXED: Safe array mapping */}
            {servicesList.map((svc, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 text-sm text-gray-700 rounded-full shadow-sm">
                {svc}
                <button type="button" onClick={() => removeArrayItem("services", idx)} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
              </span>
            ))}
          </div>
          {errors.services && <p className="text-xs text-red-500 mt-2 font-medium">{errors.services}</p>}
        </div>

        {/* SEO Tags Matrix */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Tags className="w-4 h-4 text-primary-500" /> Search Optimization Tags
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "tags", tagInput, setTagInput)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Pediatric Dentist, Affordable Clinic"
            />
            <button type="button" onClick={() => addArrayItem("tags", tagInput, setTagInput)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* 🟢 FIXED: Safe array mapping */}
            {tagsList.map((tag, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 border border-primary-100 text-sm text-primary-700 rounded-full">
                #{tag}
                <button type="button" onClick={() => removeArrayItem("tags", idx)} className="text-primary-400 hover:text-primary-600"><X className="w-3.5 h-3.5" /></button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
