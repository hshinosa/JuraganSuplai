'use client';

/**
 * Tracking Page - Public Order Tracking
 * Shows live courier location on map with real-time updates
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, XCircle, Loader2, QrCode } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Order, User as UserType } from '@/types/database';
import { toast } from 'sonner';

// Components
import { TrackingHeader } from '@/components/track/TrackingHeader';
import { TrackingMap } from '@/components/track/TrackingMap';
import { TrackingTimeline } from '@/components/track/TrackingTimeline';
import { OrderDetailsCard } from '@/components/track/OrderDetailsCard';
import { CourierInfoCard } from '@/components/track/CourierInfoCard';

interface TrackingPageProps {
  params: Promise<{ orderId: string }>;
}

export default function TrackingPage({ params }: TrackingPageProps) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [courier, setCourier] = useState<UserType | null>(null);
  const [supplier, setSupplier] = useState<UserType | null>(null);
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch order and related data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch order
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: orderData, error: orderError } = await (supabase.from('orders') as any)
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;
        setOrder(orderData);

        // Fetch courier if assigned
        if (orderData?.courier_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: courierData } = await (supabase.from('users') as any)
            .select('*')
            .eq('id', orderData.courier_id)
            .single();
          
          if (courierData) {
            setCourier(courierData);
            // Parse location from PostGIS
            if (courierData.location && typeof courierData.location === 'string') {
              // location is stored as POINT(lng lat)
              const match = (courierData.location as string).match(/POINT\(([^ ]+) ([^)]+)\)/);
              if (match) {
                setCourierLocation({
                  lng: parseFloat(match[1]),
                  lat: parseFloat(match[2]),
                });
              }
            }
          }
        }

        // Fetch supplier if assigned
        if (orderData?.supplier_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: supplierData } = await (supabase.from('users') as any)
            .select('*')
            .eq('id', orderData.supplier_id)
            .single();
          
          if (supplierData) {
            setSupplier(supplierData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Pesanan tidak ditemukan');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!order) return;

    // Subscribe to order changes
    const orderChannel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          setOrder(payload.new as Order);
          toast.info('Status pesanan diperbarui');
        }
      )
      .subscribe();

    // Subscribe to courier location if assigned
    let courierChannel: ReturnType<typeof supabase.channel> | null = null;
    
    if (order.courier_id) {
      courierChannel = supabase
        .channel(`courier-location-${order.courier_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${order.courier_id}`,
          },
          (payload) => {
            const userData = payload.new as UserType;
            if (userData.location && typeof userData.location === 'string') {
              const match = (userData.location as string).match(/POINT\(([^ ]+) ([^)]+)\)/);
              if (match) {
                setCourierLocation({
                  lng: parseFloat(match[1]),
                  lat: parseFloat(match[2]),
                });
              }
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(orderChannel);
      if (courierChannel) {
        supabase.removeChannel(courierChannel);
      }
    };
  }, [order?.id, order?.courier_id]);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderAny = order as any;
  const buyerLocation = {
    lat: orderAny.delivery_lat || -6.2,
    lng: orderAny.delivery_lng || 106.8,
    label: order.delivery_address || undefined,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TrackingHeader orderId={orderId} status={order.status} />

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Live Map - Only show when shipping */}
        {order.status === 'shipping' && (
          <TrackingMap
            courierLocation={courierLocation}
            supplier={supplier}
            buyerLocation={buyerLocation}
          />
        )}

        {/* Timeline */}
        <TrackingTimeline status={order.status} />

        {/* Order Details */}
        <OrderDetailsCard order={order} />

        {/* Courier Info */}
        {courier && <CourierInfoCard courier={courier} />}

        {/* Action Buttons */}
        {order.status === 'delivered' && (
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <p className="text-emerald-700 font-medium mb-3">
                Pesanan telah tiba! Konfirmasi penerimaan untuk menyelesaikan order.
              </p>
              <Button
                onClick={() => router.push(`/confirm/${orderId}`)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Konfirmasi Terima
              </Button>
            </CardContent>
          </Card>
        )}

        {order.status === 'waiting_payment' && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <p className="text-amber-700 font-medium mb-3">
                Supplier sudah siap! Lakukan pembayaran untuk memulai pengiriman.
              </p>
              <Button
                onClick={() => router.push(`/pay/${orderId}`)}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Bayar Sekarang
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
