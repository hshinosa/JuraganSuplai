'use server';

/**
 * Server Actions: Buyer Actions
 * Handle buyer order creation and management
 */

import { createAdminClient } from '@/lib/supabase/server';
import { findSuppliers } from '@/lib/ai/tools/find-suppliers';
import { sendWhatsApp } from '@/lib/ai/tools/send-whatsapp';
import { templates, formatCurrency } from '@/lib/whatsapp/templates';
import type { OrderInsert } from '@/types/database';
import { revalidatePath } from 'next/cache';

interface RequestItemInput {
  buyerId: string;
  productName: string;
  quantity: number;
  unit: string;
  estimatedWeight: number;
  expectedPrice: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
}

interface RequestItemResult {
    success: boolean;
    orderId?: string;
    suppliersContacted?: number;
    message: string;
}

/**
 * Create a new order and broadcast to nearby suppliers
 */
export async function actionRequestItem(
    input: RequestItemInput
): Promise<RequestItemResult> {
    const supabase = createAdminClient();

    try {
        // 1. Find nearby suppliers
        const suppliersResult = JSON.parse(
            await findSuppliers({
                lat: input.deliveryLat,
                lng: input.deliveryLng,
                category: input.category || null,
                radiusKm: 10,
                maxResults: 5,
            })
        );

        if (!suppliersResult.success || suppliersResult.found === 0) {
            return {
                success: false,
                message: `Maaf, tidak ada supplier untuk "${input.productName}" di sekitar lokasi Anda.`,
            };
        }

        // 2. Create order
        const serviceFee = Math.round(input.expectedPrice * 0.05); // 5% service fee

        const orderData: OrderInsert = {
            buyer_id: input.buyerId,
            product_name: input.productName,
            quantity: input.quantity,
            unit: input.unit,
            weight_kg: input.estimatedWeight,
            buyer_price: input.expectedPrice,
            service_fee: serviceFee,
            delivery_address: input.deliveryAddress,
            delivery_location:
                `POINT(${input.deliveryLng} ${input.deliveryLat})` as unknown as string,
            status: 'searching_supplier',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: order, error: orderError } = await (
            supabase.from('orders') as any
        )
            .insert(orderData)
            .select()
            .single();

        if (orderError || !order) {
            console.error(
                '[actionRequestItem] Order creation failed:',
                orderError
            );
            return {
                success: false,
                message: 'Gagal membuat pesanan. Silakan coba lagi.',
            };
        }

        // 3. Broadcast to suppliers
        const broadcastPromises = suppliersResult.suppliers.map(
            async (supplier: {
                id: string;
                name: string;
                phone: string;
                distance_km: number;
                product: string;
                price: number;
            }) => {
                // Record broadcast
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from('order_broadcasts') as any).insert({
                    order_id: order.id,
                    supplier_id: supplier.id,
                });

                // Send WhatsApp
                const message = templates.supplierOffer({
                    product_name: input.productName,
                    category: input.category,
                    product_notes: input.productNotes,
                    delivery_notes: input.deliveryNotes,
                    quantity: input.quantity,
                    unit: input.unit,
                    weight_kg: input.estimatedWeight,
                    buyer_address: input.deliveryAddress,
                    distance_km: supplier.distance_km,
                    buyer_price: input.expectedPrice,
                    order_id: order.id,
                });

                return sendWhatsApp({ phone: supplier.phone, message });
            }
        );

        await Promise.all(broadcastPromises);

        // 4. Log agent action
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('agent_logs') as any).insert({
            order_id: order.id,
            iteration: 1,
            thought: `Buyer requested ${input.productName}${
                input.category ? ` [${input.category}]` : ''
            }. Broadcasting to ${suppliersResult.found} suppliers.`,
            action: 'broadcastToSuppliers',
            action_input: {
                suppliers: suppliersResult.suppliers.map(
                    (s: { id: string }) => s.id
                ),
                category: input.category,
                productNotes: input.productNotes,
                deliveryNotes: input.deliveryNotes,
            },
            observation: `Broadcasted to ${suppliersResult.found} suppliers`,
        });

        revalidatePath('/dashboard/buyer');

        return {
            success: true,
            orderId: order.id,
            suppliersContacted: suppliersResult.found,
            message: `Pesanan dibuat! Menghubungi ${suppliersResult.found} supplier terdekat...`,
        };
    } catch (error) {
        console.error('[actionRequestItem] Error:', error);
        return {
            success: false,
            message: 'Terjadi kesalahan. Silakan coba lagi.',
        };
    }
    
    // 3. Broadcast to suppliers
    const broadcastPromises = suppliersResult.suppliers.map(async (supplier: {
      id: string;
      name: string;
      phone: string;
      distance_km: number;
      product: string;
      price: number;
    }) => {
      // Record broadcast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('order_broadcasts') as any).insert({
        order_id: order.id,
        supplier_id: supplier.id,
      });
      
      // Send WhatsApp
      const message = templates.supplierOffer({
        product_name: input.productName,
        quantity: input.quantity,
        unit: input.unit,
        weight_kg: input.estimatedWeight,
        buyer_address: input.deliveryAddress,
        distance_km: supplier.distance_km,
        buyer_price: input.expectedPrice,
        order_id: order.id,
      });
      
      return sendWhatsApp({ phone: supplier.phone, message });
    });
    
    await Promise.all(broadcastPromises);
    
    // 4. Log agent action
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('agent_logs') as any).insert({
      order_id: order.id,
      iteration: 1,
      thought: `Buyer requested ${input.productName}. Broadcasting to ${suppliersResult.found} suppliers.`,
      action: 'broadcastToSuppliers',
      action_input: { suppliers: suppliersResult.suppliers.map((s: { id: string }) => s.id) },
      observation: `Broadcasted to ${suppliersResult.found} suppliers`,
    });
    
    revalidatePath('/dashboard/buyer');
    
    return {
      success: true,
      orderId: order.id,
      suppliersContacted: suppliersResult.found,
      message: `Pesanan dibuat! Menghubungi ${suppliersResult.found} supplier terdekat...`,
    };
    
  } catch (error) {
    console.error('[actionRequestItem] Error:', error);
    return {
      success: false,
      message: 'Terjadi kesalahan. Silakan coba lagi.',
    };
  }
}

