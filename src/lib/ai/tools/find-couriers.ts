/**
 * Agent Tool: Find Nearby Couriers
 * Uses PostGIS to find available couriers within radius
 */

import { createAdminClient } from '@/lib/supabase/server';
import { registerTool } from '../executor';
import type { VehicleType } from '@/types/database';

interface FindCouriersInput {
  lat: number;
  lng: number;
  radiusKm?: number;
  maxResults?: number;
}

interface CourierResult {
  user_id: string;
  name: string;
  phone: string;
  vehicle: VehicleType;
  distance_km: number;
}

export async function findCouriers(input: FindCouriersInput): Promise<string> {
  const { lat, lng, radiusKm = 5, maxResults = 5 } = input;
  
  if (!lat || !lng) {
    return JSON.stringify({ 
      success: false, 
      error: 'Latitude and longitude are required' 
    });
  }
  
  const supabase = createAdminClient();
  
  // Use type assertion for RPC call
  const { data, error } = await (supabase.rpc as Function)('find_nearby_couriers', {
    lat,
    lng,
    radius_km: radiusKm,
    max_results: maxResults,
  });
  
  if (error) {
    console.error('[findCouriers] Error:', error);
    return JSON.stringify({ 
      success: false, 
      error: error.message 
    });
  }
  
  const couriers = data as CourierResult[];
  
  if (couriers.length === 0) {
    return JSON.stringify({
      success: true,
      found: 0,
      message: `Tidak ada kurir tersedia dalam radius ${radiusKm}km`,
      couriers: [],
    });
  }
  
  return JSON.stringify({
    success: true,
    found: couriers.length,
    couriers: couriers.map(c => ({
      id: c.user_id,
      name: c.name,
      phone: c.phone,
      vehicle: c.vehicle,
      distance_km: Math.round(c.distance_km * 10) / 10,
    })),
  });
}

// Register the tool
registerTool('findCouriers', async (input) => {
  return findCouriers(input as unknown as FindCouriersInput);
});

export default findCouriers;
