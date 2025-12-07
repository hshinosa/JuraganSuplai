import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Truck, CheckCircle, AlertCircle } from 'lucide-react';

interface BuyerStatsProps {
  counts: {
    active: number;
    shipping: number;
    completed: number;
    issues: number;
  };
}

export function BuyerStats({ counts }: BuyerStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{counts.active}</p>
              <p className="text-xs text-slate-500">Aktif</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{counts.shipping}</p>
              <p className="text-xs text-slate-500">Dikirim</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{counts.completed}</p>
              <p className="text-xs text-slate-500">Selesai</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{counts.issues}</p>
              <p className="text-xs text-slate-500">Masalah</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
