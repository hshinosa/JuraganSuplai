'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin } from 'lucide-react';
import { Order } from '@/types/database';

// Format currency
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

interface OrderDetailsCardProps {
  order: Order;
}

export function OrderDetailsCard({ order }: OrderDetailsCardProps) {
  const totalAmount = order.total_amount || (order.buyer_price + order.shipping_cost + order.service_fee);
  const pricePerUnit = order.quantity > 0 ? order.buyer_price / order.quantity : 0;

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          Detail Pesanan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-start py-2 border-b border-slate-100">
          <div>
            <p className="font-medium text-slate-900">{order.product_name}</p>
            <p className="text-sm text-slate-500">
              {order.quantity} {order.unit} × {formatRupiah(pricePerUnit)}
            </p>
          </div>
          <p className="font-bold text-slate-900">
            {formatRupiah(totalAmount)}
          </p>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-900">Lokasi Pengiriman</p>
            <p className="text-sm text-slate-500">{order.delivery_address}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
