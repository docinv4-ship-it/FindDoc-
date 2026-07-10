-- Add slug to clinics for public links
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);

-- Add social media fields to doctors
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add certificates/verification fields to doctors
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificates TEXT[];
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Add gallery to clinics
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS gallery_images TEXT[];

-- Add holiday/leave table
CREATE TABLE IF NOT EXISTS doctor_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_all_day BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holidays_clinic ON doctor_holidays(clinic_id);
CREATE INDEX IF NOT EXISTS idx_holidays_dates ON doctor_holidays(clinic_id, start_date, end_date);

-- Add reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_doctor ON reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_patient ON reviews(patient_id);

-- Add patient favorites table
CREATE TABLE IF NOT EXISTS patient_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_patient ON patient_favorites(patient_id);
CREATE INDEX IF NOT EXISTS idx_favorites_doctor ON patient_favorites(doctor_id);

-- RLS for new tables
ALTER TABLE doctor_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_holidays_clinic" ON doctor_holidays FOR SELECT
  TO authenticated USING (clinic_id IN (SELECT id FROM clinics WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())));

CREATE POLICY "insert_holidays_clinic" ON doctor_holidays FOR INSERT
  TO authenticated WITH CHECK (clinic_id IN (SELECT id FROM clinics WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())));

CREATE POLICY "delete_holidays_clinic" ON doctor_holidays FOR DELETE
  TO authenticated USING (clinic_id IN (SELECT id FROM clinics WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())));

CREATE POLICY "select_reviews_public" ON reviews FOR SELECT
  TO public USING (true);

CREATE POLICY "insert_reviews_patient" ON reviews FOR INSERT
  TO authenticated WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "select_favorites_patient" ON patient_favorites FOR SELECT
  TO authenticated USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "insert_favorites_patient" ON patient_favorites FOR INSERT
  TO authenticated WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "delete_favorites_patient" ON patient_favorites FOR DELETE
  TO authenticated USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- Broadcast messages table
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_broadcast_doctor ON broadcast_messages(doctor_id);
