/**
 * Supplier Response Handler
 * Processes SANGGUP (accept) and TIDAK (reject) from suppliers
 * 
 * Expected messages:
 * - SANGGUP#orderId#price (accept with offered price)
 * - TIDAK#orderId (reject)
 */

import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsApp } from '@/lib/ai/tools/send-whatsapp';

interface SupplierResponse {
  orderId: string;
  action: 'SANGGUP' | 'TIDAK';
  offeredPrice?: number;
}

/**
 * Parse supplier response command
 * Format: SANGGUP#orderId#price or TIDAK#orderId
 */
export function parseSupplierResponse(message: string): SupplierResponse | null {
  const isSanggup = message.startsWith('SANGGUP#');
  const tidak = message.startsWith('TIDAK#');
  
  if (!isSanggup && !tidak) return null;
  
  const parts = message.split('#');
  
  if (isSanggup && parts.length >= 3) {
    const orderId = parts[1];
    const price = parseFloat(parts[2]);
    if (!isNaN(price)) {
      return { orderId, action: 'SANGGUP', offeredPrice: price };
    }
  }
  
  if (!isSanggup && parts.length >= 2) {
    const orderId = parts[1];
    return { orderId, action: 'TIDAK' };
  }
  
  return null;
}

/**
 * Handle SANGGUP (supplier accepts order)
 */
