-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor Subscriptions Table
CREATE TABLE IF NOT EXISTS doctor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'grace', 'cancelled', 'expired')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
  external_subscription_id TEXT,
  external_customer_id TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  grace_period_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id)
);

-- Featured Listings Table
CREATE TABLE IF NOT EXISTS featured_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired')),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  subscription_id UUID REFERENCES doctor_subscriptions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id)
);

-- Legal Consents Table
CREATE TABLE IF NOT EXISTS legal_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('doctor', 'patient', 'guest')),
  user_id UUID,
  guest_identifier TEXT,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('terms', 'privacy', 'cookies', 'booking_terms')),
  version TEXT NOT NULL DEFAULT '1.0',
  source_action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing Events Table (webhook/payment audit log)
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_subscription_id UUID REFERENCES doctor_subscriptions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  external_event_id TEXT,
  provider TEXT NOT NULL DEFAULT 'paddle',
  payload JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctor_subscriptions_doctor_id ON doctor_subscriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_subscriptions_status ON doctor_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_featured_listings_status ON featured_listings(status);
CREATE INDEX IF NOT EXISTS idx_featured_listings_expires_at ON featured_listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_legal_consents_user ON legal_consents(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription ON billing_events(doctor_subscription_id);

-- Enable RLS on all new tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "select_subscription_plans_public" ON subscription_plans FOR SELECT TO public USING (is_active = true);
CREATE POLICY "select_subscription_plans_authenticated" ON subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_subscription_plans_service" ON subscription_plans FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "update_subscription_plans_service" ON subscription_plans FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for doctor_subscriptions
CREATE POLICY "select_own_subscription" ON doctor_subscriptions FOR SELECT TO authenticated
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "insert_own_subscription" ON doctor_subscriptions FOR INSERT TO authenticated
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "update_own_subscription" ON doctor_subscriptions FOR UPDATE TO authenticated
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "all_subscriptions_service" ON doctor_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for featured_listings
CREATE POLICY "select_active_featured_listings" ON featured_listings FOR SELECT TO public
  USING (status = 'active' AND expires_at > NOW());
CREATE POLICY "select_own_featured_listing" ON featured_listings FOR SELECT TO authenticated
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "insert_own_featured_listing" ON featured_listings FOR INSERT TO authenticated
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "update_own_featured_listing" ON featured_listings FOR UPDATE TO authenticated
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()))
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));
CREATE POLICY "all_featured_listings_service" ON featured_listings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies for legal_consents
CREATE POLICY "select_own_legal_consents" ON legal_consents FOR SELECT TO authenticated
  USING ((user_type = 'doctor' AND user_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())) OR
         (user_type = 'patient' AND user_id IN (SELECT id FROM patients WHERE user_id = auth.uid())));
CREATE POLICY "insert_legal_consents_public" ON legal_consents FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "insert_legal_consents_authenticated" ON legal_consents FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for billing_events
CREATE POLICY "select_own_billing_events" ON billing_events FOR SELECT TO authenticated
  USING (doctor_subscription_id IN (SELECT id FROM doctor_subscriptions WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())));
CREATE POLICY "insert_billing_events_service" ON billing_events FOR INSERT TO service_role WITH CHECK (true);

-- Insert default subscription plans
INSERT INTO subscription_plans (slug, name, description, price_monthly, price_yearly, features, limits, display_order, is_active) VALUES
('trial', 'Free Trial', 'Try all features free for 14 days', 0, 0, 
  '["Full platform access", "Booking system", "Patient chat", "Basic analytics", "Single clinic support", "Email support"]'::jsonb,
  '{"doctors": 1, "clinics": 1, "patients": -1}'::jsonb,
  0, true),
('basic', 'Basic', 'Essential features for solo practitioners', 12.99, 129,
  '["1 Doctor profile", "1 Clinic", "Booking system", "Patient chat", "Basic analytics", "Email support", "Appointment reminders", "Patient management"]'::jsonb,
  '{"doctors": 1, "clinics": 1, "patients": -1}'::jsonb,
  1, true),
('pro', 'Pro', 'Everything you need to grow your practice', 24.99, 249,
  '["5 Doctor profiles", "3 Clinics", "Booking system", "Patient chat", "Advanced analytics", "Priority support", "Medical records", "Prescriptions", "QR code check-in", "PWA patient portal", "SMS reminders", "Custom branding"]'::jsonb,
  '{"doctors": 5, "clinics": 3, "patients": -1}'::jsonb,
  2, true),
('featured', 'Featured Listing Add-on', 'Get highlighted in patient searches', 9.99, 99,
  '["Featured badge on profile", "Top ranking in searches", "Homepage featured section", "Search result boosting", "Priority placement"]'::jsonb,
  '{}'::jsonb,
  3, true);

-- Function to auto-expire featured listings
CREATE OR REPLACE FUNCTION expire_featured_listings() RETURNS void AS $$
BEGIN
  UPDATE featured_listings
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_doctor_subscriptions_updated_at BEFORE UPDATE ON doctor_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_featured_listings_updated_at BEFORE UPDATE ON featured_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check feature access
CREATE OR REPLACE FUNCTION check_feature_access(p_doctor_id UUID, p_feature TEXT) RETURNS BOOLEAN AS $$
DECLARE
  v_plan_slug TEXT;
  v_subscription_status TEXT;
BEGIN
  SELECT ds.status, sp.slug INTO v_subscription_status, v_plan_slug
  FROM doctor_subscriptions ds
  JOIN subscription_plans sp ON ds.plan_id = sp.id
  WHERE ds.doctor_id = p_doctor_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF v_subscription_status IN ('trial', 'active') THEN
    IF p_feature = 'medical_records' OR p_feature = 'prescriptions' OR p_feature = 'qr_checkin' OR p_feature = 'pwa' THEN
      RETURN v_plan_slug = 'pro';
    END IF;
    RETURN true;
  END IF;
  
  IF v_subscription_status = 'grace' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;