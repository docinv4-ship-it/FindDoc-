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

export interface LocationState {
  country: string;
  state: string;
  city: string;
  address: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  timezone: string;
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

export interface AvailabilityDay {
  enabled: boolean;
  start: string;
  end: string;
}

export interface BreakItem {
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

export interface VerificationDoc {
  type: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export const daysOfWeek = [
  { id: 0, name: "Monday" },
  { id: 1, name: "Tuesday" },
  { id: 2, name: "Wednesday" },
  { id: 3, name: "Thursday" },
  { id: 4, name: "Friday" },
  { id: 5, name: "Saturday" },
  { id: 6, name: "Sunday" },
];
