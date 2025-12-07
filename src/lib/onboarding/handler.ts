/**
 * Onboarding State Machine Handler
 * Manages the step-by-step registration flow for Supplier & Courier
 */

import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsApp } from '@/lib/ai/tools/send-whatsapp';
import { analyzeImage } from '@/lib/ai/tools/analyze-image';
import { getCategorySelectionMessage, parseSelectedCategories, getCategoryNames, CategoryId } from './categories';

export type OnboardingState = 
  | 'awaiting_role' 
  | 'name_input' 
  | 'business_name_input' 
  | 'supplier_location'
  | 'categories_select' 
  | 'awaiting_ktp' 
  | 'awaiting_selfie' 
  | 'courier_name' 
  | 'location_share' 
  | 'details_input';

interface OnboardingData {
  role?: 'supplier' | 'courier';
  // Shared
  name?: string;
  address?: string;
  // Supplier
  businessName?: string;
  categories?: CategoryId[];
  ktpVerified?: boolean;
  selfieVerified?: boolean;
  ktpAnalysisResult?: any; // Store analysis results for reference
  selfieAnalysisResult?: any;
  // Courier
  vehicle?: 'motor' | 'mobil' | 'keduanya';
}

/**
 * Initialize onboarding - ask for role
 */
export async function startOnboarding(phone: string): Promise<void> {
  const message = `👋 *Selamat datang di JuraganSuplai.ai!*\n\nApakah Anda ingin daftar sebagai:\n\n1️⃣ *SUPPLIER* - Penjual bahan baku\n2️⃣ *KURIR* - Penghantar barang\n\nBalas dengan: *supplier* atau *kurir*`;
  
  const supabase = createAdminClient();
  
  await (supabase.from('users') as any)
    .upsert(
      {
        phone,
        onboarding_step: 'role_selection',
        onboarding_data: {},
      },
      { onConflict: 'phone' }
    )
    .select();
  
  await sendWhatsApp({ phone, message });
}

/**
 * Handle role selection (supplier or courier)
 */
export async function handleRoleSelection(phone: string, input: string): Promise<boolean> {
  const role = input.toLowerCase().trim();
  
  if (!['supplier', 'kurir'].includes(role)) {
    await sendWhatsApp({ 
      phone, 
      message: '❌ Masukan tidak valid. Balas dengan: *supplier* atau *kurir*' 
    });
    return false;
  }
  
  const actualRole = role === 'kurir' ? 'courier' : 'supplier';
  const supabase = createAdminClient();
  
  const nextStep = actualRole === 'supplier' ? 'name_input' : 'name_input';
  const onboardingData: OnboardingData = { role: actualRole };
  
  await (supabase.from('users') as any)
    .upsert(
      {
        phone,
        role: actualRole,
        onboarding_step: nextStep,
        onboarding_data: onboardingData,
      },
      { onConflict: 'phone' }
    )
    .select();
  
  // Send next step message based on role
  if (actualRole === 'supplier') {
    await sendWhatsApp({ 
      phone, 
      message: '✅ Anda terdaftar sebagai *SUPPLIER*\n\n📝 *Step 1/6: Nama Lengkap*\n\nBalas dengan nama lengkap Anda:\n\nContoh: "Ucup Santoso"' 
    });
  } else {
    await sendWhatsApp({ 
      phone, 
      message: '✅ Anda terdaftar sebagai *KURIR*\n\n📝 *Step 1/3: Nama Lengkap*\n\nBalas dengan nama lengkap Anda:\n\nContoh: "Budi Santoso"' 
    });
  }
  
  return true;
}

/**
 * Map new step names to database-compatible values
 * Database ENUM may not have all new values yet, so we map to compatible old values
 */
export function mapStepToDatabase(newStep: string): string {
  const stepMap: Record<string, string> = {
    'business_name_input': 'location_share', // Old step name that exists in DB
    'supplier_location': 'location_share',   // Map to existing location_share step
    'categories_select': 'details_input',     // Old step name that exists in DB
    'awaiting_ktp': 'verification',           // Old step name that exists in DB
    'awaiting_selfie': 'verification',        // Old step name that exists in DB
    'completed': 'completed',                 // Final step
  };
  
  // If not in map, use as-is (for steps that already exist in ENUM)
  return stepMap[newStep] || newStep;
}

