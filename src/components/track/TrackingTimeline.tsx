'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Store, Truck, Clock, CheckCircle, Navigation, Package } from 'lucide-react';
import { Order } from '@/types/database';

// Tracking steps
const trackingSteps = [
  { status: 'searching_supplier', label: 'Mencari Supplier', icon: Store },
  { status: 'negotiating_courier', label: 'Mencari Kurir', icon: Truck },
  { status: 'waiting_payment', label: 'Menunggu Pembayaran', icon: Clock },
  { status: 'paid_held', label: 'Pembayaran Diterima', icon: CheckCircle },
  { status: 'shipping', label: 'Dalam Pengiriman', icon: Navigation },
  { status: 'delivered', label: 'Terkirim', icon: Package },
  { status: 'completed', label: 'Selesai', icon: CheckCircle },
];

interface TrackingTimelineProps {
  status: Order['status'];
}

export function TrackingTimeline({ status }: TrackingTimelineProps) {
  // Calculate progress
  const getProgressPercent = () => {
    const stepIndex = trackingSteps.findIndex((s) => s.status === status);
    if (stepIndex === -1) return 0;
    return ((stepIndex + 1) / trackingSteps.length) * 100;
  };

  const currentStepIndex = trackingSteps.findIndex((s) => s.status === status);

  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-slate-900 mb-2">
            <span>Status Pesanan</span>
            <span>{Math.round(getProgressPercent())}%</span>
          </div>
          <Progress value={getProgressPercent()} className="h-2" />
        </div>

        <div className="space-y-6 relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-100" />

          {trackingSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.status} className="relative flex items-start gap-4">
                <div
                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                </div>
                <div className={`${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                  <p className={`text-sm font-medium ${isCurrent ? 'text-emerald-600' : ''}`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sedang diproses...
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
