'use client';

/**
 * Order Status Badge Component
 * Displays order status with appropriate styling
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, {
  label: string;
  className: string;
}> = {
  searching_supplier: {
    label: 'Mencari Supplier',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  waiting_buyer_approval: {
    label: 'Menunggu Konfirmasi',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  negotiating_courier: {
    label: 'Mencari Kurir',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  stuck_no_courier: {
    label: 'Kurir Tidak Tersedia',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  waiting_payment: {
    label: 'Menunggu Bayar',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  paid_held: {
    label: 'Siap Kirim',
    className: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  shipping: {
    label: 'Sedang Diantar',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  delivered: {
    label: 'Sampai Tujuan',
    className: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  dispute_check: {
    label: 'Cek Keluhan',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  completed: {
    label: 'Selesai',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  refunded: {
    label: 'Dikembalikan',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  cancelled_by_buyer: {
    label: 'Dibatalkan',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  failed_no_supplier: {
    label: 'Gagal',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn('font-medium border', config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

export default OrderStatusBadge;
