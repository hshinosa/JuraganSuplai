/**
 * Supabase Database Types
 * Generated from schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type UserRole = 'buyer' | 'supplier' | 'courier';

export type OnboardingStep = 
  | 'role_selection'
  | 'name_input'
  | 'location_share'
  | 'details_input'
  | 'verification'
  | 'completed';

export type OrderStatus =
  | 'searching_supplier'
  | 'waiting_buyer_approval'
  | 'negotiating_courier'
  | 'stuck_no_courier'
  | 'waiting_payment'
  | 'paid_held'
  | 'shipping'
  | 'delivered'
  | 'dispute_check'
  | 'completed'
  | 'refunded'
  | 'cancelled_by_buyer'
  | 'failed_no_supplier';

export type VehicleType = 'motor' | 'mobil' | 'pickup' | 'truk';

export type TransactionType =
  | 'escrow_in'
  | 'escrow_release'
  | 'commission_in'
  | 'withdrawal'
  | 'refund_out'
  | 'refund_in';

export type MessageStatus = 'pending' | 'sent' | 'failed';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          name: string | null;
          role: UserRole | null;
          location: unknown | null; // PostGIS Geography
          address: string | null;
          onboarding_step: OnboardingStep;
          onboarding_data: Json;
          is_verified: boolean;
          ktp_image_url: string | null;
          selfie_image_url: string | null;
          business_name: string | null;
          vehicle: VehicleType | null;
          is_busy: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          name?: string | null;
          role?: UserRole | null;
          location?: unknown | null;
          address?: string | null;
          onboarding_step?: OnboardingStep;
          onboarding_data?: Json;
          is_verified?: boolean;
          ktp_image_url?: string | null;
          selfie_image_url?: string | null;
          business_name?: string | null;
          vehicle?: VehicleType | null;
          is_busy?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          name?: string | null;
          role?: UserRole | null;
          location?: unknown | null;
          address?: string | null;
          onboarding_step?: OnboardingStep;
          onboarding_data?: Json;
          is_verified?: boolean;
          ktp_image_url?: string | null;
          selfie_image_url?: string | null;
          business_name?: string | null;
          vehicle?: VehicleType | null;
          is_busy?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          supplier_id: string;
          name: string;
          price: number;
          unit: string;
          weight_per_unit: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          name: string;
          price: number;
          unit?: string;
          weight_per_unit?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          name?: string;
          price?: number;
          unit?: string;
          weight_per_unit?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string | null;
          supplier_id: string | null;
          courier_id: string | null;
          product_name: string;
          quantity: number;
          unit: string;
          weight_kg: number | null;
          buyer_price: number;
          supplier_price: number | null;
          supplier_offered_price: number | null;
          shipping_cost: number;
          service_fee: number;
          total_amount: number | null;
          pickup_location: unknown | null;
          pickup_address: string | null;
          delivery_location: unknown | null;
          delivery_address: string | null;
          distance_km: number | null;
          status: OrderStatus;
          payment_qr_string: string | null;
          payment_expires_at: string | null;
          paid_at: string | null;
          pickup_photo_url: string | null;
          pickup_at: string | null;
          delivery_token: string;
          delivered_at: string | null;
          dispute_image_url: string | null;
          dispute_confidence: number | null;
          dispute_reason: string | null;
          courier_last_location: unknown | null;
          courier_location_updated_at: string | null;
          negotiation_started_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id?: string | null;
          supplier_id?: string | null;
          courier_id?: string | null;
          product_name: string;
          quantity: number;
          unit?: string;
          weight_kg?: number | null;
          buyer_price: number;
          supplier_price?: number | null;
          supplier_offered_price?: number | null;
          shipping_cost?: number;
          service_fee?: number;
          total_amount?: number | null;
          pickup_location?: unknown | null;
          pickup_address?: string | null;
          delivery_location?: unknown | null;
          delivery_address?: string | null;
          distance_km?: number | null;
          status?: OrderStatus;
          payment_qr_string?: string | null;
          payment_expires_at?: string | null;
          paid_at?: string | null;
          pickup_photo_url?: string | null;
          pickup_at?: string | null;
          delivery_token?: string;
          delivered_at?: string | null;
          dispute_image_url?: string | null;
          dispute_confidence?: number | null;
          dispute_reason?: string | null;
          courier_last_location?: unknown | null;
          courier_location_updated_at?: string | null;
          negotiation_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string | null;
          supplier_id?: string | null;
          courier_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit?: string;
          weight_kg?: number | null;
          buyer_price?: number;
          supplier_price?: number | null;
          supplier_offered_price?: number | null;
          shipping_cost?: number;
          service_fee?: number;
          total_amount?: number | null;
          pickup_location?: unknown | null;
          pickup_address?: string | null;
          delivery_location?: unknown | null;
          delivery_address?: string | null;
          distance_km?: number | null;
          status?: OrderStatus;
          payment_qr_string?: string | null;
          payment_expires_at?: string | null;
          paid_at?: string | null;
          pickup_photo_url?: string | null;
          pickup_at?: string | null;
          delivery_token?: string;
          delivered_at?: string | null;
          dispute_image_url?: string | null;
          dispute_confidence?: number | null;
          dispute_reason?: string | null;
          courier_last_location?: unknown | null;
          courier_location_updated_at?: string | null;
          negotiation_started_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          available: number;
          escrow_held: number;
          total_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          available?: number;
          escrow_held?: number;
          total_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          available?: number;
          escrow_held?: number;
          total_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      wallet_transactions: {
        Row: {
          id: string;
          wallet_id: string;
          order_id: string | null;
          type: TransactionType;
          amount: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          order_id?: string | null;
          type: TransactionType;
          amount: number;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          wallet_id?: string;
          order_id?: string | null;
          type?: TransactionType;
          amount?: number;
          description?: string | null;
          created_at?: string;
        };
      };
      order_broadcasts: {
        Row: {
          id: string;
          order_id: string;
          supplier_id: string;
          sent_at: string;
          response: string | null;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          supplier_id: string;
          sent_at?: string;
          response?: string | null;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          supplier_id?: string;
          sent_at?: string;
          response?: string | null;
          responded_at?: string | null;
        };
      };
      courier_broadcasts: {
        Row: {
          id: string;
          order_id: string;
          courier_id: string;
          sent_at: string;
          response: string | null;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          courier_id: string;
          sent_at?: string;
          response?: string | null;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          courier_id?: string;
          sent_at?: string;
          response?: string | null;
          responded_at?: string | null;
        };
      };
      pending_messages: {
        Row: {
          id: string;
          phone_number: string;
          message: string;
          status: MessageStatus;
          retry_count: number;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone_number: string;
          message: string;
          status?: MessageStatus;
          retry_count?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone_number?: string;
          message?: string;
          status?: MessageStatus;
          retry_count?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      agent_conversations: {
        Row: {
          id: string;
          user_id: string | null;
          phone: string;
          role: string;
          content: string;
          tool_calls: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          phone: string;
          role: string;
          content: string;
          tool_calls?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          phone?: string;
          role?: string;
          content?: string;
          tool_calls?: Json | null;
          created_at?: string;
        };
      };
      agent_logs: {
        Row: {
          id: string;
          order_id: string | null;
          iteration: number | null;
          thought: string | null;
          action: string | null;
          action_input: Json | null;
          observation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          iteration?: number | null;
          thought?: string | null;
          action?: string | null;
          action_input?: Json | null;
          observation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          iteration?: number | null;
          thought?: string | null;
          action?: string | null;
          action_input?: Json | null;
          observation?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      find_nearby_suppliers: {
        Args: {
          lat: number;
          lng: number;
          search_term: string | null;
          radius_km?: number;
          max_results?: number;
        };
        Returns: {
          user_id: string;
          name: string;
          phone: string;
          distance_km: number;
          product_id: string;
          product_name: string;
          price: number;
          active_orders: number;
        }[];
      };
      find_nearby_couriers: {
        Args: {
          lat: number;
          lng: number;
          radius_km?: number;
          max_results?: number;
        };
        Returns: {
          user_id: string;
          name: string;
          phone: string;
          vehicle: VehicleType;
          distance_km: number;
        }[];
      };
      complete_order_and_release_escrow: {
        Args: {
          p_order_id: string;
          p_supplier_id: string;
          p_amount: number;
        };
        Returns: Json;
      };
      process_payment_escrow: {
        Args: {
          p_order_id: string;
          p_supplier_id: string;
          p_total_amount: number;
          p_supplier_amount: number;
        };
        Returns: Json;
      };
      process_refund: {
        Args: {
          p_order_id: string;
          p_supplier_id: string;
          p_amount: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      user_role: UserRole;
      onboarding_step: OnboardingStep;
      order_status: OrderStatus;
      vehicle_type: VehicleType;
      transaction_type: TransactionType;
      message_status: MessageStatus;
    };
  };
}

// Convenience types
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];

export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type WalletInsert = Database['public']['Tables']['wallets']['Insert'];
export type WalletUpdate = Database['public']['Tables']['wallets']['Update'];

export type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row'];
export type AgentLog = Database['public']['Tables']['agent_logs']['Row'];
