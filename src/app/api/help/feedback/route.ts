import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { article_id, is_helpful, comment, user_identifier } = body;

    if (!article_id || typeof is_helpful !== 'boolean') {
      return NextResponse.json({ error: 'article_id and is_helpful are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('help_feedback')
      .insert({
        article_id,
        is_helpful,
        comment: comment || null,
        user_identifier: user_identifier || null,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Help feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
