'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

// Format currency
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

interface PaymentStatusProps {
  status: 'success' | 'failed';
  orderId: string;
  grandTotal: number;
  onRetry: () => void;
}

export function PaymentStatus({ status, orderId, grandTotal, onRetry }: PaymentStatusProps) {
  const router = useRouter();

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
      >
        <Card className="bg-white">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              <CheckCircle className="w-20 h-20 mx-auto text-emerald-500 mb-4" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Pembayaran Berhasil!
            </h2>
            <p className="text-slate-500 mb-6">
              Dana Anda aman di escrow. Akan dirilis ke supplier setelah pesanan selesai.
            </p>
            <div className="bg-emerald-50 rounded-lg p-4 mb-6">
              <p className="text-emerald-700 font-semibold text-lg">
                {formatRupiah(grandTotal)}
              </p>
            </div>
            <Button
              onClick={() => router.push(`/track/${orderId}`)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Lacak Pesanan
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <XCircle className="w-20 h-20 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Pembayaran Gagal
          </h2>
          <p className="text-slate-500 mb-6">
            Waktu pembayaran habis atau terjadi kesalahan.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/buyer')}
              className="flex-1"
            >
              Kembali
            </Button>
            <Button
              onClick={onRetry}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
