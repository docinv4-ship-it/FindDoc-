/*
# DocFind Onboarding Enhancements & Search/Event/Notification Infrastructure

## Overview
This migration adds comprehensive onboarding fields to doctors and clinics tables,
creates a push_tokens table for PWA push notifications, adds search indexes for
fast doctor/clinic/review queries, creates event triggers for automatic notification
queue insertion, and adds no-show tracking columns to appointments.

## 1. New Columns on `doctors` table
- qualification, experience_years, registration_number, bio, languages_spoken, services_offered, cover_image_url, custom_specialization

## 2. New Columns on `clinics` table
- about, cover_image_url, latitude, longitude, consultation_type, buffer_time_minutes, facilities, languages_spoken, is_featured, account_status

## 3. New Columns on `appointments` table
- no_show_marked_at, no_show_marked_by, completed_at, rescheduled_from, rescheduled_at

## 4. New Table: `push_tokens` for PWA push notifications

## 5. Search and ranking indexes

## 6. Event triggers for automatic notification queue insertion

## 7. Functions: search_doctors, process_notification_queue, update_notification_status, mark_no_show, sync_featured_to_clinics, expire_featured_listings_auto

## 8. Storage bucket for clinic images (public)
*/

-- ============================================================
-- 1. Add columns to doctors table
-- ============================================================

