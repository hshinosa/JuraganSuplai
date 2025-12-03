'use client';

/**
 * Confirmation Page - Delivery QR Scan
 * Buyer scans QR from courier to confirm delivery
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Order } from '@/types/database';
import { actionConfirmDelivery, actionReportDispute } from '@/actions/buyer';
import { toast } from 'sonner';

// Components
import { ConfirmHeader } from '@/components/confirm/ConfirmHeader';
import { DeliveryQR } from '@/components/confirm/DeliveryQR';
import { DisputeForm } from '@/components/confirm/DisputeForm';
import { SuccessView } from '@/components/confirm/SuccessView';

// Format currency
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

interface ConfirmationPageProps {
  params: Promise<{ orderId: string }>;
}

export default function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeImage, setDisputeImage] = useState<string | null>(null);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<'pending' | 'success' | 'dispute'>('pending');
  
  const supabase = createClient();

  // Generate expected confirmation code
  const expectedCode = `JS-${orderId.slice(0, 6).toUpperCase()}`;

  // Fetch order
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('orders') as any)
          .select('*')
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrder(data);

        // Check if already completed
        if (data?.status === 'completed') {
          setConfirmationStatus('success');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Pesanan tidak ditemukan');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, supabase]);

  // Handle confirmation
  const handleConfirm = async () => {
    // Validate code
    if (confirmationCode.toUpperCase() !== expectedCode) {
      toast.error('Kode konfirmasi tidak valid');
      return;
    }

    setIsConfirming(true);

    try {
      const result = await actionConfirmDelivery({
        orderId,
        buyerId: order?.buyer_id || '',
        confirmationCode: confirmationCode.toUpperCase(),
      });

      if (result.success) {
        setConfirmationStatus('success');
        toast.success('Pesanan berhasil dikonfirmasi!');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error('Gagal mengkonfirmasi pesanan');
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle dispute
  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Mohon jelaskan masalah yang terjadi');
      return;
    }

    setIsSubmittingDispute(true);

    try {
      const result = await actionReportDispute({
        orderId,
        buyerId: order?.buyer_id || '',
        reason: disputeReason,
        imageUrl: disputeImage || undefined,
      });

      if (result.success) {
        setConfirmationStatus('dispute');
        toast.success('Laporan dispute terkirim');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Dispute error:', error);
      toast.error('Gagal mengirim laporan');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="bg-white max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Pesanan Tidak Ditemukan</h2>
            <p className="text-slate-500 mb-4">Order ID: {orderId}</p>
            <Button onClick={() => router.push('/dashboard/buyer')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ConfirmHeader orderId={orderId} />

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <AnimatePresence mode="wait">
          {confirmationStatus === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <SuccessView orderId={orderId} />
            </motion.div>
          ) : confirmationStatus === 'dispute' ? (
            <motion.div
              key="dispute"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card className="bg-white">
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="w-20 h-20 mx-auto text-amber-500 mb-4" />
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Dispute Dilaporkan
                  </h2>
                  <p className="text-slate-500 mb-6">
                    Tim kami akan memeriksa laporan Anda dalam 1x24 jam
                  </p>
                  <Badge className="bg-amber-100 text-amber-700 mb-6">
                    Status: Dalam Peninjauan
                  </Badge>
                  <Button
                    onClick={() => router.push('/dashboard/buyer')}
                    className="w-full"
                    variant="outline"
                  >
                    Kembali ke Dashboard
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : showDispute ? (
            <motion.div
              key="dispute-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <DisputeForm
                disputeReason={disputeReason}
                setDisputeReason={setDisputeReason}
                disputeImage={disputeImage}
                setDisputeImage={setDisputeImage}
                onSubmit={handleDispute}
                onCancel={() => setShowDispute(false)}
                isSubmitting={isSubmittingDispute}
              />
            </motion.div>
          ) : (
            <motion.div
              key="confirm-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <DeliveryQR
                expectedCode={expectedCode}
                confirmationCode={confirmationCode}
                setConfirmationCode={setConfirmationCode}
                onConfirm={handleConfirm}
                onDispute={() => setShowDispute(true)}
                isConfirming={isConfirming}
              />

              {/* Order Summary */}
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="w-5 h-5 text-slate-400" />
                    <span className="font-medium">{order.product_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="font-bold text-emerald-600">
                      {formatRupiah(order.total_amount || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
