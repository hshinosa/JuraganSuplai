'use client';

/**
 * Create Order Form Component
 * Main input for buyer to request items
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MapPin, Package, Scale, DollarSign, Loader2 } from 'lucide-react';
import { actionRequestItem } from '@/actions/buyer';
import { toast } from 'sonner';

const orderSchema = z.object({
  productName: z.string().min(2, 'Nama produk minimal 2 karakter'),
  quantity: z.number().min(0.1, 'Minimal 0.1'),
  unit: z.string().min(1, 'Unit harus diisi'),
  estimatedWeight: z.number().min(0.1, 'Estimasi berat minimal 0.1 kg'),
  expectedPrice: z.number().min(1000, 'Harga minimal Rp 1.000'),
  deliveryAddress: z.string().min(10, 'Alamat terlalu pendek'),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface CreateOrderFormProps {
  buyerId: string;
  onSuccess?: (orderId: string) => void;
  defaultLocation?: { lat: number; lng: number };
}

export function CreateOrderForm({ 
  buyerId, 
  onSuccess,
  defaultLocation = { lat: -6.2, lng: 106.8 } // Jakarta default
}: CreateOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState(defaultLocation);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      unit: 'kg',
      quantity: 1,
      estimatedWeight: 1,
    },
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation tidak didukung di browser Anda');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        toast.success('Lokasi berhasil didapatkan!');
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Gagal mendapatkan lokasi');
        setIsGettingLocation(false);
      }
    );
  };

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    
    try {
      const result = await actionRequestItem({
        buyerId,
        productName: data.productName,
        quantity: data.quantity,
        unit: data.unit,
        estimatedWeight: data.estimatedWeight,
        expectedPrice: data.expectedPrice,
        deliveryAddress: data.deliveryAddress,
        deliveryLat: location.lat,
        deliveryLng: location.lng,
      });

      if (result.success) {
        toast.success(result.message);
        reset();
        if (result.orderId && onSuccess) {
          onSuccess(result.orderId);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-emerald-600" />
          Cari Produk & Supplier
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="productName" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produk yang dicari
            </Label>
            <Input
              id="productName"
              placeholder="Contoh: Bawang Merah, Cabai Rawit, Tomat..."
              className="text-lg"
              {...register('productName')}
            />
            {errors.productName && (
              <p className="text-sm text-red-500">{errors.productName.message}</p>
            )}
          </div>

          {/* Quantity & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Jumlah</Label>
              <div className="flex gap-2">
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  placeholder="1"
                  className="flex-1"
                  {...register('quantity', { valueAsNumber: true })}
                />
                <select
                  className="px-3 py-2 border border-slate-200 rounded-md bg-white"
                  {...register('unit')}
                >
                  <option value="kg">kg</option>
                  <option value="karung">karung</option>
                  <option value="pcs">pcs</option>
                  <option value="ikat">ikat</option>
                </select>
              </div>
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedWeight" className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Estimasi Berat (kg)
              </Label>
              <Input
                id="estimatedWeight"
                type="number"
                step="0.1"
                placeholder="50"
                {...register('estimatedWeight', { valueAsNumber: true })}
              />
              {errors.estimatedWeight && (
                <p className="text-sm text-red-500">{errors.estimatedWeight.message}</p>
              )}
            </div>
          </div>

          {/* Expected Price */}
          <div className="space-y-2">
            <Label htmlFor="expectedPrice" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Budget Maksimal (Rp)
            </Label>
            <Input
              id="expectedPrice"
              type="number"
              placeholder="50000"
              {...register('expectedPrice', { valueAsNumber: true })}
            />
            <p className="text-xs text-slate-500">
              * Biaya layanan 5% akan ditambahkan saat pembayaran
            </p>
            {errors.expectedPrice && (
              <p className="text-sm text-red-500">{errors.expectedPrice.message}</p>
            )}
          </div>

          {/* Delivery Address */}
          <div className="space-y-2">
            <Label htmlFor="deliveryAddress" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Alamat Pengiriman
            </Label>
            <Textarea
              id="deliveryAddress"
              placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan, Kota..."
              rows={2}
              {...register('deliveryAddress')}
            />
            {errors.deliveryAddress && (
              <p className="text-sm text-red-500">{errors.deliveryAddress.message}</p>
            )}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="text-sm"
            >
              {isGettingLocation ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              Gunakan Lokasi Saya
            </Button>
            
            {location.lat !== defaultLocation.lat && (
              <p className="text-xs text-emerald-600">
                📍 Lokasi: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Mencari Supplier...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Cari Supplier Terdekat
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default CreateOrderForm;
