-- ==============================================
-- JuraganSuplai.ai - Database Schema
-- MVP Phase 1 - PostgreSQL 16+ with PostGIS
-- ==============================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For similarity search

-- ==============================================
-- ENUMS
-- ==============================================

-- User roles
CREATE TYPE user_role AS ENUM ('buyer', 'supplier', 'courier');

-- Onboarding steps
CREATE TYPE onboarding_step AS ENUM (
  'role_selection',
  'name_input', 
  'location_share',
  'details_input',
  'verification',
  'completed'
);

-- Order status (following MVP workflow)
CREATE TYPE order_status AS ENUM (
  'searching_supplier',
  'waiting_buyer_approval',
  'negotiating_courier',
  'stuck_no_courier',
  'waiting_payment',
  'paid_held',
  'shipping',
  'delivered',
  'dispute_check',
  'completed',
  'refunded',
  'cancelled_by_buyer',
  'failed_no_supplier'
);

-- Vehicle types for couriers
CREATE TYPE vehicle_type AS ENUM ('motor', 'mobil', 'pickup', 'truk');

-- Wallet transaction types
CREATE TYPE transaction_type AS ENUM (
  'escrow_in',
  'escrow_release',
  'commission_in',
  'withdrawal',
  'refund_out',
  'refund_in'
);

-- Message pending status
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'failed');

-- ==============================================
-- TABLES
-- ==============================================

-- Users table (buyers, suppliers, couriers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  role user_role,
  
  -- Location (PostGIS POINT)
  location GEOGRAPHY(POINT, 4326),
  address TEXT,
  
  -- Onboarding
  onboarding_step onboarding_step DEFAULT 'role_selection',
  onboarding_data JSONB DEFAULT '{}',
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  ktp_image_url TEXT,
  selfie_image_url TEXT,
  
  -- Supplier specific
  business_name VARCHAR(255),
  
  -- Courier specific
  vehicle vehicle_type,
  is_busy BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table (supplier inventory)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'kg',
  weight_per_unit DECIMAL(10, 2) DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table (main transaction)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Parties
  buyer_id UUID REFERENCES users(id),
  supplier_id UUID REFERENCES users(id),
  courier_id UUID REFERENCES users(id),
  
  -- Product info
  product_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) DEFAULT 'kg',
  weight_kg DECIMAL(10, 2),
  
  -- Pricing
  buyer_price DECIMAL(15, 2) NOT NULL,
  supplier_price DECIMAL(15, 2),
  supplier_offered_price DECIMAL(15, 2),
  shipping_cost DECIMAL(15, 2) DEFAULT 0,
  service_fee DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2),
  
  -- Locations
  pickup_location GEOGRAPHY(POINT, 4326),
  pickup_address TEXT,
  delivery_location GEOGRAPHY(POINT, 4326),
  delivery_address TEXT,
  distance_km DECIMAL(10, 2),
  
  -- Status
  status order_status DEFAULT 'searching_supplier',
  
  -- Payment
  payment_qr_string TEXT,
  payment_expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Delivery
  pickup_photo_url TEXT,
  pickup_at TIMESTAMPTZ,
  delivery_token UUID DEFAULT uuid_generate_v4(),
  delivered_at TIMESTAMPTZ,
  
  -- Dispute
  dispute_image_url TEXT,
  dispute_confidence DECIMAL(5, 2),
  dispute_reason TEXT,
  
  -- Tracking
  courier_last_location GEOGRAPHY(POINT, 4326),
  courier_location_updated_at TIMESTAMPTZ,
  
  -- Negotiation
  negotiation_started_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supplier broadcast tracking
CREATE TABLE order_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  response TEXT,
  responded_at TIMESTAMPTZ
);

-- Courier broadcast tracking
CREATE TABLE courier_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  response TEXT,
  responded_at TIMESTAMPTZ
);

-- Wallets table
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  available DECIMAL(15, 2) DEFAULT 0,
  escrow_held DECIMAL(15, 2) DEFAULT 0,
  total_earned DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet transactions
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  type transaction_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending WhatsApp messages (retry queue)
CREATE TABLE pending_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status message_status DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent conversation history
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  phone VARCHAR(20) NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent logs for debugging
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  iteration INTEGER,
  thought TEXT,
  action TEXT,
  action_input JSONB,
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INDEXES
-- ==============================================

