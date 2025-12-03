'use client';

import { Store, Utensils, MapPin, TrendingUp } from 'lucide-react';

export function StatsSection() {
  return (
    <section className="py-10 bg-white border-y border-slate-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Mitra Supplier', value: '2,500+', icon: Store },
            { label: 'UMKM Terbantu', value: '15,000+', icon: Utensils },
            { label: 'Kota Jangkauan', value: '12+', icon: MapPin },
            { label: 'Transaksi Harian', value: '5,000+', icon: TrendingUp },
          ].map((stat, i) => (
            <div key={i} className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
