'use server';

/**
 * Server Actions: Supplier Actions
 * Handle supplier responses and product management
 */

import { createAdminClient } from '@/lib/supabase/server';
import { findCouriers } from '@/lib/ai/tools/find-couriers';
import { sendWhatsApp } from '@/lib/ai/tools/send-whatsapp';
import { templates } from '@/lib/whatsapp/templates';
import { revalidatePath } from 'next/cache';

interface SupplierAcceptInput {
  orderId: string;
  supplierId: string;
  deliveryMethod: 'self' | 'courier';
  offeredPrice?: number;
}

/**
 * Supplier accepts an order
 */
export async function actionSupplierAccept(
  input: SupplierAcceptInput
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient();
  
  try {
    // Check if supplier has capacity
    const { count: activeOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', input.supplierId)
      .in('status', ['paid_held', 'shipping', 'waiting_payment']);
    
    if ((activeOrders || 0) >= 3) {
      await sendWhatsApp({
        phone: (await getSupplierPhone(input.supplierId)) || '',
        message: templates.supplierBusy(),
      });
      return { success: false, message: 'Kuota order penuh (max 3).' };
    }
    
    // Get order details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = await (supabase
      .from('orders') as any)
      .select('*, buyer:users!orders_buyer_id_fkey(phone, address)')
      .eq('id', input.orderId)
      .single();
    
    if (!order) {
      return { success: false, message: 'Order tidak ditemukan.' };
    }
    
    // Get supplier details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: supplier } = await (supabase
      .from('users') as any)
      .select('*')
      .eq('id', input.supplierId)
      .single();
    
    if (!supplier) {
      return { success: false, message: 'Supplier tidak ditemukan.' };
    }
    
    // Update order with supplier
    const updateData: Record<string, unknown> = {
      supplier_id: input.supplierId,
      supplier_price: input.offeredPrice || order.buyer_price,
      pickup_address: supplier.address,
      // pickup_location will be set from supplier's location
    };
    
    // Record broadcast response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase
      .from('order_broadcasts') as any)
      .update({
        response: 'SANGGUP ' + (input.deliveryMethod === 'self' ? 'KIRIM' : 'AMBIL'),
        responded_at: new Date().toISOString(),
      })
      .eq('order_id', input.orderId)
      .eq('supplier_id', input.supplierId);
    
    if (input.deliveryMethod === 'self') {
      // Supplier will deliver - go straight to waiting payment
      updateData.status = 'waiting_payment';
      updateData.shipping_cost = 0;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('orders') as any).update(updateData).eq('id', input.orderId);
      
      return {
        success: true,
        message: 'Order diterima! Menunggu pembayaran dari pembeli.',
      };
    } else {
      // Need courier - search for available couriers
      updateData.status = 'negotiating_courier';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('orders') as any).update(updateData).eq('id', input.orderId);
      
      // Find couriers
      const couriersResult = JSON.parse(
        await findCouriers({
          lat: supplier.location ? extractLat(supplier.location) : -6.2,
          lng: supplier.location ? extractLng(supplier.location) : 106.8,
          radiusKm: 5,
          maxResults: 5,
        })
      );
      
      if (!couriersResult.success || couriersResult.found === 0) {
        // No couriers available - notify supplier
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase
          .from('orders') as any)
          .update({ status: 'stuck_no_courier' })
          .eq('id', input.orderId);
        
        await sendWhatsApp({
          phone: supplier.phone,
          message: `Maaf Pak, kurir belum tersedia. Bapak bisa antar sendiri? Atau mau cancel order ini?`,
        });
        
        return {
          success: true,
          message: 'Order diterima, tapi kurir belum tersedia. Silakan antar sendiri atau tunggu.',
        };
      }
      
      // Broadcast to couriers
      const buyerData = order.buyer as { phone: string; address: string };
      
      for (const courier of couriersResult.couriers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('courier_broadcasts') as any).insert({
          order_id: input.orderId,
          courier_id: courier.id,
        });
        
        // Calculate shipping cost (simple: Rp 5000 per km, min Rp 10000)
        const shippingCost = Math.max(10000, Math.round(courier.distance_km * 5000));
        
        await sendWhatsApp({
          phone: courier.phone,
          message: templates.courierJobOffer({
            supplier_name: supplier.name || supplier.business_name || 'Supplier',
            supplier_address: supplier.address || 'Lihat lokasi',
            buyer_address: buyerData?.address || order.delivery_address || 'Lihat lokasi',
            distance_km: courier.distance_km,
            shipping_cost: shippingCost,
            product_name: order.product_name,
            quantity: order.quantity,
            unit: order.unit,
            weight_kg: order.weight_kg || 0,
            order_id: input.orderId,
          }),
        });
      }
      
      return {
        success: true,
        message: `Order diterima! Mencari kurir (${couriersResult.found} kurir dihubungi)...`,
      };
    }
    
  } catch (error) {
    console.error('[actionSupplierAccept] Error:', error);
    return { success: false, message: 'Terjadi kesalahan.' };
  }
}

