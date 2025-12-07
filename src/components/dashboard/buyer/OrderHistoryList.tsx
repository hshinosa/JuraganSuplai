import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderCard } from '@/components/order-card';
import { History } from 'lucide-react';
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
    <div className="mt-4">
      <p className="text-sm text-slate-500 mb-4">{orders.length} pesanan selesai</p>

      {orders.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="p-8 text-center">
            <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">Belum ada riwayat pesanan</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-4 pr-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onSelect={() => onSelectOrder(order.id)}
                isSelected={selectedOrderId === order.id}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
