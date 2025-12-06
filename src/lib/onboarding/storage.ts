/**
 * Image Upload Handler for Onboarding Photos
 * Saves KTP and Selfie to Supabase Storage
 */

import { createAdminClient } from '@/lib/supabase/server';

/**
 * Download image from URL and upload to Supabase Storage
 */
export async function uploadImageToSupabase(
  phone: string,
  imageUrl: string,
  photoType: 'ktp' | 'both', // 'ktp' or 'selfie' (determined by photoType)
): Promise<string> {
  const supabase = createAdminClient();
  
  try {
    // Download image from URL using built-in fetch
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate file name
    const timestamp = Date.now();
    const photoSubtype = photoType === 'ktp' ? 'ktp' : 'selfie';
    const fileName = `onboarding/${phone.replace(/\D/g, '')}_${photoSubtype}_${timestamp}.jpg`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('user-uploads')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(fileName);
    
    console.log(`[Storage] Uploaded ${photoSubtype} for ${phone}: ${publicUrlData.publicUrl}`);
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('[Storage] Upload error:', error);
    throw error;
  }
}
