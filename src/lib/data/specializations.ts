export interface SpecializationGroup {
  label: string;
  options: string[];
}

export const SPECIALIZATION_GROUPS: SpecializationGroup[] = [
  {
    label: "General & Family Medicine",
    options: [
      "General Physician",
      "Family Medicine",
      "Internal Medicine",
    ],
  },
  {
    label: "Pediatrics & Neonatology",
    options: [
      "Pediatrician",
      "Neonatologist",
    ],
  },
  {
    label: "Cardiology & Cardiac Surgery",
    options: [
      "Cardiologist",
      "Cardiac Surgeon",
    ],
  },
  {
    label: "Dentistry",
    options: [
      "Dentist",
      "Orthodontist",
      "Oral & Maxillofacial Surgeon",
      "Periodontist",
      "Endodontist",
    ],
  },
  {
    label: "Women's Health & Fertility",
    options: [
      "Gynecologist",
      "Obstetrician",
      "Fertility Specialist (IVF)",
    ],
  },
  {
    label: "Orthopedics & Spine",
    options: [
      "Orthopedic Surgeon",
      "Spine Specialist",
    ],
  },
  {
    label: "Neurology & Neurosurgery",
    options: [
      "Neurologist",
      "Neurosurgeon",
    ],
  },
  {
    label: "Dermatology & Cosmetology",
    options: [
      "Dermatologist",
      "Cosmetologist",
    ],
  },
  {
    label: "Eye Care",
    options: [
      "Ophthalmologist",
      "Optometrist",
    ],
  },
  {
    label: "ENT & Audiology",
    options: [
      "ENT Specialist",
      "Audiologist",
    ],
  },
  {
    label: "Mental Health",
    options: [
      "Psychiatrist",
      "Psychologist",
    ],
  },
  {
    label: "Oncology",
    options: [
      "Oncologist",
      "Radiation Oncologist",
    ],
  },
  {
    label: "Respiratory & Pulmonary",
    options: [
      "Pulmonologist",
    ],
  },
  {
    label: "Kidney & Digestive",
    options: [
      "Nephrologist",
      "Gastroenterologist",
      "Hepatologist",
    ],
  },
  {
    label: "Endocrinology & Hormones",
    options: [
      "Endocrinologist",
    ],
  },
  {
    label: "Urology & Surgery",
    options: [
      "Urologist",
      "General Surgeon",
      "Plastic Surgeon",
      "Vascular Surgeon",
    ],
  },
  {
    label: "Emergency & Critical Care",
    options: [
      "Emergency Medicine Specialist",
      "Anesthesiologist",
      "Critical Care Specialist",
    ],
  },
  {
    label: "Rehabilitation & Therapy",
    options: [
      "Physiotherapist",
      "Occupational Therapist",
      "Speech Therapist",
    ],
  },
  {
    label: "Nutrition & Diet",
    options: [
      "Nutritionist/Dietitian",
    ],
  },
  {
    label: "Diagnostics & Lab",
    options: [
      "Radiologist",
      "Pathologist",
    ],
  },
  {
    label: "Infectious Disease & Immunity",
    options: [
      "Infectious Disease Specialist",
      "Rheumatologist",
      "Allergy & Immunology Specialist",
    ],
  },
  {
    label: "Sports & Pain Management",
    options: [
      "Sports Medicine Specialist",
      "Pain Management Specialist",
    ],
  },
];

export const ALL_SPECIALIZATIONS: string[] = SPECIALIZATION_GROUPS.flatMap(
  (g) => g.options
);

export const OTHER_SPECIALIZATION = "Other (Custom)";
