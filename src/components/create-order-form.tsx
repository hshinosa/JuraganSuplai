'use client';

/**
 * Create Order Form (Dialog, Multi-Item)
 * - Supports multiple items in one submission (creates multiple requests)
 * - Auto category suggestion from product name / suggestions list
 * - Embedded Google Maps preview (follows current location)
 */

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  MapPin,
  Package,
  Scale,
  DollarSign,
  Loader2,
  Tag,
  Info,
  Plus,
  X,
} from 'lucide-react';
import { actionRequestItem } from '@/actions/buyer';
import { toast } from 'sonner';

const CATEGORY_OPTIONS = [
  { value: 'sayur-mayur', label: 'Sayur Mayur', examples: 'bawang, cabai, tomat, wortel, kentang' },
  { value: 'buah-buahan', label: 'Buah-buahan', examples: 'pisang, jeruk, apel, melon, semangka' },
  { value: 'protein-hewani', label: 'Protein Hewani', examples: 'ayam, daging sapi, ikan, udang, telur' },
  { value: 'bahan-pokok', label: 'Bahan Pokok', examples: 'beras, gula, minyak, tepung, garam' },
  { value: 'bumbu-kering', label: 'Bumbu Kering', examples: 'lada, ketumbar, kunyit, jahe kering' },
  { value: 'minuman-dan-lainnya', label: 'Minuman / Lainnya', examples: 'air mineral, kopi, teh, produk lain' },
];

const PRODUCT_SUGGESTIONS = [
  { name: 'Bawang Merah', category: 'sayur-mayur' },
  { name: 'Bawang Putih', category: 'sayur-mayur' },
  { name: 'Cabai Rawit', category: 'sayur-mayur' },
  { name: 'Wortel', category: 'sayur-mayur' },
  { name: 'Tomat', category: 'sayur-mayur' },
  { name: 'Kentang', category: 'sayur-mayur' },
  { name: 'Daging Sapi', category: 'protein-hewani' },
  { name: 'Ayam Broiler', category: 'protein-hewani' },
  { name: 'Ikan Lele', category: 'protein-hewani' },
  { name: 'Telur Ayam', category: 'protein-hewani' },
  { name: 'Beras Medium', category: 'bahan-pokok' },
  { name: 'Gula Pasir', category: 'bahan-pokok' },
  { name: 'Minyak Goreng', category: 'bahan-pokok' },
  { name: 'Jahe', category: 'bumbu-kering' },
  { name: 'Ketumbar', category: 'bumbu-kering' },
  { name: 'Kopi Bubuk', category: 'minuman-dan-lainnya' },
  { name: 'Air Mineral Galon', category: 'minuman-dan-lainnya' },
];

const suggestCategory = (productName: string | undefined) => {
  if (!productName) return null;
  const normalized = productName.toLowerCase();
  const rules: Array<{ keywords: string[]; value: string }> = [
    { keywords: ['bawang', 'cabe', 'cabai', 'tomat', 'wortel', 'kentang', 'sawi', 'bayam', 'kol', 'selada'], value: 'sayur-mayur' },
    { keywords: ['pisang', 'jeruk', 'apel', 'melon', 'semangka', 'pepaya', 'mangga'], value: 'buah-buahan' },
    { keywords: ['ayam', 'daging', 'sapi', 'kambing', 'ikan', 'udang', 'lele', 'nila', 'telur'], value: 'protein-hewani' },
    { keywords: ['beras', 'gula', 'minyak', 'tepung', 'garam'], value: 'bahan-pokok' },
    { keywords: ['lada', 'ketumbar', 'kunyit', 'jahe', 'kencur', 'lengkuas'], value: 'bumbu-kering' },
  ];
  const match = rules.find((rule) => rule.keywords.some((kw) => normalized.includes(kw)));
  if (!match) return null;
  return CATEGORY_OPTIONS.find((opt) => opt.value === match.value) || null;
};

const itemSchema = z.object({
  productName: z.string().min(2, 'Nama produk minimal 2 karakter'),
  category: z.string().min(2, 'Pilih kategori produk'),
  productNotes: z.string().max(300, 'Maksimal 300 karakter').optional(),
  quantity: z.number().min(0.1, 'Minimal 0.1'),
  unit: z.string().min(1, 'Unit harus diisi'),
  estimatedWeight: z.number().min(0.1, 'Estimasi berat minimal 0.1 kg'),
  expectedPrice: z.number().min(1000, 'Harga minimal Rp 1.000'),
});

