import { z } from "zod";

export const LocationOpsSchema = z.object({
  latitude: z.number({ required_error: "Latitude is required" }).min(-90).max(90),
  longitude: z.number({ required_error: "Longitude is required" }).min(-180).max(180),
  resolvedAddress: z.string().min(5, "A valid resolved address is required from geolocation"),
  isManualOverride: z.boolean().default(false),
});

export const ClinicDetailsSchema = z.object({
  images: z.array(z.string()).min(1, "At least one clinic image is required"),
  languages: z.array(z.string()).min(1, "Select at least one language for consultation"),
});

export const ConsultationSchema = z.object({
  currency: z.string().min(1, "Currency selection is required"),
  consultationFee: z.number({ invalid_type_error: "Fee must be a valid number" }).min(0, "Fee cannot be negative"),
  slotSizeMinutes: z.enum(["15", "30", "45", "60"], {
    required_error: "Please select a standard consultation slot duration",
  }),
});

export type LocationOpsData = z.infer<typeof LocationOpsSchema>;
export type ClinicDetailsData = z.infer<typeof ClinicDetailsSchema>;
export type ConsultationData = z.infer<typeof ConsultationSchema>;

export interface GroupTwoState {
  locationOps: LocationOpsData;
  clinicDetails: ClinicDetailsData;
  consultation: ConsultationData;
}
