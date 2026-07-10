import { createClient } from "@/lib/supabase/server";

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface SlotGeneratorResult {
  slots: AvailableSlot[];
  error?: string;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function isSlotOverlappingBreak(slotStart: number, slotEnd: number, breakStart: number, breakEnd: number): boolean {
  return slotStart < breakEnd && slotEnd > breakStart;
}

export async function generateAvailableSlots(clinicId: string, date: string): Promise<SlotGeneratorResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();

  const dateObj = new Date(date);
  const dayOfWeek = (dateObj.getDay() + 6) % 7;

  const { data: availability, error: availError } = await supabase.from("availability").select("*").eq("clinic_id", clinicId).eq("day_of_week", dayOfWeek).eq("is_active", true);
  if (availError) return { slots: [], error: "Failed to fetch availability" };
  if (!availability || availability.length === 0) return { slots: [], error: "No availability for this day" };

  const { data: clinicData } = await supabase.from("clinics").select("slot_duration_minutes").eq("id", clinicId).single();
  const defaultSlotDuration = clinicData?.slot_duration_minutes || 30;

  const { data: breaks } = await supabase.from("doctor_breaks").select("*").eq("clinic_id", clinicId).eq("is_active", true).or(`day_of_week.eq.${dayOfWeek},and(day_of_week.is.null,specific_date.eq.${date}))`);

  const { data: bookedAppointments } = await supabase.from("appointments").select("start_time, end_time").eq("clinic_id", clinicId).eq("appointment_date", date).in("status", ["pending", "confirmed"]);

  const { data: overrides } = await supabase.from("availability_overrides").select("*").eq("clinic_id", clinicId).eq("date", date);

  const breaksList = breaks || [];
  const bookedSlots = bookedAppointments || [];
  const overridesList = overrides || [];
  const allSlots: AvailableSlot[] = [];

  for (const avail of availability) {
    const slotDuration = avail.slot_duration_minutes || defaultSlotDuration;
    const startMinutes = timeToMinutes(avail.start_time);
    const endMinutes = timeToMinutes(avail.end_time);

    for (let current = startMinutes; current < endMinutes; current += slotDuration) {
      const slotStart = current;
      const slotEnd = Math.min(current + slotDuration, endMinutes);
      const slotStartTime = minutesToTime(slotStart);
      const slotEndTime = minutesToTime(slotEnd);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const overlapsBreak = breaksList.some((b: any) => {
        if (b.day_of_week !== dayOfWeek && !(b.specific_date === date)) return false;
        const breakStart = timeToMinutes(b.start_time);
        const breakEnd = timeToMinutes(b.end_time);
        return isSlotOverlappingBreak(slotStart, slotEnd, breakStart, breakEnd);
      });

      if (overlapsBreak) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const overlapsUnavailableOverride = overridesList.some((o: any) => {
        if (o.is_available === true) return false;
        if (!o.start_time || !o.end_time) return false;
        const overrideStart = timeToMinutes(o.start_time);
        const overrideEnd = timeToMinutes(o.end_time);
        return isSlotOverlappingBreak(slotStart, slotEnd, overrideStart, overrideEnd);
      });

      if (overlapsUnavailableOverride) continue;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isBooked = bookedSlots.some((apt: any) => apt.start_time === slotStartTime && apt.end_time === slotEndTime);

      allSlots.push({ start_time: slotStartTime, end_time: slotEndTime, is_available: !isBooked });
    }
  }

  allSlots.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  return { slots: allSlots };
}

export async function getAvailableSlots(clinicId: string, date: string): Promise<AvailableSlot[]> {
  const result = await generateAvailableSlots(clinicId, date);
  return result.slots.filter((s) => s.is_available);
}

export async function isSlotAvailable(clinicId: string, date: string, startTime: string, endTime: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();
  const { data: conflicts } = await supabase.from("appointments").select("id").eq("clinic_id", clinicId).eq("appointment_date", date).eq("start_time", startTime).eq("end_time", endTime).in("status", ["pending", "confirmed"]).maybeSingle();
  return !conflicts;
}
