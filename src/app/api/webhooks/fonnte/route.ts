/**
 * Fonnte WhatsApp Webhook Handler
 * Receives incoming messages and location updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { runAgent } from '@/lib/ai/executor';
import '@/lib/ai/tools';
import { sendWhatsApp } from '@/lib/ai/tools/send-whatsapp';
import { findCouriers } from '@/lib/ai/tools/find-couriers';
import { templates } from '@/lib/whatsapp/templates';
import {
  startOnboarding,
  handleRoleSelection,
  handleSupplierName,
  handleSupplierBusinessName,
  handleSupplierCategories,
  handlePhotoUpload,
  handleCourierName,
  handleCourierAddress,
  handleCourierVehicle,
} from '@/lib/onboarding/handler';

interface FonnteWebhookPayload {
  device: string;
  sender?: string; // Optional for status updates
  message?: string; // Optional for status updates
  url?: string; // Image/file URL
  location?: {
    latitude: number;
    longitude: number;
  };
  name?: string;
  member?: string;
  type?: string;
  state?: string | number; // Status update state (e.g., 'delivered', 'sent')
  stateid?: string; // Status update ID
}

/**
 * Format phone number to Indonesian format
 */
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Handle incoming WhatsApp message
 */
async function handleMessage(payload: FonnteWebhookPayload): Promise<string> {
  const supabase = createAdminClient();
  
  // Type guard: ensure sender and message exist
  if (!payload.sender || !payload.message) {
    throw new Error('Message handler requires sender and message');
  }
  
  const phone = formatPhoneNumber(payload.sender);
  const message = payload.message;
  
  // 🔴 FILTER: Ignore messages that are our own bot responses
  // Our bot messages ALL start with ✅ emoji - this is the most reliable filter
  if (message.startsWith('✅')) {
    console.log(`[Webhook] ✓ Ignoring outgoing bot message from ${phone}`);
    return 'Ignored bot message - starts with ✅';
  }
  
  // Also filter out messages that contain Fonnte footer
  // (happens rarely but Fonnte sometimes appends "Sent via fonnte.com" to echoed messages)
  if (message.includes('Sent via fonnte.com') || message.includes('sent via fonnte.com')) {
    console.log(`[Webhook] ✓ Ignoring Fonnte system footer message from ${phone}`);
    return 'Ignored Fonnte system message';
  }
  
  console.log(`[Webhook] Message from ${phone}: ${message}`);

  // Check if user is in onboarding
  const { data: userData, error: userError } = await (supabase
    .from('users') as any)
    .select('onboarding_step, role, onboarding_data')
    .eq('phone', phone)
    .single();
  
  const onboardingStep = userData?.onboarding_step || null;
  const userRole = userData?.role || null;
  const onboardingData = userData?.onboarding_data || {};

  console.log(`[Webhook] User: ${phone} | Step: ${onboardingStep} | Role: ${userRole} | Message: "${message.substring(0, 30)}"`);

  // NEW FLOW: User ini baru pertama kali atau ingin daftar
  if (message.toLowerCase().includes('daftar') && !userRole) {
    console.log(`[Onboarding] Starting onboarding for ${phone}`);
    await startOnboarding(phone);
    return 'Onboarding started';
  }

  // ONBOARDING STATE MACHINE
  if (onboardingStep && onboardingStep !== 'completed') {
    console.log(`[Onboarding] Processing step: ${onboardingStep}, Role: ${userRole}`);

    // Handle role selection
    if (onboardingStep === 'role_selection') {
      console.log(`[Onboarding] Handling role selection`);
      const success = await handleRoleSelection(phone, message);
      return success ? 'Role selected' : 'Invalid role input';
    }

    // Handle supplier flow
    if (userRole === 'supplier') {
      if (onboardingStep === 'name_input') {
        console.log(`[Supplier] Step: name_input`);
        const success = await handleSupplierName(phone, message);
        return success ? 'Name saved' : 'Invalid name';
      }

      if (onboardingStep === 'business_name_input' || onboardingStep === 'location_share') {
        console.log(`[Supplier] Step: business_name_input (or legacy location_share)`);
        // location_share is legacy step, treat as business_name_input
        const success = await handleSupplierBusinessName(phone, message);
        return success ? 'Business name saved' : 'Invalid business name';
      }

      if (onboardingStep === 'categories_select' || onboardingStep === 'details_input') {
        console.log(`[Supplier] Step: categories_select (or legacy details_input)`);
        // details_input is legacy step, treat as categories_select
        const success = await handleSupplierCategories(phone, message);
        return success ? 'Categories selected' : 'Invalid categories';
      }

      if (onboardingStep === 'awaiting_ktp' || onboardingStep === 'awaiting_selfie' || onboardingStep === 'verification') {
        console.log(`[Supplier] Step: photo upload (${onboardingStep})`);
        // verification is legacy step for photos
        // Handle photo upload
        if (payload.url) {
          console.log(`[Onboarding] Photo upload detected: ${payload.url}`);
          const success = await handlePhotoUpload(phone, payload.url);
          return success ? 'Photo verified' : 'Photo verification failed';
        } else {
          await sendWhatsApp({
            phone,
            message: '❌ Silakan kirim foto, bukan teks.',
          });
          return 'Waiting for photo';
        }
      }
    }

    // Handle courier flow
    if (userRole === 'courier') {
      if (onboardingStep === 'name_input') {
        const success = await handleCourierName(phone, message);
        return success ? 'Name saved' : 'Invalid name';
      }

      if (onboardingStep === 'location_share') {
        const success = await handleCourierAddress(phone, message);
        return success ? 'Address saved' : 'Invalid address';
      }

      if (onboardingStep === 'details_input') {
        const success = await handleCourierVehicle(phone, message);
        return success ? 'Vehicle selected' : 'Invalid vehicle';
      }
    }
  }

  // Check for LOKASI command: LOKASI#latitude#longitude
  if (message.startsWith('LOKASI#')) {
    const parts = message.split('#');
    if (parts.length === 3) {
      const latitude = parseFloat(parts[1]);
      const longitude = parseFloat(parts[2]);
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        console.log(`[LOKASI] Command detected: lat=${latitude}, lon=${longitude}`);
        return await handleLocationUpdate(phone, { latitude, longitude });
      } else {
        const errorMsg = `❌ Format lokasi salah. Gunakan: LOKASI#-6.2088#106.8456`;
        await sendWhatsApp({ phone, message: errorMsg });
        return errorMsg;
      }
    } else {
      const errorMsg = `❌ Format lokasi salah. Gunakan: LOKASI#latitude#longitude\nContoh: LOKASI#-6.2088#106.8456`;
      await sendWhatsApp({ phone, message: errorMsg });
      return errorMsg;
    }
  }
  
  // Check for BANTUAN (HELP) command
  if (message.toUpperCase() === 'BANTUAN' || message.toUpperCase() === 'HELP') {
    const helpMessage = `📖 *DAFTAR PERINTAH JURAGAN SUPLAI*\n\n1️⃣ *DAFTAR Registrasi*\nKetik DAFTAR untuk memulai pendaftaran\n\n2️⃣ *LOKASI Kirim Lokasi*\n\`LOKASI#latitude#longitude\`\nContoh: \`LOKASI#-6.2088#106.8456\`\n\n3️⃣ *BANTUAN Bantuan*\nKetik BANTUAN untuk tampilkan pesan ini\n\n📞 Butuh bantuan lebih lanjut?\nHubungi admin: +6285294131193`;
    await sendWhatsApp({ phone, message: helpMessage });
    return helpMessage;
  }
  
  // Check if this is a location update (bypass agent)
  if (payload.location) {
    return await handleLocationUpdate(phone, payload.location);
  }
  
  // If user is registered and not in onboarding, handle order commands
  if (onboardingStep === 'completed' && userRole) {
    console.log(`[Webhook] User ${phone} is registered (role: ${userRole}). Processing order commands...`);
    
    const normalizedMessage = message.toUpperCase().trim();
    
    // ========================
    // SUPPLIER COMMANDS
    // ========================
    if (userRole === 'supplier') {
      // DASHBOARD - Show supplier dashboard
      if (normalizedMessage === 'DASHBOARD' || normalizedMessage === 'MENU' || normalizedMessage === 'HOME') {
        return await handleSupplierDashboard(phone);
      }
      
      // ORDER - Show active orders
      if (normalizedMessage === 'ORDER' || normalizedMessage === 'PESANAN' || normalizedMessage === 'ORDERAN') {
        return await handleSupplierOrders(phone);
      }
      
      // RIWAYAT - Show order history
      if (normalizedMessage === 'RIWAYAT' || normalizedMessage === 'HISTORY' || normalizedMessage === 'HISTORI') {
        return await handleSupplierHistory(phone);
      }
      
      // SANGGUP KIRIM - Supplier accepts and will deliver themselves
      if (normalizedMessage.includes('SANGGUP KIRIM')) {
        return await handleSupplierResponse(phone, 'self');
      }
      
      // SANGGUP AMBIL - Supplier accepts but needs courier
      if (normalizedMessage.includes('SANGGUP AMBIL') || normalizedMessage === 'SANGGUP') {
        return await handleSupplierResponse(phone, 'courier');
      }
      
      // TIDAK - Supplier rejects
      if (normalizedMessage === 'TIDAK' || normalizedMessage.includes('TIDAK BISA') || normalizedMessage.includes('TOLAK')) {
        return await handleSupplierReject(phone);
      }
      
      // BATAL - Cancel active order
      if (normalizedMessage === 'BATAL' || normalizedMessage.includes('CANCEL')) {
        return await handleOrderCancel(phone, 'supplier');
      }
      
      // KIRIM - Supplier starts self-delivery (paid_held → shipping)
      if (normalizedMessage === 'KIRIM' || normalizedMessage === 'ANTAR' || normalizedMessage === 'MULAI KIRIM') {
        return await handleSupplierStartDelivery(phone);
      }
      
      // SELESAI - Supplier marks self-delivery as complete (shipping → delivered)
      if (normalizedMessage === 'SELESAI' || normalizedMessage === 'SUDAH SAMPAI') {
        return await handleSupplierDelivered(phone);
      }
      
      // SALDO - Check wallet balance
      if (normalizedMessage === 'SALDO' || normalizedMessage === 'BALANCE') {
        return await handleCheckBalance(phone);
      }
      
      // BANTUAN - Show help
      if (normalizedMessage === 'BANTUAN' || normalizedMessage === 'HELP' || normalizedMessage === '?') {
        return await handleSupplierHelp(phone);
      }
    }
    
    // ========================
    // COURIER COMMANDS
    // ========================
    if (userRole === 'courier') {
      // DASHBOARD - Show courier dashboard
      if (normalizedMessage === 'DASHBOARD' || normalizedMessage === 'MENU' || normalizedMessage === 'HOME') {
        return await handleCourierDashboard(phone);
      }
      
      // ORDER - Show active delivery jobs
      if (normalizedMessage === 'ORDER' || normalizedMessage === 'JOB' || normalizedMessage === 'ANTARAN') {
        return await handleCourierOrders(phone);
      }
      
      // RIWAYAT - Show delivery history
      if (normalizedMessage === 'RIWAYAT' || normalizedMessage === 'HISTORY' || normalizedMessage === 'HISTORI') {
        return await handleCourierHistory(phone);
      }
      
      // AMBIL - Courier accepts job
      if (normalizedMessage === 'AMBIL' || normalizedMessage.includes('TERIMA')) {
        return await handleCourierAccept(phone);
      }
      
      // BATAL - Cancel/reject job
      if (normalizedMessage === 'BATAL' || normalizedMessage.includes('DARURAT BATAL')) {
        return await handleOrderCancel(phone, 'courier');
      }
      
      // SELESAI - Mark delivery complete (alternative to QR scan)
      if (normalizedMessage === 'SELESAI' || normalizedMessage.includes('DELIVERED')) {
        return await handleCourierDelivered(phone);
      }
      
      // SALDO - Check wallet balance
      if (normalizedMessage === 'SALDO' || normalizedMessage === 'BALANCE') {
        return await handleCheckBalance(phone);
      }
      
      // BANTUAN - Show help
      if (normalizedMessage === 'BANTUAN' || normalizedMessage === 'HELP' || normalizedMessage === '?') {
        return await handleCourierHelp(phone);
      }
    }
    
    // If no command matched, use AI agent for natural conversation
    console.log(`[Webhook] No command matched, passing to AI agent...`);
    const agentResult = await runAgent(message, [], { phone, userId: userData?.id });
    
    if (agentResult.success && agentResult.response) {
      await sendWhatsApp({ phone, message: `✅ ${agentResult.response}` });
      return agentResult.response;
    }
  }
  
  // Default: log message
  console.log(`[Webhook] Non-command message from ${phone}: "${message.substring(0, 50)}..."`);
  return 'Message logged';
}

