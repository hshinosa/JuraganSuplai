'use client';

import { Order } from '@/types/database';

// Format currency
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

interface PaymentOrderSummaryProps {
  order: Order;
}

export function PaymentOrderSummary({ order }: PaymentOrderSummaryProps) {
  const totalAmount = order.total_amount || 0;
  const serviceFee = Math.round(totalAmount * 0.05);
  const grandTotal = totalAmount + serviceFee;

  return (
    <div className="w-full border-t pt-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Produk</span>
        <span className="font-medium">{order.product_name}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Subtotal</span>
        <span>{formatRupiah(totalAmount)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Biaya Layanan (5%)</span>
        <span>{formatRupiah(serviceFee)}</span>
      </div>
      <div className="flex justify-between text-lg font-bold pt-2 border-t">
        <span>Total</span>
        <span className="text-emerald-600">{formatRupiah(grandTotal)}</span>
      </div>
    </div>
  );
}
