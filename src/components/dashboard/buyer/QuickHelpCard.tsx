import { Card, CardContent } from '@/components/ui/card';

export function QuickHelpCard() {
  return (
    <Card className="bg-white mt-4">
      <CardContent className="p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Cara Kerja</h3>
        <ol className="text-sm text-slate-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">
              1
            </span>
            <span>Buat pesanan dengan detail produk</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">
              2
            </span>
            <span>Sistem mencari supplier terdekat</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">
              3
            </span>
            <span>Bayar dengan QRIS</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">
              4
            </span>
            <span>Lacak pengiriman realtime</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-emerald-100 text-emerald-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">
              5
            </span>
            <span>Scan QR untuk konfirmasi terima</span>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