// ========================
// ORDER COMMAND HANDLERS
// ========================

/**
 * Handle supplier response (SANGGUP KIRIM / SANGGUP AMBIL)
 */
async function handleSupplierResponse(
  phone: string,
  deliveryMethod: 'self' | 'courier'
): Promise<string> {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // Get supplier by phone
    const { data: supplier } = await (supabase.from('users') as any)
      .select('id, name, phone, address, location, business_name')
      .eq('phone', phone)
      .eq('role', 'supplier')
      .single();
    
    if (!supplier) {
      await sendWhatsApp({ phone, message: '❌ Anda belum terdaftar sebagai supplier.' });
      return 'Supplier not found';
    }
    
    // Check supplier capacity (max 3 active orders)
    const { count: activeOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)
      .in('status', ['paid_held', 'shipping', 'waiting_payment']);
    
    if ((activeOrders || 0) >= 3) {
      await sendWhatsApp({ phone, message: templates.supplierBusy() });
      return 'Supplier at capacity';
    }
    
    // Find pending broadcast for this supplier
    const { data: broadcast } = await (supabase.from('order_broadcasts') as any)
      .select('order_id')
      .eq('supplier_id', supplier.id)
      .is('response', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!broadcast) {
      await sendWhatsApp({ phone, message: '❌ Tidak ada pesanan yang menunggu respons Anda.' });
      return 'No pending order';
    }
    
    const orderId = broadcast.order_id;
    
    // Get order details
    const { data: order } = await (supabase.from('orders') as any)
      .select('*, buyer:users!orders_buyer_id_fkey(phone, address, name)')
      .eq('id', orderId)
      .single();
    
    if (!order || order.status !== 'searching_supplier') {
      await sendWhatsApp({ phone, message: '❌ Order sudah diambil supplier lain.' });
      return 'Order already taken';
    }
    
    // Record broadcast response
    await (supabase.from('order_broadcasts') as any)
      .update({
        response: deliveryMethod === 'self' ? 'SANGGUP KIRIM' : 'SANGGUP AMBIL',
        responded_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('supplier_id', supplier.id);
    
    // Update order with supplier
    const updateData: Record<string, unknown> = {
      supplier_id: supplier.id,
      supplier_price: order.buyer_price,
      pickup_address: supplier.address,
    };
    
    if (deliveryMethod === 'self') {
      // Supplier will deliver themselves
      updateData.status = 'waiting_payment';
      updateData.shipping_cost = 0;
      
      await (supabase.from('orders') as any).update(updateData).eq('id', orderId);
      
      // Notify buyer
      const buyerData = order.buyer as { phone: string; name: string; address: string };
      const paymentUrl = `${baseUrl}/pay/${orderId}`;
      
      await sendWhatsApp({
        phone: buyerData.phone,
        message: `✅ *Supplier Ditemukan!*\n\n${supplier.business_name || supplier.name} sanggup menyediakan ${order.product_name} dan akan mengantarkan sendiri.\n\nHarga: Rp ${order.buyer_price.toLocaleString('id-ID')}\nOngkir: GRATIS\n\n💳 Bayar sekarang:\n${paymentUrl}`,
      });
      
      // Generate Google Maps link to buyer address
      const deliveryAddress = order.delivery_address || buyerData.address || '';
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddress)}`;
      
      await sendWhatsApp({
        phone,
        message: `✅ *Order Diterima!*\n\nOrder ID: #${orderId.substring(0, 8)}\n📦 ${order.product_name}\n💰 Harga: Rp ${order.buyer_price.toLocaleString('id-ID')}\n\n📍 *Alamat Antar:*\n${deliveryAddress}\n\n🗺️ *Lihat Rute:*\n${mapsUrl}\n\nMenunggu pembayaran dari pembeli...\nSetelah dibayar, balas *KIRIM* untuk mulai antar.`,
      });
      
      return 'Order accepted - self delivery';
      
    } else {
      // Need courier - search for available couriers
      updateData.status = 'negotiating_courier';
      await (supabase.from('orders') as any).update(updateData).eq('id', orderId);
      
      // Find couriers
      const lat = extractLat(supplier.location);
      const lng = extractLng(supplier.location);
      
      const couriersResult = JSON.parse(
        await findCouriers({ lat, lng, radiusKm: 5, maxResults: 5 })
      );
      
      if (!couriersResult.success || couriersResult.found === 0) {
        await (supabase.from('orders') as any)
          .update({ status: 'stuck_no_courier' })
          .eq('id', orderId);
        
        await sendWhatsApp({
          phone,
          message: `✅ Order diterima!\n\n⚠️ Tapi kurir belum tersedia di area Anda.\n\nPilihan:\n1. Antar sendiri (balas "SANGGUP KIRIM")\n2. Tunggu kurir tersedia\n3. Balas "BATAL" untuk tolak order`,
        });
        
        return 'Order accepted but no courier available';
      }
      
      // Broadcast to couriers
      const buyerData = order.buyer as { phone: string; address: string };
      
      for (const courier of couriersResult.couriers) {
        await (supabase.from('courier_broadcasts') as any).insert({
          order_id: orderId,
          courier_id: courier.id,
        });
        
        const shippingCost = Math.max(10000, Math.round(courier.distance_km * 5000));
        
        await sendWhatsApp({
          phone: courier.phone,
          message: templates.courierJobOffer({
            supplier_name: supplier.business_name || supplier.name || 'Supplier',
            supplier_address: supplier.address || 'Lihat lokasi',
            buyer_address: buyerData?.address || order.delivery_address || 'Lihat lokasi',
            distance_km: courier.distance_km,
            shipping_cost: shippingCost,
            product_name: order.product_name,
            quantity: order.quantity,
            unit: order.unit,
            weight_kg: order.weight_kg || 0,
            order_id: orderId,
          }),
        });
      }
      
      await sendWhatsApp({
        phone,
        message: `✅ Order diterima!\n\nOrder ID: #${orderId.substring(0, 8)}\nProduk: ${order.product_name}\n\n🚚 Mencari kurir (${couriersResult.found} kurir dihubungi)...\n\nAnda akan dinotifikasi saat kurir terkonfirmasi.`,
      });
      
      return `Order accepted - searching ${couriersResult.found} couriers`;
    }
    
  } catch (error) {
    console.error('[handleSupplierResponse] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Terjadi kesalahan. Coba lagi.' });
    return 'Error processing response';
  }
}

