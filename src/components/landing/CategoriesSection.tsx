'use client';

import { motion } from 'framer-motion';
import { Leaf, Beef, Wheat, Fish, ShoppingBag, ChefHat } from 'lucide-react';

export function CategoriesSection() {
  return (
    <section id="kategori" className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Kategori Populer</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Temukan segala kebutuhan bahan baku bisnis Anda dalam satu platform
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Sayuran', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
            { name: 'Daging', icon: Beef, color: 'text-red-600', bg: 'bg-red-50' },
            { name: 'Sembako', icon: Wheat, color: 'text-amber-600', bg: 'bg-amber-50' },
            { name: 'Ikan', icon: Fish, color: 'text-blue-600', bg: 'bg-blue-50' },
            { name: 'Buah', icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50' },
            { name: 'Bumbu', icon: ChefHat, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((cat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center cursor-pointer hover:shadow-md transition-all"
            >
              <div className={`w-14 h-14 ${cat.bg} ${cat.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <cat.icon className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-slate-900">{cat.name}</h3>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
