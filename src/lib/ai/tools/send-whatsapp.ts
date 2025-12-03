/**
 * Agent Tool: Send WhatsApp Message via Fonnte
 */

import { createAdminClient } from '@/lib/supabase/server';
import { registerTool } from '../executor';

const FONNTE_API_URL = 'https://api.fonnte.com/send';

interface SendWhatsAppInput {
  phone: string;
  message: string;
  imageUrl?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format phone number to Indonesian format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  
  // If doesn't start with 62, add it
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send WhatsApp message via Fonnte API
 */
export async function sendWhatsApp(input: SendWhatsAppInput): Promise<string> {
  const { phone, message, imageUrl } = input;
  
  if (!phone || !message) {
    return JSON.stringify({
      success: false,
      error: 'Phone and message are required',
    });
  }
  
  const formattedPhone = formatPhoneNumber(phone);
  const token = process.env.FONNTE_TOKEN;
  
  if (!token) {
    console.error('[sendWhatsApp] FONNTE_TOKEN not configured');
    return JSON.stringify({
      success: false,
      error: 'WhatsApp service not configured',
    });
  }
  
  try {
    const formData = new FormData();
    formData.append('target', formattedPhone);
    formData.append('message', message);
    
    if (imageUrl) {
      formData.append('url', imageUrl);
    }
    
    const response = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': token,
      },
      body: formData,
    });
    
    const result = await response.json();
    
    if (!response.ok || result.status === false) {
      throw new Error(result.reason || result.message || 'Failed to send message');
    }
    
    console.log(`[sendWhatsApp] Sent to ${formattedPhone}: ${message.substring(0, 50)}...`);
    
    return JSON.stringify({
      success: true,
      messageId: result.id || 'sent',
      phone: formattedPhone,
    } as SendResult);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sendWhatsApp] Error:', errorMessage);
    
    // Queue for retry
    await queueForRetry(formattedPhone, message);
    
    return JSON.stringify({
      success: false,
      error: errorMessage,
      queued: true,
    });
  }
}

/**
 * Queue failed message for retry
 */
async function queueForRetry(phone: string, message: string): Promise<void> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('pending_messages') as any).insert({
    phone_number: phone,
    message,
    status: 'pending',
    retry_count: 0,
  });
}

/**
 * Send WhatsApp with retry logic
 */
export async function sendWhatsAppWithRetry(
  phone: string, 
  message: string,
  maxRetries = 3
): Promise<SendResult> {
  let lastError: string | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = JSON.parse(await sendWhatsApp({ phone, message })) as SendResult;
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error;
    
    if (attempt < maxRetries) {
      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  
  return {
    success: false,
    error: lastError || 'Max retries exceeded',
  };
}

// Register the tool
registerTool('sendWhatsApp', async (input) => {
  return sendWhatsApp(input as unknown as SendWhatsAppInput);
});

export default sendWhatsApp;