/**
 * Handle supplier rejection (TIDAK)
 */
async function handleSupplierReject(phone: string): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    // Get supplier
    const { data: supplier } = await (supabase.from('users') as any)
      .select('id')
      .eq('phone', phone)
      .eq('role', 'supplier')
      .single();
    
    if (!supplier) {
      await sendWhatsApp({ phone, message: '❌ Anda belum terdaftar sebagai supplier.' });
      return 'Supplier not found';
    }
    
    // Find pending broadcast
    const { data: broadcast } = await (supabase.from('order_broadcasts') as any)
      .select('order_id')
      .eq('supplier_id', supplier.id)
      .is('response', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!broadcast) {
      await sendWhatsApp({ phone, message: '❌ Tidak ada pesanan yang menunggu respons Anda.' });
      return 'No pending order';
    }
    
    const orderId = broadcast.order_id;
    
    // Record rejection
    await (supabase.from('order_broadcasts') as any)
      .update({
        response: 'TIDAK',
        responded_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('supplier_id', supplier.id);
    
    // Check if all suppliers rejected
    const { data: broadcasts } = await (supabase.from('order_broadcasts') as any)
      .select('response')
      .eq('order_id', orderId);
    
    const allResponded = broadcasts?.every((b: { response: string | null }) => b.response !== null);
    const allRejected = broadcasts?.every((b: { response: string | null }) => b.response === 'TIDAK');
    
    if (allResponded && allRejected) {
      await (supabase.from('orders') as any)
        .update({ status: 'failed_no_supplier' })
        .eq('id', orderId);
      
      // Notify buyer
      const { data: order } = await (supabase.from('orders') as any)
        .select('buyer:users!orders_buyer_id_fkey(phone)')
        .eq('id', orderId)
        .single();
      
      if (order?.buyer) {
        await sendWhatsApp({
          phone: (order.buyer as { phone: string }).phone,
          message: `😔 Maaf, tidak ada supplier yang tersedia untuk pesanan Anda saat ini.\n\nCoba lagi nanti atau ubah lokasi/produk.`,
        });
      }
    }
    
    await sendWhatsApp({ phone, message: '✅ Respons Anda dicatat. Terima kasih!' });
    return 'Rejection recorded';
    
  } catch (error) {
    console.error('[handleSupplierReject] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Terjadi kesalahan. Coba lagi.' });
    return 'Error processing rejection';
  }
}

/**
 * Handle courier accepting a job (AMBIL)
 */
