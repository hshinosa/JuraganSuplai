'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="bg-emerald-900 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute right-0 top-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute left-0 bottom-0 w-96 h-96 bg-emerald-400 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Siap Mengembangkan Bisnis Anda?
            </h2>
            <p className="text-emerald-100 text-lg mb-10 leading-relaxed">
              Bergabunglah dengan ekosistem rantai pasok modern. 
              Efisiensikan pengadaan bahan baku Anda mulai hari ini.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard/buyer">
                <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50 text-lg px-8 h-14 rounded-full font-bold">
                  Mulai Belanja Sekarang
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-emerald-700 text-white hover:bg-emerald-800 text-lg px-8 h-14 rounded-full bg-transparent">
                <MessageCircle className="w-5 h-5 mr-2" />
                Konsultasi Gratis
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
