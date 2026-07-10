import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const checks: Record<string, { status: string; message?: string; latency?: number }> = {};

    // Check database
    const dbStart = Date.now();
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/doctors?select=id&limit=1`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
      });
      const latency = Date.now() - dbStart;
      checks.database = {
        status: response.ok ? 'healthy' : 'error',
        message: response.ok ? 'Connected' : 'Connection failed',
        latency,
      };
    } catch (error) {
      checks.database = { status: 'error', message: 'Connection failed' };
    }

    // All checks passed
    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Health check failed' }, { status: 500 });
  }
}
