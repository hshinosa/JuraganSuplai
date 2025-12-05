'use client';

/**
 * Order Status Badge Component
 * Displays order status with modern styling
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, Clock, Truck, Package, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import type { OrderStatus } from '@/types/database';
import type { LucideIcon } from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const statusConfig: Record<OrderStatus, {
  label: string;
  className: string;
  icon: LucideIcon;
  pulse?: boolean;
}> = {
  searching_supplier: {
    label: 'Mencari Supplier',
    className: 'bg-blue-50 text-blue-700 border-blue-200/50',
    icon: Search,
    pulse: true,
  },
  waiting_buyer_approval: {
    label: 'Menunggu Konfirmasi',
    className: 'bg-violet-50 text-violet-700 border-violet-200/50',
    icon: Clock,
    pulse: true,
  },
  negotiating_courier: {
    label: 'Mencari Kurir',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200/50',
    icon: Search,
    pulse: true,
  },
  stuck_no_courier: {
    label: 'Kurir Tidak Tersedia',
    className: 'bg-orange-50 text-orange-700 border-orange-200/50',
    icon: AlertTriangle,
  },
  waiting_payment: {
    label: 'Menunggu Pembayaran',
    className: 'bg-amber-50 text-amber-700 border-amber-200/50',
    icon: Clock,
    pulse: true,
  },
  paid_held: {
    label: 'Siap Kirim',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200/50',
    icon: Package,
  },
  shipping: {
    label: 'Dalam Pengiriman',
    className: 'bg-blue-50 text-blue-700 border-blue-200/50',
    icon: Truck,
    pulse: true,
  },
  delivered: {
    label: 'Sampai Tujuan',
    className: 'bg-teal-50 text-teal-700 border-teal-200/50',
    icon: Package,
  },
  dispute_check: {
    label: 'Dalam Peninjauan',
    className: 'bg-rose-50 text-rose-700 border-rose-200/50',
    icon: AlertTriangle,
    pulse: true,
  },
  completed: {
    label: 'Selesai',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    icon: CheckCircle2,
  },
  refunded: {
    label: 'Dana Dikembalikan',
    className: 'bg-slate-100 text-slate-600 border-slate-200/50',
    icon: XCircle,
  },
  cancelled_by_buyer: {
    label: 'Dibatalkan',
    className: 'bg-slate-100 text-slate-500 border-slate-200/50',
    icon: XCircle,
  },
  failed_no_supplier: {
    label: 'Gagal',
    className: 'bg-red-50 text-red-600 border-red-200/50',
    icon: XCircle,
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  default: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

const iconSizes = {
  sm: 'h-3 w-3',
  default: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function OrderStatusBadge({ 
  status, 
  className, 
  showIcon = true,
  size = 'default' 
}: OrderStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-600 border-slate-200/50',
    icon: Loader2,
  };

  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium border rounded-full inline-flex items-center',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
          iconSizes[size],
          config.pulse && 'animate-pulse'
        )} />
      )}
      <span>{config.label}</span>
    </Badge>
  );
}

export default OrderStatusBadge;
