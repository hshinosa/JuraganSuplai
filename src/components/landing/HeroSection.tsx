'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Store,
  CheckCircle,
  MapPin,
  Users,
  Search,
  Wheat,
  ShoppingBag,
  Beef,
  Truck
} from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/50 via-slate-50 to-slate-50 -z-10" />
      
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-emerald-700 bg-emerald-50 border-emerald-200 rounded-full text-sm font-medium">
              🚀 Platform B2B No. #1 untuk UMKM Kuliner
            </Badge>
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-[1.15] tracking-tight">
              Pasok Bahan Baku <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                Langsung dari Sumbernya
              </span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
              Hubungkan bisnis kuliner Anda dengan ribuan supplier dan petani lokal. 
              Dapatkan harga tangan pertama, pengiriman instan, dan sistem pembayaran tempo yang aman.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard/buyer" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 rounded-full px-8">
                  Cari Bahan Baku
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 text-lg border-slate-200 hover:bg-white hover:text-emerald-600 rounded-full px-8">
                <Store className="w-5 h-5 mr-2" />
                Daftar Supplier
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>Tanpa Minimum Order</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>Garansi Segar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>Gratis Ongkir*</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative lg:h-[600px] flex items-center justify-center"
          >
            {/* Abstract Background Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-3xl" />
            
            {/* Main Card Mockup */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-10">
              {/* Header Mockup */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-slate-500">Lokasi Pengiriman</p>
                  <div className="flex items-center gap-1 font-semibold text-slate-900">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Restoran Sederhana, Jaksel
                  </div>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
              </div>

              {/* Search Bar Mockup */}
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 mb-6 border border-slate-100">
                <Search className="w-5 h-5 text-slate-400" />
                <span className="text-slate-400">Cari beras, telur, sayur...</span>
              </div>

              {/* Product List Mockup */}
              <div className="space-y-4">
                {[
                  { name: 'Beras Premium 50kg', price: 'Rp 650.000', icon: Wheat, color: 'bg-amber-100 text-amber-600' },
                  { name: 'Telur Ayam Negeri 10kg', price: 'Rp 280.000', icon: ShoppingBag, color: 'bg-orange-100 text-orange-600' },
                  { name: 'Daging Sapi Segar 5kg', price: 'Rp 600.000', icon: Beef, color: 'bg-red-100 text-red-600' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                    <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{item.name}</h4>
                      <p className="text-sm text-slate-500">Stok tersedia • Siap kirim</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{item.price}</p>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-emerald-50 hover:text-emerald-600">
                        + Keranjang
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Floating Status Card */}
              <div className="absolute -right-8 bottom-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-bounce duration-[3000ms]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status Pengiriman</p>
                    <p className="font-bold text-slate-900">Sedang Diantar</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
