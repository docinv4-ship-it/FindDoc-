-- Add missing notification types to the notifications table constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'appointment_confirmed',
    'appointment_pending', 
    'appointment_rejected',
    'appointment_cancelled',
    'appointment_completed',
    'appointment_no_show',
    'appointment_rescheduled',
    'appointment_reminder_24h',
    'appointment_reminder_2h',
    'new_message',
    'chat_reply',
    'doctor_verified',
    'review_submitted',
    'subscription_updated',
    'featured_status'
  ));

-- Fix availability_overrides table structure to match expected schema
-- The migration used different column names, so we need to verify/rename
DO $$
BEGIN
  -- Check if 'date' column exists, if not rename 'override_date' to 'date'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'availability_overrides' AND column_name = 'date'
  ) THEN
    ALTER TABLE availability_overrides RENAME COLUMN override_date TO date;
  END IF;
END $$;

-- Add is_available column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'availability_overrides' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE availability_overrides ADD COLUMN is_available BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Drop override_type if it exists since we're using is_available boolean
ALTER TABLE availability_overrides DROP COLUMN IF EXISTS override_type;