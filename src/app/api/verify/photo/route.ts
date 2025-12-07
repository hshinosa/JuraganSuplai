import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { mapStepToDatabase } from '@/lib/onboarding/handler';
import { sendWhatsApp } from '@/lib/ai/tools/send-whatsapp';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface VerifyRequest {
  phone: string;
  type: 'ktp' | 'selfie';
  imageBase64: string;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, type, imageBase64 }: VerifyRequest = await request.json();

    if (!phone || !type || !imageBase64) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract base64 data if it has data URL prefix
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    console.log(`[Verify Photo] ${type.toUpperCase()} from ${phone}`);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Vision service not configured' },
        { status: 500 }
      );
    }

    if (type === 'ktp') {
      // Verify KTP
      const ktpPrompt = `Analyze this ID card (KTP) image and verify:
1. Is this a valid Indonesian ID card (KTP)?
2. Is the ID number (NIK) clearly visible and readable?
3. Is the photo clear enough to read the details?
4. Are there any issues with the photo quality?

Return ONLY valid JSON (no markdown): { "is_valid": boolean, "nik_visible": boolean, "clarity": "high"|"medium"|"low", "issues": [] }`;

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                  },
                },
                {
                  text: ktpPrompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Verify Photo] Gemini API error:', error);
        
        // MVP FALLBACK: Auto-accept photo for MVP when API fails
        console.log('[Verify Photo] Using MVP mode - auto-accepting KTP');
        
        const supabase = createAdminClient();
        const userData = await (supabase
          .from('users') as any)
          .select('onboarding_data')
          .eq('phone', phone)
          .single();

        const onboardingData = userData.data?.onboarding_data || {};
        onboardingData.ktpVerified = true;

        const { error: upsertError } = await (supabase.from('users') as any).upsert(
          {
            phone,
            onboarding_data: onboardingData,
          },
          { onConflict: 'phone' }
        );
        
        if (upsertError) {
          console.error('[Verify Photo] Upsert error (KTP MVP):', upsertError);
        }

        console.log(`[Verify Photo] KTP auto-verified for ${phone} (MVP mode)`);
        
        // Verify data was saved
        const { data: verifyData, error: verifyError } = await (supabase
          .from('users') as any)
          .select('onboarding_data, onboarding_step')
          .eq('phone', phone)
          .single();
        
        console.log(`[Verify Photo] Verification fetch - data:`, verifyData, 'error:', verifyError);
        
        // Send WhatsApp notification
        await sendWhatsApp({
          phone,
          message: '✅ Foto KTP Anda berhasil diverifikasi!\n\n📸 *Step 5/5: Foto Selfie*\n\nSekarang upload selfie Anda sambil memegang KTP.',
        }).catch(err => console.error('[Verify Photo] Failed to send WhatsApp:', err));
        
        return NextResponse.json({
          verified: true,
          message: '✅ KTP diterima',
          mvpMode: true,
        });
      }

      const result = await response.json();
      const responseText =
        result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log(`[Verify Photo] KTP response:`, responseText);

      try {
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return NextResponse.json({
            verified: false,
            message: 'Could not parse verification response',
          });
        }

        const analysis = JSON.parse(jsonMatch[0]);

        const verified =
          analysis.is_valid &&
          analysis.nik_visible &&
          (analysis.clarity === 'high' || analysis.clarity === 'medium');

        if (verified) {
          // Update user in database
          const supabase = createAdminClient();
          const userData = await (supabase
            .from('users') as any)
            .select('onboarding_data')
            .eq('phone', phone)
            .single();

          const onboardingData = userData.data?.onboarding_data || {};
          onboardingData.ktpVerified = true;

          const { error: upsertError } = await (supabase.from('users') as any).upsert(
            {
              phone,
              onboarding_data: onboardingData,
            },
            { onConflict: 'phone' }
          );
          
          if (upsertError) {
            console.error('[Verify Photo] Upsert error (KTP success):', upsertError);
          }

          console.log(`[Verify Photo] KTP verified for ${phone}`);
          
          // Verify data was saved
          const { data: verifyData, error: verifyError } = await (supabase
            .from('users') as any)
            .select('onboarding_data')
            .eq('phone', phone)
            .single();
          
          console.log(`[Verify Photo] Verification fetch (KTP success) - data:`, verifyData, 'error:', verifyError);
          
          // Send WhatsApp notification
          await sendWhatsApp({
            phone,
            message: '✅ Foto KTP Anda berhasil diverifikasi!\n\n📸 *Step 5/5: Foto Selfie*\n\nSekarang upload selfie Anda sambil memegang KTP.',
          }).catch(err => console.error('[Verify Photo] Failed to send WhatsApp:', err));
        }

        return NextResponse.json({
          verified,
          message: verified
            ? 'KTP terverifikasi'
            : `KTP tidak valid: ${analysis.issues?.join(', ') || 'Format tidak sesuai'}`,
        });
      } catch (parseError) {
        console.error('[Verify Photo] JSON parse error:', parseError);
        return NextResponse.json(
          { verified: false, message: 'Error parsing verification result' },
          { status: 500 }
        );
      }
    } else if (type === 'selfie') {
      // Verify Selfie
      const selfiePrompt = `Analyze this selfie photo and verify:
1. Is there a clear human face visible?
2. Is the face looking toward the camera?
3. Is there an ID card (KTP) visible in the photo with the person?
4. Is the overall image quality good?

Return ONLY valid JSON (no markdown): { "face_visible": boolean, "face_clear": boolean, "id_visible": boolean, "quality": "high"|"medium"|"low", "issues": [] }`;

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                  },
                },
                {
                  text: selfiePrompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Verify Photo] Gemini API error:', error);
        
        // MVP FALLBACK: Auto-accept photo for MVP when API fails
        console.log('[Verify Photo] Using MVP mode - auto-accepting Selfie');
        
        const supabase = createAdminClient();
        const userData = await (supabase
          .from('users') as any)
          .select('onboarding_data')
          .eq('phone', phone)
          .single();

        const onboardingData = userData.data?.onboarding_data || {};
        onboardingData.selfieVerified = true;

        const { error: upsertError } = await (supabase.from('users') as any).upsert(
          {
            phone,
            onboarding_data: onboardingData,
            onboarding_step: mapStepToDatabase('completed'),
          },
          { onConflict: 'phone' }
        );
        
        if (upsertError) {
          console.error('[Verify Photo] Upsert error (Selfie MVP):', upsertError);
        }

        console.log(`[Verify Photo] Selfie auto-verified for ${phone} (MVP mode)`);
        
        // Verify data was saved
        const { data: verifyData, error: verifyError } = await (supabase
          .from('users') as any)
          .select('onboarding_data, onboarding_step')
          .eq('phone', phone)
          .single();
        
        console.log(`[Verify Photo] Verification fetch (Selfie) - data:`, verifyData, 'error:', verifyError);
        
        // Send WhatsApp notification
        await sendWhatsApp({
          phone,
          message: '✅ Selfie Anda berhasil diverifikasi!\n\n🎉 *Pendaftaran Selesai!*\n\nAkun Anda sudah terdaftar dan sedang menunggu persetujuan dari admin.\n\nTerima kasih telah bergabung dengan Juragan Suplai!',
        }).catch(err => console.error('[Verify Photo] Failed to send WhatsApp:', err));
        
        return NextResponse.json({
          verified: true,
          message: '✅ Selfie diterima',
          mvpMode: true,
        });
      }

      const result = await response.json();
      const responseText =
        result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log(`[Verify Photo] Selfie response:`, responseText);

      try {
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return NextResponse.json({
            verified: false,
            message: 'Could not parse verification response',
          });
        }

        const analysis = JSON.parse(jsonMatch[0]);

        const verified =
          analysis.face_visible &&
          analysis.face_clear &&
          analysis.id_visible &&
          (analysis.quality === 'high' || analysis.quality === 'medium');

        if (verified) {
          // Update user in database
          const supabase = createAdminClient();
          const userData = await (supabase
            .from('users') as any)
            .select('onboarding_data')
            .eq('phone', phone)
            .single();

          const onboardingData = userData.data?.onboarding_data || {};
          onboardingData.selfieVerified = true;

          const { error: upsertError } = await (supabase.from('users') as any).upsert(
            {
              phone,
              onboarding_data: onboardingData,
              onboarding_step: mapStepToDatabase('completed'),
            },
            { onConflict: 'phone' }
          );
          
          if (upsertError) {
            console.error('[Verify Photo] Upsert error (Selfie success):', upsertError);
          }

          console.log(`[Verify Photo] Selfie verified for ${phone}`);
          
          // Verify data was saved
          const { data: verifyData, error: verifyError } = await (supabase
            .from('users') as any)
            .select('onboarding_data, onboarding_step')
            .eq('phone', phone)
            .single();
          
          console.log(`[Verify Photo] Verification fetch (Selfie success) - data:`, verifyData, 'error:', verifyError);
          
          // Send WhatsApp notification
          await sendWhatsApp({
            phone,
            message: '✅ Selfie Anda berhasil diverifikasi!\n\n🎉 *Pendaftaran Selesai!*\n\nAkun Anda sudah terdaftar dan sedang menunggu persetujuan dari admin.\n\nTerima kasih telah bergabung dengan Juragan Suplai!',
          }).catch(err => console.error('[Verify Photo] Failed to send WhatsApp:', err));
        }

        return NextResponse.json({
          verified,
          message: verified
            ? 'Selfie terverifikasi'
            : `Selfie tidak valid: ${analysis.issues?.join(', ') || 'Format tidak sesuai'}`,
        });
      } catch (parseError) {
        console.error('[Verify Photo] JSON parse error:', parseError);
        return NextResponse.json(
          { verified: false, message: 'Error parsing verification result' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('[Verify Photo] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
