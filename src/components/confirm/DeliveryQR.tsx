'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface DeliveryQRProps {
  expectedCode: string;
  confirmationCode: string;
  setConfirmationCode: (code: string) => void;
  onConfirm: () => void;
  onDispute: () => void;
  isConfirming: boolean;
}

export function DeliveryQR({
  expectedCode,
  confirmationCode,
  setConfirmationCode,
  onConfirm,
  onDispute,
  isConfirming,
}: DeliveryQRProps) {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-lg">Scan QR Kurir</CardTitle>
        <p className="text-sm text-slate-500">
          Minta kurir menunjukkan QR Code pengiriman
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center py-4">
          <div className="p-4 bg-white border-2 border-slate-200 rounded-xl">
            <QRCodeSVG value={expectedCode} size={200} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Atau masukkan kode manual</Label>
            <Input
              placeholder="Contoh: JS-123456"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg uppercase"
            />
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
            onClick={onConfirm}
            disabled={isConfirming || !confirmationCode}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Konfirmasi Terima Barang
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">
                Ada masalah?
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
            onClick={onDispute}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Laporkan Masalah / Barang Rusak
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
