import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderCard } from '@/components/order-card';
import { RefreshCw, Package, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order } from '@/types/database';

interface ActiveOrdersListProps {
  orders: Order[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreateOrder: () => void;
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
}

export function ActiveOrdersList({
  orders,
  isLoading,
  onRefresh,
  onCreateOrder,
  selectedOrderId,
  onSelectOrder,
}: ActiveOrdersListProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{orders.length} pesanan aktif</p>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white animate-pulse">
              <CardContent className="p-4 h-32" />
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">Belum ada pesanan aktif</p>
            <Button onClick={onCreateOrder} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Buat Pesanan Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-4 pr-4">
            <AnimatePresence>
              {orders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
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