async function handleCourierAccept(phone: string): Promise<string> {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // Get courier
    const { data: courier } = await (supabase.from('users') as any)
      .select('id, name, phone, is_busy')
      .eq('phone', phone)
      .eq('role', 'courier')
      .single();
    
    if (!courier) {
      await sendWhatsApp({ phone, message: '❌ Anda belum terdaftar sebagai kurir.' });
      return 'Courier not found';
    }
    
    if (courier.is_busy) {
      await sendWhatsApp({ phone, message: '❌ Anda sedang menangani order lain. Selesaikan dulu sebelum ambil job baru.' });
      return 'Courier busy';
    }
    
    // Find pending broadcast
    const { data: broadcast } = await (supabase.from('courier_broadcasts') as any)
      .select('order_id')
      .eq('courier_id', courier.id)
      .is('response', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!broadcast) {
      await sendWhatsApp({ phone, message: '❌ Tidak ada job yang menunggu respons Anda.' });
      return 'No pending job';
    }
    
    const orderId = broadcast.order_id;
    
    // Check if order still available
    const { data: order } = await (supabase.from('orders') as any)
      .select(`
        *,
        supplier:users!orders_supplier_id_fkey(id, name, phone, address, business_name),
        buyer:users!orders_buyer_id_fkey(id, phone, address)
      `)
      .eq('id', orderId)
      .eq('status', 'negotiating_courier')
      .single();
    
    if (!order) {
      await sendWhatsApp({ phone, message: '❌ Job sudah diambil kurir lain.' });
      return 'Job already taken';
    }
    
    // Calculate shipping cost
    const shippingCost = Math.max(10000, Math.round((order.distance_km || 5) * 5000));
    
    // Mark courier as busy
    await (supabase.from('users') as any)
      .update({ is_busy: true })
      .eq('id', courier.id);
    
    // Update order with courier
    await (supabase.from('orders') as any)
      .update({
        courier_id: courier.id,
        shipping_cost: shippingCost,
        status: 'waiting_payment',
      })
      .eq('id', orderId);
    
    // Record response
    await (supabase.from('courier_broadcasts') as any)
      .update({
        response: 'AMBIL',
        responded_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('courier_id', courier.id);
    
    const supplierData = order.supplier as { id: string; name: string; phone: string; address: string; business_name: string };
    const buyerData = order.buyer as { id: string; phone: string; address: string };
    
    // Send tracking URL to courier
    const trackingUrl = `${baseUrl}/track/${orderId}`;
    
    await sendWhatsApp({
      phone,
      message: `✅ *Job Diterima!*\n\nOrder ID: #${orderId.substring(0, 8)}\nOngkir: Rp ${shippingCost.toLocaleString('id-ID')}\n\n📍 *Alamat Pickup:*\n${supplierData.address || 'Hubungi supplier'}\n${supplierData.business_name || supplierData.name} (${supplierData.phone})\n\n📍 *Alamat Antar:*\n${order.delivery_address || buyerData.address}\n\n🗺️ *Link Tracking:*\n${trackingUrl}\n\nSetelah pickup, kirim foto barang dan update lokasi Anda.`,
    });
    
    // Notify supplier
    await sendWhatsApp({
      phone: supplierData.phone,
      message: `🚚 *Kurir Dikonfirmasi!*\n\nKurir: ${courier.name}\nNo HP: ${courier.phone}\n\n📦 Mohon siapkan barang.\nKurir akan segera menuju lokasi Anda.\n\n🗺️ Lacak: ${trackingUrl}`,
    });
    
    // Notify buyer
    const paymentUrl = `${baseUrl}/pay/${orderId}`;
    const totalAmount = order.buyer_price + (order.service_fee || 0) + shippingCost;
    
    await sendWhatsApp({
      phone: buyerData.phone,
      message: `✅ *Kurir Ditemukan!*\n\n${supplierData.business_name || supplierData.name} akan menyediakan ${order.product_name}.\nKurir ${courier.name} akan mengantarkan.\n\nHarga: Rp ${order.buyer_price.toLocaleString('id-ID')}\nOngkir: Rp ${shippingCost.toLocaleString('id-ID')}\nTotal: Rp ${totalAmount.toLocaleString('id-ID')}\n\n💳 Bayar sekarang:\n${paymentUrl}`,
    });
    
    return 'Job accepted';
    
  } catch (error) {
    console.error('[handleCourierAccept] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Terjadi kesalahan. Coba lagi.' });
    return 'Error processing acceptance';
  }
}

/**
 * Handle order cancellation (BATAL)
 */
async function handleOrderCancel(phone: string, role: 'supplier' | 'courier'): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    // Get user
    const { data: user } = await (supabase.from('users') as any)
      .select('id, name')
      .eq('phone', phone)
      .eq('role', role)
      .single();
    
    if (!user) {
      await sendWhatsApp({ phone, message: '❌ User tidak ditemukan.' });
      return 'User not found';
    }
    
    // Find active order
    const columnName = role === 'supplier' ? 'supplier_id' : 'courier_id';
    const { data: order } = await (supabase.from('orders') as any)
      .select('id, status, buyer:users!orders_buyer_id_fkey(phone)')
      .eq(columnName, user.id)
      .in('status', ['searching_supplier', 'negotiating_courier', 'waiting_payment', 'paid_held'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!order) {
      await sendWhatsApp({ phone, message: '❌ Tidak ada order aktif untuk dibatalkan.' });
      return 'No active order';
    }
    
    // Can only cancel before shipping
    if (order.status === 'shipping' || order.status === 'delivered') {
      await sendWhatsApp({ phone, message: '❌ Order sudah dalam pengiriman, tidak bisa dibatalkan.' });
      return 'Cannot cancel - already shipping';
    }
    
    // Update order status
    const updateData: Record<string, unknown> = {
      status: 'cancelled_by_buyer', // Reusing status for simplicity
    };
    
    if (role === 'courier') {
      updateData.courier_id = null;
      updateData.status = 'negotiating_courier'; // Go back to finding courier
      
      // Mark courier as not busy
      await (supabase.from('users') as any)
        .update({ is_busy: false })
        .eq('id', user.id);
    }
    
    await (supabase.from('orders') as any).update(updateData).eq('id', order.id);
    
    // Notify buyer
    const buyerData = order.buyer as { phone: string };
    if (buyerData?.phone) {
      const reason = role === 'supplier' ? 'Supplier' : 'Kurir';
      await sendWhatsApp({
        phone: buyerData.phone,
        message: `⚠️ ${reason} membatalkan order #${order.id.substring(0, 8)}.\n\nKami sedang mencari ${role === 'supplier' ? 'supplier' : 'kurir'} pengganti...`,
      });
    }
    
    await sendWhatsApp({ phone, message: '✅ Order berhasil dibatalkan.' });
    return 'Order cancelled';
    
  } catch (error) {
    console.error('[handleOrderCancel] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Terjadi kesalahan. Coba lagi.' });
    return 'Error cancelling order';
  }
}

/**
 * Handle supplier starting self-delivery (KIRIM)
 * For orders where supplier chose "SANGGUP KIRIM" and will deliver themselves
 */
async function handleSupplierStartDelivery(phone: string): Promise<string> {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // Get supplier
    const { data: supplier } = await (supabase.from('users') as any)
      .select('id, name, business_name')
      .eq('phone', phone)
      .eq('role', 'supplier')
      .single();
    
    if (!supplier) {
      await sendWhatsApp({ phone, message: '❌ Anda belum terdaftar sebagai supplier.' });
      return 'Supplier not found';
    }
    
    // Find order that is paid_held and has no courier (self-delivery)
    const { data: order } = await (supabase.from('orders') as any)
      .select('id, product_name, delivery_address, buyer:users!orders_buyer_id_fkey(phone, name)')
      .eq('supplier_id', supplier.id)
      .eq('status', 'paid_held')
      .is('courier_id', null) // Self-delivery = no courier
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!order) {
      await sendWhatsApp({ phone, message: '❌ Tidak ada pesanan yang siap diantar.\n\nPastikan pembeli sudah bayar dan Anda memilih antar sendiri.' });
      return 'No order ready for self-delivery';
    }
    
    // Update order status to shipping
    await (supabase.from('orders') as any)
      .update({
        status: 'shipping',
        pickup_at: new Date().toISOString(),
      })
      .eq('id', order.id);
    
    // Notify buyer
    const buyerData = order.buyer as { phone: string; name: string };
    const trackingUrl = `${baseUrl}/track/${order.id}`;
    const supplierTrackingUrl = `${baseUrl}/track/${order.id}/courier`;
    
    await sendWhatsApp({
      phone: buyerData.phone,
      message: `🚚 *Barang Sedang Dikirim!*\n\nSupplier ${supplier.business_name || supplier.name} sedang mengantar pesanan Anda.\n\n📦 ${order.product_name}\n📍 ${order.delivery_address}\n\n🗺️ Lacak: ${trackingUrl}\n\nSiapkan diri untuk menerima barang!`,
    });
    
    await sendWhatsApp({
      phone,
      message: `✅ *Pengantaran Dimulai!*\n\nOrder ID: #${order.id.substring(0, 8)}\n📦 ${order.product_name}\n📍 ${order.delivery_address}\n\n🗺️ *Buka link ini untuk:*\n• Share lokasi real-time ke pembeli\n• Lihat rute ke alamat tujuan\n${supplierTrackingUrl}\n\nSetelah barang sampai, balas *SELESAI* untuk konfirmasi.`,
    });
    
    return 'Self-delivery started';
    
  } catch (error) {
    console.error('[handleSupplierStartDelivery] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Terjadi kesalahan. Coba lagi.' });
    return 'Error starting delivery';
  }
}

