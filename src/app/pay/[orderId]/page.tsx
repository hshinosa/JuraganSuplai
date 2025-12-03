'use client';

/**
 * Payment Page - Mock QRIS
 * Visual demo for hackathon - NOT real payment
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Order } from '@/types/database';
import { toast } from 'sonner';

// Components
import { PaymentHeader } from '@/components/pay/PaymentHeader';
import { PaymentQR } from '@/components/pay/PaymentQR';
import { PaymentStatus } from '@/components/pay/PaymentStatus';

// Generate mock QRIS string
const generateMockQRIS = (orderId: string, amount: number) => {
  const timestamp = Date.now();
  return `00020101021126670016ID.CO.JURAGANSUPLAI01189360012345678901020210${orderId}5204839953033605405${amount}5802ID5913JuraganSuplai6007JAKARTA61051012062070703A0163049${timestamp}`;
};

interface PaymentPageProps {
  params: Promise<{ orderId: string }>;
}

export default function PaymentPage({ params }: PaymentPageProps) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const supabase = createClient();

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

        // Check if already paid
        if (data?.status !== 'waiting_payment') {
          setPaymentStatus('success');
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

  // Countdown timer
  useEffect(() => {
    if (paymentStatus !== 'pending' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentStatus('failed');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentStatus, timeLeft]);

  // Simulate payment (for demo)
  const handleSimulatePayment = async () => {
    setIsPaying(true);
    setPaymentStatus('processing');

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Update order status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('orders') as any)
        .update({
          status: 'paid_held',
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      setPaymentStatus('success');
      toast.success('Pembayaran berhasil!');

      // Redirect to tracking after 2 seconds
      setTimeout(() => {
        router.push(`/track/${orderId}`);
      }, 2000);
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast.error('Pembayaran gagal');
    } finally {
      setIsPaying(false);
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

  const totalAmount = order.total_amount || 0;
  const serviceFee = Math.round(totalAmount * 0.05);
  const grandTotal = totalAmount + serviceFee;
  const qrString = generateMockQRIS(orderId, grandTotal);

  return (
    <div className="min-h-screen bg-slate-50">
      <PaymentHeader orderId={orderId} />

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <AnimatePresence mode="wait">
          {paymentStatus === 'success' || paymentStatus === 'failed' ? (
            <PaymentStatus
              key="status"
              status={paymentStatus === 'success' ? 'success' : 'failed'}
              orderId={orderId}
              grandTotal={grandTotal}
              onRetry={() => {
                setPaymentStatus('pending');
                setTimeLeft(15 * 60);
              }}
            />
          ) : (
            <motion.div
              key="pending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <PaymentQR
                order={order}
                qrString={qrString}
                timeLeft={timeLeft}
                isPaying={isPaying}
                onSimulatePayment={handleSimulatePayment}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