DO $$ BEGIN ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualification text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE doctors ADD COLUMN IF NOT EXISTS registration_number text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE doctors ADD COLUMN IF NOT EXISTS languages_spoken text[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE doctors ADD COLUMN IF NOT EXISTS services_offered text[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE doctors ADD COLUMN IF NOT EXISTS cover_image_url text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE doctors ADD COLUMN IF NOT EXISTS custom_specialization text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- 2. Add columns to clinics table
-- ============================================================

DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS about text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS cover_image_url text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS latitude double precision; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS longitude double precision; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS consultation_type text DEFAULT 'in_person' CHECK (consultation_type IN ('in_person', 'online', 'both')); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS buffer_time_minutes integer DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS facilities text[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS languages_spoken text[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE clinics ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated')); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- 3. Add columns to appointments table
-- ============================================================

DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS no_show_marked_at timestamptz; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS no_show_marked_by text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at timestamptz; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_from jsonb; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ============================================================
-- 4. Create push_tokens table
-- ============================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type text NOT NULL CHECK (user_type IN ('doctor', 'patient')),
  user_id uuid NOT NULL,
  token text NOT NULL,
  endpoint text,
  platform text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(user_type, user_id, is_active) WHERE is_active = true;

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_push_tokens" ON push_tokens;
CREATE POLICY "select_own_push_tokens" ON push_tokens FOR SELECT
  TO authenticated USING (
    (user_type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR (user_type = 'patient' AND user_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "insert_own_push_tokens" ON push_tokens;
CREATE POLICY "insert_own_push_tokens" ON push_tokens
  FOR INSERT TO authenticated WITH CHECK (
    (user_type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR (user_type = 'patient' AND user_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "update_own_push_tokens" ON push_tokens;
CREATE POLICY "update_own_push_tokens" ON push_tokens FOR UPDATE
  TO authenticated USING (
    (user_type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR (user_type = 'patient' AND user_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  ) WITH CHECK (
    (user_type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR (user_type = 'patient' AND user_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "delete_own_push_tokens" ON push_tokens;
CREATE POLICY "delete_own_push_tokens" ON push_tokens FOR DELETE
  TO authenticated USING (
    (user_type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
    OR (user_type = 'patient' AND user_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "all_push_tokens_service" ON push_tokens;
CREATE POLICY "all_push_tokens_service" ON push_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Search and ranking indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_doctors_search_specialization ON doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_search_verified ON doctors(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_doctors_search_onboarded ON doctors(is_onboarded) WHERE is_onboarded = true;
CREATE INDEX IF NOT EXISTS idx_doctors_search_name_gin ON doctors USING gin (to_tsvector('simple', full_name));
CREATE INDEX IF NOT EXISTS idx_doctors_search_spec_gin ON doctors USING gin (to_tsvector('simple', specialization));

CREATE INDEX IF NOT EXISTS idx_clinics_search_city ON clinics(city);
CREATE INDEX IF NOT EXISTS idx_clinics_search_country ON clinics(country);
CREATE INDEX IF NOT EXISTS idx_clinics_search_active ON clinics(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_clinics_search_featured ON clinics(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_clinics_search_name_gin ON clinics USING gin (to_tsvector('simple', name));

CREATE INDEX IF NOT EXISTS idx_reviews_doctor_rating ON reviews(doctor_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_doctor_verified ON reviews(doctor_id, is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_reviews_appointment ON reviews(appointment_id) WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status ON appointments(doctor_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status ON appointments(patient_id, status);

-- ============================================================
-- 6. Sync is_featured from featured_listings to clinics
-- ============================================================

CREATE OR REPLACE FUNCTION sync_featured_to_clinics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE clinics SET is_featured = true
  WHERE doctor_id IN (
    SELECT doctor_id FROM featured_listings
    WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
  ) AND is_featured = false;

  UPDATE clinics SET is_featured = false
  WHERE doctor_id NOT IN (
    SELECT doctor_id FROM featured_listings
    WHERE status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
  ) AND is_featured = true;
END;
$$;

-- ============================================================
-- 7. Ranked doctor search function
-- ============================================================

CREATE OR REPLACE FUNCTION search_doctors(
  p_query text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_specialization text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  doctor_id uuid,
  full_name text,
  specialization text,
  profile_image_url text,
  is_verified boolean,
  is_onboarded boolean,
  clinic_id uuid,
  clinic_name text,
  city text,
  consultation_fee numeric,
  slug text,
  is_featured boolean,
  rating_avg numeric,
  review_count bigint,
  rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      d.id AS doctor_id,
      d.full_name,
      d.specialization,
      d.profile_image_url,
      d.is_verified,
      d.is_onboarded,
      c.id AS clinic_id,
      c.name AS clinic_name,
      c.city,
      c.consultation_fee,
      c.slug,
      COALESCE(c.is_featured, false) AS is_featured,
      COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.doctor_id = d.id AND r.is_verified = true), 0) AS rating_avg,
      (SELECT COUNT(*) FROM reviews r WHERE r.doctor_id = d.id AND r.is_verified = true) AS review_count,
      (CASE WHEN COALESCE(c.is_featured, false) THEN 1000 ELSE 0 END
       + CASE WHEN d.is_verified THEN 100 ELSE 0 END
       + CASE WHEN d.is_onboarded THEN 10 ELSE 0 END
       + CASE WHEN p_query IS NOT NULL AND p_query != '' AND d.full_name ILIKE '%' || p_query || '%' THEN 5 ELSE 0 END
       + CASE WHEN p_query IS NOT NULL AND p_query != '' AND d.specialization ILIKE '%' || p_query || '%' THEN 3 ELSE 0 END
      ) AS rank
    FROM doctors d
    LEFT JOIN clinics c ON c.doctor_id = d.id AND c.is_active = true
    WHERE d.is_onboarded = true
      AND (p_query IS NULL OR p_query = '' OR d.full_name ILIKE '%' || p_query || '%' OR d.specialization ILIKE '%' || p_query || '%' OR c.name ILIKE '%' || p_query || '%')
      AND (p_city IS NULL OR p_city = '' OR c.city ILIKE '%' || p_city || '%')
      AND (p_specialization IS NULL OR p_specialization = '' OR d.specialization = p_specialization OR d.custom_specialization ILIKE '%' || p_specialization || '%')
  )
  SELECT * FROM ranked
  ORDER BY rank DESC, rating_avg DESC, full_name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ============================================================
-- 8. Process notification queue with retry logic
-- ============================================================

CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS TABLE (
  id uuid,
  user_type text,
  user_id uuid,
  notification_type text,
  title text,
  body text,
  data jsonb,
  channels text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE notification_queue
  SET status = 'processing', updated_at = NOW()
  WHERE id IN (
    SELECT id FROM notification_queue
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id, user_type, user_id, notification_type, title, body, data, channels;
END;
$$;

-- ============================================================
-- 9. Update notification status (with retry)
-- ============================================================

CREATE OR REPLACE FUNCTION update_notification_status(
  p_id uuid,
  p_success boolean,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item record;
BEGIN
  SELECT * INTO item FROM notification_queue WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF p_success THEN
    UPDATE notification_queue SET status = 'sent', sent_at = NOW(), last_error = NULL, updated_at = NOW() WHERE id = p_id;
    INSERT INTO notifications (user_id, user_type, type, title, body, data, is_read, read_at)
    VALUES (
      item.user_id,
      CASE WHEN item.user_type = 'admin' THEN 'doctor' ELSE item.user_type END,
      CASE
        WHEN item.notification_type LIKE 'appointment%' THEN item.notification_type
        WHEN item.notification_type LIKE 'review%' THEN 'new_message'
        WHEN item.notification_type LIKE 'featured%' THEN 'appointment_pending'
        WHEN item.notification_type LIKE 'subscription%' THEN 'appointment_pending'
        WHEN item.notification_type LIKE 'verification%' THEN 'appointment_pending'
        WHEN item.notification_type LIKE 'no_show%' THEN 'appointment_cancelled'
        ELSE 'new_message'
      END,
      item.title,
      COALESCE(item.body, ''),
      item.data,
      false,
      NULL
    );
  ELSE
    IF item.retry_count + 1 >= item.max_retries THEN
      UPDATE notification_queue SET status = 'failed', retry_count = retry_count + 1, last_error = p_error, updated_at = NOW() WHERE id = p_id;
    ELSE
      UPDATE notification_queue
      SET status = 'pending', retry_count = retry_count + 1, last_error = p_error,
          next_retry_at = NOW() + (interval '1 minute' * POWER(2, item.retry_count)),
          updated_at = NOW()
      WHERE id = p_id;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 10. Mark appointment as no-show
-- ============================================================

CREATE OR REPLACE FUNCTION mark_no_show(p_appointment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  appt record;
BEGIN
  SELECT * INTO appt FROM appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF appt.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot mark no-show for appointment with status %', appt.status;
  END IF;

  UPDATE appointments
  SET status = 'no_show', no_show_marked_at = NOW(), no_show_marked_by = 'doctor', updated_at = NOW()
  WHERE id = p_appointment_id;

  INSERT INTO events (event_type, actor_type, target_type, target_id, appointment_id, doctor_id, patient_id, clinic_id, metadata)
  VALUES (
    'no_show_marked', 'doctor', 'appointment', p_appointment_id, p_appointment_id,
    appt.doctor_id, appt.patient_id, appt.clinic_id,
    jsonb_build_object('appointment_date', appt.appointment_date, 'start_time', appt.start_time)
  );

  INSERT INTO notification_queue (user_type, user_id, notification_type, title, body, data, channels, status)
  VALUES (
    'patient', appt.patient_id, 'no_show_marked',
    'Appointment Marked as No-Show',
    'Your appointment was marked as a no-show. Please contact the clinic if this is an error.',
    jsonb_build_object('appointment_id', p_appointment_id),
    ARRAY['in_app'], 'pending'
  );
END;
$$;

-- ============================================================
-- 11. Trigger: on appointment insert
-- ============================================================

CREATE OR REPLACE FUNCTION on_appointment_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO events (event_type, actor_type, target_type, target_id, appointment_id, doctor_id, patient_id, clinic_id, metadata)
  VALUES (
    'booking_created', 'patient', 'appointment', NEW.id, NEW.id,
    NEW.doctor_id, NEW.patient_id, NEW.clinic_id,
    jsonb_build_object('appointment_date', NEW.appointment_date, 'start_time', NEW.start_time, 'status', NEW.status)
  );

  INSERT INTO notification_queue (user_type, user_id, notification_type, title, body, data, channels, status)
  VALUES (
    'doctor', NEW.doctor_id,
    CASE WHEN NEW.status = 'confirmed' THEN 'appointment_confirmed' ELSE 'appointment_pending' END,
    CASE WHEN NEW.status = 'confirmed' THEN 'New Appointment Confirmed' ELSE 'New Appointment Request' END,
    'You have a new appointment request.',
    jsonb_build_object('appointment_id', NEW.id, 'appointment_date', NEW.appointment_date, 'start_time', NEW.start_time),
    ARRAY['in_app'], 'pending'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_appointment_created ON appointments;
CREATE TRIGGER trigger_appointment_created AFTER INSERT ON appointments FOR EACH ROW EXECUTE FUNCTION on_appointment_created();

-- ============================================================
-- 12. Trigger: on appointment status change
-- ============================================================

CREATE OR REPLACE FUNCTION on_appointment_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  event_name text;
  notif_type text;
  notif_title text;
  notif_body text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  event_name := CASE NEW.status
    WHEN 'confirmed' THEN 'booking_confirmed'
    WHEN 'cancelled' THEN 'booking_cancelled'
    WHEN 'completed' THEN 'appointment_completed'
    WHEN 'no_show' THEN 'no_show_marked'
    ELSE NULL
  END;

  IF event_name IS NULL THEN RETURN NEW; END IF;

  INSERT INTO events (event_type, actor_type, target_type, target_id, appointment_id, doctor_id, patient_id, clinic_id, metadata)
  VALUES (
    event_name,
    CASE WHEN NEW.status IN ('confirmed', 'completed') THEN 'doctor'::text ELSE 'system'::text END,
    'appointment', NEW.id, NEW.id, NEW.doctor_id, NEW.patient_id, NEW.clinic_id,
    jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'appointment_date', NEW.appointment_date)
  );

  IF NEW.status IN ('confirmed', 'cancelled', 'completed', 'no_show') THEN
    notif_type := CASE NEW.status
      WHEN 'confirmed' THEN 'appointment_confirmed'
      WHEN 'cancelled' THEN 'appointment_cancelled'
      WHEN 'completed' THEN 'appointment_completed'
      WHEN 'no_show' THEN 'appointment_cancelled'
    END;
    notif_title := CASE NEW.status
      WHEN 'confirmed' THEN 'Appointment Confirmed'
      WHEN 'cancelled' THEN 'Appointment Cancelled'
      WHEN 'completed' THEN 'Appointment Completed'
      WHEN 'no_show' THEN 'Appointment Marked as No-Show'
    END;
    notif_body := CASE NEW.status
      WHEN 'confirmed' THEN 'Your appointment has been confirmed.'
      WHEN 'cancelled' THEN 'Your appointment has been cancelled.'
      WHEN 'completed' THEN 'Your appointment has been marked as completed. We would love your feedback!'
      WHEN 'no_show' THEN 'Your appointment was marked as a no-show.'
    END;

    INSERT INTO notification_queue (user_type, user_id, notification_type, title, body, data, channels, status)
    VALUES (
      'patient', NEW.patient_id, notif_type, notif_title, notif_body,
      jsonb_build_object('appointment_id', NEW.id, 'appointment_date', NEW.appointment_date),
      ARRAY['in_app'], 'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_appointment_status_changed ON appointments;
CREATE TRIGGER trigger_appointment_status_changed AFTER UPDATE OF status ON appointments FOR EACH ROW EXECUTE FUNCTION on_appointment_status_changed();

-- ============================================================
-- 13. Trigger: on review submitted
-- ============================================================

CREATE OR REPLACE FUNCTION on_review_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO events (event_type, actor_type, target_type, target_id, doctor_id, patient_id, metadata)
  VALUES (
    'review_submitted', 'patient', 'review', NEW.id,
    NEW.doctor_id, NEW.patient_id,
    jsonb_build_object('rating', NEW.rating, 'appointment_id', NEW.appointment_id)
  );

  INSERT INTO notification_queue (user_type, user_id, notification_type, title, body, data, channels, status)
  VALUES (
    'doctor', NEW.doctor_id, 'new_message',
    'New Review Received',
    'A patient has submitted a review for you.',
    jsonb_build_object('review_id', NEW.id, 'rating', NEW.rating),
    ARRAY['in_app'], 'pending'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_review_submitted ON reviews;
CREATE TRIGGER trigger_review_submitted AFTER INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION on_review_submitted();

-- ============================================================
-- 14. Trigger: on featured listing change
-- ============================================================

CREATE OR REPLACE FUNCTION on_featured_listing_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  event_name text;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
      event_name := 'featured_activated';
    ELSIF NEW.status != 'active' AND OLD IS NOT NULL AND OLD.status = 'active' THEN
      event_name := 'featured_expired';
    ELSE
      event_name := NULL;
    END IF;

    IF event_name IS NOT NULL THEN
      INSERT INTO events (event_type, actor_type, target_type, target_id, doctor_id, metadata)
      VALUES (event_name, 'admin', 'featured_listing', NEW.id, NEW.doctor_id, jsonb_build_object('status', NEW.status, 'expires_at', NEW.expires_at));

      INSERT INTO notification_queue (user_type, user_id, notification_type, title, body, data, channels, status)
      VALUES (
        'doctor', NEW.doctor_id, 'appointment_pending',
        CASE WHEN event_name = 'featured_activated' THEN 'Featured Listing Activated' ELSE 'Featured Listing Expired' END,
        CASE WHEN event_name = 'featured_activated' THEN 'Your featured listing is now active. You will rank higher in search results.' ELSE 'Your featured listing has expired. Renew to maintain boosted ranking.' END,
        jsonb_build_object('featured_id', NEW.id, 'expires_at', NEW.expires_at),
        ARRAY['in_app'], 'pending'
      );
    END IF;

    PERFORM sync_featured_to_clinics();
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM sync_featured_to_clinics();
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_featured_listing_changed ON featured_listings;
CREATE TRIGGER trigger_featured_listing_changed AFTER INSERT OR UPDATE OR DELETE ON featured_listings FOR EACH ROW EXECUTE FUNCTION on_featured_listing_changed();

-- ============================================================
-- 15. Trigger: on verification status change
-- ============================================================

CREATE OR REPLACE FUNCTION on_verification_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO events (event_type, actor_type, target_type, target_id, doctor_id, metadata)
    VALUES ('doctor_verified', 'admin', 'verification_request', NEW.id, NEW.doctor_id, jsonb_build_object('status', NEW.status));

    INSERT INTO notification_queue (user_type, user_id, notification_type, title, body, data, channels, status)
    VALUES (
      'doctor', NEW.doctor_id, 'appointment_confirmed',
      'Verification Approved',
      'Your verification has been approved. You are now a verified doctor on DocFind.',
      jsonb_build_object('verification_id', NEW.id),
      ARRAY['in_app'], 'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_verification_status_changed ON verification_requests;
CREATE TRIGGER trigger_verification_status_changed AFTER UPDATE OF status ON verification_requests FOR EACH ROW EXECUTE FUNCTION on_verification_status_changed();

-- ============================================================
-- 16. Trigger: on subscription change
-- ============================================================

CREATE OR REPLACE FUNCTION on_subscription_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = OLD.status AND NEW.plan_id IS NOT DISTINCT FROM OLD.plan_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO events (event_type, actor_type, target_type, target_id, doctor_id, metadata)
  VALUES (
    'subscription_changed',
    CASE WHEN NEW.status IN ('cancelled', 'expired') THEN 'doctor' ELSE 'system' END,
    'doctor_subscription', NEW.id, NEW.doctor_id,
    jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'plan_id', NEW.plan_id)
  );

  INSERT INTO notification_queue (user_type, user_id, notification_type, title, body, data, channels, status)
  VALUES (
    'doctor', NEW.doctor_id, 'appointment_pending',
    'Subscription Updated',
    'Your subscription status has been updated to: ' || NEW.status,
    jsonb_build_object('subscription_id', NEW.id, 'status', NEW.status),
    ARRAY['in_app'], 'pending'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_subscription_changed ON doctor_subscriptions;
CREATE TRIGGER trigger_subscription_changed AFTER UPDATE OF status, plan_id ON doctor_subscriptions FOR EACH ROW EXECUTE FUNCTION on_subscription_changed();

-- ============================================================
-- 17. Auto-expire featured listings
-- ============================================================

CREATE OR REPLACE FUNCTION expire_featured_listings_auto()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE featured_listings SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW();
  PERFORM sync_featured_to_clinics();
END;
$$;

-- ============================================================
-- 18. Storage bucket for clinic images (public)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-images', 'clinic-images', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "select_clinic_images_public" ON storage.objects;
CREATE POLICY "select_clinic_images_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'clinic-images');

DROP POLICY IF EXISTS "insert_own_clinic_images" ON storage.objects;
CREATE POLICY "insert_own_clinic_images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'clinic-images'
    AND (storage.foldername(name))[1] IN (SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_clinic_images" ON storage.objects;
CREATE POLICY "update_own_clinic_images" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'clinic-images'
    AND (storage.foldername(name))[1] IN (SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid())
  ) WITH CHECK (
    bucket_id = 'clinic-images'
    AND (storage.foldername(name))[1] IN (SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_clinic_images" ON storage.objects;
CREATE POLICY "delete_own_clinic_images" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'clinic-images'
    AND (storage.foldername(name))[1] IN (SELECT d.id::text FROM doctors d WHERE d.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "all_clinic_images_service" ON storage.objects;
CREATE POLICY "all_clinic_images_service" ON storage.objects FOR ALL
  TO service_role USING (bucket_id = 'clinic-images') WITH CHECK (bucket_id = 'clinic-images');

-- ============================================================
-- 19. Update updated_at trigger for push_tokens
-- ============================================================

DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 20. Run initial featured sync
-- ============================================================

SELECT sync_featured_to_clinics();
