-- Fix RPC functions to be callable via Supabase client
-- Run this in Supabase SQL Editor to update existing functions

-- Drop existing functions first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS find_nearby_suppliers(DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS find_nearby_couriers(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS complete_order_and_release_escrow(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS process_payment_escrow(UUID, UUID, DECIMAL, DECIMAL);
DROP FUNCTION IF EXISTS process_refund(UUID, UUID, DECIMAL);

-- 1. Find nearby suppliers
CREATE OR REPLACE FUNCTION find_nearby_suppliers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  category TEXT,
  radius_km INTEGER DEFAULT 10,
  max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  name VARCHAR,
  phone VARCHAR,
  distance_km DOUBLE PRECISION,
  product_id UUID,
  product_name VARCHAR,
  price DECIMAL,
  active_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.name,
    u.phone,
    ST_Distance(u.location::geography, ST_MakePoint(lng, lat)::geography) / 1000 as distance_km,
    p.id as product_id,
    p.name as product_name,
    p.price,
    (SELECT COUNT(*) FROM orders o WHERE o.supplier_id = u.id 
     AND o.status IN ('paid_held', 'shipping', 'waiting_payment')) as active_orders
  FROM users u
  JOIN products p ON p.supplier_id = u.id
  WHERE u.role = 'supplier'
    AND u.is_verified = true
    AND p.is_active = true
    AND (category IS NULL OR u.categories @> ARRAY[category])
    AND ST_DWithin(
      u.location::geography,
      ST_MakePoint(lng, lat)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Find nearby couriers
CREATE OR REPLACE FUNCTION find_nearby_couriers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 5,
  max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  name VARCHAR,
  phone VARCHAR,
  vehicle vehicle_type,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.name,
    u.phone,
    u.vehicle,
    ST_Distance(u.location::geography, ST_MakePoint(lng, lat)::geography) / 1000 as distance_km
  FROM users u
  WHERE u.role = 'courier'
    AND u.is_verified = true
    AND u.is_busy = false
    AND ST_DWithin(
      u.location::geography,
      ST_MakePoint(lng, lat)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Complete order and release escrow
CREATE OR REPLACE FUNCTION complete_order_and_release_escrow(
  p_order_id UUID,
  p_supplier_id UUID,
  p_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_wallet_id UUID;
  v_result JSON;
BEGIN
  UPDATE orders 
  SET status = 'completed', 
      delivered_at = NOW() 
  WHERE id = p_order_id;
  
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_supplier_id;
  
  UPDATE wallets SET
    available = available + p_amount,
    escrow_held = escrow_held - p_amount,
    total_earned = total_earned + p_amount
  WHERE id = v_wallet_id;
  
  INSERT INTO wallet_transactions (wallet_id, order_id, type, amount, description)
  VALUES (v_wallet_id, p_order_id, 'escrow_release', p_amount, 'Order completed - escrow released');
  
  v_result := json_build_object('success', true, 'wallet_id', v_wallet_id);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Process payment escrow
CREATE OR REPLACE FUNCTION process_payment_escrow(
  p_order_id UUID,
  p_supplier_id UUID,
  p_total_amount DECIMAL,
  p_supplier_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_wallet_id UUID;
  v_result JSON;
BEGIN
  UPDATE orders 
  SET status = 'paid_held',
      paid_at = NOW(),
      total_amount = p_total_amount
  WHERE id = p_order_id;
  
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_supplier_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, escrow_held) 
    VALUES (p_supplier_id, p_supplier_amount)
    RETURNING id INTO v_wallet_id;
  ELSE
    UPDATE wallets SET escrow_held = escrow_held + p_supplier_amount 
    WHERE id = v_wallet_id;
  END IF;
  
  INSERT INTO wallet_transactions (wallet_id, order_id, type, amount, description)
  VALUES (v_wallet_id, p_order_id, 'escrow_in', p_supplier_amount, 'Payment received - held in escrow');
  
  v_result := json_build_object('success', true, 'wallet_id', v_wallet_id);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Process refund
CREATE OR REPLACE FUNCTION process_refund(
  p_order_id UUID,
  p_supplier_id UUID,
  p_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_wallet_id UUID;
  v_result JSON;
BEGIN
  UPDATE orders SET status = 'refunded' WHERE id = p_order_id;
  
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_supplier_id;
  
  UPDATE wallets SET escrow_held = escrow_held - p_amount 
  WHERE id = v_wallet_id;
  
  INSERT INTO wallet_transactions (wallet_id, order_id, type, amount, description)
  VALUES (v_wallet_id, p_order_id, 'refund_out', p_amount, 'Order refunded - escrow returned');
  
  v_result := json_build_object('success', true);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