-- PostGIS spatial indexes
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_orders_pickup_location ON orders USING GIST(pickup_location);
CREATE INDEX idx_orders_delivery_location ON orders USING GIST(delivery_location);
CREATE INDEX idx_orders_courier_location ON orders USING GIST(courier_last_location);

-- Text search indexes
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);

-- Status and FK indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX idx_orders_courier_id ON orders(courier_id);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);
CREATE INDEX idx_pending_messages_status ON pending_messages(status);

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_messages_updated_at BEFORE UPDATE ON pending_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- RPC FUNCTIONS
-- ==============================================

-- Find nearby suppliers with products
CREATE OR REPLACE FUNCTION find_nearby_suppliers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  search_term TEXT,
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
    AND (search_term IS NULL OR p.name ILIKE '%' || search_term || '%')
    AND ST_DWithin(
      u.location::geography,
      ST_MakePoint(lng, lat)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Find nearby available couriers
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
$$ LANGUAGE plpgsql;

-- Complete order and release escrow (atomic transaction)
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
  -- 1. Update order status
  UPDATE orders 
  SET status = 'completed', 
      delivered_at = NOW() 
  WHERE id = p_order_id;
  
  -- 2. Get supplier wallet
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_supplier_id;
  
  -- 3. Release escrow (atomic)
  UPDATE wallets SET
    available = available + p_amount,
    escrow_held = escrow_held - p_amount,
    total_earned = total_earned + p_amount
  WHERE id = v_wallet_id;
  
  -- 4. Log transaction
  INSERT INTO wallet_transactions (wallet_id, order_id, type, amount, description)
  VALUES (v_wallet_id, p_order_id, 'escrow_release', p_amount, 'Order completed - escrow released');
  
  v_result := json_build_object('success', true, 'wallet_id', v_wallet_id);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Process escrow for payment
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
  -- 1. Update order status
  UPDATE orders 
  SET status = 'paid_held',
      paid_at = NOW(),
      total_amount = p_total_amount
  WHERE id = p_order_id;
  
  -- 2. Get or create supplier wallet
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_supplier_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, escrow_held) 
    VALUES (p_supplier_id, p_supplier_amount)
    RETURNING id INTO v_wallet_id;
  ELSE
    UPDATE wallets SET escrow_held = escrow_held + p_supplier_amount 
    WHERE id = v_wallet_id;
  END IF;
  
  -- 3. Log transaction
  INSERT INTO wallet_transactions (wallet_id, order_id, type, amount, description)
  VALUES (v_wallet_id, p_order_id, 'escrow_in', p_supplier_amount, 'Payment received - held in escrow');
  
  v_result := json_build_object('success', true, 'wallet_id', v_wallet_id);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Process refund
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
  -- 1. Update order status
  UPDATE orders SET status = 'refunded' WHERE id = p_order_id;
  
  -- 2. Get supplier wallet
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_supplier_id;
  
  -- 3. Remove from escrow
  UPDATE wallets SET escrow_held = escrow_held - p_amount 
  WHERE id = v_wallet_id;
  
  -- 4. Log transaction
  INSERT INTO wallet_transactions (wallet_id, order_id, type, amount, description)
  VALUES (v_wallet_id, p_order_id, 'refund_out', p_amount, 'Order refunded - escrow returned');
  
  v_result := json_build_object('success', true);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Public read for products
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (is_active = true);

-- Suppliers can manage their products
CREATE POLICY "Suppliers can manage own products" ON products
  FOR ALL USING (
    supplier_id IN (
      SELECT id FROM users WHERE phone = current_setting('app.current_user_phone', true)
    )
  );

-- Users can view their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (phone = current_setting('app.current_user_phone', true));

-- Service role bypass (for server actions)
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role has full access to orders" ON orders
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role has full access to wallets" ON wallets
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role has full access to wallet_transactions" ON wallet_transactions
  FOR ALL USING (current_setting('role') = 'service_role');

-- ==============================================
-- ENABLE REALTIME
-- ==============================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_logs;
