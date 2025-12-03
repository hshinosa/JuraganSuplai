'use client';

import { Badge } from '@/components/ui/badge';
import { Search, Users, MapPin, Shield, CheckCircle, Truck, TrendingUp } from 'lucide-react';

export function HowItWorksSection() {
  return (
    <section id="cara-kerja" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <Badge variant="outline" className="mb-4 text-emerald-600 border-emerald-200 bg-emerald-50">
              Cara Kerja
            </Badge>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Proses Pengadaan yang <br/>
              Lebih Sederhana
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Lupakan proses belanja ke pasar yang melelahkan. Fokus pada pengembangan menu dan pelayanan pelanggan, biar kami yang urus bahan bakunya.
            </p>

            <div className="space-y-8">
              {[
                {
                  title: 'Request Kebutuhan',
                  desc: 'Cukup ketik barang yang Anda butuhkan dan lokasi pengiriman.',
                  icon: Search
                },
                {
                  title: 'Matching Otomatis',
                  desc: 'Sistem kami mencarikan supplier terdekat dengan harga terbaik.',
                  icon: Users
                },
                {
                  title: 'Pengiriman Terpantau',
                  desc: 'Kurir menjemput dan mengantar pesanan dengan live tracking.',
                  icon: MapPin
                },
                {
                  title: 'Pembayaran Aman',
                  desc: 'Dana diteruskan ke supplier hanya setelah barang Anda terima.',
                  icon: Shield
                }
              ].map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h4>
                    <p className="text-slate-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-blue-50 rounded-3xl transform rotate-3" />
            <div className="relative bg-slate-900 rounded-3xl p-8 shadow-2xl text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6">Live Monitoring</h3>
                <div className="space-y-4">
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">Pesanan #ORD-2938</p>
                      <p className="text-sm text-slate-400">Selesai • Warung Bu Tini</p>
                    </div>
                    <span className="ml-auto text-green-400 font-bold">Rp 450rb</span>
                  </div>
                  
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">Pesanan #ORD-2939</p>
                      <p className="text-sm text-slate-400">Diantar • Resto Padang Jaya</p>
                    </div>
                    <span className="ml-auto text-amber-400 font-bold">Rp 1.2jt</span>
                  </div>

                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">Pesanan #ORD-2940</p>
                      <p className="text-sm text-slate-400">Mencari Supplier • Cafe Kopi</p>
                    </div>
                    <span className="ml-auto text-blue-400 font-bold">Rp 85rb</span>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-800">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Total Transaksi Hari Ini</p>
                      <p className="text-3xl font-bold">Rp 145.200.000</p>
                    </div>
                    <div className="text-emerald-400 flex items-center gap-1 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      +12.5%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
