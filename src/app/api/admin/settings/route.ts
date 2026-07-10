import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_roles?user_id=eq.${user.id}&select=id`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  });
  const roles = await res.json();
  return roles.length > 0;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const settings: Record<string, { value: unknown; description: string | null }> = {};
    for (const s of data || []) {
      settings[s.key] = { value: s.value, description: s.description };
    }
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object required' }, { status: 400 });
    }

    const results: { key: string; success: boolean }[] = [];

    for (const [key, value] of Object.entries(settings)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settingData: any = { value };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_settings?key=eq.${key}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(settingData),
      });

      if (!response.ok) {
        // Try insert if update didn't match any row
        const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/platform_settings`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ key, value }),
        });
        results.push({ key, success: insertResponse.ok });
      } else {
        results.push({ key, success: true });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const { key, value, description } = body;

    if (!key) return NextResponse.json({ error: 'Setting key required' }, { status: 400 });

    const response = await fetch(`${SUPABASE_URL}/rest/v1/platform_settings`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ key, value, description: description || null }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.message || 'Create failed' }, { status: 500 });
    }

    const created = await response.json();
    return NextResponse.json({ setting: created[0] });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 });
  }
}
