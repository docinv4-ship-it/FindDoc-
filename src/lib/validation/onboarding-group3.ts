import { z } from "zod";

// --- AVAILABILITY SCHEMA ---
export const TimeSlotSchema = z.object({
  id: z.string(), // Unique ID for React keys
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
}).refine(
  (data) => {
    // Basic validation to ensure start is before end
    if (!data.startTime || !data.endTime) return true;
    return data.startTime < data.endTime;
  },
  { message: "End time must be after start time", path: ["endTime"] }
);

export const DayScheduleSchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  isAvailable: z.boolean(),
  slots: z.array(TimeSlotSchema),
});

export const AvailabilitySchema = z.object({
  schedule: z.array(DayScheduleSchema),
});

// --- PUBLIC PROFILE SCHEMA ---
export const PublicProfileSchema = z.object({
  profileSlug: z.string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  bio: z.string().min(50, "Bio must be at least 50 characters to build trust").max(1000),
  services: z.array(z.string()).min(1, "List at least one core service"),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed for SEO optimization"),
});

// --- DOCUMENTS SCHEMA ---
export const DocumentsSchema = z.object({
  medicalLicense: z.string().min(1, "Medical License document is required for verification"),
  idProof: z.string().min(1, "Government ID proof is required"),
  clinicRegistration: z.string().optional(), // Optional for individual practitioners
});

export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type DaySchedule = z.infer<typeof DayScheduleSchema>;
export type AvailabilityData = z.infer<typeof AvailabilitySchema>;
export type PublicProfileData = z.infer<typeof PublicProfileSchema>;
export type DocumentsData = z.infer<typeof DocumentsSchema>;

export interface GroupThreeState {
  availability: AvailabilityData;
  publicProfile: PublicProfileData;
  documents: DocumentsData;
}
