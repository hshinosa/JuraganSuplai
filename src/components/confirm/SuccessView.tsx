'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Star, ThumbsUp } from 'lucide-react';

interface SuccessViewProps {
  orderId: string;
}

export function SuccessView({ orderId }: SuccessViewProps) {
  const router = useRouter();

  return (
    <Card className="bg-white border-emerald-200">
      <CardContent className="p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Pesanan Selesai!
          </h2>
          <p className="text-slate-500">
            Terima kasih telah menggunakan JuraganSuplai. Dana telah diteruskan ke supplier.
          </p>
        </div>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className="w-8 h-8 text-amber-400 fill-amber-400 cursor-pointer hover:scale-110 transition-transform"
            />
          ))}
        </div>

        <div className="pt-4">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
            onClick={() => router.push('/dashboard/buyer')}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Kembali ke Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
