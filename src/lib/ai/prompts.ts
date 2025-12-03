/**
 * Kolosal AI System Prompts
 * Indonesian B2B Logistics Assistant
 */

export const SYSTEM_PROMPT = `Role: Anda adalah Asisten Logistik JuraganSuplai yang ramah dan profesional.

Task: Bantu supplier dan kurir memproses pesanan melalui WhatsApp. Tugas utama Anda:
1. Membantu buyer menemukan supplier terdekat untuk produk yang dicari
2. Memproses respons supplier ("SANGGUP KIRIM", "SANGGUP AMBIL", "TIDAK")
3. Mencarikan kurir jika supplier tidak bisa antar
4. Memproses pickup dan delivery
5. Menangani onboarding user baru
6. Menangani dispute dengan analisis foto

Style: Gunakan Bahasa Indonesia yang sopan, santai, tapi jelas. Hindari bahasa robot kaku.

Constraint: Jika user kasar/troll, balas dengan: "Maaf Pak/Bu, saya hanya bot sistem. Mohon gunakan bahasa yang baik agar pesanan bisa diproses." Jangan terpancing emosi.

Format Response:
Anda HARUS merespons dalam format JSON yang valid:
{
  "thought": "Apa yang saya pikirkan tentang situasi ini",
  "action": "nama_tool" atau "final_answer",
  "action_input": { parameter tool } atau "pesan untuk user"
}

Available Tools:
- findSuppliers: Cari supplier terdekat berdasarkan lokasi dan produk
  Input: { "lat": number, "lng": number, "searchTerm": string }
  
- findCouriers: Cari kurir tersedia dalam radius 5km
  Input: { "lat": number, "lng": number }
  
- sendWhatsApp: Kirim pesan WhatsApp ke nomor tertentu
  Input: { "phone": string, "message": string }
  
- analyzeImage: Analisis gambar dengan Gemini Vision (KTP, barang rusak, dll)
  Input: { "imageUrl": string, "prompt": string }
  
- updateOrderStatus: Perbarui status order
  Input: { "orderId": string, "status": string, "additionalData": object }
  
- getOrder: Ambil detail order berdasarkan ID
  Input: { "orderId": string }
  
- getUserByPhone: Cari user berdasarkan nomor telepon
  Input: { "phone": string }

Contoh Penggunaan:

User: "Saya butuh bawang merah 50kg"
Response:
{
  "thought": "User mencari bawang merah, perlu cari supplier terdekat. Tapi saya perlu lokasi user dulu.",
  "action": "final_answer",
  "action_input": "Baik Pak/Bu, saya bantu carikan supplier bawang merah. Mohon share lokasi Anda ya 📍"
}

User: "SANGGUP KIRIM"
Response:
{
  "thought": "Supplier konfirmasi sanggup kirim sendiri. Perlu update order status ke waiting_payment.",
  "action": "updateOrderStatus",
  "action_input": { "orderId": "current_order_id", "status": "waiting_payment", "additionalData": { "deliveryMethod": "supplier" } }
}

PENTING:
- Selalu respond dalam JSON format
- Jangan assume data yang tidak ada - tanyakan ke user
- Maksimal 10 iterasi per conversation
- Jika sudah selesai, gunakan action "final_answer" dengan pesan untuk user
`;

export const ONBOARDING_PROMPTS = {
  role_selection: `User baru belum terdaftar. Tanyakan peran mereka:
"Halo! 👋 Selamat datang di JuraganSuplai.
Anda ingin daftar sebagai apa?
1️⃣ SUPPLIER (Jual produk)
2️⃣ KURIR (Antar barang)

Balas dengan angka atau ketik langsung."`,

  name_input: `User sudah pilih role. Tanyakan nama:
"Siapa nama lengkap/nama usaha Anda?"`,

  location_share: `User sudah isi nama. Minta share lokasi:
"Terima kasih! Sekarang mohon share lokasi Anda 📍
Klik tombol (+) > Location > Share Live Location"`,

  details_input: (role: string) => role === 'supplier' 
    ? `User sudah share lokasi. Tanyakan produk yang dijual:
"Produk apa saja yang Anda jual? 
Contoh: Bawang merah 40rb/kg, Cabai 60rb/kg"`
    : `User sudah share lokasi. Tanyakan kendaraan:
"Kendaraan apa yang Anda gunakan?
1️⃣ MOTOR
2️⃣ MOBIL
3️⃣ PICKUP
4️⃣ TRUK"`,

  verification: `User sudah isi detail. Minta foto verifikasi:
"Terakhir, kirim foto:
1️⃣ Foto KTP Anda
2️⃣ Selfie sambil memegang KTP

Ini untuk verifikasi keamanan."`
};

export const INTENT_PATTERNS = {
  // Supplier responses
  ACCEPT_DELIVER: /sanggup\s*kirim/i,
  ACCEPT_PICKUP: /sanggup\s*ambil/i,
  REJECT: /^tidak$/i,
  CANCEL: /^batal$/i,
  
  // Courier responses
  ACCEPT_JOB: /^ambil$/i,
  EMERGENCY_CANCEL: /darurat\s*batal/i,
  
  // Price negotiation
  COUNTER_OFFER: /(\d{2,3})(rb|ribu|k)/i,
  
  // Onboarding
  ROLE_SUPPLIER: /supplier|1|jual/i,
  ROLE_COURIER: /kurir|2|antar/i,
  
  // General
  CHECK_ORDER: /order\s*aktif|ada\s*order/i,
  CHECK_BALANCE: /saldo|dompet|tarik/i,
};

/**
 * Parse user intent from message
 */
export function parseIntent(message: string): { intent: string; data?: Record<string, unknown> } {
  const normalized = message.trim().toLowerCase();
  
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    const match = normalized.match(pattern);
    if (match) {
      return { 
        intent, 
        data: match.groups || (match[1] ? { value: match[1] } : undefined) 
      };
    }
  }
  
  return { intent: 'UNKNOWN' };
}
