'use client';

import { Package, MapPin, Phone, MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">Juragan Suplai</span>
            </div>
            <p className="text-slate-500 leading-relaxed mb-6">
              Platform B2B logistics modern yang menghubungkan pembeli dengan supplier lokal terdekat untuk efisiensi rantai pasok Indonesia.
            </p>
            <div className="flex gap-4">
              {/* Social Icons Placeholder */}
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors cursor-pointer">
                <span className="font-bold">IG</span>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors cursor-pointer">
                <span className="font-bold">FB</span>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors cursor-pointer">
                <span className="font-bold">LI</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Perusahaan</h4>
            <ul className="space-y-4 text-slate-500">
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Tentang Kami</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Karir</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Kontak</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Layanan</h4>
            <ul className="space-y-4 text-slate-500">
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Belanja Grosir</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Daftar Supplier</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Daftar Kurir</a></li>
              <li><a href="#" className="hover:text-emerald-600 transition-colors">Cek Ongkir</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Hubungi Kami</h4>
            <ul className="space-y-4 text-slate-500">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                <span>Jl. Sudirman No. 123, Jakarta Selatan, DKI Jakarta 12190</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-emerald-600" />
                <span>(021) 555-0123</span>
              </li>
              <li className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <span>support@juragansuplai.id</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">
            © 2025 JuraganSuplai Indonesia. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-emerald-600">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-600">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
