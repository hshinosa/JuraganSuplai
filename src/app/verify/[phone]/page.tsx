'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

type VerificationStep = 'ktp' | 'selfie' | 'completed';

export default function VerificationPage() {
  const params = useParams();
  const router = useRouter();
  const phone = params.phone as string;
  
  const [step, setStep] = useState<VerificationStep>('ktp');
  const [ktpImage, setKtpImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ktpVerified, setKtpVerified] = useState(false);
  const [selfieVerified, setSelfieVerified] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ktp' | 'selfie') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file is image
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diterima');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      console.log(`[Verify] File loaded (${type}), size: ${base64.length}`);
      
      if (type === 'ktp') {
        setKtpImage(base64);
      } else {
        setSelfieImage(base64);
      }

      // Send to backend for verification
      setLoading(true);
      try {
        console.log(`[Verify] Sending ${type} to /api/verify/photo`);
        const response = await fetch('/api/verify/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            type,
            imageBase64: base64,
          }),
        });

        const data = await response.json();
        console.log(`[Verify] API Response (${type}):`, { ok: response.ok, data });

        if (!response.ok) {
          toast.error(data.error || 'Gagal memverifikasi foto');
          return;
        }

        if (data.verified) {
          console.log(`[Verify] ${type} verified! Setting state...`);
          if (type === 'ktp') {
            setKtpVerified(true);
            toast.success('✅ KTP berhasil diverifikasi!');
            setTimeout(() => {
              console.log('[Verify] Advancing to selfie');
              setStep('selfie');
            }, 1000);
          } else {
            setSelfieVerified(true);
            toast.success('✅ Selfie berhasil diverifikasi!');
            setTimeout(() => {
              console.log('[Verify] Advancing to completed');
              setStep('completed');
            }, 1000);
          }
        } else {
          toast.error(`❌ ${data.message || 'Foto tidak memenuhi kriteria. Coba lagi.'}`);
        }
      } catch (error) {
        console.error('[Verify] Fetch error:', error);
        toast.error('Error saat upload foto');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  if (step === 'completed' && ktpVerified && selfieVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-emerald-200">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl text-emerald-700">Verifikasi Selesai!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-600">
              Terima kasih! Akun Anda sudah diverifikasi. Silakan tunggu approve dari admin.
            </p>
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {step === 'ktp' ? '🪪 Unggah Foto KTP' : '📸 Unggah Selfie'}
          </CardTitle>
          <CardDescription>
            {step === 'ktp'
              ? 'Pastikan KTP terlihat jelas dengan nomor NIK yang terbaca'
              : 'Ambil selfie dengan membawa KTP Anda'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Badges */}
          <div className="flex gap-2">
            <Badge
              variant={ktpVerified ? 'default' : step === 'ktp' ? 'outline' : 'secondary'}
              className={ktpVerified ? 'bg-emerald-600' : ''}
            >
              {ktpVerified ? '✅ KTP' : '🪪 KTP'}
            </Badge>
            <Badge
              variant={selfieVerified ? 'default' : step === 'selfie' ? 'outline' : 'secondary'}
              className={selfieVerified ? 'bg-emerald-600' : ''}
            >
              {selfieVerified ? '✅ Selfie' : '📸 Selfie'}
            </Badge>
          </div>

          {/* Image Preview */}
          {(step === 'ktp' && ktpImage) || (step === 'selfie' && selfieImage) ? (
            <div className="relative rounded-lg overflow-hidden bg-slate-200 h-64">
              <img
                src={(step === 'ktp' ? ktpImage : selfieImage) || ''}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              {ktpVerified && step === 'ktp' && (
                <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-emerald-600" />
                </div>
              )}
              {selfieVerified && step === 'selfie' && (
                <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-emerald-600" />
                </div>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-600">
                Klik untuk upload foto
              </span>
              <span className="text-xs text-slate-500 mt-1">
                (JPG, PNG, maksimal 5MB)
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (step !== 'completed') {
                    handleFileUpload(e, step);
                  }
                }}
                disabled={loading || step === 'completed'}
              />
            </label>
          )}

          {/* Upload Button */}
          {((step === 'ktp' && ktpImage && !ktpVerified) ||
            (step === 'selfie' && selfieImage && !selfieVerified)) && (
            <Button
              onClick={() => {
                // Re-trigger verification
                const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (input?.files?.[0]) {
                  const e = new Event('change', { bubbles: true });
                  input.dispatchEvent(e);
                }
              }}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                '✓ Kirim Foto'
              )}
            </Button>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700 space-y-1">
            {step === 'ktp' ? (
              <>
                <p className="font-semibold">📋 Checklist KTP:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Foto jelas tanpa blur atau bayangan</li>
                  <li>Nomor NIK terlihat dengan jelas</li>
                  <li>Seluruh KTP masuk dalam frame</li>
                  <li>Cahaya cukup, tidak terlalu gelap/terang</li>
                </ul>
              </>
            ) : (
              <>
                <p className="font-semibold">🤳 Checklist Selfie:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Wajah Anda terlihat jelas</li>
                  <li>Pegangan KTP (atau surat identitas) di tangan</li>
                  <li>Cahaya cukup untuk melihat wajah dengan jelas</li>
                  <li>KTP terbaca dalam foto</li>
                </ul>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
