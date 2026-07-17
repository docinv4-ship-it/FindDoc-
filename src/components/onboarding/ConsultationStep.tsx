"use client";

import { useId } from "react";
import { DollarSign, Clock } from "lucide-react";
import { ConsultationData } from "@/lib/validation/onboarding-group2";

interface ConsultationStepProps {
  data: ConsultationData;
  onChange: (updates: Partial<ConsultationData>) => void;
  errors: Record<string, string>;
}

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "PKR", symbol: "Rs" },
  { code: "AED", symbol: "AED" },
  { code: "SAR", symbol: "SR" },
];

const SLOT_SIZES = [
  { value: "15", label: "15 Minutes" },
  { value: "30", label: "30 Minutes" },
  { value: "45", label: "45 Minutes" },
  { value: "60", label: "1 Hour" },
];

export default function ConsultationStep({ data, onChange, errors }: ConsultationStepProps) {
  const currencyId = useId();
  const feeId = useId();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Financial & Allocation Parameters</h2>
        <p className="text-sm text-gray-500">Configure global transaction configurations and strict calendar session sizing rules.</p>
      </div>

      <div className="space-y-5">
        {/* Currency & Fee Setup */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor={currencyId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Currency
            </label>
            <select
              id={currencyId}
              value={data.currency}
              onChange={(e) => onChange({ currency: e.target.value })}
              className={`w-full px-3 py-2.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.currency ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
            >
              <option value="">Select Code</option>
              {CURRENCIES.map((cur) => (
                <option key={cur.code} value={cur.code}>
                  {cur.code} ({cur.symbol})
                </option>
              ))}
            </select>
            {errors.currency && <p className="text-xs text-red-500 mt-1 font-medium">{errors.currency}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor={feeId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Consultation Base Rate
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id={feeId}
                type="number"
                min="0"
                value={data.consultationFee === undefined || isNaN(data.consultationFee) ? "" : data.consultationFee}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                  onChange({ consultationFee: val });
                }}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  errors.consultationFee ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
                }`}
                placeholder="50"
              />
            </div>
            {errors.consultationFee && <p className="text-xs text-red-500 mt-1 font-medium">{errors.consultationFee}</p>}
          </div>
        </div>

        {/* Slot Duration Grid Selection */}
        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-semibold text-gray-700">Adaptive Calendar Slot Sizing</label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SLOT_SIZES.map((slot) => {
              const isSelected = data.slotSizeMinutes === slot.value;
              return (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => onChange({ slotSizeMinutes: slot.value as "15" | "30" | "45" | "60" })}
                  className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                    isSelected
                      ? "bg-primary-50 border-primary-500 ring-2 ring-primary-200 text-primary-900 font-bold"
                      : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600 font-medium"
                  }`}
                >
                  <span className="text-sm">{slot.label}</span>
                </button>
              );
            })}
          </div>
          {errors.slotSizeMinutes && <p className="text-xs text-red-500 mt-2 font-medium">{errors.slotSizeMinutes}</p>}
        </div>
      </div>
    </div>
  );
}