/**
 * Supplier rejects an order
 */
export async function actionSupplierReject(
  orderId: string,
  supplierId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient();
  
  try {
    // Record rejection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('order_broadcasts') as any)
      .update({
        response: 'TIDAK',
        responded_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('supplier_id', supplierId);
    
    // Check if all suppliers rejected
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: broadcasts } = await (supabase.from('order_broadcasts') as any)
      .select('response')
      .eq('order_id', orderId);
    
    const broadcastList = broadcasts as { response: string | null }[] | null;
    const allResponded = broadcastList?.every(b => b.response !== null);
    const allRejected = broadcastList?.every(b => b.response === 'TIDAK');
    
    if (allResponded && allRejected) {
      // All suppliers rejected - mark order as failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('orders') as any)
        .update({ status: 'failed_no_supplier' })
        .eq('id', orderId);
    }
    
    return { success: true, message: 'Respons dicatat.' };
    
  } catch (error) {
    console.error('[actionSupplierReject] Error:', error);
    return { success: false, message: 'Terjadi kesalahan.' };
  }
}

/**
 * Update supplier's product price
 */
export async function actionUpdateProductPrice(
  supplierId: string,
  productName: string,
  newPrice: number
): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient();
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('products') as any)
      .update({ price: newPrice })
      .eq('supplier_id', supplierId)
      .ilike('name', `%${productName}%`);
    
    if (error) throw error;
    
    return { success: true, message: `Harga ${productName} berhasil diubah menjadi Rp ${newPrice.toLocaleString('id-ID')}` };
    
  } catch (error) {
    console.error('[actionUpdateProductPrice] Error:', error);
    return { success: false, message: 'Gagal mengubah harga.' };
  }
}

/**
 * Get supplier's active orders
 */
export async function actionGetSupplierOrders(supplierId: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:users!orders_buyer_id_fkey(name, phone, address),
      courier:users!orders_courier_id_fkey(name, phone, vehicle)
    `)
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[actionGetSupplierOrders] Error:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get supplier's wallet balance
 */
export async function actionGetSupplierWallet(supplierId: string) {
  const supabase = createAdminClient();
  
  const { data } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', supplierId)
    .single();
  
  return data || { available: 0, escrow_held: 0, total_earned: 0 };
}

// Helper functions
async function getSupplierPhone(supplierId: string): Promise<string | null> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('users') as any)
    .select('phone')
    .eq('id', supplierId)
    .single();
  const userData = data as { phone: string } | null;
  return userData?.phone || null;
}

function extractLat(location: unknown): number {
  // Handle PostGIS POINT format
  if (typeof location === 'string') {
    const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (match) return parseFloat(match[2]);
  }
  return -6.2; // Default Jakarta
}

function extractLng(location: unknown): number {
  if (typeof location === 'string') {
    const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (match) return parseFloat(match[1]);
  }
  return 106.8;
}
