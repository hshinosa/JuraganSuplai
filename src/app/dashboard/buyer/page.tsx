'use client';

/**
 * Buyer Dashboard Page
 * Main interface for buyers to create orders and track them
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreateOrderForm } from '@/components/create-order-form';
import { AgentLogConsole } from '@/components/agent-log-console';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, History, Truck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Order } from '@/types/database';
import { toast } from 'sonner';

// Components
import { DashboardHeader } from '@/components/dashboard/buyer/DashboardHeader';
import { BuyerStats } from '@/components/dashboard/buyer/BuyerStats';
import { ActiveOrdersList } from '@/components/dashboard/buyer/ActiveOrdersList';
import { OrderHistoryList } from '@/components/dashboard/buyer/OrderHistoryList';
import { QuickHelpCard } from '@/components/dashboard/buyer/QuickHelpCard';

// Demo buyer ID (in real app, from auth)
const DEMO_BUYER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export default function BuyerDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const supabase = createClient();

  // Fetch buyer's orders
  const fetchOrders = async () => {
    setIsLoading(true);
    // Guard: ensure supabase client looks valid (helps when NEXT_PUBLIC_* env vars are missing)
    if (!supabase || typeof (supabase as any).from !== 'function') {
      console.error('Supabase client is not available or misconfigured.');
      toast.error('Supabase tidak terkonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', DEMO_BUYER_ID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      // Better error extraction: Supabase errors sometimes come as objects
      const message =
        error?.message || error?.error || (typeof error === 'string' ? error : undefined) || JSON.stringify(error || {}) || 'Unknown error';
      console.error('Error fetching orders:', error);
      toast.error(`Gagal memuat pesanan: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to order changes
  useEffect(() => {
    fetchOrders();

    // Guard subscription setup
    let channel: any = null;
    if (supabase && typeof (supabase as any).channel === 'function') {
      channel = supabase
      .channel('buyer-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${DEMO_BUYER_ID}`,
        },
        (payload) => {
          console.log('Order update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev]);
            toast.info('Pesanan baru dibuat!');
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === (payload.new as Order).id
                  ? (payload.new as Order)
                  : order
              )
            );
            toast.success('Status pesanan diperbarui');
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) =>
              prev.filter((order) => order.id !== (payload.old as Order).id)
            );
          }
        }
      )
      .subscribe();
    }

    return () => {
      if (supabase && typeof (supabase as any).removeChannel === 'function') {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Count orders by status
  const orderCounts = {
    active: orders.filter((o) => 
      !['completed', 'refunded', 'cancelled'].includes(o.status)
    ).length,
    shipping: orders.filter((o) => o.status === 'shipping').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    issues: orders.filter((o) => 
      ['dispute_check', 'refunded'].includes(o.status)
    ).length,
  };

  // Handle new order success
  const handleOrderSuccess = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowCreateForm(false);
    toast.success('Pesanan berhasil dibuat! Sistem sedang mencari supplier...');
  };

  // Categorize orders
  const activeOrders = orders.filter((o) => 
    !['completed', 'refunded', 'cancelled'].includes(o.status)
  );
  const historyOrders = orders.filter((o) => 
    ['completed', 'refunded', 'cancelled'].includes(o.status)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader onCreateOrder={() => setShowCreateForm(true)} />

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <BuyerStats counts={orderCounts} />

            {/* Create Order Form - Shown when button clicked */}
            <AnimatePresence>
              {showCreateForm && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="bg-white border-2 border-emerald-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Buat Pesanan Baru</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateForm(false)}
                      >
                        Batal
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <CreateOrderForm
                        buyerId={DEMO_BUYER_ID}
                        onSuccess={handleOrderSuccess}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Orders Tabs */}
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Aktif
                  {orderCounts.active > 0 && (
                    <Badge className="bg-emerald-600 text-white text-xs">
                      {orderCounts.active}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Riwayat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <ActiveOrdersList
                  orders={activeOrders}
                  isLoading={isLoading}
                  onRefresh={fetchOrders}
                  onCreateOrder={() => setShowCreateForm(true)}
                  selectedOrderId={selectedOrderId}
                  onSelectOrder={setSelectedOrderId}
                />
              </TabsContent>

              <TabsContent value="history">
                <OrderHistoryList
                  orders={historyOrders}
                  selectedOrderId={selectedOrderId}
                  onSelectOrder={setSelectedOrderId}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* System Activity Log - Right sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white flex items-center gap-2 text-base">
                    <Truck className="w-5 h-5 text-emerald-400" />
                    Status Aktivitas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <AgentLogConsole
                    orderId={selectedOrderId || undefined}
                    maxHeight="500px"
                  />
                </CardContent>
              </Card>

              <QuickHelpCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
