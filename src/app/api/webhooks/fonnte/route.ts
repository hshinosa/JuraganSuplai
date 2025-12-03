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
  sender: string;
  message: string;
  url?: string; // Image/file URL
  location?: {
    latitude: number;
    longitude: number;
  };
  name?: string;
  member?: string;
  type?: string;
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
  const phone = formatPhoneNumber(payload.sender);
  const message = payload.message;
  
  console.log(`[Webhook] Message from ${phone}: ${message}`);
  
  // Check if this is a location update (bypass agent)
  if (payload.location) {
    return await handleLocationUpdate(phone, payload.location);
  }
  
  // Get or create user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: user } = await (supabase
    .from('users') as any)
    .select('*')
    .eq('phone', phone)
    .single();
  
  // If new user, create and start onboarding
  if (!user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newUser } = await (supabase
      .from('users') as any)
      .insert({ phone, onboarding_step: 'role_selection' })
      .select()
      .single();
    user = newUser;
  }
  
  // Get conversation history (last 10 messages)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: history } = await (supabase
    .from('agent_conversations') as any)
    .select('role, content')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(10);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationHistory = (history || []).reverse().map((h: any) => ({
    role: h.role as 'user' | 'assistant',
    content: h.content,
  }));
  
  // Check for active order context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeOrder } = await (supabase
    .from('orders') as any)
    .select('id, status')
    .or(`buyer_id.eq.${user?.id},supplier_id.eq.${user?.id},courier_id.eq.${user?.id}`)
    .not('status', 'in', '(completed,refunded,cancelled_by_buyer,failed_no_supplier)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  // Build context for agent
  const context = {
    orderId: activeOrder?.id,
    userId: user?.id,
    phone,
  };
  
  // Enhance message with context
  let enhancedMessage = message;
  if (user?.onboarding_step !== 'completed') {
    enhancedMessage = `[ONBOARDING: ${user?.onboarding_step}] ${message}`;
  }
  if (payload.url) {
    enhancedMessage = `[IMAGE: ${payload.url}] ${message}`;
  }
  
  // Run agent
  const result = await runAgent(enhancedMessage, conversationHistory, context);
  
  // Save conversation to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('agent_conversations') as any).insert([
    { phone, role: 'user', content: message, user_id: user?.id },
    { phone, role: 'assistant', content: result.response, user_id: user?.id },
  ]);
  
  // Send response via WhatsApp
  await sendWhatsApp({ phone, message: result.response });
  
  return result.response;
}

/**
 * Handle live location update from courier
 * This bypasses the agent for performance
 */
async function handleLocationUpdate(
  phone: string,
  location: { latitude: number; longitude: number }
): Promise<string> {
  const supabase = createAdminClient();
  
  console.log(`[Webhook] Location update from ${phone}: ${location.latitude}, ${location.longitude}`);
  
  // Update courier's location
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase
    .from('users') as any)
    .update({
      location: `POINT(${location.longitude} ${location.latitude})`,
    })
    .eq('phone', phone);
  
  // Find active order for this courier and update tracking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: courier } = await (supabase
    .from('users') as any)
    .select('id')
    .eq('phone', phone)
    .eq('role', 'courier')
    .single();
  
  if (courier) {
    // Update order's courier location for realtime tracking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase
      .from('orders') as any)
      .update({
        courier_last_location: `POINT(${location.longitude} ${location.latitude})`,
        courier_location_updated_at: new Date().toISOString(),
      })
      .eq('courier_id', courier.id)
      .eq('status', 'shipping');
  }
  
  return 'Location updated';
}

/**
 * POST handler for Fonnte webhook
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as FonnteWebhookPayload;
    
    // Validate required fields
    if (!payload.sender || !payload.message) {
      // This might be a location-only update
      if (payload.sender && payload.location) {
        await handleLocationUpdate(
          formatPhoneNumber(payload.sender),
          payload.location
        );
        return NextResponse.json({ success: true, type: 'location' });
      }
      
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Process message asynchronously
    const response = await handleMessage(payload);
    
    return NextResponse.json({
      success: true,
      response: response.substring(0, 100) + '...',
    });
    
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