/**
 * Handle supplier name (full name) input
 */
export async function handleSupplierName(phone: string, input: string): Promise<boolean> {
  const name = input.trim();
  
  console.log(`[handleSupplierName] Start - Phone: ${phone}, Input: "${name}"`);
  
  if (name.length < 3 || name.length > 100) {
    console.log(`[handleSupplierName] Invalid length: ${name.length}`);
    await sendWhatsApp({ 
      phone, 
      message: '❌ Nama harus 3-100 karakter. Coba lagi:' 
    });
    return false;
  }
  
  try {
    const supabase = createAdminClient();
    
    const { data: userData, error: selectError } = await (supabase.from('users') as any)
      .select('onboarding_data')
      .eq('phone', phone)
      .single();
    
    if (selectError) {
      console.error(`[handleSupplierName] Select error:`, selectError);
      await sendWhatsApp({ 
        phone, 
        message: '❌ Gagal mengambil data. Coba lagi.' 
      });
      return false;
    }
    
    const onboardingData = (userData?.onboarding_data || {}) as OnboardingData;
    onboardingData.name = name;
    
    // Use database-compatible step name
    const dbStep = mapStepToDatabase('business_name_input');
    console.log(`[handleSupplierName] Updating database - name: "${name}", step: "${dbStep}"`);
    
    const { error: upsertError, data } = await (supabase.from('users') as any)
      .upsert(
        {
          phone,
          name,
          onboarding_step: dbStep,
          onboarding_data: onboardingData,
        },
        { onConflict: 'phone' }
      )
      .select();
    
    if (upsertError) {
      console.error(`[handleSupplierName] Upsert error:`, upsertError);
      await sendWhatsApp({ 
        phone, 
        message: '❌ Gagal menyimpan nama. Coba lagi.' 
      });
      return false;
    }
    
    console.log(`[handleSupplierName] Database updated successfully:`, data);
    
    await sendWhatsApp({ 
      phone, 
      message: `✅ Nama lengkap: *${name}*\n\n🏪 *Step 2/6: Nama Toko/Usaha*\n\nBalas dengan nama toko atau bisnis Anda:\n\nContoh: "Toko Sayuran Segar"` 
    });
    
    console.log(`[handleSupplierName] Message sent successfully`);
    return true;
  } catch (error) {
    console.error(`[handleSupplierName] Exception:`, error);
    await sendWhatsApp({ 
      phone, 
      message: '❌ Terjadi kesalahan. Coba lagi.' 
    });
    return false;
  }
}

/**
 * Handle supplier business name (toko name) input
 */
export async function handleSupplierBusinessName(phone: string, input: string): Promise<boolean> {
  const businessName = input.trim();
  
  console.log(`[handleSupplierBusinessName] Start - Phone: ${phone}, Input: "${businessName}"`);
  
  if (businessName.length < 3 || businessName.length > 100) {
    console.log(`[handleSupplierBusinessName] Invalid length: ${businessName.length}`);
    await sendWhatsApp({ 
      phone, 
      message: '❌ Nama toko harus 3-100 karakter. Coba lagi:' 
    });
    return false;
  }
  
  try {
    const supabase = createAdminClient();
    
    const { data: userData, error: selectError } = await (supabase.from('users') as any)
      .select('onboarding_data')
      .eq('phone', phone)
      .single();
    
    if (selectError) {
      console.error(`[handleSupplierBusinessName] Select error:`, selectError);
      await sendWhatsApp({ 
        phone, 
        message: '❌ Gagal mengambil data. Coba lagi.' 
      });
      return false;
    }
    
    const onboardingData = (userData?.onboarding_data || {}) as OnboardingData;
    onboardingData.businessName = businessName;
    
    const dbStep = mapStepToDatabase('supplier_location');
    console.log(`[handleSupplierBusinessName] Updating database - business_name: "${businessName}", step: "${dbStep}"`);
    
    const { error: upsertError, data } = await (supabase.from('users') as any)
      .upsert(
        {
          phone,
          business_name: businessName,
          onboarding_step: dbStep,
          onboarding_data: onboardingData,
        },
        { onConflict: 'phone' }
      )
      .select();
    
    if (upsertError) {
      console.error(`[handleSupplierBusinessName] Upsert error:`, upsertError);
      await sendWhatsApp({ 
        phone, 
        message: '❌ Gagal menyimpan nama toko. Coba lagi.' 
      });
      return false;
    }
    
    console.log(`[handleSupplierBusinessName] Database updated successfully:`, data);
    
    const locationMessage = `✅ Nama toko: *${businessName}*\n\n📍 *Step 3/6: Lokasi Toko*\n\nKirimkan lokasi toko Anda dengan salah satu cara:\n\n1️⃣ *Share Location* - Klik 📎 → Location → Share current location\n\n2️⃣ *Ketik Alamat* - Tulis alamat lengkap toko Anda\n\nContoh: "Jl. Merdeka No. 123, Bandung"`;
    
    console.log(`[handleSupplierBusinessName] Sending location request message`);
    await sendWhatsApp({ phone, message: locationMessage });
    
    console.log(`[handleSupplierBusinessName] Message sent successfully`);
    return true;
  } catch (error) {
    console.error(`[handleSupplierBusinessName] Exception:`, error);
    await sendWhatsApp({ 
      phone, 
      message: '❌ Terjadi kesalahan. Coba lagi.' 
    });
    return false;
  }
}

