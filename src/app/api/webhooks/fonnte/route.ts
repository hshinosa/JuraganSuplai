/**
 * Fonnte WhatsApp Webhook Handler
 * Receives incoming messages and location updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { runAgent } from '@/lib/ai/executor';
import '@/lib/ai/tools';
import { sendWhatsApp } from '@/lib/ai/tools/send-whatsapp';
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
  
  // If user is registered and not in onboarding, could pass to agent here
  if (onboardingStep === 'completed' && userRole) {
    console.log(`[Webhook] User ${phone} is registered (role: ${userRole}). Passing to agent...`);
    // TODO: Implement agent flow for ongoing order management
  }
  
  // Default: log message
  console.log(`[Webhook] Non-command message from ${phone}: "${message.substring(0, 50)}..."`);
  return 'Message logged';
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
