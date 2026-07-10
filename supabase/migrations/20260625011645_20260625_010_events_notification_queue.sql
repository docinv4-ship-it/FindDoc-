-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_type TEXT CHECK (actor_type IN ('doctor', 'patient', 'admin', 'system')),
  actor_id UUID,
  target_type TEXT,
  target_id UUID,
  clinic_id UUID,
  doctor_id UUID,
  patient_id UUID,
  appointment_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('doctor', 'patient', 'admin')),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  channels TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_doctor ON events(doctor_id);
CREATE INDEX IF NOT EXISTS idx_events_patient ON events(patient_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "select_own_events_doc" ON events FOR SELECT TO authenticated
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "select_own_events_pat" ON events FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));
CREATE POLICY "insert_events_auth" ON events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "all_events_svc" ON events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "select_own_notif_queue" ON notification_queue FOR SELECT TO authenticated
  USING ((user_type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())) OR
         (user_type = 'patient' AND user_id IN (SELECT id FROM patients WHERE user_id = auth.uid())));
CREATE POLICY "all_notif_queue_svc" ON notification_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Booking conflict prevention function
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_clinic_id UUID,
  p_appointment_date DATE,
  p_start_time TEXT,
  p_end_time TEXT,
  p_exclude_appointment_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM appointments
  WHERE clinic_id = p_clinic_id
    AND appointment_date = p_appointment_date
    AND status IN ('pending', 'confirmed')
    AND id != COALESCE(p_exclude_appointment_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (start_time < p_end_time AND end_time > p_start_time);
  
  RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
