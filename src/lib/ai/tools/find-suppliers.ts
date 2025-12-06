/**
 * Agent Tool: Find Nearby Suppliers
 * Uses PostGIS spatial search to find suppliers with matching products
 */

import { createAdminClient } from '@/lib/supabase/server';
import { registerTool } from '../executor';

interface FindSuppliersInput {
    lat: number;
    lng: number;
    category?: string;
    radiusKm?: number;
    maxResults?: number;
}

interface SupplierResult {
    user_id: string;
    name: string;
    phone: string;
    distance_km: number;
    product_id: string;
    product_name: string;
    price: number;
    active_orders: number;
}

export async function findSuppliers(
    input: FindSuppliersInput
): Promise<string> {
    const { lat, lng, category, radiusKm = 10, maxResults = 5 } = input;

    if (!lat || !lng) {
        return JSON.stringify({
            success: false,
            error: 'Latitude and longitude are required',
        });
    }

    const supabase = createAdminClient();

    // Use type assertion for RPC call
    const { data, error } = await (supabase.rpc as Function)(
        'find_nearby_suppliers',
        {
            lat,
            lng,
            category: category || null,
            radius_km: radiusKm,
            max_results: maxResults,
        }
    );

    if (error) {
        console.error('[findSuppliers] Error:', error);
        return JSON.stringify({
            success: false,
            error: error.message,
        });
    }

    const suppliers = data as SupplierResult[];

    // Filter out suppliers with 3+ active orders
    const availableSuppliers = suppliers.filter((s) => s.active_orders < 3);

    if (availableSuppliers.length === 0) {
        return JSON.stringify({
            success: true,
            found: 0,
            message: `Tidak ada supplier tersedia untuk kategori "${
                category || 'umum'
            }" dalam radius ${radiusKm}km`,
            suppliers: [],
        });
    }

    return JSON.stringify({
        success: true,
        found: availableSuppliers.length,
        suppliers: availableSuppliers.map((s) => ({
            id: s.user_id,
            name: s.name,
            phone: s.phone,
            distance_km: Math.round(s.distance_km * 10) / 10,
            product: s.product_name,
            price: s.price,
        })),
    });
}

// Register the tool
registerTool('findSuppliers', async (input) => {
    return findSuppliers(input as unknown as FindSuppliersInput);
});

export default findSuppliers;
