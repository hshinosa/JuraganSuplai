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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Search, MapPin, Package, Scale, DollarSign, Loader2, Tag, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { actionRequestItem } from '@/actions/buyer';
import { toast } from 'sonner';
import { CATEGORIES, type CategoryId } from '@/lib/onboarding/categories';

// Schema for single product item
const productItemSchema = z.object({
  productName: z.string().min(2, 'Nama produk minimal 2 karakter'),
  category: z.string().min(1, 'Kategori harus dipilih'),
  quantity: z.number().min(0.1, 'Minimal 0.1'),
  unit: z.string().min(1, 'Unit harus diisi'),
  estimatedWeight: z.number().min(0.1, 'Estimasi berat minimal 0.1 kg'),
  expectedPrice: z.number().min(1000, 'Harga minimal Rp 1.000'),
  specifications: z.string().optional(),
});

// Schema for delivery location
const deliverySchema = z.object({
  deliveryAddress: z.string().min(10, 'Alamat terlalu pendek'),
  locationLandmark: z.string().optional(),
});

type ProductItem = z.infer<typeof productItemSchema>;
type DeliveryData = z.infer<typeof deliverySchema>;

interface CreateOrderFormProps {
  buyerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (orderId: string) => void;
  defaultLocation?: { lat: number; lng: number };
}

