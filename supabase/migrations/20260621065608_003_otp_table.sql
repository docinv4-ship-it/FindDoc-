-- OTP Verifications Table
-- Stores one-time password codes for phone verification

CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'booking', 'chat', 'lookup', 'cancel')),
  reference_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for OTP lookups
CREATE INDEX idx_otp_phone ON otp_verifications(phone);
CREATE INDEX idx_otp_reference ON otp_verifications(reference_id);
CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);

-- RLS for OTP
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow public insert for sending OTP
CREATE POLICY "otp_public_insert" ON otp_verifications FOR INSERT
  TO public WITH CHECK (true);

-- Allow public select for verification (limited by expiration)
CREATE POLICY "otp_public_select" ON otp_verifications FOR SELECT
  TO public USING (expires_at > NOW() AND verified = false);

-- Allow public update for marking verified
CREATE POLICY "otp_public_update" ON otp_verifications FOR UPDATE
  TO public USING (expires_at > NOW() AND verified = false)
  WITH CHECK (true);

-- Function to cleanup expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps() RETURNS void AS $$
BEGIN
  DELETE FROM otp_verifications WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for conversation lookup in conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_lookup ON conversations(clinic_id, patient_id);
