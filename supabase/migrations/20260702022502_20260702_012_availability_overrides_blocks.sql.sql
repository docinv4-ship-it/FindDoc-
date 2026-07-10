-- Availability Overrides Table
CREATE TABLE IF NOT EXISTS availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_overrides_clinic_date ON availability_overrides(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_date ON availability_overrides(date);

-- Enable RLS
ALTER TABLE availability_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for availability_overrides
CREATE POLICY "select_own_overrides" ON availability_overrides FOR SELECT
  TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE doctor_id = auth.uid())
  );

CREATE POLICY "insert_own_overrides" ON availability_overrides FOR INSERT
  TO authenticated WITH CHECK (
    clinic_id IN (SELECT id FROM clinics WHERE doctor_id = auth.uid())
  );

CREATE POLICY "update_own_overrides" ON availability_overrides FOR UPDATE
  TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE doctor_id = auth.uid())
  );

CREATE POLICY "delete_own_overrides" ON availability_overrides FOR DELETE
  TO authenticated USING (
    clinic_id IN (SELECT id FROM clinics WHERE doctor_id = auth.uid())
  );

-- User Blocks Table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  blocker_type TEXT NOT NULL CHECK (blocker_type IN ('doctor', 'patient')),
  blocker_id UUID NOT NULL,
  blocked_user_id UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'no_reason',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, blocker_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_conversation ON user_blocks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_type, blocker_id);

-- Enable RLS
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_blocks
CREATE POLICY "select_own_blocks" ON user_blocks FOR SELECT
  TO authenticated USING (
    (blocker_type = 'doctor' AND blocker_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR
    (blocker_type = 'patient' AND blocker_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  );

CREATE POLICY "insert_own_blocks" ON user_blocks FOR INSERT
  TO authenticated WITH CHECK (
    (blocker_type = 'doctor' AND blocker_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR
    (blocker_type = 'patient' AND blocker_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  );

CREATE POLICY "delete_own_blocks" ON user_blocks FOR DELETE
  TO authenticated USING (
    (blocker_type = 'doctor' AND blocker_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR
    (blocker_type = 'patient' AND blocker_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  );

-- Add appointment reference ID generation function
CREATE OR REPLACE FUNCTION generate_booking_reference(appointment_id UUID, created_at TIMESTAMPTZ)
RETURNS TEXT AS $$
BEGIN
  RETURN 'DF-' || 
    LPAD(EXTRACT(EPOCH FROM created_at)::BIGINT::TEXT, 8, '0') || 
    '-' || 
    UPPER(SUBSTRING(appointment_id::TEXT, 1, 6));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add column to appointments for reference ID if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN reference_id TEXT;
  END IF;
END $$;

-- Add delivery status to messages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'delivery_status'
  ) THEN
    ALTER TABLE messages ADD COLUMN delivery_status TEXT DEFAULT 'delivered' CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed'));
  END IF;
END $$;

-- Notification retention cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND is_read = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add support for message attachments metadata
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE messages ADD COLUMN attachments TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Add message size limit check
ALTER TABLE messages DROP CONSTRAINT IF EXISTS message_content_length_check;
ALTER TABLE messages ADD CONSTRAINT message_content_length_check CHECK (LENGTH(content) <= 10000);

-- Clinic slug uniqueness validation function
CREATE OR REPLACE FUNCTION validate_clinic_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM clinics
      WHERE slug = NEW.slug
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Clinic slug must be unique';
    END IF;
    IF NEW.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
      RAISE EXCEPTION 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_slugs ON clinics;
CREATE TRIGGER validate_slugs BEFORE INSERT OR UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION validate_clinic_slug();

-- Soft delete support for doctors and patients
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doctors' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE doctors ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE patients ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clinics' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE clinics ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;
