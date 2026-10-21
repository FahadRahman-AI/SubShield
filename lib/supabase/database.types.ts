// Mirrors supabase/migrations/20261019000000_init.sql.
// Regenerate with: npx supabase gen types typescript --linked > lib/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Timestamp = string

export interface Database {
  __InternalSupabase: { PostgrestVersion: '12' }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          is_pro: boolean
          plan: 'monthly' | 'yearly' | null
          subscription_status: string | null
          current_period_end: Timestamp | null
          region: 'US' | 'UK' | 'EU' | 'CA' | 'AU'
          alert_email: boolean
          alert_sms: boolean
          phone: string | null
          created_at: Timestamp
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          is_pro?: boolean
          plan?: 'monthly' | 'yearly' | null
          subscription_status?: string | null
          current_period_end?: Timestamp | null
          region?: 'US' | 'UK' | 'EU' | 'CA' | 'AU'
          alert_email?: boolean
          alert_sms?: boolean
          phone?: string | null
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      app_connections: {
        Row: {
          id: string
          user_id: string
          provider: 'plaid' | 'google' | 'microsoft'
          access_token: string
          refresh_token: string | null
          token_expires_at: Timestamp | null
          item_id: string | null
          institution_name: string | null
          account_email: string | null
          sync_cursor: string | null
          status: 'active' | 'error' | 'disconnected' | null
          error_code: string | null
          last_synced_at: Timestamp | null
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          provider: 'plaid' | 'google' | 'microsoft'
          access_token: string
          refresh_token?: string | null
          token_expires_at?: Timestamp | null
          item_id?: string | null
          institution_name?: string | null
          account_email?: string | null
          sync_cursor?: string | null
          status?: 'active' | 'error' | 'disconnected' | null
          error_code?: string | null
          last_synced_at?: Timestamp | null
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['app_connections']['Insert']>
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          connection_id: string
          external_id: string
          account_id: string | null
          merchant_name: string | null
          description: string
          website: string | null
          amount: number
          iso_currency_code: string
          date: string
          category: string | null
          pending: boolean
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          connection_id: string
          external_id: string
          account_id?: string | null
          merchant_name?: string | null
          description: string
          website?: string | null
          amount: number
          iso_currency_code?: string
          date: string
          category?: string | null
          pending?: boolean
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
        Relationships: []
      }
      email_signals: {
        Row: {
          id: string
          user_id: string
          connection_id: string
          external_id: string
          kind: 'receipt' | 'renewal_notice' | 'price_change' | 'trial_ending' | 'cancellation'
          merchant_key: string
          sender: string | null
          subject: string | null
          amount: number | null
          currency: string | null
          occurred_at: string
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          connection_id: string
          external_id: string
          kind: 'receipt' | 'renewal_notice' | 'price_change' | 'trial_ending' | 'cancellation'
          merchant_key: string
          sender?: string | null
          subject?: string | null
          amount?: number | null
          currency?: string | null
          occurred_at: string
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['email_signals']['Insert']>
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          connection_id: string | null
          name: string
          cost: number
          billing_cycle: 'monthly' | 'yearly' | 'weekly' | null
          category: string | null
          next_billing_date: string
          cancellation_difficulty: 'easy' | 'medium' | 'nightmare' | null
          cancellation_url: string | null
          status: 'active' | 'cancelling' | 'cancelled' | 'ignored' | null
          merchant_key: string
          domain: string | null
          source: 'plaid' | 'email' | 'manual'
          currency: string
          previous_cost: number | null
          last_charged_at: string | null
          first_seen_at: string | null
          charge_count: number
          confidence: number
          waste_score: number
          yearly_waste: number
          leak_reasons: Json
          duplicate_group: string | null
          is_teaser: boolean
          updated_at: Timestamp
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          connection_id?: string | null
          name: string
          cost: number
          billing_cycle?: 'monthly' | 'yearly' | 'weekly' | null
          category?: string | null
          next_billing_date: string
          cancellation_difficulty?: 'easy' | 'medium' | 'nightmare' | null
          cancellation_url?: string | null
          status?: 'active' | 'cancelling' | 'cancelled' | 'ignored' | null
          merchant_key: string
          domain?: string | null
          source?: 'plaid' | 'email' | 'manual'
          currency?: string
          previous_cost?: number | null
          last_charged_at?: string | null
          first_seen_at?: string | null
          charge_count?: number
          confidence?: number
          waste_score?: number
          yearly_waste?: number
          leak_reasons?: Json
          duplicate_group?: string | null
          is_teaser?: boolean
          updated_at?: Timestamp
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      cancellation_logs: {
        Row: {
          id: string
          user_id: string
          subscription_id: string
          method: 'email' | 'letter' | 'manual_guide' | null
          status: 'draft' | 'sent' | 'confirmed' | null
          recipient: string | null
          subject: string | null
          body: string | null
          region: string | null
          provider_message_id: string | null
          sent_at: Timestamp | null
          confirmed_at: Timestamp | null
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id: string
          method?: 'email' | 'letter' | 'manual_guide' | null
          status?: 'draft' | 'sent' | 'confirmed' | null
          recipient?: string | null
          subject?: string | null
          body?: string | null
          region?: string | null
          provider_message_id?: string | null
          sent_at?: Timestamp | null
          confirmed_at?: Timestamp | null
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['cancellation_logs']['Insert']>
        Relationships: []
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          kind: AlertKind
          title: string
          body: string | null
          amount_delta: number | null
          dedupe_key: string
          delivered_email_at: Timestamp | null
          delivered_sms_at: Timestamp | null
          read_at: Timestamp | null
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          kind: AlertKind
          title: string
          body?: string | null
          amount_delta?: number | null
          dedupe_key: string
          delivered_email_at?: Timestamp | null
          delivered_sms_at?: Timestamp | null
          read_at?: Timestamp | null
          created_at?: Timestamp
        }
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
        Relationships: []
      }
      stripe_events: {
        Row: { id: string; type: string; created_at: Timestamp }
        Insert: { id: string; type: string; created_at?: Timestamp }
        Update: Partial<{ id: string; type: string; created_at: Timestamp }>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      current_user_is_pro: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type AlertKind =
  | 'new_subscription'
  | 'price_hike'
  | 'renewal'
  | 'duplicate'
  | 'trial_ending'
  | 'charged_after_cancel'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
