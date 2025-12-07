'use client';

import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">Juragan Suplai</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#kategori" className="hover:text-emerald-600 transition-colors">Kategori</a>
          <a href="#cara-kerja" className="hover:text-emerald-600 transition-colors">Cara Kerja</a>
          <a href="#mitra" className="hover:text-emerald-600 transition-colors">Mitra</a>
          <a href="#testimoni" className="hover:text-emerald-600 transition-colors">Testimoni</a>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard/buyer">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 rounded-full px-6">
              Mulai Belanja
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