export function CreateOrderForm({ 
  buyerId,
  open,
  onOpenChange,
  onSuccess,
  defaultLocation = { lat: -6.2, lng: 106.8 } // Jakarta default
}: CreateOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState(defaultLocation);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  
  // Cart items state
  const [cartItems, setCartItems] = useState<ProductItem[]>([]);
  
  // Current product being added
  const [currentProduct, setCurrentProduct] = useState<Partial<ProductItem>>({
    unit: 'kg',
    quantity: 1,
    estimatedWeight: 1,
    category: '',
    productName: '',
    expectedPrice: 1000,
    specifications: '',
  });
  
  // Delivery form
  const { register: registerDelivery, formState: { errors: deliveryErrors }, getValues: getDeliveryValues } = useForm<DeliveryData>({
    resolver: zodResolver(deliverySchema),
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
        setLocationSet(true);
        toast.success('Lokasi GPS berhasil didapatkan!');
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
        setIsGettingLocation(false);
      }
    );
  };

  // Add product to cart
  const addToCart = () => {
    try {
      // Validate current product
      const validated = productItemSchema.parse(currentProduct);
      setCartItems([...cartItems, validated]);
      
      // Reset current product
      setCurrentProduct({
        unit: 'kg',
        quantity: 1,
        estimatedWeight: 1,
        category: '',
        productName: '',
        expectedPrice: 1000,
        specifications: '',
      });
      
      toast.success('Produk ditambahkan ke keranjang!');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      }
    }
  };
  
  // Remove item from cart
  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
    toast.info('Produk dihapus dari keranjang');
  };
  
  // Calculate totals
  const totalPrice = cartItems.reduce((sum, item) => sum + item.expectedPrice, 0);
  const totalWeight = cartItems.reduce((sum, item) => sum + item.estimatedWeight, 0);
  
  // Submit all orders
  const handleSubmitOrders = async () => {
    if (cartItems.length === 0) {
      toast.error('Keranjang kosong! Tambahkan produk terlebih dahulu.');
      return;
    }
    
    const deliveryData = getDeliveryValues();
    if (!deliveryData.deliveryAddress || deliveryData.deliveryAddress.length < 10) {
      toast.error('Alamat pengiriman harus diisi!');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Combine address with landmark if provided
      const fullAddress = deliveryData.locationLandmark 
        ? `${deliveryData.deliveryAddress}\n\nPatokan: ${deliveryData.locationLandmark}`
        : deliveryData.deliveryAddress;
      
      // Create orders for each cart item
      const orderPromises = cartItems.map(item => {
        // Combine product name with specifications if provided
        const productNameWithSpecs = item.specifications 
          ? `${item.productName} (${item.specifications})`
          : item.productName;
        
        return actionRequestItem({
          buyerId,
          productName: productNameWithSpecs,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          estimatedWeight: item.estimatedWeight,
          expectedPrice: item.expectedPrice,
          deliveryAddress: fullAddress,
          deliveryLat: location.lat,
          deliveryLng: location.lng,
        });
      });
      
      const results = await Promise.all(orderPromises);
      const successCount = results.filter(r => r.success).length;
      
      if (successCount > 0) {
        toast.success(`${successCount} pesanan berhasil dibuat!`);
        setCartItems([]);
        setLocationSet(false);
        onOpenChange(false);
        
        // Call onSuccess with first order ID
        const firstSuccessOrder = results.find(r => r.success && r.orderId);
        if (firstSuccessOrder?.orderId && onSuccess) {
          onSuccess(firstSuccessOrder.orderId);
        }
      } else {
        toast.error('Gagal membuat pesanan. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
            Buat Pesanan Baru
          </DialogTitle>
          <DialogDescription>
            Tambahkan produk ke keranjang, isi lokasi pengiriman, dan sistem akan mencarikan supplier terdekat.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* LEFT COLUMN: Product Cart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                Keranjang Produk
              </h3>
              <span className="text-sm text-slate-500">
                {cartItems.length} item
              </span>
            </div>
            
            {/* Cart Items List */}
            {cartItems.length > 0 && (
              <Card className="p-4 bg-slate-50 border-slate-200 max-h-[250px] overflow-y-auto">
                <div className="space-y-2">
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex items-start justify-between bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-slate-500">
                          {CATEGORIES[item.category as CategoryId]?.icon} {CATEGORIES[item.category as CategoryId]?.name} • {item.quantity} {item.unit} • {item.estimatedWeight} kg
                        </p>
                        {item.specifications && (
                          <p className="text-xs text-slate-600 mt-1 italic">
                            "{item.specifications}"
                          </p>
                        )}
                        <p className="text-sm font-semibold text-emerald-600 mt-1">
                          Rp {item.expectedPrice.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Cart Summary */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total Berat:</span>
                    <span className="font-semibold">{totalWeight} kg</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">Total Budget:</span>
                    <span className="font-semibold text-emerald-600">
                      Rp {totalPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Add Product Form */}
            <Card className="p-4 border-emerald-200 bg-white">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Tambah Produk
              </h4>
              
              <div className="space-y-3">
                {/* Product Name & Category */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nama Produk *</Label>
                    <Input
                      placeholder="Contoh: Bawang Merah"
                      value={currentProduct.productName}
                      onChange={(e) => setCurrentProduct({...currentProduct, productName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Kategori *</Label>
                    <Select
                      value={currentProduct.category}
                      onValueChange={(value) => setCurrentProduct({...currentProduct, category: value})}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(CATEGORIES).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Specifications */}
                <div className="space-y-1">
                  <Label className="text-xs">Detail Spesifikasi (Opsional)</Label>
                  <Textarea
                    placeholder="Contoh: Grade A, ukuran sedang, segar, tidak busuk..."
                    rows={2}
                    value={currentProduct.specifications}
                    onChange={(e) => setCurrentProduct({...currentProduct, specifications: e.target.value})}
                    className="text-sm"
                  />
                </div>
                
                {/* Quantity & Unit */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Jumlah *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={currentProduct.quantity || ''}
                      onChange={(e) => setCurrentProduct({...currentProduct, quantity: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit *</Label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                      value={currentProduct.unit}
                      onChange={(e) => setCurrentProduct({...currentProduct, unit: e.target.value})}
                    >
                      <option value="kg">kg</option>
                      <option value="karung">karung</option>
                      <option value="pcs">pcs</option>
                      <option value="ikat">ikat</option>
                    </select>
                  </div>
                </div>
                
                {/* Weight & Price */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Berat (kg) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={currentProduct.estimatedWeight || ''}
                      onChange={(e) => setCurrentProduct({...currentProduct, estimatedWeight: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Budget (Rp) *</Label>
                    <Input
                      type="number"
                      value={currentProduct.expectedPrice || ''}
                      onChange={(e) => setCurrentProduct({...currentProduct, expectedPrice: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                
                <Button
                  type="button"
                  onClick={addToCart}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah ke Keranjang
                </Button>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Delivery Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              Lokasi Pengiriman
            </h3>
            
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              {/* GPS Button */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant={locationSet ? "default" : "outline"}
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className={`w-full ${locationSet ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4 mr-2" />
                  )}
                  {locationSet ? "📍 Lokasi GPS Aktif" : "Gunakan Lokasi Saya"}
                </Button>
                
                {locationSet && (
                  <div className="w-full rounded-lg overflow-hidden border-2 border-emerald-200 bg-white">
                    <iframe
                      width="100%"
                      height="200"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng-0.01},${location.lat-0.01},${location.lng+0.01},${location.lat+0.01}&layer=mapnik&marker=${location.lat},${location.lng}`}
                      allowFullScreen
                    />
                    <div className="px-3 py-2 bg-emerald-50 text-center">
                      <p className="text-xs text-emerald-700 font-medium">
                        📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="deliveryAddress" className="text-sm font-medium">
                  Alamat Lengkap *
                </Label>
                <Textarea
                  id="deliveryAddress"
                  placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan, Kota..."
                  rows={3}
                  {...registerDelivery('deliveryAddress')}
                />
                {deliveryErrors.deliveryAddress && (
                  <p className="text-sm text-red-500">{deliveryErrors.deliveryAddress.message}</p>
                )}
              </div>
              
              {/* Landmark */}
              <div className="space-y-2">
                <Label htmlFor="locationLandmark" className="text-sm font-medium">
                  Patokan / Detail Lokasi (Opsional)
                </Label>
                <Input
                  id="locationLandmark"
                  placeholder="Dekat Alfamart, Sebelah Warung Bu Tini..."
                  {...registerDelivery('locationLandmark')}
                />
                <p className="text-xs text-slate-500">
                  💡 Bantu kurir menemukan lokasi dengan lebih mudah
                </p>
              </div>
            </div>
            
            {/* Info Card */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Tips:</strong> Pastikan lokasi GPS sudah aktif dan alamat ditulis lengkap untuk mempercepat pengiriman.
              </p>
            </Card>
          </div>
        </div>
        
        {/* Bottom Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmitOrders}
            disabled={isSubmitting || cartItems.length === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Memproses {cartItems.length} Pesanan...
              </>
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Cari Supplier ({cartItems.length} Produk)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateOrderForm;