export async function handleSupplierAccept(
  phone: string,
  supplierId: string,
  orderId: string,
  offeredPrice: number
): Promise<string> {
  const supabase = createAdminClient();
  
  console.log(`[SANGGUP] Supplier ${phone} accepted order ${orderId} at Rp ${offeredPrice}`);
  
  try {
    // Update order_broadcasts to mark response
    const { error: broadcastError } = await supabase
      .from('order_broadcasts')
      .update({
        response: 'SANGGUP',
        responded_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('supplier_id', supplierId);
    
    if (broadcastError) throw broadcastError;
    
    // Update order with supplier acceptance
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        supplier_id: supplierId,
        supplier_offered_price: offeredPrice,
        status: 'waiting_buyer_approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // Get buyer info to notify them
    const { data: buyer, error: buyerError } = await supabase
      .from('users')
      .select('phone, name')
      .eq('id', order.buyer_id)
      .single();
    
    if (buyerError) throw buyerError;
    
    // Get supplier info
    const { data: supplier, error: supplierError } = await supabase
      .from('users')
      .select('name')
      .eq('id', supplierId)
      .single();
    
    if (supplierError) throw supplierError;
    
    // Notify supplier
    const supplierMsg = `✅ Pesanan #${orderId} diterima!\nAnda menawarkan harga: Rp ${offeredPrice.toLocaleString('id-ID')}\n\nMenunggu persetujuan pembeli...`;
    await sendWhatsApp({ phone, message: supplierMsg });
    
    // Notify buyer
    const buyerMsg = `🤝 Supplier ${supplier.name} menerima pesanan Anda!\n\n📍 Harga yang ditawarkan: Rp ${offeredPrice.toLocaleString('id-ID')}\n\nKetik SETUJU untuk lanjutkan atau TOLAK untuk cari supplier lain.`;
    await sendWhatsApp({ phone: buyer.phone, message: buyerMsg });
    
    console.log(`[SANGGUP] Buyer ${buyer.phone} notified about acceptance`);
    return `Supplier ${supplier.name} accepted order. Buyer notified.`;
    
  } catch (error) {
    console.error(`[SANGGUP] Error for ${phone}:`, error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await sendWhatsApp({ 
      phone, 
      message: `❌ Terjadi kesalahan saat memproses respons: ${errorMsg}` 
    });
    return `Error: ${errorMsg}`;
  }
}

/**
 * Handle TIDAK (supplier rejects order)
 */
export async function handleSupplierReject(
  phone: string,
  supplierId: string,
  orderId: string
): Promise<string> {
  const supabase = createAdminClient();
  
  console.log(`[TIDAK] Supplier ${phone} rejected order ${orderId}`);
  
  try {
    // Update order_broadcasts to mark response
    const { error: broadcastError } = await supabase
      .from('order_broadcasts')
      .update({
        response: 'TIDAK',
        responded_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('supplier_id', supplierId);
    
    if (broadcastError) throw broadcastError;
    
    // Get supplier info
    const { data: supplier, error: supplierError } = await supabase
      .from('users')
      .select('name')
      .eq('id', supplierId)
      .single();
    
    if (supplierError) throw supplierError;
    
    // Notify supplier
    const supplierMsg = `👋 Baik, terima kasih atas respons. Pesanan #${orderId} ditolak.`;
    await sendWhatsApp({ phone, message: supplierMsg });
    
    // Check if there are other pending responses
    const { data: broadcasts, error: broadcastsError } = await supabase
      .from('order_broadcasts')
      .select('*')
      .eq('order_id', orderId)
      .is('responded_at', null);
    
    if (broadcastsError) throw broadcastsError;
    
    if (!broadcasts || broadcasts.length === 0) {
      // No more pending responses - order failed
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'failed_no_supplier',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      
      if (updateError) throw updateError;
      
      console.log(`[TIDAK] Order ${orderId} failed - no suppliers accepted`);
      
      // Notify buyer
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('id', orderId)
        .single();
      
      if (order && !orderError) {
        const { data: buyer } = await supabase
          .from('users')
          .select('phone')
          .eq('id', order.buyer_id)
          .single();
        
        if (buyer) {
          const buyerMsg = `😔 Maaf, tidak ada supplier yang bersedia mengambil pesanan #${orderId}.\n\nSilakan coba lagi dengan harga yang lebih tinggi atau lokasi yang berbeda.`;
          await sendWhatsApp({ phone: buyer.phone, message: buyerMsg });
        }
      }
    }
    
    return `Supplier ${supplier.name} rejected order. Awaiting other responses...`;
    
  } catch (error) {
    console.error(`[TIDAK] Error for ${phone}:`, error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await sendWhatsApp({ 
      phone, 
      message: `❌ Terjadi kesalahan: ${errorMsg}` 
    });
    return `Error: ${errorMsg}`;
  }
}

/**
 * Handle buyer response to supplier offer
 * SETUJU (approve) or TOLAK (reject)
 */
export async function handleBuyerApproval(
  phone: string,
  buyerId: string,
  orderId: string,
  approved: boolean
): Promise<string> {
  const supabase = createAdminClient();
  
  console.log(`[APPROVAL] Buyer ${phone} ${approved ? 'SETUJU' : 'TOLAK'} order ${orderId}`);
  
  try {
    if (approved) {
      // Move to payment stage
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'waiting_payment',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      
      if (updateError) throw updateError;
      
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('total_amount, supplier_id')
        .eq('id', orderId)
        .single();
      
      if (orderError) throw orderError;
      
      // Notify buyer about payment
      const buyerMsg = `✅ Pesanan disetujui!\n\nTotal: Rp ${order.total_amount?.toLocaleString('id-ID')}\n\n💳 Silakan lakukan pembayaran dengan scan QRIS.`;
      await sendWhatsApp({ phone, message: buyerMsg });
      
      // Notify supplier
      const { data: supplier } = await supabase
        .from('users')
        .select('phone')
        .eq('id', order.supplier_id)
        .single();
      
      if (supplier) {
        const supplierMsg = `🎉 Pesanan #${orderId} disetujui pembeli!\n\nSilakan bersiapkan barang untuk pengiriman.`;
        await sendWhatsApp({ phone: supplier.phone, message: supplierMsg });
      }
      
      return 'Order approved. Buyer moved to payment stage.';
    } else {
      // Buyer rejected - keep searching
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          supplier_id: null,
          supplier_offered_price: null,
          status: 'searching_supplier',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      
      if (updateError) throw updateError;
      
      const buyerMsg = `👍 Baik, kami cari supplier lain untuk pesanan Anda.`;
      await sendWhatsApp({ phone, message: buyerMsg });
      
      return 'Order rejected by buyer. Searching other suppliers.';
    }
    
  } catch (error) {
    console.error(`[APPROVAL] Error for ${phone}:`, error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await sendWhatsApp({ 
      phone, 
      message: `❌ Terjadi kesalahan: ${errorMsg}` 
    });
    return `Error: ${errorMsg}`;
  }
}