/**
 * Handle supplier marking self-delivery as complete (SELESAI)
 * For orders where supplier delivered themselves
 */
async function handleSupplierDelivered(phone: string): Promise<string> {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // Get supplier
    const { data: supplier } = await (supabase.from('users') as any)
      .select('id, name, business_name')
      .eq('phone', phone)
      .eq('role', 'supplier')
      .single();
    
    if (!supplier) {
      await sendWhatsApp({ phone, message: '❌ Anda belum terdaftar sebagai supplier.' });
      return 'Supplier not found';
    }
    
    // Find shipping order with self-delivery (no courier)
    const { data: order } = await (supabase.from('orders') as any)
      .select('id, product_name, buyer:users!orders_buyer_id_fkey(phone, name)')
      .eq('supplier_id', supplier.id)
      .eq('status', 'shipping')
      .is('courier_id', null) // Self-delivery = no courier
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!order) {
      await sendWhatsApp({ phone, message: '❌ Tidak ada pesanan yang sedang dalam pengiriman.\n\nBalas *KIRIM* dulu untuk mulai antar.' });
      return 'No shipping order';
    }
    
    // Update order status to delivered
    await (supabase.from('orders') as any)
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', order.id);
    
    // Notify buyer to confirm
    const buyerData = order.buyer as { phone: string; name: string };
    const confirmUrl = `${baseUrl}/confirm/${order.id}`;
    
    await sendWhatsApp({
      phone: buyerData.phone,
      message: `📦 *Barang Sudah Sampai!*\n\nSupplier melaporkan pesanan sudah dikirim.\n\n✅ Konfirmasi penerimaan:\n${confirmUrl}\n\nAtau scan QR dari supplier.`,
    });
    
    await sendWhatsApp({
      phone,
      message: `✅ *Pengantaran Selesai!*\n\nOrder ID: #${order.id.substring(0, 8)}\n\nMinta pembeli untuk konfirmasi di:\n${confirmUrl}\n\nAtau tunjukkan QR code di link tersebut.\n\n💰 Dana akan diteruskan setelah konfirmasi.`,
    });
    
    return 'Self-delivery marked as complete';
    
  } catch (error) {
    console.error('[handleSupplierDelivered] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Terjadi kesalahan. Coba lagi.' });
    return 'Error marking delivery';
  }
}

/**
 * Handle courier marking delivery as complete (SELESAI)
 */
async function handleCourierDelivered(phone: string): Promise<string> {
  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // Get courier
    const { data: courier } = await (supabase.from('users') as any)
      .select('id, name')
      .eq('phone', phone)
      .eq('role', 'courier')
      .single();
    
    if (!courier) {
      await sendWhatsApp({ phone, message: '❌ Anda belum terdaftar sebagai kurir.' });
      return 'Courier not found';
    }
    
    // Find shipping order
    const { data: order } = await (supabase.from('orders') as any)
      .select('id, buyer:users!orders_buyer_id_fkey(phone)')
      .eq('courier_id', courier.id)
      .eq('status', 'shipping')
      .single();
    
    if (!order) {
      await sendWhatsApp({ phone, message: '❌ Tidak ada order yang sedang dalam pengiriman.' });
      return 'No shipping order';
    }
    
    // Update order status
    await (supabase.from('orders') as any)
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', order.id);
    
    // Mark courier as not busy
    await (supabase.from('users') as any)
      .update({ is_busy: false })
      .eq('id', courier.id);
    
    // Notify buyer to confirm
    const buyerData = order.buyer as { phone: string };
    const confirmUrl = `${baseUrl}/confirm/${order.id}`;
    
    await sendWhatsApp({
      phone: buyerData.phone,
      message: `📦 *Barang Sudah Sampai!*\n\nKurir melaporkan pesanan sudah dikirim.\n\n✅ Konfirmasi penerimaan:\n${confirmUrl}\n\nAtau scan QR dari kurir.`,
    });
    
    await sendWhatsApp({
      phone,
      message: `✅ Status diupdate ke "Delivered".\n\nMinta pembeli untuk konfirmasi di:\n${confirmUrl}\n\nDana akan diteruskan setelah konfirmasi.`,
    });
    
    return 'Delivery marked as complete';
    
  } catch (error) {
    console.error('[handleCourierDelivered] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Terjadi kesalahan. Coba lagi.' });
    return 'Error marking delivery';
  }
}

/**
 * Handle balance check (SALDO)
 */
async function handleCheckBalance(phone: string): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    // Get user
    const { data: user } = await (supabase.from('users') as any)
      .select('id, name, role')
      .eq('phone', phone)
      .single();
    
    if (!user) {
      await sendWhatsApp({ phone, message: '❌ User tidak ditemukan.' });
      return 'User not found';
    }
    
    // Get wallet
    const { data: wallet } = await (supabase
      .from('wallets') as any)
      .select('available, escrow_held, total_earned')
      .eq('user_id', user.id)
      .single();
    
    const walletData = wallet as { available: number; escrow_held: number; total_earned: number } | null;
    const available = walletData?.available || 0;
    const escrow = walletData?.escrow_held || 0;
    const totalEarned = walletData?.total_earned || 0;
    
    const message = `💰 *Saldo ${user.name}*\n\n✅ Tersedia: Rp ${available.toLocaleString('id-ID')}\n🔒 Ditahan: Rp ${escrow.toLocaleString('id-ID')}\n📊 Total Pendapatan: Rp ${totalEarned.toLocaleString('id-ID')}\n\nSaldo tersedia bisa ditarik kapan saja.`;
    
    await sendWhatsApp({ phone, message: `✅ ${message}` });
    return 'Balance checked';
    
  } catch (error) {
    console.error('[handleCheckBalance] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Terjadi kesalahan. Coba lagi.' });
    return 'Error checking balance';
  }
}

// ========================
// SUPPLIER DASHBOARD HANDLERS
// ========================

/**
 * Handle supplier dashboard (DASHBOARD)
 */