/**
 * Cancel an order (before payment)
 */
export async function actionCancelOrder(
    orderId: string,
    buyerId: string
): Promise<{ success: boolean; message: string }> {
    const supabase = createAdminClient();

    try {
        // Get order
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: order } = await (supabase.from('orders') as any)
            .select('*, supplier:users!orders_supplier_id_fkey(phone, name)')
            .eq('id', orderId)
            .eq('buyer_id', buyerId)
            .single();

        if (!order) {
            return { success: false, message: 'Pesanan tidak ditemukan.' };
        }

        // Can only cancel before payment
        if (
            ![
                'searching_supplier',
                'waiting_buyer_approval',
                'negotiating_courier',
                'waiting_payment',
            ].includes(order.status)
        ) {
            return {
                success: false,
                message: 'Pesanan sudah tidak bisa dibatalkan.',
            };
        }

        // Update status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('orders') as any)
            .update({ status: 'cancelled_by_buyer' })
            .eq('id', orderId);

        // Notify supplier if already assigned
        if (order.supplier_id && order.supplier) {
            const supplierData = order.supplier as {
                phone: string;
                name: string;
            };
            await sendWhatsApp({
                phone: supplierData.phone,
                message: `Maaf Pak ${
                    supplierData.name
                }, order #${orderId.substring(
                    0,
                    8
                )} baru saja dibatalkan pembeli.`,
            });
        }

        revalidatePath('/dashboard/buyer');

        return { success: true, message: 'Pesanan berhasil dibatalkan.' };
    } catch (error) {
        console.error('[actionCancelOrder] Error:', error);
        return { success: false, message: 'Gagal membatalkan pesanan.' };
    }
}

/**
 * Get buyer's orders
 */
export async function actionGetBuyerOrders(buyerId: string) {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('orders')
        .select(
            `
      *,
      supplier:users!orders_supplier_id_fkey(id, name, phone, business_name),
      courier:users!orders_courier_id_fkey(id, name, phone, vehicle)
    `
        )
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[actionGetBuyerOrders] Error:', error);
        return [];
    }

    return data || [];
}

/**
 * Simulate payment (MVP mock QRIS)
 */
