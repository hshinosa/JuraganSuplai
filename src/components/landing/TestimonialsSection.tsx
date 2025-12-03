'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

export function TestimonialsSection() {
  return (
    <section id="testimoni" className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Kata Mereka</h2>
          <p className="text-slate-600">Ribuan pemilik bisnis telah beralih ke JuraganSuplai</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              name: 'Budi Santoso',
              role: 'Pemilik Warteg Bahari',
              text: 'Sejak pakai JuraganSuplai, saya nggak perlu bangun jam 3 pagi buat ke pasar. Barang diantar pas saya buka warung. Kualitasnya juga bagus banget.',
              rating: 5
            },
            {
              name: 'Siti Aminah',
              role: 'Catering Berkah',
              text: 'Sangat membantu buat catering dadakan. Cari bahan baku 50kg daging sapi dalam 1 jam langsung dapet supplier yang sanggup kirim.',
              rating: 5
            },
            {
              name: 'Hendro Wijaya',
              role: 'Supplier Sayur',
              text: 'Omzet saya naik 3x lipat karena orderan masuk terus dari aplikasi. Sistem pembayarannya juga lancar, nggak ada yang nunggak.',
              rating: 5
            }
          ].map((testi, i) => (
            <Card key={i} className="border-none shadow-lg">
              <CardContent className="p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(testi.rating)].map((_, j) => (
                    <Star key={j} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 mb-6 italic">"{testi.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500">
                    {testi.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{testi.name}</h4>
                    <p className="text-sm text-slate-500">{testi.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
