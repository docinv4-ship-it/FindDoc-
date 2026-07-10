-- Admin roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'viewer')),
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Verification documents table
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('license', 'certificate', 'clinic_proof', 'id_card', 'profile_photo', 'other')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resubmit')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES admin_roles(id),
  reviewed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'resubmit', 'suspended')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES admin_roles(id),
  reviewed_at TIMESTAMPTZ,
  internal_notes TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_roles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_type TEXT NOT NULL CHECK (requester_type IN ('doctor', 'patient', 'guest')),
  requester_id UUID,
  requester_email TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  assigned_to UUID REFERENCES admin_roles(id),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Support ticket messages
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'requester')),
  sender_id UUID,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports/complaints table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_type TEXT NOT NULL CHECK (reporter_type IN ('doctor', 'patient', 'guest', 'system')),
  reporter_id UUID,
  reporter_email TEXT,
  reported_entity_type TEXT NOT NULL CHECK (reported_entity_type IN ('doctor', 'clinic', 'patient', 'review', 'appointment')),
  reported_entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  assigned_to UUID REFERENCES admin_roles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES admin_roles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
('maintenance_mode', 'false'::jsonb, 'Enable maintenance mode'),
('registration_enabled', 'true'::jsonb, 'Allow new registrations'),
('featured_price_monthly', '9.99'::jsonb, 'Monthly price for featured listing'),
('featured_price_yearly', '99'::jsonb, 'Yearly price for featured listing'),
('max_file_upload_size', '10485760'::jsonb, 'Max file upload size in bytes (10MB)'),
('allowed_file_types', '["image/jpeg", "image/png", "application/pdf"]'::jsonb, 'Allowed file MIME types')
ON CONFLICT (key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_doctor_id ON verification_documents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_status ON verification_documents(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_entity ON reports(reported_entity_type, reported_entity_id);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_roles
CREATE POLICY "select_own_admin_role" ON admin_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "all_admin_roles_service" ON admin_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for verification_documents (private - only admin and owner doctor)
CREATE POLICY "select_own_verification_documents" ON verification_documents FOR SELECT TO authenticated
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "insert_own_verification_documents" ON verification_documents FOR INSERT TO authenticated
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "all_verification_documents_service" ON verification_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for verification_requests
CREATE POLICY "select_own_verification_request" ON verification_requests FOR SELECT TO authenticated
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "insert_own_verification_request" ON verification_requests FOR INSERT TO authenticated
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "all_verification_requests_service" ON verification_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for audit_logs (admin only)
CREATE POLICY "select_audit_logs_service" ON audit_logs FOR SELECT TO service_role USING (true);
CREATE POLICY "insert_audit_logs_service" ON audit_logs FOR INSERT TO service_role WITH CHECK (true);

-- RLS Policies for support_tickets
CREATE POLICY "select_own_support_tickets" ON support_tickets FOR SELECT TO authenticated
  USING (requester_type = 'doctor' AND requester_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR
         requester_type = 'patient' AND requester_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));
CREATE POLICY "insert_support_tickets_authenticated" ON support_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "all_support_tickets_service" ON support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for support_ticket_messages
CREATE POLICY "select_own_ticket_messages" ON support_ticket_messages FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE requester_type = 'doctor' AND requester_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())));
CREATE POLICY "insert_ticket_messages_authenticated" ON support_ticket_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "all_ticket_messages_service" ON support_ticket_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for reports
CREATE POLICY "insert_reports_authenticated" ON reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "all_reports_service" ON reports FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for platform_settings
CREATE POLICY "select_platform_settings_public" ON platform_settings FOR SELECT TO public USING (true);
CREATE POLICY "all_platform_settings_service" ON platform_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to check admin role
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_roles WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent)
  VALUES (p_admin_id, p_action, p_entity_type, p_entity_id, p_before_data, p_after_data, p_ip_address, p_user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update verification_requests updated_at
CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update support_tickets updated_at
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update admin_roles updated_at
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update reports updated_at
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();