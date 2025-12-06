'use client';

/**
 * Order Card Component
 * Displays order summary in a card format
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from './order-status-badge';
import { Package, MapPin, Truck, Clock } from 'lucide-react';
import type { Order } from '@/types/database';

interface OrderCardProps {
  order: Order & {
    supplier?: { name: string; phone: string; business_name?: string } | null;
    courier?: { name: string; phone: string; vehicle?: string } | null;
  };
  onViewDetails?: (orderId: string) => void;
  onPay?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
  onTrack?: (orderId: string) => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderCard({ 
  order, 
  onViewDetails, 
  onPay, 
  onCancel,
  onTrack,
  onSelect,
  isSelected 
}: OrderCardProps) {
  const totalAmount = order.total_amount || 
    (order.buyer_price + order.service_fee + order.shipping_cost);

  const canPay = order.status === 'waiting_payment';
  const canCancel = ['searching_supplier', 'waiting_buyer_approval', 'negotiating_courier', 'waiting_payment'].includes(order.status);
  const canTrack = order.status === 'shipping';
  const isActive = !['completed', 'refunded', 'cancelled_by_buyer', 'failed_no_supplier'].includes(order.status);

  return (
    <Card className={`bg-white border border-slate-200 rounded-lg shadow-sm transition-shadow hover:shadow-md ${
      isActive ? '' : 'opacity-75'
    }`}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="h-4 w-4" />
          <span>{formatDate(order.created_at)}</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono">#{order.id.substring(0, 8)}</span>
        </div>
        <OrderStatusBadge status={order.status} />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Product Info */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Package className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">
              {order.product_name}
            </h3>
            <p className="text-sm text-slate-500">
              {order.quantity} {order.unit} • Est. {order.weight_kg || '-'} kg
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-emerald-600">
              Rp {formatCurrency(totalAmount)}
            </p>
            <p className="text-xs text-slate-400">
              +Rp {formatCurrency(order.service_fee)} biaya
            </p>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="flex items-start gap-3 text-sm">
          <div className="p-2 bg-slate-50 rounded-lg">
            <MapPin className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex-1">
            <p className="text-slate-600 line-clamp-2">
              {order.delivery_address || 'Alamat belum ditentukan'}
            </p>
          </div>
        </div>

        {/* Supplier/Courier Info */}
        {(order.supplier || order.courier) && (
          <div className="flex items-center gap-3 text-sm border-t pt-3">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Truck className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex-1">
              {order.supplier && (
                <p className="text-slate-600">
                  <span className="text-slate-400">Supplier:</span>{' '}
                  {order.supplier.business_name || order.supplier.name}
                </p>
              )}
              {order.courier && (
                <p className="text-slate-600">
                  <span className="text-slate-400">Kurir:</span>{' '}
                  {order.courier.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {canPay && onPay && (
            <Button 
              onClick={() => onPay(order.id)}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              Bayar Sekarang
            </Button>
          )}
          
          {canTrack && onTrack && (
            <Button 
              onClick={() => onTrack(order.id)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Lacak Pengiriman
            </Button>
          )}
          
          {onViewDetails && (
            <Button 
              variant="outline"
              onClick={() => onViewDetails(order.id)}
              className={canPay || canTrack ? '' : 'flex-1'}
            >
              Detail
            </Button>
          )}
          
          {canCancel && onCancel && (
            <Button 
              variant="ghost"
              onClick={() => onCancel(order.id)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              Batal
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default OrderCard;
