"use client";

import { Plus, Trash2, AlertCircle } from "lucide-react";
import { AvailabilityData, DaySchedule, TimeSlot } from "@/lib/validation/onboarding-group3";

interface AvailabilityStepProps {
  data: AvailabilityData;
  onChange: (updates: Partial<AvailabilityData>) => void;
  errors: Record<string, string>;
}

export default function AvailabilityStep({ data, onChange, errors }: AvailabilityStepProps) {

  // Safe fallback to prevent rendering crashes if data structure isn't loaded yet
  const scheduleList = data?.schedule || [];

  const updateDay = (dayName: string, updates: Partial<DaySchedule>) => {
    const newSchedule = scheduleList.map((d) => 
      d.day === dayName ? { ...d, ...updates } : d
    );
    onChange({ schedule: newSchedule });
  };

  const addSlot = (dayName: string) => {
    const day = scheduleList.find(d => d.day === dayName);
    if (!day) return;

    // 🔥 ELON FIX: Using native browser crypto.randomUUID() instead of heavy/buggy npm uuid package
    const generatedId = typeof window !== "undefined" && window.crypto?.randomUUID 
      ? window.crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 11);

    const newSlot: TimeSlot = { id: generatedId, startTime: "09:00", endTime: "17:00" };
    updateDay(dayName, { slots: [...(day.slots || []), newSlot] });
  };

  const updateSlot = (dayName: string, slotId: string, field: "startTime" | "endTime", value: string) => {
    const day = scheduleList.find(d => d.day === dayName);
    if (!day || !day.slots) return;

    const newSlots = day.slots.map(s => s.id === slotId ? { ...s, [field]: value } : s);
    updateDay(dayName, { slots: newSlots });
  };

  const removeSlot = (dayName: string, slotId: string) => {
    const day = scheduleList.find(d => d.day === dayName);
    if (!day || !day.slots) return;
    updateDay(dayName, { slots: day.slots.filter(s => s.id !== slotId) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Weekly Availability Matrix</h2>
        <p className="text-sm text-gray-500">Configure your operational hours. You can add infinite distinct slots (e.g., Morning & Evening shifts).</p>
      </div>

      <div className="space-y-4">
        {/* 🟢 SAFE CHECK: App will never crash even if schedule array takes time to bind */}
        {scheduleList.map((dayObj) => (
          <div key={dayObj?.day} className={`p-4 rounded-xl border transition-all ${dayObj?.isAvailable ? "bg-white border-primary-200 shadow-sm" : "bg-gray-50 border-gray-200"}`}>

            {/* Header: Toggle & Day Name */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={dayObj?.isAvailable || false}
                    onChange={(e) => updateDay(dayObj.day, { isAvailable: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
                <span className={`font-bold ${dayObj?.isAvailable ? "text-gray-900" : "text-gray-400"}`}>{dayObj?.day}</span>
              </div>

              {dayObj?.isAvailable && (
                <button type="button" onClick={() => addSlot(dayObj.day)} className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1 bg-primary-50 px-2.5 py-1.5 rounded-md transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Slot
                </button>
              )}
            </div>

            {/* Slots Grid */}
            {dayObj?.isAvailable && (
              <div className="mt-4 space-y-3 pl-0 sm:pl-14">
                {(!dayObj.slots || dayObj.slots.length === 0) ? (
                  <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> Please add at least one time slot.</p>
                ) : (
                  dayObj.slots.map((slot) => (
                    <div key={slot?.id} className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={slot?.startTime || "09:00"}
                          onChange={(e) => updateSlot(dayObj.day, slot.id, "startTime", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                        />
                        <span className="text-gray-400 font-medium text-xs">to</span>
                        <input
                          type="time"
                          value={slot?.endTime || "17:00"}
                          onChange={(e) => updateSlot(dayObj.day, slot.id, "endTime", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white text-gray-900"
                        />
                      </div>
                      <button type="button" onClick={() => removeSlot(dayObj.day, slot.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