export async function actionSimulatePayment(
    orderId: string,
    buyerId: string
): Promise<{ success: boolean; message: string }> {
    const supabase = createAdminClient();

    try {
        // Get order
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: order } = await (supabase.from('orders') as any)
            .select('*, supplier:users!orders_supplier_id_fkey(id, phone)')
            .eq('id', orderId)
            .eq('buyer_id', buyerId)
            .single();

        if (!order) {
            return { success: false, message: 'Pesanan tidak ditemukan.' };
        }

        if (order.status !== 'waiting_payment') {
            return {
                success: false,
                message: 'Status pesanan tidak valid untuk pembayaran.',
            };
        }

        const supplierData = order.supplier as { id: string; phone: string };
        const totalAmount =
            order.buyer_price + order.service_fee + order.shipping_cost;
        const supplierAmount = order.buyer_price; // Supplier gets product price only

        // Process payment via RPC
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: paymentError } = await (supabase.rpc as Function)(
            'process_payment_escrow',
            {
                p_order_id: orderId,
                p_supplier_id: supplierData.id,
                p_total_amount: totalAmount,
                p_supplier_amount: supplierAmount,
            }
        );

        if (paymentError) {
            console.error(
                '[actionSimulatePayment] Payment error:',
                paymentError
            );
            return { success: false, message: 'Pembayaran gagal.' };
        }

        // Notify supplier
        await sendWhatsApp({
            phone: supplierData.phone,
            message: templates.supplierPaymentReceived({
                order_id: orderId,
                total_amount: totalAmount,
                courier_name: order.courier_id
                    ? 'Kurir Aktif'
                    : 'Menunggu kurir',
                courier_phone: '-',
            }),
        });

        revalidatePath('/dashboard/buyer');

        return {
            success: true,
            message:
                'Pembayaran berhasil! Supplier sedang mempersiapkan barang.',
        };
    } catch (error) {
        console.error('[actionSimulatePayment] Error:', error);
        return { success: false, message: 'Terjadi kesalahan pembayaran.' };
    }
}

/**
 * Confirm delivery (buyer scans QR)
 */
export async function actionConfirmDelivery(input: {
    orderId: string;
    buyerId: string;
    confirmationCode?: string;
}): Promise<{ success: boolean; message: string }> {
    const supabase = createAdminClient();
    const { orderId } = input;

    try {
        // Get order and validate
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: order } = await (supabase.from('orders') as any)
            .select('*, supplier:users!orders_supplier_id_fkey(id, phone)')
            .eq('id', orderId)
            .single();

        if (!order) {
            return { success: false, message: 'Pesanan tidak ditemukan.' };
        }

        if (order.status !== 'delivered' && order.status !== 'shipping') {
            return {
                success: false,
                message: 'Pesanan belum dalam status pengiriman.',
            };
        }

        const supplierData = order.supplier as { id: string; phone: string };
        const totalAmount = order.total_amount || order.buyer_price;

        // Complete order and release escrow
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.rpc as Function)(
            'complete_order_and_release_escrow',
            {
                p_order_id: orderId,
                p_supplier_id: supplierData.id,
                p_amount: totalAmount,
            }
        );

        if (error) {
            console.error('[actionConfirmDelivery] Error:', error);
            return { success: false, message: 'Gagal mengonfirmasi pesanan.' };
        }

        // Notify supplier
        await sendWhatsApp({
            phone: supplierData.phone,
            message: templates.supplierOrderCompleted({
                order_id: orderId,
                amount: totalAmount,
            }),
        });

        return {
            success: true,
            message:
                'Pesanan selesai! Terima kasih telah menggunakan JuraganSuplai.',
        };
    } catch (error) {
        console.error('[actionConfirmDelivery] Error:', error);
        return { success: false, message: 'Terjadi kesalahan.' };
    }
}

/**
 * Report a dispute for an order
 */
export async function actionReportDispute(input: {
    orderId: string;
    buyerId: string;
    reason: string;
    imageUrl?: string;
}): Promise<{ success: boolean; message: string }> {
    const supabase = createAdminClient();
    const { orderId, reason, imageUrl } = input;

    try {
        // Update order to dispute status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('orders') as any)
            .update({
                status: 'dispute_check',
                dispute_reason: reason,
                dispute_image_url: imageUrl,
                dispute_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        if (error) throw error;

        return {
            success: true,
            message:
                'Laporan dispute terkirim. Tim kami akan meninjau dalam 24 jam.',
        };
    } catch (error) {
        console.error('[actionReportDispute] Error:', error);
        return { success: false, message: 'Gagal mengirim laporan dispute.' };
    }
}
