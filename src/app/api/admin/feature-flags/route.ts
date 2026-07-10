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
      .from('feature_flags')
      .select('*')
      .order('category', { ascending: true })
      .order('label', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ flags: data });
  } catch (error) {
    console.error('Feature flags GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const { id, is_enabled, label, description, category } = body;

    if (!id) return NextResponse.json({ error: 'Flag ID required' }, { status: 400 });

    const updateBody: Record<string, unknown> = {};
    if (typeof is_enabled === 'boolean') updateBody.is_enabled = is_enabled;
    if (label !== undefined) updateBody.label = label;
    if (description !== undefined) updateBody.description = description;
    if (category !== undefined) updateBody.category = category;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/feature_flags?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updateBody),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
    }

    const updated = await response.json();
    return NextResponse.json({ flag: updated[0] });
  } catch (error) {
    console.error('Feature flags PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const { key, label, description, category, is_enabled } = body;

    if (!key || !label) return NextResponse.json({ error: 'Key and label required' }, { status: 400 });

    const response = await fetch(`${SUPABASE_URL}/rest/v1/feature_flags`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        key,
        label,
        description: description || null,
        category: category || 'General',
        is_enabled: is_enabled ?? false,
        is_system: false,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ error: err.message || 'Create failed' }, { status: 500 });
    }

    const created = await response.json();
    return NextResponse.json({ flag: created[0] });
  } catch (error) {
    console.error('Feature flags POST error:', error);
    return NextResponse.json({ error: 'Failed to create feature flag' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Flag ID required' }, { status: 400 });

    // Check if system flag
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/feature_flags?id=eq.${id}&select=is_system`, {
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    });
    const checkData = await checkRes.json();
    if (checkData[0]?.is_system) {
      return NextResponse.json({ error: 'System flags cannot be deleted' }, { status: 400 });
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/feature_flags?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feature flags DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete feature flag' }, { status: 500 });
  }
}
