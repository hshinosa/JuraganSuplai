'use client';

/**
 * Order Card Component
 * Displays order summary in a card format with modern design
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from './order-status-badge';
import { Package, MapPin, Truck, Clock, ChevronRight, CreditCard, Navigation } from 'lucide-react';
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
    <Card 
      className={`
        relative overflow-hidden border-0 shadow-sm transition-all duration-200 cursor-pointer
        hover:shadow-md hover:-translate-y-0.5
        ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
        ${isActive ? 'bg-white' : 'bg-slate-50 opacity-80'}
      `}
      onClick={onSelect}
    >
      {/* Status accent line */}
      <div className={`absolute inset-x-0 top-0 h-1 ${
        order.status === 'shipping' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
        order.status === 'waiting_payment' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
        order.status === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
        order.status.includes('dispute') || order.status.includes('refund') ? 'bg-gradient-to-r from-red-500 to-rose-500' :
        'bg-gradient-to-r from-slate-300 to-slate-400'
      }`} />
      
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2.5 rounded-xl ${
              isActive ? 'bg-emerald-50' : 'bg-slate-100'
            }`}>
              <Package className={`h-5 w-5 ${
                isActive ? 'text-emerald-600' : 'text-slate-400'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 leading-tight">
                {order.product_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400 font-mono">#{order.id.substring(0, 8)}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">{order.quantity} {order.unit}</span>
              </div>
            </div>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Price & Time */}
        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Total Harga</p>
            <p className="text-lg font-bold text-slate-900">
              Rp {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">{formatDate(order.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-3 mb-4">
          <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600 line-clamp-1 flex-1">
            {order.delivery_address || 'Alamat belum ditentukan'}
          </p>
        </div>

        {/* Supplier/Courier Info */}
        {(order.supplier || order.courier) && (
          <div className="flex items-center gap-3 py-3 px-4 bg-blue-50 rounded-xl mb-4">
            <Truck className="h-4 w-4 text-blue-600" />
            <div className="flex-1 text-sm">
              {order.supplier && (
                <p className="text-slate-700">
                  <span className="text-slate-500">Supplier:</span>{' '}
                  <span className="font-medium">{order.supplier.business_name || order.supplier.name}</span>
                </p>
              )}
              {order.courier && (
                <p className="text-slate-700">
                  <span className="text-slate-500">Kurir:</span>{' '}
                  <span className="font-medium">{order.courier.name}</span>
                  {order.courier.vehicle && (
                    <span className="text-slate-400 ml-1">({order.courier.vehicle})</span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {canPay && onPay && (
            <Button 
              onClick={(e) => { e.stopPropagation(); onPay(order.id); }}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Bayar Sekarang
            </Button>
          )}
          
          {canTrack && onTrack && (
            <Button 
              onClick={(e) => { e.stopPropagation(); onTrack(order.id); }}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-sm"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Lacak
            </Button>
          )}
          
          {onViewDetails && (
            <Button 
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onViewDetails(order.id); }}
              className={`border-slate-200 hover:bg-slate-50 ${canPay || canTrack ? '' : 'flex-1'}`}
            >
              Detail
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          
          {canCancel && onCancel && (
            <Button 
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}
              className="text-slate-400 hover:text-red-500 hover:bg-red-50"
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
