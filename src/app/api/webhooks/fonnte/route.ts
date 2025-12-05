/**
 * Fonnte WhatsApp Webhook Handler
 * Receives incoming messages and location updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { runAgent } from '@/lib/ai/executor';
import '@/lib/ai/tools'; // Register all tools
import { sendWhatsApp } from '@/lib/ai/tools/send-whatsapp';

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
  // These come back as Fonnte webhook notifications, not user messages
  const botMessagePatterns = [
    '✅ Halo',           // Our DAFTAR reply
    'Halo! 👋',          // Our quick reply
    'Sent via fonnte.com' // Fonnte footer (indicates it's a sent message, not received)
  ];
  
  if (botMessagePatterns.some(pattern => message.includes(pattern))) {
    console.log(`[Webhook] ✓ Ignoring bot message from ${phone} (message: "${message.substring(0, 40)}...")`);
    return 'Ignored bot message';
  }
  
  console.log(`[Webhook] Message from ${phone}: ${message}`);

  // DAFTAR MANUAL - Format: DAFTAR#NamaLengkap#role
  if (message.includes('DAFTAR#')) {
    try {
      console.log(`[DAFTAR] Processing registration from ${phone}`);
      
      // Parse message: DAFTAR#Ucup#buyer
      const parts = message.split('#');
      const inputName = parts[1]?.trim();
      const inputRaw = parts[2]?.trim().toLowerCase();
      
      // Validate inputs
      if (!inputName) {
        const errorMsg = 'Format: DAFTAR#NamaLengkap#role (contoh: DAFTAR#Ucup#buyer)';
        console.warn(`[DAFTAR] Missing name from ${phone}`);
        await sendWhatsApp({ phone, message: errorMsg });
        return errorMsg;
      }
      
      // Validate and default role
      const validRoles = ['buyer', 'supplier', 'courier'];
      const inputRole = validRoles.includes(inputRaw) ? inputRaw : 'buyer';
      
      if (!validRoles.includes(inputRaw)) {
        console.warn(`[DAFTAR] Invalid role '${inputRaw}' from ${phone}, defaulting to 'buyer'`);
      }
      
      // Insert/update user with retry logic
      console.log(`[DAFTAR] Inserting user: ${inputName} (${inputRole}) at ${phone}`);
      
      let lastError: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { data, error } = await (supabase
            .from('users') as any)
            .upsert({
              phone,
              name: inputName,
              role: inputRole,
              onboarding_step: 'completed',
              is_verified: true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'phone' })
            .select();
          
          if (error) {
            lastError = error;
            throw error;
          }
          
          // Success!
          console.log(`[DAFTAR] Successfully registered ${inputName} (${inputRole}) - ${phone}`);
          const replyMessage = `✅ Halo ${inputName}!\nPendaftaran berhasil sebagai *${inputRole.toUpperCase()}*\n\n📍 *Langkah berikutnya: Kirim Lokasi*\n\nFormat:\n\`LOKASI#latitude#longitude\`\n\nContoh untuk Jakarta:\n\`LOKASI#-6.2088#106.8456\`\n\nCara mendapat koordinat:\n1. Buka Google Maps\n2. Klik lokasi Anda\n3. Copy koordinat (lat,lng)\n\nKetik BANTUAN untuk bantuan lebih lanjut.`;
          
          await sendWhatsApp({ phone, message: replyMessage });
          return replyMessage;
          
        } catch (error) {
          lastError = error;
          console.warn(`[DAFTAR] Attempt ${attempt}/3 failed for ${phone}:`, error);
          
          if (attempt < 3) {
            // Wait before retry with exponential backoff
            const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // All retries failed
      console.error(`[DAFTAR] All 3 retry attempts failed for ${phone}`);
      const errorMsg = `Maaf, pendaftaran gagal: ${lastError?.message || 'Network error'}`;
      await sendWhatsApp({ phone, message: errorMsg });
      return errorMsg;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[DAFTAR] Unexpected error for ${phone}:`, error);
      await sendWhatsApp({ 
        phone, 
        message: `Maaf, terjadi kesalahan: ${errorMsg}` 
      });
      return `Error: ${errorMsg}`;
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
    const helpMessage = `📖 *DAFTAR PERINTAH JURAGAN SUPLAI*\n\n1️⃣ *DAFTAR Registrasi*\n\`DAFTAR#Nama#role\`\nContoh: \`DAFTAR#Budi#supplier\`\nRole: supplier, kurir, atau buyer\n\n2️⃣ *LOKASI Kirim Lokasi*\n\`LOKASI#latitude#longitude\`\nContoh: \`LOKASI#-6.2088#106.8456\`\n\n3️⃣ *BANTUAN Bantuan*\nKetik BANTUAN untuk tampilkan pesan ini\n\n📞 Butuh bantuan lebih lanjut?\nHubungi admin: +6285294131193`;
    await sendWhatsApp({ phone, message: helpMessage });
    return helpMessage;
  }
  
  // Check if this is a location update (bypass agent)
  if (payload.location) {
    return await handleLocationUpdate(phone, payload.location);
  }
  
  // For non-DAFTAR messages, just log (don't reply)
  // Bot will only reply to DAFTAR registration messages
  // Other messages won't interrupt personal chats
  console.log(`[Webhook] Non-DAFTAR message from ${phone}: "${message.substring(0, 50)}..."`);
  console.log(`[Webhook] No reply sent (waiting for Agent implementation)`);
  return 'Message logged, no reply';
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
    console.log(`[${requestId}] Incoming webhook payload:`, JSON.stringify(payload, null, 2));
    
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
    
    // Check if this is location-only update (no message)
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
      
      console.warn(`[${requestId}] No message or location in payload`);
      return NextResponse.json(
        { error: 'Missing message or location', requestId },
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
