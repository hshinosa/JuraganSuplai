/**
 * WhatsApp Message Templates
 * Indonesian language templates for all notification scenarios
 */

export const templates = {
  // ========================
  // SUPPLIER NOTIFICATIONS
  // ========================
  
  supplierOffer: (data: {
    product_name: string;
    quantity: number;
    unit: string;
    weight_kg: number;
    buyer_address: string;
    distance_km: number;
    buyer_price: number;
    order_id: string;
  }) => `🛒 *Permintaan Baru dari JuraganSuplai*

Produk: ${data.product_name}
Jumlah: ${data.quantity} ${data.unit}
Berat estimasi: ${data.weight_kg} kg
Lokasi Pembeli: ${data.buyer_address}
Jarak: ${data.distance_km} km
Harga yang diajukan: Rp ${formatCurrency(data.buyer_price)}

Balas dengan:
✅ "SANGGUP KIRIM" jika bisa memenuhi + antar sendiri
✅ "SANGGUP AMBIL" jika bisa memenuhi + perlu kurir
❌ "TIDAK" jika stok habis/tidak bisa

Order ID: #${data.order_id.substring(0, 8)}`,

  supplierPaymentReceived: (data: {
    order_id: string;
    total_amount: number;
    courier_name: string;
    courier_phone: string;
  }) => `💰 *Pembayaran Diterima*

Order #${data.order_id.substring(0, 8)} sudah dibayar.
Total: Rp ${formatCurrency(data.total_amount)}

Silakan siapkan barang untuk diambil kurir.
Kurir: ${data.courier_name} (${data.courier_phone})

Dana akan diteruskan setelah barang sampai.`,

  supplierOrderCompleted: (data: {
    order_id: string;
    amount: number;
  }) => `✅ *Dana Masuk!*

Order #${data.order_id.substring(0, 8)} selesai.
Dana Rp ${formatCurrency(data.amount)} sudah masuk saldo Anda!

Cek saldo: ketik "SALDO"`,

  supplierBusy: () => `⚠️ *Kuota Penuh*

Maaf Pak, Anda sudah punya 3 order aktif.
Selesaikan minimal 1 order terlebih dahulu.`,

  // ========================
  // COURIER NOTIFICATIONS
  // ========================
  
  courierJobOffer: (data: {
    supplier_name: string;
    supplier_address: string;
    buyer_address: string;
    distance_km: number;
    shipping_cost: number;
    product_name: string;
    quantity: number;
    unit: string;
    weight_kg: number;
    order_id: string;
  }) => `🚚 *Penawaran Antar Barang*

Dari: ${data.supplier_name} (${data.supplier_address})
Ke: ${data.buyer_address}
Jarak: ${data.distance_km} km
Estimasi Ongkir: Rp ${formatCurrency(data.shipping_cost)}

Barang: ${data.product_name} (${data.quantity} ${data.unit})
Berat estimasi: ${data.weight_kg} kg

Balas "AMBIL" untuk terima job ini.

Order ID: #${data.order_id.substring(0, 8)}`,

  courierPickupReady: (data: {
    order_id: string;
    supplier_address: string;
    supplier_name: string;
    supplier_phone: string;
  }) => `📦 *Siap Diambil*

Order #${data.order_id.substring(0, 8)} sudah siap.

Alamat Pickup: ${data.supplier_address}
Kontak: ${data.supplier_name} (${data.supplier_phone})

Setelah ambil barang:
1. Foto barang yang diambil
2. Aktifkan "Share Live Location" ke nomor ini`,

  courierStaleLocation: (data: {
    minutes: number;
    order_id: string;
  }) => `⚠️ *Peringatan Sistem*

Lokasi Anda tidak terdeteksi selama ${data.minutes} menit.
Harap buka WhatsApp dan perbarui "Share Live Location" sekarang.

Order #${data.order_id.substring(0, 8)}`,

  // ========================
  // BUYER NOTIFICATIONS (via Dashboard, but also WhatsApp for critical)
  // ========================
  
  buyerSupplierFound: (data: {
    supplier_name: string;
    product_name: string;
    price: number;
    order_id: string;
  }) => `✅ *Supplier Ditemukan!*

${data.supplier_name} sanggup menyediakan ${data.product_name}.
Harga: Rp ${formatCurrency(data.price)}

Silakan lakukan pembayaran di dashboard.
Order ID: #${data.order_id.substring(0, 8)}`,

  buyerCourierApproaching: (data: {
    distance_m: number;
    eta_minutes: number;
    tracking_url: string;
  }) => `🚚 *Kurir Mendekat!*

Pesanan Anda tinggal ${data.distance_m} meter lagi.
Estimasi tiba: ${data.eta_minutes} menit.

Pantau: ${data.tracking_url}`,

  buyerOrderComplete: (data: {
    order_id: string;
    total_amount: number;
  }) => `✅ *Pesanan Selesai*

Order #${data.order_id.substring(0, 8)} telah sampai.
Total: Rp ${formatCurrency(data.total_amount)}

Terima kasih telah menggunakan JuraganSuplai! 🙏`,

  // ========================
  // ONBOARDING
  // ========================
  
  onboardingWelcome: () => `Halo! 👋 Selamat datang di JuraganSuplai.

Anda ingin daftar sebagai apa?
1️⃣ SUPPLIER (Jual produk)
2️⃣ KURIR (Antar barang)

Balas dengan angka atau ketik langsung.`,

  onboardingAskName: (role: string) => 
    `Baik, Anda mendaftar sebagai ${role.toUpperCase()}.

Siapa nama lengkap/nama usaha Anda?`,

  onboardingAskLocation: (name: string) => 
    `Terima kasih, ${name}! 

Sekarang mohon share lokasi Anda 📍
Klik tombol (+) > Location > Share Live Location`,

  onboardingAskProducts: () => 
    `Produk apa saja yang Anda jual?
    
Contoh: Bawang merah 40rb/kg, Cabai 60rb/kg
Kirim dalam satu pesan.`,

  onboardingAskVehicle: () => 
    `Kendaraan apa yang Anda gunakan?
1️⃣ MOTOR
2️⃣ MOBIL
3️⃣ PICKUP
4️⃣ TRUK`,

  onboardingAskVerification: () => 
    `Terakhir, kirim foto untuk verifikasi:
1️⃣ Foto KTP Anda
2️⃣ Selfie sambil memegang KTP

Ini untuk keamanan transaksi.`,

  onboardingComplete: (name: string, role: string) => 
    `🎉 *Selamat ${name}!*

Akun ${role} Anda sudah aktif.

${role === 'supplier' 
  ? 'Anda akan menerima notifikasi jika ada pembeli yang mencari produk Anda.'
  : 'Anda akan menerima notifikasi jika ada job pengantaran di sekitar Anda.'}

Ketik "BANTUAN" jika perlu panduan.`,

  // ========================
  // ERROR & FALLBACK
  // ========================
  
  errorGeneric: () => 
    `Maaf, sistem sedang bermasalah. Silakan coba lagi nanti.`,

  errorAbusive: () => 
    `Maaf Pak/Bu, saya hanya bot sistem. Mohon gunakan bahasa yang baik agar pesanan bisa diproses.`,

  fallbackUnknown: () => 
    `Maaf, saya tidak mengerti pesan Anda.

Ketik:
• "BANTUAN" untuk panduan
• "ORDER" untuk cek pesanan aktif
• "SALDO" untuk cek saldo`,

  help: (role?: string) => {
    const baseHelp = `📚 *Panduan JuraganSuplai*

`;
    
    if (role === 'supplier') {
      return baseHelp + `Sebagai SUPPLIER:
• Anda akan menerima permintaan produk
• Balas "SANGGUP KIRIM" jika bisa antar sendiri
• Balas "SANGGUP AMBIL" jika perlu kurir
• Balas "TIDAK" jika tidak tersedia

Perintah:
• SALDO - cek saldo
• ORDER - cek pesanan aktif
• UBAH [produk] [harga] - update harga`;
    }
    
    if (role === 'courier') {
      return baseHelp + `Sebagai KURIR:
• Anda akan menerima penawaran job
• Balas "AMBIL" untuk terima job
• Share Live Location saat pengantaran
• Foto barang saat pickup

Perintah:
• SALDO - cek pendapatan
• ORDER - cek job aktif`;
    }
    
    return baseHelp + `Perintah umum:
• DAFTAR - daftar akun baru
• BANTUAN - tampilkan panduan ini`;
  },
};

/**
 * Format currency to Indonesian Rupiah format
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

export { formatCurrency };
