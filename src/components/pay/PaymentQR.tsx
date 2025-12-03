'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Clock, Shield, CreditCard, Loader2 } from 'lucide-react';
import { PaymentOrderSummary } from './PaymentOrderSummary';
import { Order } from '@/types/database';

// Format currency
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format time
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface PaymentQRProps {
  order: Order;
  qrString: string;
  timeLeft: number;
  isPaying: boolean;
  onSimulatePayment: () => void;
}

export function PaymentQR({
  order,
  qrString,
  timeLeft,
  isPaying,
  onSimulatePayment,
}: PaymentQRProps) {
  const totalAmount = order.total_amount || 0;
  const serviceFee = Math.round(totalAmount * 0.05);
  const grandTotal = totalAmount + serviceFee;

  return (
    <div className="space-y-4">
      {/* Timer */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-amber-800 font-medium">
                Selesaikan pembayaran dalam
              </span>
            </div>
            <span className="text-2xl font-bold text-amber-600">
              {formatTime(timeLeft)}
            </span>
          </div>
          <Progress
            value={(timeLeft / (15 * 60)) * 100}
            className="mt-2 h-2 bg-amber-200"
          />
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card className="bg-white">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Scan QRIS</CardTitle>
          <p className="text-sm text-slate-500">
            Gunakan aplikasi e-wallet atau mobile banking
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-xl border-2 border-slate-100 mb-4">
            <QRCodeSVG
              value={qrString}
              size={200}
              level="M"
              includeMargin
              imageSettings={{
                src: '/logo-icon.png',
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
          
          <Badge className="bg-slate-100 text-slate-600 mb-4">
            <Shield className="w-3 h-3 mr-1" />
            Mock QRIS - Demo Only
          </Badge>

          <PaymentOrderSummary order={order} />
        </CardContent>
      </Card>

      {/* Simulate Payment Button (for demo) */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="p-4">
          <p className="text-sm text-emerald-700 mb-3 text-center">
            🎮 Mode Demo: Klik tombol untuk simulasi pembayaran
          </p>
          <Button
            onClick={onSimulatePayment}
            disabled={isPaying}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-6"
          >
            {isPaying ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Simulasi Bayar {formatRupiah(grandTotal)}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Payment Methods Info */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <p className="text-sm text-slate-500 text-center">
            Didukung oleh GoPay, OVO, DANA, LinkAja, ShopeePay, 
            dan semua bank yang mendukung QRIS
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
