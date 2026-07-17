"use client";

import { ChangeEvent } from "react";
import { UploadCloud, X, Languages } from "lucide-react";
import { ClinicDetailsData } from "@/lib/validation/onboarding-group2";

interface ClinicDetailsStepProps {
  data: ClinicDetailsData;
  onChange: (updates: Partial<ClinicDetailsData>) => void;
  errors: Record<string, string>;
}

const AVAILABLE_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "ar", label: "Arabic" },
  { id: "ur", label: "Urdu" },
  { id: "hi", label: "Hindi" },
  { id: "fr", label: "French" },
];

export default function ClinicDetailsStep({ data, onChange, errors }: ClinicDetailsStepProps) {

  // 🟢 FIXED: Handled multiple async files flawlessly using Promise.all
  const handleImageConversion = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);

    try {
      const base64Results = await Promise.all(
        filesArray.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result);
              } else {
                reject(new Error("Conversion failed"));
              }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });
        })
      );

      // Updates state once with all newly converted images appended safely
      onChange({ images: [...(data.images || []), ...base64Results] });
    } catch (error) {
      console.error("Media Engine Upload Error:", error);
    }
  };

  // 🟢 FIXED: Added safety fallback to prevent errors if data.images is undefined
  const removeImageIndex = (indexToRemove: number) => {
    const currentImages = data.images || [];
    onChange({ images: currentImages.filter((_, idx) => idx !== indexToRemove) });
  };

  const toggleLanguageItem = (langLabel: string) => {
    const currentList = data.languages || [];
    if (currentList.includes(langLabel)) {
      onChange({ languages: currentList.filter((item) => item !== langLabel) });
    } else {
      onChange({ languages: [...currentList, langLabel] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Clinic Media & Language Engine</h2>
        <p className="text-sm text-gray-500">Inject raw media representations and structural dialect sets for localization targeting.</p>
      </div>

      <div className="space-y-5">
        {/* Dynamic Image Upload Grid */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Clinic Operations Media (Minimum 1 Required)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {data.images?.map((base64Url, index) => (
              <div key={index} className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 group bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={base64Url} alt={`Clinic upload view ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImageIndex(index)}
                  className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-primary-400 transition-all p-4 text-center">
              <UploadCloud className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs font-semibold text-gray-700">Upload Assets</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageConversion}
              />
            </label>
          </div>
          {errors.images && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.images}</p>}
        </div>

        {/* Language Multi-Select UI Chips */}
        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-semibold text-gray-700">Supported Consultation Dialects</label>
          </div>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_LANGUAGES.map((language) => {
              const isSelected = data.languages?.includes(language.label);
              return (
                <button
                  key={language.id}
                  type="button"
                  onClick={() => toggleLanguageItem(language.label)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
                    isSelected
                      ? "bg-primary-500 border-primary-600 text-white shadow-xs"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {language.label}
                </button>
              );
            })}
          </div>
          {errors.languages && <p className="text-xs text-red-500 mt-2 font-medium">{errors.languages}</p>}
        </div>
      </div>
    </div>
  );
}
