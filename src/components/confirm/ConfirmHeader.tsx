'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ConfirmHeaderProps {
  orderId: string;
}

export function ConfirmHeader({ orderId }: ConfirmHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/track/${orderId}`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Konfirmasi Terima</h1>
            <p className="text-sm text-slate-500">#{orderId.slice(0, 8)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
