-- Create verification documents storage bucket (private - no public access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-docs',
  'verification-docs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage policies for verification-docs bucket (private access only)
CREATE POLICY "select_own_verification_files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM doctors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_verification_files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-docs' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM doctors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "all_verification_files_service" ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'verification-docs')
  WITH CHECK (bucket_id = 'verification-docs');

-- Function to generate signed URL for verification documents
CREATE OR REPLACE FUNCTION get_verification_doc_url(file_path TEXT) RETURNS TEXT AS $$
DECLARE
  signed_url TEXT;
BEGIN
  -- Return a placeholder that will be handled by the API
  RETURN '/api/verification-docs/' || file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;