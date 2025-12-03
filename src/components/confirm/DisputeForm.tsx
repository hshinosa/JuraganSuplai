'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Upload, Loader2, XCircle } from 'lucide-react';

interface DisputeFormProps {
  disputeReason: string;
  setDisputeReason: (reason: string) => void;
  disputeImage: string | null;
  setDisputeImage: (image: string | null) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function DisputeForm({
  disputeReason,
  setDisputeReason,
  disputeImage,
  setDisputeImage,
  onSubmit,
  onCancel,
  isSubmitting,
}: DisputeFormProps) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDisputeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="bg-white border-red-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Ajukan Komplain
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Deskripsi Masalah</Label>
          <Textarea
            placeholder="Jelaskan kerusakan atau ketidaksesuaian barang..."
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Foto Bukti</Label>
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
            {disputeImage ? (
              <div className="relative">
                <img
                  src={disputeImage}
                  alt="Bukti"
                  className="max-h-48 mx-auto rounded-lg"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 rounded-full w-6 h-6"
                  onClick={() => setDisputeImage(null)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">
                  Klik untuk upload foto
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={onSubmit}
            disabled={isSubmitting || !disputeReason || !disputeImage}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengirim...
              </>
            ) : (
              'Kirim Laporan'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
