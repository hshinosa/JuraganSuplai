'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderCard } from '@/components/order-card';
import { CreateOrderForm } from '@/components/create-order-form';
import { RefreshCw, Package, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order } from '@/types/database';

interface ActiveOrdersListProps {
  orders: Order[];
  isLoading: boolean;
  onRefresh: () => void;
  buyerId: string;
  onOrderSuccess: (orderIds: string[]) => void;
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
}

export function ActiveOrdersList({
  orders,
  isLoading,
  onRefresh,
  buyerId,
  onOrderSuccess,
  selectedOrderId,
  onSelectOrder,
}: ActiveOrdersListProps) {
  return (
    <div className="h-full flex flex-col pt-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">{orders.length} pesanan aktif</span>
            {orders.length > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh} 
            disabled={isLoading}
            className="border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <CreateOrderForm buyerId={buyerId} onSuccess={onOrderSuccess} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 space-y-3 overflow-auto">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-white border border-slate-100 animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <Card className="bg-slate-50/50 border-dashed border border-slate-200 w-full max-w-md mx-auto">
            <CardContent className="py-8 text-center">
              <div className="relative inline-flex">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                  <Package className="w-6 h-6 text-emerald-600" />
                </div>
                <Sparkles className="w-4 h-4 text-amber-400 absolute -top-0.5 -right-0.5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Mulai Belanja Sekarang
              </h3>
              <p className="text-xs text-slate-500 mb-3 max-w-[200px] mx-auto">
                Cari produk dari supplier terdekat dengan harga terbaik
              </p>
              <CreateOrderForm buyerId={buyerId} onSuccess={onOrderSuccess} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            <AnimatePresence mode="popLayout">
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <OrderCard
                    order={order}
                    onSelect={() => onSelectOrder(order.id)}
                    isSelected={selectedOrderId === order.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
