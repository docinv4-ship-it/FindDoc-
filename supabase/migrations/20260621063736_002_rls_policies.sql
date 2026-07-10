-- Row Level Security Policies for DocFind
-- Defines access control for all core tables

-- ============================================================================
-- DOCTORS RLS POLICIES
-- ============================================================================
CREATE POLICY "doctors_select_own" ON doctors FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "doctors_insert_own" ON doctors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "doctors_update_own" ON doctors FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "doctors_delete_own" ON doctors FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Public read for verified doctors (for search)
CREATE POLICY "doctors_public_read" ON doctors FOR SELECT
  TO public USING (is_verified = true AND deleted_at IS NULL);

-- ============================================================================
-- CLINICS RLS POLICIES
-- ============================================================================
CREATE POLICY "clinics_select_own" ON clinics FOR SELECT
  TO authenticated USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "clinics_insert_own" ON clinics FOR INSERT
  TO authenticated WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "clinics_update_own" ON clinics FOR UPDATE
  TO authenticated USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "clinics_delete_own" ON clinics FOR DELETE
  TO authenticated USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Public read for active clinics
CREATE POLICY "clinics_public_read" ON clinics FOR SELECT
  TO public USING (is_active = true AND deleted_at IS NULL);

-- ============================================================================
-- PATIENTS RLS POLICIES
-- ============================================================================
CREATE POLICY "patients_select_own" ON patients FOR SELECT
  TO authenticated USING ((auth.uid() = user_id) OR (is_guest = true));

CREATE POLICY "patients_insert_own" ON patients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "patients_update_own" ON patients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "patients_delete_own" ON patients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Guest insert policy for booking without account
CREATE POLICY "patients_guest_insert" ON patients FOR INSERT
  TO public WITH CHECK (is_guest = true);

-- ============================================================================
-- AVAILABILITY RLS POLICIES
-- ============================================================================
CREATE POLICY "availability_select_own" ON availability FOR SELECT
  TO authenticated USING (clinic_id IN (SELECT id FROM clinics WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())));

CREATE POLICY "availability_public_read" ON availability FOR SELECT
  TO public USING (is_active = true);

CREATE POLICY "availability_insert_own" ON availability FOR INSERT
  TO authenticated WITH CHECK (clinic_id IN (SELECT id FROM clinics WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())));

CREATE POLICY "availability_update_own" ON availability FOR UPDATE
  TO authenticated USING (clinic_id IN (SELECT id FROM clinics WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())))
  WITH CHECK (clinic_id IN (SELECT id FROM clinics WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())));

CREATE POLICY "availability_delete_own" ON availability FOR DELETE
  TO authenticated USING (clinic_id IN (SELECT id FROM clinics WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())));

-- ============================================================================
-- APPOINTMENTS RLS POLICIES
-- ============================================================================
CREATE POLICY "appointments_select_own" ON appointments FOR SELECT
  TO authenticated USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "appointments_insert_own" ON appointments FOR INSERT
  TO authenticated WITH CHECK (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "appointments_update_own" ON appointments FOR UPDATE
  TO authenticated USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  ) WITH CHECK (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "appointments_delete_own" ON appointments FOR DELETE
  TO authenticated USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- Guest booking policy
CREATE POLICY "appointments_guest_insert" ON appointments FOR INSERT
  TO public WITH CHECK (patient_id IN (SELECT id FROM patients WHERE is_guest = true));

-- ============================================================================
-- CONVERSATIONS RLS POLICIES
-- ============================================================================
CREATE POLICY "conversations_select_own" ON conversations FOR SELECT
  TO authenticated USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "conversations_insert_own" ON conversations FOR INSERT
  TO authenticated WITH CHECK (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "conversations_update_own" ON conversations FOR UPDATE
  TO authenticated USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "conversations_delete_own" ON conversations FOR DELETE
  TO authenticated USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- ============================================================================
-- MESSAGES RLS POLICIES
-- ============================================================================
CREATE POLICY "messages_select_own" ON messages FOR SELECT
  TO authenticated USING (conversation_id IN (
    SELECT id FROM conversations WHERE 
      doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  ));

CREATE POLICY "messages_insert_own" ON messages FOR INSERT
  TO authenticated WITH CHECK (conversation_id IN (
    SELECT id FROM conversations WHERE 
      doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
      OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  ));
