'use client';

/**
 * Buyer Dashboard Page
 * Main interface for buyers to create orders and track them
 */

import { useState, useEffect } from 'react';
import { AgentLogConsole } from '@/components/agent-log-console';
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

  // Handle new order success (multi-order support)
  const handleOrderSuccess = (orderIds: string[]) => {
    const firstId = orderIds[0];
    if (firstId) setSelectedOrderId(firstId);
    toast.success(
      orderIds.length > 1
        ? `Berhasil membuat ${orderIds.length} pesanan! Sistem sedang mencari supplier...`
        : 'Pesanan berhasil dibuat! Sistem sedang mencari supplier...'
    );
  };

  // Categorize orders
  const activeOrders = orders.filter((o) => 
    !['completed', 'refunded', 'cancelled'].includes(o.status)
  );
  const historyOrders = orders.filter((o) => 
    ['completed', 'refunded', 'cancelled'].includes(o.status)
  );

  return (
    <div className="min-h-screen xl:h-screen flex flex-col bg-slate-50 xl:overflow-hidden">
      <DashboardHeader />

      <main className="flex-1 container mx-auto px-4 lg:px-8 py-4 xl:overflow-hidden">
        <div className="xl:h-full grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Main Content - Left section */}
          <div className="xl:col-span-8 flex flex-col gap-4 xl:overflow-hidden">
            <BuyerStats counts={orderCounts} />

            {/* Orders Section */}
            <div className="xl:flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4 xl:overflow-hidden flex flex-col min-h-[400px] xl:min-h-0">
              <Tabs defaultValue="active" className="h-full flex flex-col">
                <TabsList className="w-full max-w-xs bg-slate-100/80 p-1 rounded-lg shrink-0">
                  <TabsTrigger 
                    value="active" 
                    className="flex-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 text-sm"
                  >
                    <Package className="w-4 h-4" />
                    <span>Aktif</span>
                    {orderCounts.active > 0 && (
                      <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-5 ml-1">
                        {orderCounts.active}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history" 
                    className="flex-1 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 text-sm"
                  >
                    <History className="w-4 h-4" />
                    <span>Riwayat</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="flex-1 overflow-hidden mt-0">
                  <ActiveOrdersList
                    orders={activeOrders}
                    isLoading={isLoading}
                    onRefresh={fetchOrders}
                    buyerId={DEMO_BUYER_ID}
                    onOrderSuccess={handleOrderSuccess}
                    selectedOrderId={selectedOrderId}
                    onSelectOrder={setSelectedOrderId}
                  />
                </TabsContent>

                <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
                  <OrderHistoryList
                    orders={historyOrders}
                    selectedOrderId={selectedOrderId}
                    onSelectOrder={setSelectedOrderId}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-4 flex flex-col gap-4 xl:overflow-hidden">
            {/* Activity Log */}
            <Card className="xl:flex-1 bg-slate-900 border-0 shadow-lg overflow-hidden flex flex-col min-h-[300px] xl:min-h-0">
              <CardHeader className="py-3 px-4 border-b border-slate-700/50 shrink-0">
                <CardTitle className="text-white flex items-center gap-2 text-sm">
                  <div className="relative">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  </div>
                  Live Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <AgentLogConsole
                  orderId={selectedOrderId || undefined}
                  maxHeight="100%"
                />
              </CardContent>
            </Card>

            <QuickHelpCard />
          </div>
        </div>
      </main>
    </div>
  );
}