async function handleSupplierDashboard(phone: string): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    const { data: user } = await (supabase.from('users') as any)
      .select('id, name, business_name')
      .eq('phone', phone)
      .eq('role', 'supplier')
      .single();
    
    if (!user) {
      await sendWhatsApp({ phone, message: '❌ Supplier tidak ditemukan.' });
      return 'Supplier not found';
    }
    
    // Get wallet balance
    const { data: wallet } = await (supabase.from('wallets') as any)
      .select('available, escrow_held')
      .eq('user_id', user.id)
      .single();
    
    const available = wallet?.available || 0;
    const escrow = wallet?.escrow_held || 0;
    
    // Count active orders
    const { count: activeOrders } = await (supabase.from('orders') as any)
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', user.id)
      .in('status', ['waiting_payment', 'paid_held', 'shipping']);
    
    // Count completed orders this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: monthlyOrders } = await (supabase.from('orders') as any)
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', startOfMonth.toISOString());
    
    const dashboardMessage = `🏪 *Dashboard Supplier*\n━━━━━━━━━━━━━━━\n\n👋 Halo, *${user.business_name || user.name}*!\n\n💰 *Saldo*\n├ Tersedia: Rp ${available.toLocaleString('id-ID')}\n└ Ditahan: Rp ${escrow.toLocaleString('id-ID')}\n\n📦 *Order*\n├ Aktif: ${activeOrders || 0} pesanan\n└ Bulan ini: ${monthlyOrders || 0} selesai\n\n━━━━━━━━━━━━━━━\n📌 *Perintah:*\n• ORDER - Lihat pesanan aktif\n• RIWAYAT - Lihat riwayat\n• SALDO - Cek saldo detail\n• BANTUAN - Menu lengkap`;
    
    await sendWhatsApp({ phone, message: `✅ ${dashboardMessage}` });
    return 'Supplier dashboard sent';
    
  } catch (error) {
    console.error('[handleSupplierDashboard] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Gagal memuat dashboard.' });
    return 'Error loading dashboard';
  }
}

/**
 * Handle supplier active orders (ORDER)
 */
async function handleSupplierOrders(phone: string): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    const { data: user } = await (supabase.from('users') as any)
      .select('id, name')
      .eq('phone', phone)
      .eq('role', 'supplier')
      .single();
    
    if (!user) {
      await sendWhatsApp({ phone, message: '❌ Supplier tidak ditemukan.' });
      return 'Supplier not found';
    }
    
    // Get active orders
    const { data: orders } = await (supabase.from('orders') as any)
      .select('id, product_name, quantity, buyer_price, status, created_at, buyer:users!orders_buyer_id_fkey(name)')
      .eq('supplier_id', user.id)
      .in('status', ['searching_supplier', 'negotiating_courier', 'waiting_payment', 'paid_held', 'shipping'])
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!orders || orders.length === 0) {
      await sendWhatsApp({ phone, message: '✅ Tidak ada pesanan aktif saat ini.\n\nTunggu broadcast order dari sistem!' });
      return 'No active orders';
    }
    
    const statusEmoji: Record<string, string> = {
      'searching_supplier': '🔍',
      'negotiating_courier': '🚚',
      'waiting_payment': '💳',
      'paid_held': '💰',
      'shipping': '📦',
    };
    
    const statusText: Record<string, string> = {
      'searching_supplier': 'Mencari Supplier',
      'negotiating_courier': 'Mencari Kurir',
      'waiting_payment': 'Menunggu Bayar',
      'paid_held': 'Dibayar',
      'shipping': 'Dikirim',
    };
    
    let orderList = '📦 *Pesanan Aktif*\n━━━━━━━━━━━━━━━\n\n';
    
    orders.forEach((order: any, index: number) => {
      const buyerName = order.buyer?.name || 'Buyer';
      const emoji = statusEmoji[order.status] || '📋';
      const status = statusText[order.status] || order.status;
      
      orderList += `${index + 1}. *#${order.id.substring(0, 8)}*\n`;
      orderList += `   ${order.product_name} x${order.quantity}\n`;
      orderList += `   💵 Rp ${order.buyer_price.toLocaleString('id-ID')}\n`;
      orderList += `   ${emoji} ${status}\n`;
      orderList += `   👤 ${buyerName}\n\n`;
    });
    
    orderList += '━━━━━━━━━━━━━━━\nBalas DASHBOARD untuk kembali';
    
    await sendWhatsApp({ phone, message: `✅ ${orderList}` });
    return 'Supplier orders sent';
    
  } catch (error) {
    console.error('[handleSupplierOrders] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Gagal memuat pesanan.' });
    return 'Error loading orders';
  }
}

/**
 * Handle supplier order history (RIWAYAT)
 */
async function handleSupplierHistory(phone: string): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    const { data: user } = await (supabase.from('users') as any)
      .select('id')
      .eq('phone', phone)
      .eq('role', 'supplier')
      .single();
    
    if (!user) {
      await sendWhatsApp({ phone, message: '❌ Supplier tidak ditemukan.' });
      return 'Supplier not found';
    }
    
    // Get completed/cancelled orders
    const { data: orders } = await (supabase.from('orders') as any)
      .select('id, product_name, buyer_price, status, completed_at, cancelled_at')
      .eq('supplier_id', user.id)
      .in('status', ['completed', 'cancelled_by_buyer', 'cancelled_by_supplier', 'refunded'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!orders || orders.length === 0) {
      await sendWhatsApp({ phone, message: '✅ Belum ada riwayat pesanan.\n\nSelesaikan pesanan untuk melihat riwayat!' });
      return 'No order history';
    }
    
    let historyList = '📜 *Riwayat Pesanan*\n━━━━━━━━━━━━━━━\n\n';
    
    orders.forEach((order: any, index: number) => {
      const isCompleted = order.status === 'completed';
      const emoji = isCompleted ? '✅' : '❌';
      const date = order.completed_at || order.cancelled_at;
      const dateStr = date ? new Date(date).toLocaleDateString('id-ID') : '-';
      
      historyList += `${index + 1}. ${emoji} *#${order.id.substring(0, 8)}*\n`;
      historyList += `   ${order.product_name}\n`;
      historyList += `   💵 Rp ${order.buyer_price.toLocaleString('id-ID')}\n`;
      historyList += `   📅 ${dateStr}\n\n`;
    });
    
    historyList += '━━━━━━━━━━━━━━━\nBalas DASHBOARD untuk kembali';
    
    await sendWhatsApp({ phone, message: `✅ ${historyList}` });
    return 'Supplier history sent';
    
  } catch (error) {
    console.error('[handleSupplierHistory] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Gagal memuat riwayat.' });
    return 'Error loading history';
  }
}

/**
 * Handle supplier help (BANTUAN)
 */
async function handleSupplierHelp(phone: string): Promise<string> {
  const helpMessage = `📚 *Bantuan Supplier*\n━━━━━━━━━━━━━━━\n\n📌 *Perintah Tersedia:*\n\n🏠 *DASHBOARD* - Menu utama\n📦 *ORDER* - Lihat pesanan aktif\n📜 *RIWAYAT* - Riwayat pesanan\n💰 *SALDO* - Cek saldo\n\n📨 *Respons Order:*\n✅ *SANGGUP KIRIM* - Terima & antar sendiri\n✅ *SANGGUP AMBIL* - Terima, butuh kurir\n❌ *TIDAK* - Tolak pesanan\n🚫 *BATAL* - Batalkan order aktif\n\n🚚 *Antar Sendiri:*\n📤 *KIRIM* - Mulai pengantaran\n✅ *SELESAI* - Barang sudah sampai\n\n━━━━━━━━━━━━━━━\n❓ Butuh bantuan lain?\nHubungi admin: 0812-xxxx-xxxx`;
  
  await sendWhatsApp({ phone, message: `✅ ${helpMessage}` });
  return 'Supplier help sent';
}

// ========================
// COURIER DASHBOARD HANDLERS
// ========================

/**
 * Handle courier dashboard (DASHBOARD)
 */
