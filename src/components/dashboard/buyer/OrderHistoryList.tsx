'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { OrderCard } from '@/components/order-card';
import { History, Download, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order } from '@/types/database';

interface OrderHistoryListProps {
  orders: Order[];
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
}

export function OrderHistoryList({
  orders,
  selectedOrderId,
  onSelectOrder,
}: OrderHistoryListProps) {
  return (
    <div className="h-full flex flex-col pt-4">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">{orders.length} pesanan selesai</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-slate-200 hover:bg-slate-50">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="border-slate-200 hover:bg-slate-50">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <Card className="bg-slate-50/50 border-dashed border border-slate-200 w-full max-w-md mx-auto">
            <CardContent className="py-8 text-center">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <History className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Belum Ada Riwayat
              </h3>
              <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                Semua pesanan yang telah selesai akan muncul di sini
              </p>
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
