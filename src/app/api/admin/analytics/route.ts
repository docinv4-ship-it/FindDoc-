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

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const now = new Date();
    const defaultEnd = now.toISOString();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const headers: Record<string, string> = {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    };

    const fetchCount = async (table: string, filter?: string) => {
      let url = `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`;
      if (filter) url += `&${filter}`;
      const res = await fetch(url, { headers: { ...headers, 'Prefer': 'count=exact' } });
      const count = res.headers.get('content-range')?.split('/')[1];
      return count ? parseInt(count) : 0;
    };

    const doctorsCount = await fetchCount('doctors');
    const verifiedDoctors = await fetchCount('doctors', 'is_verified=eq.true');
    const onboardedDoctors = await fetchCount('doctors', 'is_onboarded=eq.true');
    const patientsCount = await fetchCount('patients');
    const clinicsCount = await fetchCount('clinics');
    const appointmentsCount = await fetchCount('appointments');
    const pendingAppointments = await fetchCount('appointments', 'status=eq.pending');
    const confirmedAppointments = await fetchCount('appointments', 'status=eq.confirmed');
    const cancelledAppointments = await fetchCount('appointments', 'status=eq.cancelled');
    const completedAppointments = await fetchCount('appointments', 'status=eq.completed');
    const noShowAppointments = await fetchCount('appointments', 'status=eq.no_show');
    const activeSubscriptions = await fetchCount('doctor_subscriptions', 'status=eq.active');
    const trialSubscriptions = await fetchCount('doctor_subscriptions', 'status=eq.trial');
    const expiredSubscriptions = await fetchCount('doctor_subscriptions', 'status=eq.expired');
    const suspendedSubscriptions = await fetchCount('doctor_subscriptions', 'status=eq.suspended');
    const featuredListings = await fetchCount('featured_listings', 'status=eq.active');
    const pendingVerifications = await fetchCount('verification_requests', 'status=eq.pending');
    const approvedVerifications = await fetchCount('verification_requests', 'status=eq.approved');
    const rejectedVerifications = await fetchCount('verification_requests', 'status=eq.rejected');
    const pendingReports = await fetchCount('reports', 'status=eq.pending');
    const openTickets = await fetchCount('support_tickets', 'status=eq.open');
    const inProgressTickets = await fetchCount('support_tickets', 'status=eq.in_progress');

    // Date-range filtered counts
    const dateFilter = `created_at=gte.${start}&created_at=lte.${end}`;
    const appointmentsInRange = await fetchCount('appointments', dateFilter);
    const newDoctorsInRange = await fetchCount('doctors', dateFilter);
    const newPatientsInRange = await fetchCount('patients', dateFilter);

    // Trend data: daily appointment counts for the range
    const trendRes = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?select=created_at,status&created_at=gte.${start}&created_at=lte.${end}&order=created_at.asc`,
      { headers }
    );
    const trendData = await trendRes.json();

    // Group by day
    const dailyMap: Record<string, { total: number; confirmed: number; cancelled: number; completed: number; pending: number }> = {};
    for (const apt of trendData || []) {
      const day = apt.created_at?.split('T')[0];
      if (!day) continue;
      if (!dailyMap[day]) dailyMap[day] = { total: 0, confirmed: 0, cancelled: 0, completed: 0, pending: 0 };
      dailyMap[day].total++;
      if (dailyMap[day][apt.status as keyof typeof dailyMap[typeof day]] !== undefined) {
        (dailyMap[day] as any)[apt.status]++;
      }
    }
    const trends = Object.entries(dailyMap).map(([date, counts]) => ({ date, ...counts }));

    // Doctor specialization distribution
    const specRes = await fetch(
      `${SUPABASE_URL}/rest/v1/doctors?select=specialization`,
      { headers }
    );
    const specData = await specRes.json();
    const specMap: Record<string, number> = {};
    for (const d of specData || []) {
      const s = d.specialization || 'Unknown';
      specMap[s] = (specMap[s] || 0) + 1;
    }
    const specializations = Object.entries(specMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Subscription plan distribution
    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/doctor_subscriptions?select=status,plan_id`,
      { headers }
    );
    const subData = await subRes.json();
    const subStatusMap: Record<string, number> = {};
    for (const s of subData || []) {
      subStatusMap[s.status] = (subStatusMap[s.status] || 0) + 1;
    }

    // Recent system events
    const eventsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/events?select=id,event_type,entity_type,created_at&order=created_at.desc&limit=20`,
      { headers }
    );
    const events = await eventsRes.json();

    return NextResponse.json({
      summary: {
        doctors: doctorsCount,
        verifiedDoctors,
        onboardedDoctors,
        patients: patientsCount,
        clinics: clinicsCount,
        appointments: appointmentsCount,
        pendingAppointments,
        confirmedAppointments,
        cancelledAppointments,
        completedAppointments,
        noShowAppointments,
        activeSubscriptions,
        trialSubscriptions,
        expiredSubscriptions,
        suspendedSubscriptions,
        featuredListings,
        pendingVerifications,
        approvedVerifications,
        rejectedVerifications,
        pendingReports,
        openTickets,
        inProgressTickets,
      },
      range: {
        start,
        end,
        appointmentsInRange,
        newDoctorsInRange,
        newPatientsInRange,
      },
      trends,
      specializations,
      subscriptionStatus: subStatusMap,
      recentEvents: events || [],
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
