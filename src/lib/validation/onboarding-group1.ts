import { z } from "zod";
import { OTHER_SPECIALIZATION } from "@/lib/data/specializations";

export const BasicInfoSchema = z.object({
  clinicName: z.string().min(2, "Clinic name must be at least 2 characters").max(100),
  doctorName: z.string().min(2, "Doctor name must be at least 2 characters").max(100),
  specialization: z.string().min(1, "Specialization is required"),
  customSpecialization: z.string().optional(),
  qualification: z.string().min(2, "Qualification details are required"),
  experienceYears: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Experience must be a non-negative number",
    }),
  registrationNumber: z.string().min(3, "Valid registration or license number is required"),
}).superRefine((data, ctx) => {
  if (data.specialization === OTHER_SPECIALIZATION && (!data.customSpecialization || data.customSpecialization.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify your custom specialization",
      path: ["customSpecialization"],
    });
  }
});

export const ContactSchema = z.object({
  mobile: z.string().min(7, "Enter a valid phone/mobile number"),
  email: z.string().email("Please enter a valid email address"),
  website: z.string().url("Enter a valid URL (including https://)").or(z.literal("")),
  facebook: z.string().url("Enter a valid Facebook URL").or(z.literal("")),
  instagram: z.string().url("Enter a valid Instagram URL").or(z.literal("")),
  linkedin: z.string().url("Enter a valid LinkedIn URL").or(z.literal("")),
  whatsapp: z.string().min(7, "Enter a valid WhatsApp number").or(z.literal("")),
});

export const LocationSchema = z.object({
  country: z.string().min(1, "Country is required"),
  state: z.string().optional(),
  city: z.string().min(1, "City is required"),
  address: z.string().min(5, "Full street address must be at least 5 characters"),
  postalCode: z.string().optional(),
  latitude: z
    .string()
    .refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) >= -90 && Number(val) <= 90), {
      message: "Latitude must be between -90 and 90",
    })
    .optional(),
  longitude: z
    .string()
    .refine((val) => val === "" || (!isNaN(Number(val)) && Number(val) >= -180 && Number(val) <= 180), {
      message: "Longitude must be between -180 and 180",
    })
    .optional(),
});

export type BasicInfoData = z.infer<typeof BasicInfoSchema>;
export type ContactData = z.infer<typeof ContactSchema>;
export type LocationData = z.infer<typeof LocationSchema>;

export interface GroupOneState {
  basicInfo: BasicInfoData;
  contact: ContactData;
  location: LocationData;
}
