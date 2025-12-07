'use client';

/**
 * Courier Tracking Page - GPS Tracking for Couriers
 * Courier opens this page, clicks "Mulai Pengantaran" to start GPS tracking
 */

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Navigation,
  Phone,
  Package,
  CheckCircle,
  XCircle,
  Loader2,
  PlayCircle,
  StopCircle,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Order } from '@/types/database';
import { toast } from 'sonner';

interface CourierTrackingPageProps {
  params: Promise<{ orderId: string }>;
}

export default function CourierTrackingPage({ params }: CourierTrackingPageProps) {
  const { orderId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [supplier, setSupplier] = useState<{ name: string; phone: string; address: string } | null>(null);
  const [buyer, setBuyer] = useState<{ name: string; phone: string; address: string } | null>(null);

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data: orderData, error } = await (supabase.from('orders') as any)
          .select(`
            *,
            supplier:users!orders_supplier_id_fkey(name, phone, address, business_name),
            buyer:users!orders_buyer_id_fkey(name, phone, address)
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrder(orderData);

        if (orderData.supplier) {
          setSupplier({
            name: orderData.supplier.business_name || orderData.supplier.name,
            phone: orderData.supplier.phone,
            address: orderData.supplier.address,
          });
        }

        if (orderData.buyer) {
          setBuyer({
            name: orderData.buyer.name,
            phone: orderData.buyer.phone,
            address: orderData.buyer.address || orderData.delivery_address,
          });
        }
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Order tidak ditemukan');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Update location to server
  const updateLocationToServer = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch('/api/track/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, lat, lng }),
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      setLastUpdate(new Date());
      console.log(`[GPS] Location updated: ${lat}, ${lng}`);
    } catch (error) {
      console.error('[GPS] Failed to update location:', error);
    }
  }, [orderId]);

  // Start GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Browser Anda tidak mendukung GPS. Gunakan browser modern.');
      toast.error('GPS tidak didukung');
      return;
    }

    setLocationError(null);
    setIsTracking(true);
    toast.success('GPS Tracking dimulai!');

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        updateLocationToServer(latitude, longitude);
      },
      (error) => {
        console.error('[GPS] Error getting position:', error);
        setLocationError(getGeolocationErrorMessage(error));
        toast.error('Gagal mendapatkan lokasi');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Watch position continuously
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        updateLocationToServer(latitude, longitude);
      },
      (error) => {
        console.error('[GPS] Watch error:', error);
        setLocationError(getGeolocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000, // Accept cached position up to 5 seconds old
      }
    );

    setWatchId(id);
  }, [updateLocationToServer]);

  // Stop GPS tracking
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast.info('GPS Tracking dihentikan');
  }, [watchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Mark as picked up
  const handlePickup = async () => {
    try {
      await (supabase.from('orders') as any)
        .update({
          status: 'shipping',
          pickup_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      toast.success('Pickup dikonfirmasi! Lanjutkan pengantaran.');
      setOrder((prev) => prev ? { ...prev, status: 'shipping' } : prev);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Gagal update status');
    }
  };

  // Mark as delivered
  const handleDelivered = async () => {
    try {
      await (supabase.from('orders') as any)
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      // Mark courier as not busy
      if (order?.courier_id) {
        await (supabase.from('users') as any)
          .update({ is_busy: false })
          .eq('id', order.courier_id);
      }

      stopTracking();
      toast.success('Pengantaran selesai! Tunggu konfirmasi pembeli.');
      setOrder((prev) => prev ? { ...prev, status: 'delivered' } : prev);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Gagal update status');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Order Tidak Ditemukan</h2>
            <p className="text-slate-400">Order ID: {orderId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    paid_held: { label: 'Siap Pickup', color: 'bg-amber-500' },
    shipping: { label: 'Dalam Pengantaran', color: 'bg-blue-500' },
    delivered: { label: 'Sudah Sampai', color: 'bg-emerald-500' },
  };

  const currentStatus = statusConfig[order.status] || { label: order.status, color: 'bg-slate-500' };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Kurir Mode</h1>
            <p className="text-sm text-slate-400">Order #{orderId.substring(0, 8)}</p>
          </div>
          <Badge className={`${currentStatus.color} text-white`}>
            {currentStatus.label}
          </Badge>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* GPS Status Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-500" />
              GPS Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {locationError && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{locationError}</p>
              </div>
            )}

            {currentLocation && (
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-sm text-slate-400">Lokasi Saat Ini:</p>
                <p className="font-mono text-emerald-400">
                  {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </p>
                {lastUpdate && (
                  <p className="text-xs text-slate-500 mt-1">
                    Update terakhir: {lastUpdate.toLocaleTimeString('id-ID')}
                  </p>
                )}
              </div>
            )}

            <AnimatePresence mode="wait">
              {!isTracking ? (
                <motion.div
                  key="start"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    onClick={startTracking}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-lg"
                    disabled={order.status === 'delivered'}
                  >
                    <PlayCircle className="w-6 h-6 mr-2" />
                    Mulai Pengantaran
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="stop"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-center gap-2 py-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-400 font-medium">GPS Aktif</span>
                  </div>
                  <Button
                    onClick={stopTracking}
                    variant="outline"
                    className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Hentikan Tracking
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              Detail Pesanan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-slate-400">Produk</p>
              <p className="font-medium">{order.product_name}</p>
              <p className="text-sm text-slate-400">
                {order.quantity} {order.unit} • {order.weight_kg} kg
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Info */}
        {supplier && order.status === 'paid_held' && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">📍 Alamat Pickup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-amber-400">{supplier.name}</p>
                <p className="text-sm text-slate-300">{supplier.address}</p>
              </div>
              <a
                href={`tel:${supplier.phone}`}
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
              >
                <Phone className="w-4 h-4" />
                {supplier.phone}
              </a>
              <Button
                onClick={handlePickup}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Konfirmasi Pickup
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Buyer Info */}
        {buyer && order.status === 'shipping' && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">📍 Alamat Antar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-emerald-400">{buyer.name}</p>
                <p className="text-sm text-slate-300">{buyer.address}</p>
              </div>
              <a
                href={`tel:${buyer.phone}`}
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
              >
                <Phone className="w-4 h-4" />
                {buyer.phone}
              </a>
              <Button
                onClick={handleDelivered}
                className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Barang Sudah Sampai
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Completed State */}
        {order.status === 'delivered' && (
          <Card className="bg-emerald-900/30 border-emerald-700">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
              <h3 className="text-xl font-bold text-emerald-400 mb-2">Pengantaran Selesai!</h3>
              <p className="text-slate-300">
                Menunggu konfirmasi dari pembeli. Dana akan diteruskan setelah dikonfirmasi.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// Helper function for geolocation error messages
function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Akses lokasi ditolak. Mohon izinkan akses GPS di pengaturan browser Anda.';
    case error.POSITION_UNAVAILABLE:
      return 'Lokasi tidak tersedia. Pastikan GPS perangkat Anda aktif.';
    case error.TIMEOUT:
      return 'Waktu pencarian lokasi habis. Coba lagi.';
    default:
      return 'Terjadi kesalahan saat mendapatkan lokasi.';
  }
}
