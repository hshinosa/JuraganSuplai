import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/track/location
 * Update courier location during delivery
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId, lat, lng } = await request.json();

    if (!orderId || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, lat, lng' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get order to find courier_id
    const { data: order, error: orderError } = await (supabase.from('orders') as any)
      .select('courier_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.courier_id) {
      return NextResponse.json(
        { error: 'No courier assigned to this order' },
        { status: 400 }
      );
    }

    // Only update location for active deliveries
    if (!['paid_held', 'shipping'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Order is not in active delivery status' },
        { status: 400 }
      );
    }

    const locationPoint = `POINT(${lng} ${lat})`;
    const now = new Date().toISOString();

    // Update courier's location in users table
    const { error: userError } = await (supabase.from('users') as any)
      .update({
        location: locationPoint,
        updated_at: now,
      })
      .eq('id', order.courier_id);

    if (userError) {
      console.error('[Location API] User update error:', userError);
      return NextResponse.json(
        { error: 'Failed to update user location' },
        { status: 500 }
      );
    }

    // Update order's tracking location
    const { error: orderUpdateError } = await (supabase.from('orders') as any)
      .update({
        courier_last_location: locationPoint,
        courier_location_updated_at: now,
      })
      .eq('id', orderId);

    if (orderUpdateError) {
      console.error('[Location API] Order update error:', orderUpdateError);
      // Don't fail - user location was updated successfully
    }

    console.log(`[Location API] Updated location for order ${orderId}: ${lat}, ${lng}`);

    return NextResponse.json({
      success: true,
      timestamp: now,
      location: { lat, lng },
    });

  } catch (error) {
    console.error('[Location API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