async function handleCourierDashboard(phone: string): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    const { data: user } = await (supabase.from('users') as any)
      .select('id, name, is_busy, vehicle')
      .eq('phone', phone)
      .eq('role', 'courier')
      .single();
    
    if (!user) {
      await sendWhatsApp({ phone, message: '❌ Kurir tidak ditemukan.' });
      return 'Courier not found';
    }
    
    // Get wallet balance
    const { data: wallet } = await (supabase.from('wallets') as any)
      .select('available, escrow_held')
      .eq('user_id', user.id)
      .single();
    
    const available = wallet?.available || 0;
    const escrow = wallet?.escrow_held || 0;
    
    // Count active deliveries
    const { count: activeDeliveries } = await (supabase.from('orders') as any)
      .select('*', { count: 'exact', head: true })
      .eq('courier_id', user.id)
      .in('status', ['paid_held', 'shipping']);
    
    // Count completed this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: monthlyDeliveries } = await (supabase.from('orders') as any)
      .select('*', { count: 'exact', head: true })
      .eq('courier_id', user.id)
      .eq('status', 'completed')
      .gte('delivered_at', startOfMonth.toISOString());
    
    const statusEmoji = user.is_busy ? '🔴' : '🟢';
    const statusText = user.is_busy ? 'Sedang Antar' : 'Tersedia';
    const vehicleEmoji = user.vehicle === 'motor' ? '🏍️' : '🚙';
    
    const dashboardMessage = `🚚 *Dashboard Kurir*\n━━━━━━━━━━━━━━━\n\n👋 Halo, *${user.name}*!\n${statusEmoji} Status: ${statusText}\n${vehicleEmoji} Kendaraan: ${user.vehicle || 'N/A'}\n\n💰 *Saldo*\n├ Tersedia: Rp ${available.toLocaleString('id-ID')}\n└ Ditahan: Rp ${escrow.toLocaleString('id-ID')}\n\n📦 *Pengiriman*\n├ Aktif: ${activeDeliveries || 0} job\n└ Bulan ini: ${monthlyDeliveries || 0} selesai\n\n━━━━━━━━━━━━━━━\n📌 *Perintah:*\n• ORDER - Lihat job aktif\n• RIWAYAT - Lihat riwayat\n• SALDO - Cek saldo detail\n• BANTUAN - Menu lengkap`;
    
    await sendWhatsApp({ phone, message: `✅ ${dashboardMessage}` });
    return 'Courier dashboard sent';
    
  } catch (error) {
    console.error('[handleCourierDashboard] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Gagal memuat dashboard.' });
    return 'Error loading dashboard';
  }
}

/**
 * Handle courier active orders (ORDER)
 */
async function handleCourierOrders(phone: string): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    const { data: user } = await (supabase.from('users') as any)
      .select('id, name')
      .eq('phone', phone)
      .eq('role', 'courier')
      .single();
    
    if (!user) {
      await sendWhatsApp({ phone, message: '❌ Kurir tidak ditemukan.' });
      return 'Courier not found';
    }
    
    // Get active delivery jobs
    const { data: orders } = await (supabase.from('orders') as any)
      .select(`
        id, product_name, shipping_cost, status, 
        supplier:users!orders_supplier_id_fkey(name, address, business_name),
        buyer:users!orders_buyer_id_fkey(name)
      `)
      .eq('courier_id', user.id)
      .in('status', ['paid_held', 'shipping'])
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!orders || orders.length === 0) {
      await sendWhatsApp({ phone, message: '✅ Tidak ada job aktif saat ini.\n\nTunggu penawaran job dari sistem!' });
      return 'No active orders';
    }
    
    const statusEmoji: Record<string, string> = {
      'paid_held': '💰',
      'shipping': '📦',
    };
    
    const statusText: Record<string, string> = {
      'paid_held': 'Siap Pickup',
      'shipping': 'Sedang Antar',
    };
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let orderList = '🚚 *Job Aktif*\n━━━━━━━━━━━━━━━\n\n';
    
    orders.forEach((order: any, index: number) => {
      const supplierName = order.supplier?.business_name || order.supplier?.name || 'Supplier';
      const supplierAddress = order.supplier?.address || 'Hubungi supplier';
      const emoji = statusEmoji[order.status] || '📋';
      const status = statusText[order.status] || order.status;
      
      orderList += `${index + 1}. *#${order.id.substring(0, 8)}*\n`;
      orderList += `   ${order.product_name}\n`;
      orderList += `   💵 Ongkir: Rp ${order.shipping_cost?.toLocaleString('id-ID') || 0}\n`;
      orderList += `   ${emoji} ${status}\n`;
      orderList += `   📍 ${supplierAddress.substring(0, 30)}...\n`;
      orderList += `   🗺️ ${baseUrl}/track/${order.id}/courier\n\n`;
    });
    
    orderList += '━━━━━━━━━━━━━━━\n• SELESAI - Tandai selesai antar\n• Balas DASHBOARD untuk kembali';
    
    await sendWhatsApp({ phone, message: `✅ ${orderList}` });
    return 'Courier orders sent';
    
  } catch (error) {
    console.error('[handleCourierOrders] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Gagal memuat job.' });
    return 'Error loading orders';
  }
}

/**
 * Handle courier delivery history (RIWAYAT)
 */
async function handleCourierHistory(phone: string): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    const { data: user } = await (supabase.from('users') as any)
      .select('id')
      .eq('phone', phone)
      .eq('role', 'courier')
      .single();
    
    if (!user) {
      await sendWhatsApp({ phone, message: '❌ Kurir tidak ditemukan.' });
      return 'Courier not found';
    }
    
    // Get completed/cancelled deliveries
    const { data: orders } = await (supabase.from('orders') as any)
      .select('id, product_name, shipping_cost, status, delivered_at')
      .eq('courier_id', user.id)
      .in('status', ['completed', 'delivered'])
      .order('delivered_at', { ascending: false })
      .limit(10);
    
    if (!orders || orders.length === 0) {
      await sendWhatsApp({ phone, message: '✅ Belum ada riwayat pengantaran.\n\nSelesaikan job untuk melihat riwayat!' });
      return 'No delivery history';
    }
    
    let historyList = '📜 *Riwayat Pengantaran*\n━━━━━━━━━━━━━━━\n\n';
    
    let totalEarned = 0;
    orders.forEach((order: any, index: number) => {
      const dateStr = order.delivered_at 
        ? new Date(order.delivered_at).toLocaleDateString('id-ID') 
        : '-';
      const ongkir = order.shipping_cost || 0;
      totalEarned += ongkir;
      
      historyList += `${index + 1}. ✅ *#${order.id.substring(0, 8)}*\n`;
      historyList += `   ${order.product_name}\n`;
      historyList += `   💵 Rp ${ongkir.toLocaleString('id-ID')}\n`;
      historyList += `   📅 ${dateStr}\n\n`;
    });
    
    historyList += `━━━━━━━━━━━━━━━\n💰 Total: Rp ${totalEarned.toLocaleString('id-ID')}\n\nBalas DASHBOARD untuk kembali`;
    
    await sendWhatsApp({ phone, message: `✅ ${historyList}` });
    return 'Courier history sent';
    
  } catch (error) {
    console.error('[handleCourierHistory] Error:', error);
    await sendWhatsApp({ phone, message: '❌ Gagal memuat riwayat.' });
    return 'Error loading history';
  }
}

/**
 * Handle courier help (BANTUAN)
 */
