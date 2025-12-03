'use server';

/**
 * Server Actions: Courier Actions
 * Handle courier job acceptance and delivery updates
 */

import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsApp } from '@/lib/ai/tools/send-whatsapp';
import { templates } from '@/lib/whatsapp/templates';
import { revalidatePath } from 'next/cache';

/**
 * Courier accepts a delivery job
 */
export async function actionCourierAcceptJob(
  orderId: string,
  courierId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient();
  
  try {
    // Check if courier is already busy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: courier } = await (supabase.from('users') as any)
      .select('is_busy, name, phone')
      .eq('id', courierId)
      .single();
    
    if (!courier) {
      return { success: false, message: 'Kurir tidak ditemukan.' };
    }
    
    if (courier.is_busy) {
      return { success: false, message: 'Anda sedang menangani order lain.' };
    }
    
    // Check if order is still available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await (supabase.from('orders') as any)
      .select(`
        *,
        supplier:users!orders_supplier_id_fkey(id, name, phone, address),
        buyer:users!orders_buyer_id_fkey(id, phone)
      `)
      .eq('id', orderId)
      .eq('status', 'negotiating_courier')
      .single();
    
    if (!order) {
      return { success: false, message: 'Job sudah diambil kurir lain atau tidak tersedia.' };
    }
    
    // Calculate shipping cost
    // Simple calculation: Rp 5000 per km, minimum Rp 10000
    const shippingCost = Math.max(10000, Math.round((order.distance_km || 5) * 5000));
    
    // Mark courier as busy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('users') as any)
      .update({ is_busy: true })
      .eq('id', courierId);
    
    // Update order with courier
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('orders') as any)
      .update({
        courier_id: courierId,
        shipping_cost: shippingCost,
        status: 'waiting_payment',
      })
      .eq('id', orderId);
    
    // Record courier response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('courier_broadcasts') as any)
      .update({
        response: 'AMBIL',
        responded_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('courier_id', courierId);
    
    // Notify courier with pickup info
    const supplierData = order.supplier as { id: string; name: string; phone: string; address: string };
    
    await sendWhatsApp({
      phone: courier.phone,
      message: templates.courierPickupReady({
        order_id: orderId,
        supplier_address: supplierData.address || 'Lihat di maps',
        supplier_name: supplierData.name || 'Supplier',
        supplier_phone: supplierData.phone,
      }),
    });
    
    // Notify supplier
    await sendWhatsApp({
      phone: supplierData.phone,
      message: `🚚 Kurir sudah dikonfirmasi!\n\nKurir: ${courier.name}\nNo HP: ${courier.phone}\n\nMohon siapkan barang. Kurir akan segera menuju lokasi Anda.`,
    });
    
    revalidatePath('/dashboard/courier');
    
    return {
      success: true,
      message: `Job diterima! Segera menuju pickup di ${supplierData.address || 'lokasi supplier'}.`,
    };
    
  } catch (error) {
    console.error('[actionCourierAcceptJob] Error:', error);
    return { success: false, message: 'Terjadi kesalahan.' };
  }
}

/**
 * Courier confirms pickup with photo
 */
export async function actionCourierConfirmPickup(
  orderId: string,
  courierId: string,
  photoUrl: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient();
  
  try {
    // Verify courier owns this order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await (supabase.from('orders') as any)
      .select('*, buyer:users!orders_buyer_id_fkey(phone)')
      .eq('id', orderId)
      .eq('courier_id', courierId)
      .single();
    
    if (!order) {
      return { success: false, message: 'Order tidak ditemukan atau bukan milik Anda.' };
    }
    
    if (order.status !== 'paid_held') {
      return { success: false, message: 'Order belum siap untuk pickup.' };
    }
    
    // Update order with pickup info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('orders') as any)
      .update({
        status: 'shipping',
        pickup_photo_url: photoUrl,
        pickup_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    
    // Notify buyer
    const buyerData = order.buyer as { phone: string };
    const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/track/${orderId}`;
    
    await sendWhatsApp({
      phone: buyerData.phone,
      message: `📦 *Barang Diambil!*\n\nKurir sudah mengambil barang Anda.\n\nLacak pengiriman: ${trackingUrl}`,
    });
    
    return {
      success: true,
      message: 'Pickup dikonfirmasi! Segera menuju lokasi pembeli.',
    };
    
  } catch (error) {
    console.error('[actionCourierConfirmPickup] Error:', error);
    return { success: false, message: 'Terjadi kesalahan.' };
  }
}

/**
 * Update courier location during delivery
 */
export async function actionUpdateCourierLocation(
  courierId: string,
  lat: number,
  lng: number
): Promise<{ success: boolean }> {
  const supabase = createAdminClient();
  
  try {
    // Update courier's location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('users') as any)
      .update({
        location: `POINT(${lng} ${lat})`,
      })
      .eq('id', courierId);
    
    // Update active order's tracking location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('orders') as any)
      .update({
        courier_last_location: `POINT(${lng} ${lat})`,
        courier_location_updated_at: new Date().toISOString(),
      })
      .eq('courier_id', courierId)
      .eq('status', 'shipping');
    
    return { success: true };
    
  } catch (error) {
    console.error('[actionUpdateCourierLocation] Error:', error);
    return { success: false };
  }
}

/**
 * Complete delivery (courier marks as delivered)
 */
export async function actionCourierCompleteDelivery(
  orderId: string,
  courierId: string
): Promise<{ success: boolean; message: string; confirmUrl?: string }> {
  const supabase = createAdminClient();
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await (supabase.from('orders') as any)
      .select('delivery_token')
      .eq('id', orderId)
      .eq('courier_id', courierId)
      .eq('status', 'shipping')
      .single();
    
    if (!order) {
      return { success: false, message: 'Order tidak ditemukan.' };
    }
    
    // Generate confirmation URL for buyer to scan
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/confirm/${orderId}?token=${order.delivery_token}`;
    
    // Update status to delivered (awaiting buyer confirmation)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('orders') as any)
      .update({ status: 'delivered' })
      .eq('id', orderId);
    
    // Mark courier as available again
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('users') as any)
      .update({ is_busy: false })
      .eq('id', courierId);
    
    return {
      success: true,
      message: 'Barang sudah diantar. Minta pembeli scan QR untuk konfirmasi.',
      confirmUrl,
    };
    
  } catch (error) {
    console.error('[actionCourierCompleteDelivery] Error:', error);
    return { success: false, message: 'Terjadi kesalahan.' };
  }
}

/**
 * Get courier's active jobs
 */
export async function actionGetCourierJobs(courierId: string) {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('orders') as any)
    .select(`
      *,
      supplier:users!orders_supplier_id_fkey(name, phone, address),
      buyer:users!orders_buyer_id_fkey(name, phone, address)
    `)
    .eq('courier_id', courierId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[actionGetCourierJobs] Error:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get pending courier job offers
 */
export async function actionGetCourierOffers(courierId: string) {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('courier_broadcasts') as any)
    .select(`
      *,
      order:orders(
        *,
        supplier:users!orders_supplier_id_fkey(name, address),
        buyer:users!orders_buyer_id_fkey(address)
      )
    `)
    .eq('courier_id', courierId)
    .is('response', null)
    .order('sent_at', { ascending: false });
  
  if (error) {
    console.error('[actionGetCourierOffers] Error:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get courier's wallet/earnings
 */
export async function actionGetCourierWallet(courierId: string) {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('wallets') as any)
    .select('*')
    .eq('user_id', courierId)
    .single();
  
  return data || { available: 0, escrow_held: 0, total_earned: 0 };
}
