import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { consent_type, source_action, version } = body;

    if (!consent_type || !source_action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    let userType: 'doctor' | 'patient' | 'guest' = 'guest';
    let userId: string | null = null;

    if (user) {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (doctor) {
        userType = 'doctor';
        userId = doctor.id;
      } else {
        const { data: patient } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (patient) {
          userType = 'patient';
          userId = patient.id;
        }
      }
    }

    const guestIdentifier = userType === 'guest'
      ? `guest_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
      : null;

    const { error } = await supabase.from('legal_consents').insert({
      user_type: userType,
      user_id: userId,
      guest_identifier: guestIdentifier,
      consent_type,
      version: version || '1.0',
      source_action,
      ip_address: ip,
      user_agent: userAgent,
      accepted_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Consent insert error:', error);
      return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Consent API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
