import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ authorized: false, role: null }, { status: 401 });
    }

    // Check if user has admin role
    const adminResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_roles?user_id=eq.${user.id}&select=*`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    const adminRoles = await adminResponse.json();
    const adminRole = adminRoles[0];

    if (adminRole) {
      return NextResponse.json({
        authorized: true,
        role: adminRole.role,
        permissions: adminRole.permissions,
        adminId: adminRole.id,
      });
    }

    // Fallback: check if doctor email is admin
    const doctorResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/doctors?user_id=eq.${user.id}&select=email`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
      }
    );

    const doctors = await doctorResponse.json();
    if (doctors[0]?.email === 'admin@healthcare.com') {
      // Auto-create admin role
      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/admin_roles`,
        {
          method: 'POST',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            user_id: user.id,
            role: 'super_admin',
            permissions: { all: true },
          }),
        }
      );

      const newRoles = await insertResponse.json();
      return NextResponse.json({
        authorized: true,
        role: 'super_admin',
        permissions: { all: true },
        adminId: newRoles[0]?.id,
      });
    }

    return NextResponse.json({ authorized: false, role: null }, { status: 403 });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 });
  }
}
