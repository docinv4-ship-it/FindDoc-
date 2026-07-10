import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');

    // Fetch verification request with documents
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/verification_requests?id=eq.${id}&select=*,doctors(id,full_name,email,specialization,phone),verification_documents(*)`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    const data = await response.json();
    if (!data[0]) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }

    // Generate signed URLs for documents (valid for 1 hour)
    const verificationRequest = data[0];
    if (verificationRequest.verification_documents?.length > 0) {
      for (const doc of verificationRequest.verification_documents) {
        const signedUrlResponse = await fetch(
          `${SUPABASE_URL}/storage/v1/object/sign/verification-docs/${doc.file_path}`,
          {
            method: 'POST',
            headers: {
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expiresIn: 3600 }),
          }
        );

        if (signedUrlResponse.ok) {
          const signedData = await signedUrlResponse.json();
          doc.signed_url = `${SUPABASE_URL}${signedData.signedURL}`;
        }
      }
    }

    return NextResponse.json({ request: verificationRequest });
  } catch (error) {
    console.error('Verification request fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch verification request' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, internal_notes, rejection_reason, admin_id } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = admin_id;

      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }
    }

    if (internal_notes !== undefined) {
      updateData.internal_notes = internal_notes;
    }

    if (rejection_reason !== undefined) {
      updateData.rejection_reason = rejection_reason;
    }

    // Update verification request
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/verification_requests?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updateData),
      }
    );

    const updated = await updateResponse.json();
    const verificationRequest = updated[0];

    if (!verificationRequest) {
      return NextResponse.json({ error: 'Failed to update verification request' }, { status: 500 });
    }

    // If approved, update doctor's is_verified status
    if (status === 'approved') {
      await fetch(
        `${SUPABASE_URL}/rest/v1/doctors?id=eq.${verificationRequest.doctor_id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_verified: true,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      // Create notification for doctor
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: verificationRequest.doctor_id,
          user_type: 'doctor',
          type: 'doctor_verified',
          title: 'Verification Approved!',
          body: 'Congratulations! Your account has been verified. Your verified badge is now active on your profile.',
          data: { verification_id: id },
        }),
      });

      // Approve all documents
      await fetch(
        `${SUPABASE_URL}/rest/v1/verification_documents?doctor_id=eq.${verificationRequest.doctor_id}&status=eq.pending`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'approved',
            reviewed_by: admin_id,
            reviewed_at: new Date().toISOString(),
          }),
        }
      );
    }

    // If rejected, update documents status
    if (status === 'rejected') {
      await fetch(
        `${SUPABASE_URL}/rest/v1/verification_documents?doctor_id=eq.${verificationRequest.doctor_id}&status=eq.pending`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'rejected',
            rejection_reason: rejection_reason,
            reviewed_by: admin_id,
            reviewed_at: new Date().toISOString(),
          }),
        }
      );

      // Create rejection notification
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: verificationRequest.doctor_id,
          user_type: 'doctor',
          type: 'doctor_verified',
          title: 'Verification Update',
          body: `Your verification request was not approved. Reason: ${rejection_reason || 'Please check your documents and resubmit.'}`,
          data: { verification_id: id, status: 'rejected' },
        }),
      });
    }

    // Log the action
    await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admin_id,
        action: `verification_${status}`,
        entity_type: 'verification_request',
        entity_id: id,
        after_data: updateData,
      }),
    });

    return NextResponse.json({ success: true, request: verificationRequest });
  } catch (error) {
    console.error('Verification update error:', error);
    return NextResponse.json({ error: 'Failed to update verification request' }, { status: 500 });
  }
}
