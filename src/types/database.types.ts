export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          external_id: string;
          provider: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          external_id: string;
          provider: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          student_number: string | null;
          display_name: string | null;
          avatar_url: string | null;
          preferred_campus: string;
          contact_phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          student_number?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_campus?: string;
          contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      campuses: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campuses"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          code: string;
          name: string;
          parent_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      seller_profiles: {
        Row: {
          id: string;
          user_id: string;
          business_name: string;
          business_description: string | null;
          contact_email: string;
          contact_phone: string | null;
          campus_code: string;
          is_verified: boolean;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          business_description?: string | null;
          contact_email: string;
          contact_phone?: string | null;
          campus_code: string;
          is_verified?: boolean;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seller_profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          type: "goods" | "service";
          category_id: string;
          title: string;
          description: string;
          price_cents: number;
          currency: string;
          status: string;
          campus_code: string;
          attributes: Json;
          condition: string | null;
          inventory_count: number;
          max_per_order: number | null;
          fulfillment_type: string | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          seller_id: string;
          type: "goods" | "service";
          category_id: string;
          title: string;
          description: string;
          price_cents: number;
          currency?: string;
          status?: string;
          campus_code: string;
          attributes?: Json;
          condition?: string | null;
          inventory_count?: number;
          max_per_order?: number | null;
          fulfillment_type?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          archived_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["listings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      goods_orders: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          listing_id: string;
          quantity: number;
          unit_price_cents: number;
          total_price_cents: number;
          currency: string;
          campus_code: string;
          status:
            | "requested"
            | "accepted"
            | "rejected"
            | "cancelled"
            | "expired"
            | "completed"
            | "issue_reported";
          note: string | null;
          expires_at: string;
          buyer_confirmed_at: string | null;
          seller_confirmed_at: string | null;
          issue_reported_at: string | null;
          issue_reported_by: string | null;
          issue_reason: string | null;
          cancellation_requested_by: string | null;
          cancellation_requested_at: string | null;
          cancellation_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          listing_id: string;
          quantity?: number;
          unit_price_cents: number;
          total_price_cents: number;
          currency?: string;
          campus_code: string;
          status?: Database["public"]["Tables"]["goods_orders"]["Row"]["status"];
          note?: string | null;
          expires_at?: string;
          buyer_confirmed_at?: string | null;
          seller_confirmed_at?: string | null;
          issue_reported_at?: string | null;
          issue_reported_by?: string | null;
          issue_reason?: string | null;
          cancellation_requested_by?: string | null;
          cancellation_requested_at?: string | null;
          cancellation_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["goods_orders"]["Insert"]>;
        Relationships: [];
      };
      service_bookings: {
        Row: {
          id: string;
          buyer_id: string;
          provider_id: string;
          service_id: string;
          slot_id: string;
          status:
            | "requested"
            | "accepted"
            | "declined"
            | "cancelled"
            | "expired"
            | "completed"
            | "no_show_reported";
          note: string | null;
          expires_at: string;
          no_show_reported_at: string | null;
          no_show_reported_by: string | null;
          no_show_details: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          provider_id: string;
          service_id: string;
          slot_id: string;
          status?: Database["public"]["Tables"]["service_bookings"]["Row"]["status"];
          note?: string | null;
          expires_at?: string;
          no_show_reported_at?: string | null;
          no_show_reported_by?: string | null;
          no_show_details?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["service_bookings"]["Insert"]>;
        Relationships: [];
      };
      order_messages: {
        Row: {
          id: string;
          order_id: string;
          sender_id: string;
          recipient_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          sender_id: string;
          recipient_id: string;
          body: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_messages"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      request_goods_order: {
        Args: {
          p_listing_id: string;
          p_quantity: number;
          p_note?: string | undefined;
        };
        Returns: Json;
      };
      respond_goods_order: {
        Args: {
          p_order_id: string;
          p_accept: boolean;
        };
        Returns: Json;
      };
      cancel_goods_order: {
        Args: {
          p_order_id: string;
        };
        Returns: Json;
      };
      confirm_goods_handoff: {
        Args: {
          p_order_id: string;
        };
        Returns: Json;
      };
      report_goods_issue: {
        Args: {
          p_order_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      request_service_booking: {
        Args: {
          p_service_id: string;
          p_slot_id: string;
          p_note?: string | undefined;
        };
        Returns: Json;
      };
      respond_service_booking: {
        Args: {
          p_booking_id: string;
          p_accept: boolean;
        };
        Returns: Json;
      };
      cancel_service_booking: {
        Args: {
          p_booking_id: string;
        };
        Returns: Json;
      };
      report_service_no_show: {
        Args: {
          p_booking_id: string;
          p_details: string;
        };
        Returns: Json;
      };
      send_order_message: {
        Args: {
          p_order_id: string;
          p_body: string;
        };
        Returns: Json;
      };
    };
  };
}
