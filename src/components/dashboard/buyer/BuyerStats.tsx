'use client';

import { Card } from '@/components/ui/card';
import { ShoppingCart, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface BuyerStatsProps {
  counts: {
    active: number;
    shipping: number;
    completed: number;
    issues: number;
  };
}

const statsConfig = [
  {
    key: 'active',
    label: 'Pesanan Aktif',
    icon: ShoppingCart,
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    description: 'Sedang diproses',
  },
  {
    key: 'shipping',
    label: 'Dalam Pengiriman',
    icon: Truck,
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
    description: 'Menuju lokasi Anda',
  },
  {
    key: 'completed',
    label: 'Selesai',
    icon: CheckCircle,
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
    description: 'Bulan ini',
  },
  {
    key: 'issues',
    label: 'Perlu Tindakan',
    icon: AlertTriangle,
    gradient: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
    description: 'Butuh perhatian',
  },
];

export function BuyerStats({ counts }: BuyerStatsProps) {
  return (
    <div className="space-y-4">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Selamat Datang! 👋</h2>
        <p className="text-slate-500 mt-1">Berikut ringkasan aktivitas pesanan Anda hari ini</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, index) => {
          const Icon = stat.icon;
          const count = counts[stat.key as keyof typeof counts];
          
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="group hover:shadow-md transition-all duration-300 border border-slate-200 bg-white">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgLight}`}>
                      <Icon className={`w-4 h-4 ${stat.textColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">{stat.label}</p>
                      <p className="text-xl font-bold text-slate-900">{count}</p>
                    </div>
                    {count > 0 && stat.key === 'issues' && (
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
