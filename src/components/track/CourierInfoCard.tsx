'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, Phone, User as UserIcon } from 'lucide-react';
import { User } from '@/types/database';

interface CourierInfoCardProps {
  courier: User | null;
}

export function CourierInfoCard({ courier }: CourierInfoCardProps) {
  if (!courier) return null;

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="w-5 h-5 text-emerald-600" />
          Info Kurir
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900">{courier.name || 'Kurir'}</p>
            <p className="text-sm text-slate-500">
              {courier.vehicle ? `${courier.vehicle} • ` : ''}
              {courier.phone}
            </p>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full"
            onClick={() => window.open(`https://wa.me/${courier.phone}`, '_blank')}
          >
            <Phone className="w-4 h-4 text-emerald-600" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
