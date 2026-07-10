-- Add status column to conversations for active/resolved states
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'resolved'::text]));

-- Create notifications table for appointment and chat notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('doctor', 'patient')),
  type TEXT NOT NULL CHECK (type IN ('appointment_confirmed', 'appointment_pending', 'appointment_rejected', 'appointment_cancelled', 'appointment_completed', 'appointment_reminder_24h', 'appointment_reminder_2h', 'new_message', 'chat_reply')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, user_type, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_doctor ON conversations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- Double booking protection: unique constraint on clinic + date + start_time
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_slot ON appointments(clinic_id, appointment_date, start_time) WHERE status IN ('pending', 'confirmed');

-- RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_notifications_doctor" ON notifications FOR SELECT
  TO authenticated USING (user_type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "select_notifications_patient" ON notifications FOR SELECT
  TO authenticated USING (user_type = 'patient' AND user_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_notifications_doctor" ON notifications FOR UPDATE
  TO authenticated USING (user_type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
