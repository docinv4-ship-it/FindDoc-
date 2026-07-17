// app/doctor/onboarding/types.ts

export interface BasicInfo {
  clinicName: string;
  doctorName: string;
  specialization: string;
  customSpecialization: string;
  qualification: string;
  experienceYears: string;
  registrationNumber: string;
}

export interface Contact {
  mobile: string;
  email: string;
  website: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  whatsapp: string;
}

export interface Location {
  country: string;
  state: string;
  city: string;
  address: string;
  postalCode: string;
  latitude: string;
  longitude: string;
}

export interface ClinicDetails {
  about: string;
  logoUrl: string;
  coverImageUrl: string;
  galleryImages: string[];
  languagesSpoken: string[];
}

export interface Consultation {
  fee: string;
  consultationType: "in_person" | "online" | "both";
  slotDuration: string;
  bufferTime: string;
  bookingMode: "auto" | "manual";
}

export interface DayAvailability {
  enabled: boolean;
  start: string;
  end: string;
}

export interface BreakTime {
  day: number;
  start: string;
  end: string;
  title: string;
}

export interface PublicProfile {
  slug: string;
  bio: string;
  services: string[];
  facilities: string[];
}

export interface VerificationDocument {
  type: "license" | "id_card" | "clinic_proof" | "certificate" | "other";
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}
