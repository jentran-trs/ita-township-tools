import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Helper to safely get auth data (returns null if Clerk not configured)
async function getAuthData() {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    return await auth();
  } catch (error) {
    console.log('Clerk auth not available:', error.message);
    return null;
  }
}

// GET - Fetch notifications for the current org
export async function GET(request) {
  try {
    const authData = await getAuthData();
    const { searchParams } = new URL(request.url);
    const orgId = authData?.orgId || searchParams.get('orgId');

    // Return empty when no auth available
    if (!orgId) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const supabase = createServerSupabaseClient();

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST204' || error.code === '42P01') {
        return NextResponse.json({ notifications: [], unreadCount: 0 });
      }
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    const unreadCount = (notifications || []).filter(n => !n.is_read).length;

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Mark notification(s) as read
export async function PATCH(request) {
  try {
    const authData = await getAuthData();
    const orgId = authData?.orgId;

    // Allow without auth for now
    if (!orgId) {
      return NextResponse.json({ success: true });
    }

    const { notificationId, markAllRead } = await request.json();

    const supabase = createServerSupabaseClient();

    if (markAllRead) {
      // Mark all notifications as read for this org
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('org_id', orgId)
        .eq('is_read', false);

      if (error && error.code !== 'PGRST204') {
        console.error('Error marking all as read:', error);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
      }
    } else if (notificationId) {
      // Mark single notification as read
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('org_id', orgId);

      if (error && error.code !== 'PGRST204') {
        console.error('Error marking as read:', error);
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
