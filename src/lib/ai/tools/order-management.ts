/**
 * Agent Tool: Order Management
 * CRUD operations for orders
 */

import { createAdminClient } from '@/lib/supabase/server';
import { registerTool } from '../executor';
import type { OrderStatus, OrderUpdate } from '@/types/database';

interface UpdateOrderInput {
  orderId: string;
  status?: OrderStatus;
  additionalData?: Record<string, unknown>;
}

interface GetOrderInput {
  orderId: string;
}

/**
 * Update order status and additional data
 */
export async function updateOrderStatus(input: UpdateOrderInput): Promise<string> {
  const { orderId, status, additionalData = {} } = input;
  
  if (!orderId) {
    return JSON.stringify({
      success: false,
      error: 'Order ID is required',
    });
  }
  
  const supabase = createAdminClient();
  
  const updateData: OrderUpdate = {
    ...additionalData,
  };
  
  if (status) {
    updateData.status = status;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('orders') as any)
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();
  
  if (error) {
    console.error('[updateOrderStatus] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
  
  console.log(`[updateOrderStatus] Order ${orderId} updated to status: ${status}`);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderData = data as any;
  
  return JSON.stringify({
    success: true,
    order: {
      id: orderData.id,
      status: orderData.status,
      product_name: orderData.product_name,
      total_amount: orderData.total_amount,
    },
  });
}

/**
 * Get order details by ID
 */
export async function getOrder(input: GetOrderInput): Promise<string> {
  const { orderId } = input;
  
  if (!orderId) {
    return JSON.stringify({
      success: false,
      error: 'Order ID is required',
    });
  }
  
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:users!orders_buyer_id_fkey(id, name, phone, address),
      supplier:users!orders_supplier_id_fkey(id, name, phone, address, business_name),
      courier:users!orders_courier_id_fkey(id, name, phone, vehicle)
    `)
    .eq('id', orderId)
    .single();
  
  if (error) {
    console.error('[getOrder] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
  
  if (!data) {
    return JSON.stringify({
      success: false,
      error: 'Order not found',
    });
  }
  
  return JSON.stringify({
    success: true,
    order: data,
  });
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(input: { phone: string }): Promise<string> {
  const { phone } = input;
  
  if (!phone) {
    return JSON.stringify({
      success: false,
      error: 'Phone number is required',
    });
  }
  
  const supabase = createAdminClient();
  
  // Normalize phone number
  let normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '62' + normalizedPhone.substring(1);
  }
  if (!normalizedPhone.startsWith('62')) {
    normalizedPhone = '62' + normalizedPhone;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('users') as any)
    .select('*')
    .eq('phone', normalizedPhone)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Not found is not an error
    console.error('[getUserByPhone] Error:', error);
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
  
  if (!data) {
    return JSON.stringify({
      success: true,
      found: false,
      message: 'User not found',
    });
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData = data as any;
  
  return JSON.stringify({
    success: true,
    found: true,
    user: {
      id: userData.id,
      name: userData.name,
      phone: userData.phone,
      role: userData.role,
      is_verified: userData.is_verified,
      onboarding_step: userData.onboarding_step,
    },
  });
}

/**
 * Get active orders for a supplier
 */
export async function getSupplierActiveOrders(supplierId: string): Promise<number> {
  const supabase = createAdminClient();
  
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', supplierId)
    .in('status', ['paid_held', 'shipping', 'waiting_payment']);
  
  if (error) {
    console.error('[getSupplierActiveOrders] Error:', error);
    return 0;
  }
  
  return count || 0;
}

// Register tools
registerTool('updateOrderStatus', async (input) => {
  return updateOrderStatus(input as unknown as UpdateOrderInput);
});

registerTool('getOrder', async (input) => {
  return getOrder(input as unknown as GetOrderInput);
});

registerTool('getUserByPhone', async (input) => {
  return getUserByPhone(input as unknown as { phone: string });
});