/**
 * Handle supplier location input (address text or GPS coordinates)
 */
export async function handleSupplierLocation(
  phone: string, 
  input: string,
  coordinates?: { latitude: number; longitude: number }
): Promise<boolean> {
  console.log(`[handleSupplierLocation] Start - Phone: ${phone}, Input: "${input}", Coords:`, coordinates);
  
  try {
    const supabase = createAdminClient();
    
    const { data: userData, error: selectError } = await (supabase.from('users') as any)
      .select('onboarding_data')
      .eq('phone', phone)
      .single();
    
    if (selectError) {
      console.error(`[handleSupplierLocation] Select error:`, selectError);
      await sendWhatsApp({ 
        phone, 
        message: '❌ Gagal mengambil data. Coba lagi.' 
      });
      return false;
    }
    
    const onboardingData = (userData?.onboarding_data || {}) as OnboardingData;
    
    // Store address text
    const address = input.trim() || 'Location shared via GPS';
    onboardingData.address = address;
    
    // Prepare location data for PostGIS if coordinates provided
    let locationPoint = null;
    if (coordinates) {
      // PostGIS format: POINT(longitude latitude)
      locationPoint = `POINT(${coordinates.longitude} ${coordinates.latitude})`;
      console.log(`[handleSupplierLocation] PostGIS point: ${locationPoint}`);
    }
    
    const dbStep = mapStepToDatabase('categories_select');
    console.log(`[handleSupplierLocation] Updating database - address: "${address}", step: "${dbStep}"`);
    
    const updateData: Record<string, unknown> = {
      phone,
      address,
      onboarding_step: dbStep,
      onboarding_data: onboardingData,
    };
    
    // Add location if coordinates available
    if (locationPoint) {
      updateData.location = locationPoint;
    }
    
    const { error: upsertError, data } = await (supabase.from('users') as any)
      .upsert(updateData, { onConflict: 'phone' })
      .select();
    
    if (upsertError) {
      console.error(`[handleSupplierLocation] Upsert error:`, upsertError);
      await sendWhatsApp({ 
        phone, 
        message: '❌ Gagal menyimpan lokasi. Coba lagi.' 
      });
      return false;
    }
    
    console.log(`[handleSupplierLocation] Database updated successfully:`, data);
    
    // Send category selection message
    const categoryMessage = getCategorySelectionMessage();
    const locationConfirmation = coordinates 
      ? `📍 Lokasi GPS tersimpan!` 
      : `📍 Alamat: *${address}*`;
    
    const fullMessage = `✅ ${locationConfirmation}\n\n🏷️ *Step 4/6: Kategori Produk*\n\n${categoryMessage}`;
    
    console.log(`[handleSupplierLocation] Sending category selection message`);
    await sendWhatsApp({ phone, message: fullMessage });
    
    console.log(`[handleSupplierLocation] Message sent successfully`);
    return true;
  } catch (error) {
    console.error(`[handleSupplierLocation] Exception:`, error);
    await sendWhatsApp({ 
      phone, 
      message: '❌ Terjadi kesalahan. Coba lagi.' 
    });
    return false;
  }
}

