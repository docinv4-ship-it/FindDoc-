import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      admin_id,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data,
    } = body;

    if (!action || !entity_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        admin_id,
        action,
        entity_type,
        entity_id,
        before_data,
        after_data,
        ip_address: ip,
        user_agent: userAgent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Audit log error:', error);
      return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
    }

    const log = await response.json();
    return NextResponse.json({ success: true, log: log[0] });
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entity_type = searchParams.get('entity_type');
    const entity_id = searchParams.get('entity_id');
    const admin_id = searchParams.get('admin_id');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `${SUPABASE_URL}/rest/v1/audit_logs?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;

    if (entity_type) query += `&entity_type=eq.${entity_type}`;
    if (entity_id) query += `&entity_id=eq.${entity_id}`;
    if (admin_id) query += `&admin_id=eq.${admin_id}`;
    if (action) query += `&action=eq.${action}`;

    const response = await fetch(query, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });

    const logs = await response.json();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Audit fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