async function handleCourierHelp(phone: string): Promise<string> {
  const helpMessage = `📚 *Bantuan Kurir*\n━━━━━━━━━━━━━━━\n\n📌 *Perintah Tersedia:*\n\n🏠 *DASHBOARD* - Menu utama\n📦 *ORDER* - Lihat job aktif\n📜 *RIWAYAT* - Riwayat pengantaran\n💰 *SALDO* - Cek saldo\n\n📨 *Respons Job:*\n✅ *AMBIL* - Terima job\n✅ *SELESAI* - Tandai selesai antar\n🚫 *BATAL* - Batalkan job\n\n━━━━━━━━━━━━━━━\n❓ Butuh bantuan lain?\nHubungi admin: 0812-xxxx-xxxx`;
  
  await sendWhatsApp({ phone, message: `✅ ${helpMessage}` });
  return 'Courier help sent';
}

// Helper functions for location extraction
function extractLat(location: unknown): number {
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

/**
 * Handle live location update from courier/buyer
 * Saves location to database and sends confirmation
 */
async function handleLocationUpdate(
  phone: string,
  location: { latitude: number; longitude: number }
): Promise<string> {
  const supabase = createAdminClient();
  
  console.log(`[LOCATION] Received from ${phone}: lat=${location.latitude}, lon=${location.longitude}`);
  
  try {
    // Validate location coordinates
    if (!location.latitude || !location.longitude) {
      throw new Error('Invalid location coordinates');
    }
    
    // Update user's location with retry logic
    let lastError: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[LOCATION] Attempt ${attempt}/3: Saving location for ${phone}`);
        
        const { data, error } = await (supabase
          .from('users') as any)
          .update({
            location: `POINT(${location.longitude} ${location.latitude})`,
            updated_at: new Date().toISOString(),
          })
          .eq('phone', phone)
          .select();
        
        if (error) {
          lastError = error;
          throw error;
        }
        
        console.log(`[LOCATION] Successfully saved location for ${phone}`);
        
        // Send confirmation via WhatsApp
        const confirmMsg = `✅ Lokasi Anda berhasil tersimpan!\n\nSiap untuk melayani pesanan. Terima kasih!`;
        await sendWhatsApp({ phone, message: confirmMsg });
        
        return confirmMsg;
        
      } catch (error) {
        lastError = error;
        console.warn(`[LOCATION] Attempt ${attempt}/3 failed for ${phone}:`, error);
        
        if (attempt < 3) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // All retries failed
    console.error(`[LOCATION] All 3 retry attempts failed for ${phone}`);
    const errorMsg = `Maaf, gagal menyimpan lokasi: ${lastError?.message || 'Network error'}`;
    await sendWhatsApp({ phone, message: errorMsg });
    return errorMsg;
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[LOCATION] Unexpected error for ${phone}:`, error);
    await sendWhatsApp({ phone, message: `Maaf, terjadi kesalahan: ${errorMsg}` });
    return `Error: ${errorMsg}`;
  }
}

/**
 * POST handler for Fonnte webhook
 */
export async function POST(request: NextRequest) {
  const requestId = `req-${Date.now()}`;
  
  try {
    const payload = await request.json() as FonnteWebhookPayload;
    
    // ✅ Log incoming payload untuk debugging
    console.log(`\n========== WEBHOOK PAYLOAD ${requestId} ==========`);
    console.log(`[${requestId}] RAW PAYLOAD:`, JSON.stringify(payload, null, 2));
    console.log(`[${requestId}] TYPE field:`, payload.type);
    console.log(`[${requestId}] URL field:`, payload.url);
    console.log(`[${requestId}] MESSAGE field:`, payload.message?.substring(0, 100));
    console.log(`[${requestId}] FILENAME field:`, (payload as any).filename);
    console.log(`[${requestId}] ALL KEYS:`, Object.keys(payload));
    console.log(`==========================================\n`);
    
    // Handle connection status (connect/disconnect)
    if ((payload as any).status && ((payload as any).status === 'connect' || (payload as any).status === 'disconnect')) {
      console.log(`[${requestId}] Connection: ${(payload as any).status}`);
      return NextResponse.json({ success: true, type: 'connection', requestId }, { status: 200 });
    }
    
    // Handle status-only updates (state changes)
    if (!payload.sender && (payload.state || payload.stateid)) {
      console.log(`[${requestId}] Status: device=${payload.device}, state=${payload.state || payload.stateid}`);
      return NextResponse.json({ success: true, type: 'status', requestId }, { status: 200 });
    }
    
    // Check for location data (with better detection for Fonnte format)
    console.log(`[${requestId}] Location field type: ${typeof payload.location}, value:`, payload.location);
    
    // Debug: Log all non-empty fields untuk cari lokasi
    const allFields = Object.entries(payload).filter(([_, v]) => v && v !== '').map(([k]) => k);
    if (allFields.length > 0) {
      console.log(`[${requestId}] Non-empty fields:`, allFields.join(', '));
    }
    
    const hasValidLocation = payload.location && 
      typeof payload.location === 'object' && 
      'latitude' in payload.location && 
      'longitude' in payload.location;
    
    if (hasValidLocation && payload.sender) {
      console.log(`[${requestId}] ✓ Location detected from ${payload.sender}`);
      const result = await handleLocationUpdate(
        formatPhoneNumber(payload.sender),
        payload.location as { latitude: number; longitude: number }
      );
      return NextResponse.json({
        success: true,
        type: 'location',
        message: result.substring(0, 100),
        requestId,
      });
    }
    
    // Debug: Log if location field exists but doesn't match format
    if (payload.location && !hasValidLocation && payload.sender) {
      console.warn(`[${requestId}] ⚠️  Location data exists but format mismatch:`, JSON.stringify(payload.location, null, 2));
    }
    
    // Require sender for message
    if (!payload.sender) {
      console.log(`[${requestId}] Skipped: status webhook`);
      return NextResponse.json({ success: true, type: 'skipped', requestId }, { status: 200 });
    }
    
    // Check if this is location-only update or image upload (no message text)
    if (!payload.message) {
      if (payload.location) {
        console.log(`[${requestId}] Location-only update from ${payload.sender}`);
        await handleLocationUpdate(
          formatPhoneNumber(payload.sender),
          payload.location
        );
        return NextResponse.json({ 
          success: true, 
          type: 'location',
          requestId 
        });
      }
      
      // Check for image/file upload (Fonnte sends image with url field)
      if (payload.url && payload.sender) {
        console.log(`[${requestId}] 🖼️  Image detected: ${payload.url}`);
        const phone = formatPhoneNumber(payload.sender);
        const response = await handleMessage({
          sender: payload.sender,
          message: '[image]', // Placeholder to pass the message guard
          url: payload.url,
          device: payload.device,
          type: payload.type,
        });
        return NextResponse.json({
          success: true,
          type: 'image',
          response: response.substring(0, 100),
          requestId,
        });
      }
      
      console.warn(`[${requestId}] ⚠️  No message, location, or image in payload. Fields:`, JSON.stringify(payload, null, 2));
      return NextResponse.json(
        { error: 'Missing message, location, or image', requestId },
        { status: 400 }
      );
    }
    
    // Process message
    const phone = formatPhoneNumber(payload.sender);
    console.log(`[${requestId}] Processing message from ${phone}: "${payload.message.substring(0, 50)}..."`);
    
    const response = await handleMessage(payload);
    
    console.log(`[${requestId}] Message processed successfully`);
    return NextResponse.json({
      success: true,
      response: response.substring(0, 100) + '...',
      phone,
      requestId,
    });
    
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    
    console.error(`[${requestId}] Webhook error:`, errorDetails);
    
    return NextResponse.json(
      { 
        error: errorDetails.message,
        requestId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for webhook verification
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'JuraganSuplai WhatsApp Webhook is active',
    timestamp: new Date().toISOString(),
  });
}
