'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation, Loader2 } from 'lucide-react';
import { User } from '@/types/database';

// Dynamic import for Leaflet (SSR issue)
const LiveMap = dynamic(
  () => import('@/components/live-map').then((mod) => mod.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] bg-slate-100 rounded-lg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    ),
  }
);

interface TrackingMapProps {
  courierLocation: { lat: number; lng: number } | null;
  supplier: User | null;
  buyerLocation: { lat: number; lng: number; label?: string };
}

export function TrackingMap({ courierLocation, supplier, buyerLocation }: TrackingMapProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-white overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-5 h-5 text-emerald-600" />
            Posisi Kurir Live
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LiveMap
            courierLocation={courierLocation || undefined}
            supplierLocation={supplier ? {
              lat: -6.2 + Math.random() * 0.01, // Mock location
              lng: 106.8 + Math.random() * 0.01,
              label: supplier.name || 'Supplier',
            } : undefined}
            buyerLocation={buyerLocation}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