const orderSchema = z.object({
  items: z.array(itemSchema).min(1, 'Minimal 1 produk'),
  deliveryAddress: z.string().min(10, 'Alamat terlalu pendek'),
  deliveryNotes: z.string().max(200, 'Maksimal 200 karakter').optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface CreateOrderFormProps {
  buyerId: string;
  onSuccess?: (orderIds: string[]) => void;
  defaultLocation?: { lat: number; lng: number };
}

export function CreateOrderForm({
  buyerId,
  onSuccess,
  defaultLocation = { lat: -6.2, lng: 106.8 }, // Jakarta default
}: CreateOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState(defaultLocation);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [focusedInput, setFocusedInput] = useState<number | null>(null);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      items: [
        {
          productName: '',
          category: CATEGORY_OPTIONS[2].value, // default protein-hewani
          productNotes: '',
          quantity: 1,
          unit: 'kg',
          estimatedWeight: 1,
          expectedPrice: 50000,
        },
      ],
      deliveryAddress: '',
      deliveryNotes: '',
    },
  });

  const { control, handleSubmit, formState: { errors }, register, setValue, watch, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchItems = watch('items');

  // Compute suggestions based on focused input only (more reactive)
  const getSuggestionsForIndex = (index: number) => {
    const item = watchItems?.[index];
    if (!item?.productName || item.productName.length < 2) return [];
    const term = item.productName.toLowerCase();
    return PRODUCT_SUGGESTIONS.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 5);
  };

  // Sync category suggestions per item
  useEffect(() => {
    watchItems?.forEach((item, index) => {
      const suggestion = suggestCategory(item.productName);
      if (suggestion && item.category !== suggestion.value) {
        setValue(`items.${index}.category`, suggestion.value, { shouldValidate: false });
      }
    });
  }, [watchItems, setValue]);

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

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    const addressWithNotes = data.deliveryNotes?.trim()
      ? `${data.deliveryAddress}\nCatatan: ${data.deliveryNotes.trim()}`
      : data.deliveryAddress;

    try {
      const results = await Promise.all(data.items.map((item) =>
        actionRequestItem({
          buyerId,
          productName: item.productName,
          category: item.category,
          productNotes: item.productNotes?.trim(),
          deliveryNotes: data.deliveryNotes?.trim(),
          quantity: item.quantity,
          unit: item.unit,
          // If unit is kg, use quantity as weight; otherwise use estimatedWeight
          estimatedWeight: item.unit === 'kg' ? item.quantity : item.estimatedWeight,
          expectedPrice: item.expectedPrice,
          deliveryAddress: addressWithNotes,
          deliveryLat: location.lat,
          deliveryLng: location.lng,
        })
      ));

      const successes = results.filter((r) => r.success && r.orderId) as { orderId: string }[];
      const failures = results.filter((r) => !r.success);

      if (successes.length > 0) {
        toast.success(`Berhasil membuat ${successes.length} pesanan`);
        if (onSuccess) onSuccess(successes.map((s) => s.orderId));
        reset();
        setOpen(false);
      }
      if (failures.length > 0) {
        toast.error(`Gagal membuat ${failures.length} pesanan. Coba lagi.`);
      }
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Search className="h-4 w-4 mr-2" /> Buat Pesanan
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-[1400px] !w-[96vw] px-8 h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-emerald-600" />
            Pesan Produk
          </DialogTitle>
          <DialogDescription>
            Tambahkan satu atau lebih produk, lalu konfirmasi lokasi pengiriman.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1.4fr] lg:grid-cols-[1.5fr_1.2fr] flex-1 min-h-0">
            <div className="flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {fields.map((field, index) => {
                const selectedCategory = CATEGORY_OPTIONS.find((opt) => opt.value === watchItems?.[index]?.category);
                const suggestions = getSuggestionsForIndex(index);
                const isCollapsed = collapsed[field.id];
                return (
                  <div key={field.id} className="rounded-lg border border-slate-200 p-4 space-y-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">Produk #{index + 1}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCollapse(field.id)}
                          aria-label={isCollapsed ? 'Perluas' : 'Ciutkan'}
                        >
                          {isCollapsed ? 'Perluas' : 'Ciutkan'}
                        </Button>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            aria-label="Hapus produk"
                          >
                            <X className="h-4 w-4 text-slate-500" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {isCollapsed ? (
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <div className="truncate max-w-[65%]">
                          {watchItems?.[index]?.productName || 'Belum diisi'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {watchItems?.[index]?.quantity ?? '-'} {watchItems?.[index]?.unit ?? ''}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
                          <div className="space-y-2 relative">
                            <Label htmlFor={`items.${index}.productName`} className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Produk yang dicari
                            </Label>
                            <Input
                              id={`items.${index}.productName`}
                              placeholder="Contoh: Bawang Merah, Cabai Rawit..."
                              className="text-base"
                              {...register(`items.${index}.productName` as const)}
                              onFocus={() => setFocusedInput(index)}
                              onBlur={(e) => {
                                register(`items.${index}.productName` as const).onBlur(e);
                                setTimeout(() => setFocusedInput(null), 150);
                              }}
                            />
                            {errors.items?.[index]?.productName && (
                              <p className="text-sm text-red-500">{errors.items[index]?.productName?.message}</p>
                            )}

                            {focusedInput === index && suggestions.length > 0 && (
                              <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                                {suggestions.map((sug) => (
                                  <button
                                    type="button"
                                    key={sug.name}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setValue(`items.${index}.productName`, sug.name);
                                      setValue(`items.${index}.category`, sug.category);
                                      setFocusedInput(null);
                                    }}
                                  >
                                    <div className="font-medium text-slate-800">{sug.name}</div>
                                    <div className="text-xs text-slate-500">Kategori: {sug.category}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`items.${index}.category`} className="flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              Kategori Produk
                            </Label>
                            <select
                              id={`items.${index}.category`}
                              className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white"
                              {...register(`items.${index}.category` as const)}
                            >
                              {CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            {selectedCategory && (
                              <p className="text-xs text-slate-500">Contoh: {selectedCategory.examples}</p>
                            )}
                            {errors.items?.[index]?.category && (
                              <p className="text-sm text-red-500">{errors.items[index]?.category?.message}</p>
                            )}
                          </div>
                        </div>

                        <div className={`grid gap-3 ${watchItems?.[index]?.unit !== 'kg' ? 'grid-cols-2' : ''}`}>
                          <div className="space-y-2">
                            <Label htmlFor={`items.${index}.quantity`}>Jumlah</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`items.${index}.quantity`}
                                type="number"
                                step="0.1"
                                className="flex-1"
                                {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                              />
                              <select
                                className="px-3 py-2 border border-slate-200 rounded-md bg-white"
                                {...register(`items.${index}.unit` as const)}
                              >
                                <option value="kg">kg</option>
                                <option value="karung">karung</option>
                                <option value="pcs">pcs</option>
                                <option value="ikat">ikat</option>
                              </select>
                            </div>
                            {errors.items?.[index]?.quantity && (
                              <p className="text-sm text-red-500">{errors.items[index]?.quantity?.message}</p>
                            )}
                          </div>

                          {watchItems?.[index]?.unit !== 'kg' && (
                            <div className="space-y-2">
                              <Label htmlFor={`items.${index}.estimatedWeight`} className="flex items-center gap-2">
                                <Scale className="h-4 w-4" />
                                Estimasi Berat (kg)
                              </Label>
                              <Input
                                id={`items.${index}.estimatedWeight`}
                                type="number"
                                step="0.1"
                                placeholder="Perkiraan berat total"
                                {...register(`items.${index}.estimatedWeight` as const, { valueAsNumber: true })}
                              />
                              {errors.items?.[index]?.estimatedWeight && (
                                <p className="text-sm text-red-500">{errors.items[index]?.estimatedWeight?.message}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`items.${index}.expectedPrice`} className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Budget Maksimal (Rp)
                          </Label>
                          <Input
                            id={`items.${index}.expectedPrice`}
                            type="number"
                            {...register(`items.${index}.expectedPrice` as const, { valueAsNumber: true })}
                          />
                          <p className="text-xs text-slate-500">* Biaya layanan 5% ditambahkan saat pembayaran</p>
                          {errors.items?.[index]?.expectedPrice && (
                            <p className="text-sm text-red-500">{errors.items[index]?.expectedPrice?.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`items.${index}.productNotes`} className="flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Spesifikasi / Detail (opsional)
                          </Label>
                          <Textarea
                            id={`items.${index}.productNotes`}
                            rows={3}
                            placeholder="Contoh: Grade A, ukuran 5-6 cm, kemasan karung 20kg, merk tertentu..."
                            {...register(`items.${index}.productNotes` as const)}
                          />
                          {errors.items?.[index]?.productNotes && (
                            <p className="text-sm text-red-500">{errors.items[index]?.productNotes?.message}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCollapsed((prev) => {
                    const next = { ...prev };
                    fields.forEach((f) => { next[f.id] = true; });
                    return next;
                  });
                  append({
                    productName: '',
                    category: CATEGORY_OPTIONS[0].value,
                    productNotes: '',
                    quantity: 1,
                    unit: 'kg',
                    estimatedWeight: 1,
                    expectedPrice: 50000,
                  });
                }}
                className="w-full border-dashed mt-4 shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" /> Tambah Produk
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 p-4 bg-slate-50">
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

              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Pinpoint Lokasi
                </div>
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
              </div>

              <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                <iframe
                  title="Pinpoint Lokasi Pengiriman"
                  src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=17&output=embed`}
                  className="w-full h-48"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="deliveryNotes">Patokan / Detail Lokasi</Label>
                <Textarea
                  id="deliveryNotes"
                  rows={2}
                  placeholder="Contoh: gerbang hitam, blok B2/5, dekat minimarket..."
                  {...register('deliveryNotes')}
                />
                {errors.deliveryNotes && (
                  <p className="text-sm text-red-500">{errors.deliveryNotes.message}</p>
                )}
                <p className="text-xs text-slate-500">
                  Catatan lokasi akan dikirim ke supplier/kurir sebagai pinpoint tambahan.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Cari Supplier Terdekat
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateOrderForm;