/**
 * Handle supplier category selection
 */
export async function handleSupplierCategories(phone: string, input: string): Promise<boolean> {
  const selectedCategories = parseSelectedCategories(input);
  
  if (selectedCategories.length === 0) {
    await sendWhatsApp({ 
      phone, 
      message: '❌ Pilihan tidak valid. Balas dengan nomor kategori (contoh: "1,3,5"):' 
    });
    return false;
  }
  
  const supabase = createAdminClient();
  
  const { data: userData } = await (supabase.from('users') as any)
    .select('onboarding_data')
    .eq('phone', phone)
    .single();
  
  const onboardingData = (userData?.onboarding_data || {}) as OnboardingData;
  onboardingData.categories = selectedCategories;
  onboardingData.ktpVerified = false;
  onboardingData.selfieVerified = false;
  
  // Use database-compatible step name
  const dbStep = mapStepToDatabase('awaiting_ktp');
  console.log(`[handleSupplierCategories] Updating database - step: "${dbStep}"`);
  
  const { error: upsertError } = await (supabase.from('users') as any)
    .upsert(
      {
        phone,
        onboarding_step: dbStep,
        onboarding_data: onboardingData,
      },
      { onConflict: 'phone' }
    )
    .select();
  
  if (upsertError) {
    console.error(`[handleSupplierCategories] Upsert error:`, upsertError);
    await sendWhatsApp({ 
      phone, 
      message: '❌ Gagal menyimpan kategori. Coba lagi.' 
    });
    return false;
  }
  
  const categoryNames = getCategoryNames(selectedCategories);
  
  // Send verification link instead of waiting for WhatsApp image
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/verify/${phone}`;
  
  await sendWhatsApp({ 
    phone, 
    message: `✅ Kategori terpilih: *${categoryNames}*\n\n📸 *Step 5-6/6: Verifikasi Foto*\n\nKlik link di bawah untuk upload foto KTP dan Selfie:\n\n${verificationUrl}\n\nFoto akan diverifikasi otomatis oleh AI.` 
  });
  
  return true;
}

/**
 * Handle photo upload (KTP atau Selfie) with automatic verification
 * Photos are validated by Gemini Vision immediately and auto-saved as verified
 */
export async function handlePhotoUpload(
  phone: string,
  imageUrl: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  
  try {
    const { data: userData } = await (supabase.from('users') as any)
      .select('onboarding_data, onboarding_step')
      .eq('phone', phone)
      .single();

    if (!userData) {
      await sendWhatsApp({ 
        phone, 
        message: '❌ Data pengguna tidak ditemukan. Mulai ulang dari awal.' 
      });
      return false;
    }

    const onboardingData = (userData?.onboarding_data || {}) as OnboardingData;
    const currentStep = userData?.onboarding_step;

    // Support both old 'verification' step and new 'awaiting_ktp' / 'awaiting_selfie' steps
    const isAwaitingKtp = currentStep === 'awaiting_ktp' || currentStep === 'verification';
    const isAwaitingSelfie = currentStep === 'awaiting_selfie' || currentStep === 'verification';

    // Check if waiting for KTP photo
    if (isAwaitingKtp && !onboardingData.ktpVerified) {
      console.log(`[Photo] Analyzing KTP for ${phone}`);
      
      const ktpPrompt = 'Verifikasi apakah ini adalah foto KTP yang jelas dengan nomor NIK terlihat. Berikan respons JSON: {is_ktp: boolean, nik_visible: boolean, confidence: 0-100, message: string}';
      const analysisResult = await analyzeImage({
        imageUrl,
        prompt: ktpPrompt,
      });
      
      let analysis: any = {};
      try {
        analysis = JSON.parse(analysisResult);
      } catch {
        const match = analysisResult.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            analysis = JSON.parse(match[0]);
          } catch {
            console.warn('[Onboarding] Failed to parse KTP analysis JSON');
            analysis = { is_ktp: false, confidence: 0, message: 'Invalid response format' };
          }
        }
      }
      
      if (!analysis.is_ktp || analysis.confidence < 60) {
        await sendWhatsApp({ 
          phone, 
          message: `⚠️ Foto KTP tidak jelas atau tidak valid.\n\n${analysis.message}\n\nSilakan kirim ulang foto KTP yang lebih jelas.` 
        });
        return false;
      }

      // KTP verified automatically - move to next step
      onboardingData.ktpVerified = true;
      onboardingData.ktpAnalysisResult = {
        confidence: analysis.confidence,
        timestamp: new Date().toISOString(),
      };

      await (supabase.from('users') as any)
        .upsert(
          {
            phone,
            onboarding_step: mapStepToDatabase('awaiting_selfie'),
            onboarding_data: onboardingData,
          },
          { onConflict: 'phone' }
        )
        .select();

      await sendWhatsApp({ 
        phone, 
        message: '✅ Foto KTP terverifikasi! (Confidence: ' + analysis.confidence + '%)\n\n🤳 *Step 5/5: Foto Selfie*\n\nSekarang kirim *Selfie Anda sambil memegang KTP*' 
      });

      return true;

    } else if (currentStep === 'awaiting_selfie') {
      console.log(`[Photo] Analyzing Selfie for ${phone}`);
      
      const selfiePrompt = 'Verifikasi apakah ini adalah selfie dengan KTP. Pastikan ada wajah manusia dan KTP dalam satu frame. Berikan respons JSON: {is_selfie_with_ktp: boolean, face_visible: boolean, ktp_visible: boolean, confidence: 0-100, message: string}';
      const analysisResult = await analyzeImage({
        imageUrl,
        prompt: selfiePrompt,
      });
      
      let analysis: any = {};
      try {
        analysis = JSON.parse(analysisResult);
      } catch {
        const match = analysisResult.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            analysis = JSON.parse(match[0]);
          } catch {
            console.warn('[Onboarding] Failed to parse Selfie analysis JSON');
            analysis = { is_selfie_with_ktp: false, confidence: 0, message: 'Invalid response format' };
          }
        }
      }
      
      if (!analysis.is_selfie_with_ktp || analysis.confidence < 60) {
        await sendWhatsApp({ 
          phone, 
          message: `⚠️ Foto selfie tidak valid atau KTP tidak terlihat.\n\n${analysis.message}\n\nSilakan kirim ulang foto selfie yang menunjukkan wajah + KTP.` 
        });
        return false;
      }

      // Selfie verified automatically - complete registration
      onboardingData.selfieVerified = true;
      onboardingData.selfieAnalysisResult = {
        confidence: analysis.confidence,
        timestamp: new Date().toISOString(),
      };

      const categoryNames = getCategoryNames(onboardingData.categories || []);
      
      await (supabase.from('users') as any)
        .upsert(
          {
            phone,
            onboarding_step: 'completed',
            is_verified: true, // Auto-verify immediately after successful photo
            onboarding_data: onboardingData,
          },
          { onConflict: 'phone' }
        )
        .select();

      const completionMessage = `✅ *Pendaftaran Supplier Berhasil!*\n\n📋 *Summary:*\n• Nama: *${onboardingData.name}*\n• Toko: *${onboardingData.businessName}*\n• Kategori: *${categoryNames}*\n\n🎉 Profil Anda sudah aktif dan terverifikasi!\n\nAnda siap menerima pesanan dari pembeli. Tunggu broadcast order di WhatsApp Anda.`;
      
      await sendWhatsApp({ phone, message: completionMessage });

      return true;
    }

    await sendWhatsApp({ 
      phone, 
      message: '❌ Tahap foto tidak valid. Silakan hubungi support.' 
    });
    return false;
  } catch (error) {
    console.error('[Onboarding] Photo verification failed:', error);
    await sendWhatsApp({ 
      phone, 
      message: '❌ Gagal verifikasi foto. Coba lagi atau hubungi support.' 
    });
    return false;
  }
}

/**
 * Handle courier name input
 */
export async function handleCourierName(phone: string, input: string): Promise<boolean> {
  const name = input.trim();
  
  if (name.length < 3 || name.length > 100) {
    await sendWhatsApp({ 
      phone, 
      message: '❌ Nama harus 3-100 karakter. Coba lagi:' 
    });
    return false;
  }
  
  const supabase = createAdminClient();
  
  const { data: userData } = await (supabase.from('users') as any)
    .select('onboarding_data')
    .eq('phone', phone)
    .single();
  
  const onboardingData = (userData?.onboarding_data || {}) as OnboardingData;
  onboardingData.name = name;
  
  await (supabase.from('users') as any)
    .upsert(
      {
        phone,
        name,
        onboarding_step: 'location_share',
        onboarding_data: onboardingData,
      },
      { onConflict: 'phone' }
    )
    .select();
  
  await sendWhatsApp({ 
    phone, 
    message: `✅ Nama: *${name}*\n\n📍 *Step 2/3: Alamat*\n\nBalas dengan alamat domisili Anda:\n\nContoh: "Jl. Ahmad Yani No.45, Surabaya, Jawa Timur"` 
  });
  
  return true;
}

/**
 * Handle courier address input
 */
export async function handleCourierAddress(phone: string, input: string): Promise<boolean> {
  const address = input.trim();
  
  if (address.length < 5 || address.length > 255) {
    await sendWhatsApp({ 
      phone, 
      message: '❌ Alamat harus 5-255 karakter. Coba lagi:' 
    });
    return false;
  }
  
  const supabase = createAdminClient();
  
  const { data: userData } = await (supabase.from('users') as any)
    .select('onboarding_data')
    .eq('phone', phone)
    .single();
  
  const onboardingData = (userData?.onboarding_data || {}) as OnboardingData;
  onboardingData.address = address;
  
  await (supabase.from('users') as any)
    .upsert(
      {
        phone,
        address,
        onboarding_step: 'details_input',
        onboarding_data: onboardingData,
      },
      { onConflict: 'phone' }
    )
    .select();
  
  await sendWhatsApp({ 
    phone, 
    message: `✅ Alamat: *${address}*\n\n🚗 *Step 3/3: Kendaraan*\n\nKendaraan apa yang Anda miliki?\n\n1. 🏍️ *MOTOR*\n2. 🚙 *MOBIL*\n3. 🚗 *KEDUANYA*\n\nBalas dengan: motor, mobil, atau keduanya` 
  });
  
  return true;
}

/**
 * Handle courier vehicle selection
 */
export async function handleCourierVehicle(phone: string, input: string): Promise<boolean> {
  const vehicleInput = input.toLowerCase().trim();
  
  if (!['motor', 'mobil', 'keduanya'].includes(vehicleInput)) {
    await sendWhatsApp({ 
      phone, 
      message: '❌ Pilihan tidak valid. Balas dengan: *motor*, *mobil*, atau *keduanya*' 
    });
    return false;
  }
  
  const supabase = createAdminClient();
  
  const { data: userData } = await (supabase.from('users') as any)
    .select('onboarding_data')
    .eq('phone', phone)
    .single();
  
  const onboardingData = (userData?.onboarding_data || {}) as OnboardingData;
  onboardingData.vehicle = vehicleInput as 'motor' | 'mobil' | 'keduanya';
  
  await (supabase.from('users') as any)
    .upsert(
      {
        phone,
        vehicle: vehicleInput === 'keduanya' ? 'pickup' : vehicleInput, // Map "keduanya" to pickup type
        onboarding_step: 'completed',
        is_verified: true, // Auto-verify for MVP
        onboarding_data: onboardingData,
      },
      { onConflict: 'phone' }
    )
    .select();
  
  const vehicleEmoji = vehicleInput === 'motor' ? '🏍️' : vehicleInput === 'mobil' ? '🚙' : '🚗🏍️';
  const completionMessage = `✅ *Pendaftaran Kurir Berhasil!*\n\n📋 *Summary:*\n• Nama: *${onboardingData.name}*\n• Alamat: *${onboardingData.address}*\n• Kendaraan: *${vehicleEmoji} ${vehicleInput.toUpperCase()}*\n\n🎉 Profil Anda sudah aktif!\n\nAnda siap menerima penawaran antar. Tunggu pesan dari sistem.`;
  
  await sendWhatsApp({ phone, message: completionMessage });
  
  return true;
}
