// Types correspondant au schéma Supabase — Brick Food Pro

export type UserRole = 'admin' | 'agent' | 'restaurant' | 'client';
export type OfferType = 'flash' | 'deal';
export type OfferStatus = 'en_attente' | 'validee' | 'refusee' | 'a_modifier';
export type PackType = 'couple' | 'famille' | 'anniversaire' | 'vip' | 'business' | 'autre';
export type OrderStatus = 'nouvelle' | 'en_preparation' | 'prete' | 'terminee' | 'livree';
export type DeliveryMode = 'retrait' | 'livraison';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Profile {
  id: string;
  role: UserRole;
  email: string;
  full_name: string;
  phone: string | null;
  restaurant_id: string | null;
  created_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: Record<string, unknown>;
  photos: string[];
  description: string | null;
  agent_id: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  restaurant_id: string;
  agent_id: string;
  type: OfferType;
  title: string;
  description: string;
  photos: string[];
  observation: string | null;
  status: OfferStatus;
  is_confirmed: boolean;
  is_published: boolean;
  commission_rate: number;
  created_at: string;
  updated_at: string;
  // Flash-specific
  price_normal: number | null;
  price_promo: number | null;
  quantity_initial: number | null;
  quantity_remaining: number | null;
  start_timestamp: string | null;
  end_timestamp: string | null;
  // Deal-specific
  pack_type: PackType | null;
  price: number | null;
  capacity_persons: number | null;
  available_date: string | null;
  available_time: string | null;
}

export interface Order {
  id: string;
  client_id: string;
  restaurant_id: string;
  offer_id: string;
  agent_id: string;
  status: OrderStatus;
  delivery_mode: DeliveryMode;
  quantity: number;
  total_amount: number;
  commission_amount: number;
  payment_status: PaymentStatus;
  payment_ref: string | null;
  reservation_code: string;
  created_at: string;
}

export interface OrderHistory {
  id: string;
  order_id: string;
  action: string;
  actor_id: string;
  created_at: string;
}

// Types enrichis avec jointures pour les requêtes
export interface OfferWithRelations extends Offer {
  restaurants?: Restaurant;
  profiles?: Profile;
}

export interface OrderWithRelations extends Order {
  profiles?: Profile;           // client
  restaurants?: Restaurant;
  offers?: Offer;
}

export interface OrderHistoryWithActor extends OrderHistory {
  profiles?: Profile;           // actor
}
