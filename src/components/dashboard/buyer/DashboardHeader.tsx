import { Button } from '@/components/ui/button';
import { Package, Plus } from 'lucide-react';

interface DashboardHeaderProps {
  onCreateOrder: () => void;
}

export function DashboardHeader({ onCreateOrder }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">JuraganSuplai</h1>
              <p className="text-sm text-slate-500">Dashboard Pembeli</p>
            </div>
          </div>

          <Button onClick={onCreateOrder} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Pesanan Baru
          </Button>
        </div>
      </div>
    </header>
  );
}
