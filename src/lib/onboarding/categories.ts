/**
 * Product Categories for Supplier Onboarding
 * Based on CategoriesSection.tsx
 */

export type CategoryId = 'sayuran' | 'daging' | 'sembako' | 'ikan' | 'buah' | 'bumbu';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string; // Emoji for WhatsApp display
  examples: string[]; // Contoh bahan baku
}

export const CATEGORIES: Record<CategoryId, Category> = {
  sayuran: {
    id: 'sayuran',
    name: 'Sayuran',
    icon: '🥬',
    examples: ['Wortel', 'Bawang merah', 'Cabai', 'Tomat', 'Kubis', 'Selada'],
  },
  daging: {
    id: 'daging',
    name: 'Daging',
    icon: '🥩',
    examples: ['Daging sapi', 'Daging ayam', 'Daging babi', 'Jeroan', 'Sosis'],
  },
  sembako: {
    id: 'sembako',
    name: 'Sembako',
    icon: '🌾',
    examples: ['Beras', 'Minyak goreng', 'Gula', 'Garam', 'Tepung terigu', 'Telur'],
  },
  ikan: {
    id: 'ikan',
    name: 'Ikan',
    icon: '🐟',
    examples: ['Ikan bandeng', 'Udang', 'Ikan nila', 'Cakalang', 'Ikan segar'],
  },
  buah: {
    id: 'buah',
    name: 'Buah',
    icon: '🍊',
    examples: ['Apel', 'Mangga', 'Jeruk', 'Pisang', 'Pepaya', 'Nanas'],
  },
  bumbu: {
    id: 'bumbu',
    name: 'Bumbu',
    icon: '🌶️',
    examples: ['Merica', 'Kunyit', 'Jahe', 'Bawang putih', 'Kayu manis'],
  },
};

/**
 * Generate WhatsApp message untuk category selection
 */
export function getCategorySelectionMessage(): string {
  const categoryList = Object.values(CATEGORIES)
    .map((cat, idx) => `${idx + 1}. ${cat.icon} *${cat.name}*\n   Contoh: ${cat.examples.join(', ')}`)
    .join('\n\n');

  return `Pilih kategori produk yang Anda jual. *Bisa lebih dari 1!*\n\nBalas dengan nomor (contoh: "1,3,5")\n\n${categoryList}\n\n*Contoh: Balas "1,2" untuk Sayuran dan Daging*`;
}

/**
 * Parse category selection dari user input
 * Input: "1,3,5" atau "1 3 5" atau "1"
 * Return: array of CategoryId
 */
export function parseSelectedCategories(input: string): CategoryId[] {
  const categoryArray = Object.keys(CATEGORIES) as CategoryId[];
  
  // Split by comma or space
  const numbers = input.split(/[,\s]+/).filter(n => n.trim());
  
  const selected: CategoryId[] = [];
  for (const numStr of numbers) {
    const idx = parseInt(numStr, 10) - 1; // Convert 1-indexed to 0-indexed
    if (idx >= 0 && idx < categoryArray.length) {
      selected.push(categoryArray[idx]);
    }
  }
  
  return [...new Set(selected)]; // Remove duplicates
}

/**
 * Get category names untuk summary
 */
export function getCategoryNames(categoryIds: CategoryId[]): string {
  return categoryIds
    .map(id => CATEGORIES[id]?.name || id)
    .join(', ');
}
