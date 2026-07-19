export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_visible: boolean;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_visible?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_visible?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          created_at: string;
          currency: string;
          customer_email: string;
          customer_name: string;
          customer_phone: string | null;
          id: string;
          items: Json;
          notes: string | null;
          payment_intent_id: string | null;
          shipping_address: string;
          shipping_city: string;
          shipping_country: string;
          shipping_postal: string | null;
          status: string;
          subtotal_cents: number;
          total_cents: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          customer_email: string;
          customer_name: string;
          customer_phone?: string | null;
          id?: string;
          items: Json;
          notes?: string | null;
          payment_intent_id?: string | null;
          shipping_address: string;
          shipping_city: string;
          shipping_country?: string;
          shipping_postal?: string | null;
          status?: string;
          subtotal_cents?: number;
          total_cents?: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          currency?: string;
          customer_email?: string;
          customer_name?: string;
          customer_phone?: string | null;
          id?: string;
          items?: Json;
          notes?: string | null;
          payment_intent_id?: string | null;
          shipping_address?: string;
          shipping_city?: string;
          shipping_country?: string;
          shipping_postal?: string | null;
          status?: string;
          subtotal_cents?: number;
          total_cents?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          category_id: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          images: string[];
          is_active: boolean;
          name: string;
          price_cents: number;
          quantity: number;
          sizes: string[];
          slug: string;
          return_policy: string | null;
          colors: string[];
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          images?: string[];
          is_active?: boolean;
          name: string;
          price_cents?: number;
          quantity?: number;
          sizes?: string[];
          slug: string;
          return_policy?: string | null;
          colors?: string[];
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          images?: string[];
          is_active?: boolean;
          name?: string;
          price_cents?: number;
          quantity?: number;
          sizes?: string[];
          slug?: string;
          return_policy?: string | null;
          colors?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: {
          admin_notification_email: string;
          brand_name: string;
          footer_tagline: string | null;
          hero_eyebrow: string | null;
          hero_headline: string | null;
          hero_image_url: string | null;
          hero_subhead: string | null;
          homepage_category_ids: string[];
          id: number;
          logo_url: string | null;
          marquee_items: string[];
          upcoming_body: string | null;
          upcoming_image_url: string | null;
          upcoming_title: string | null;
          updated_at: string;
        };
        Insert: {
          admin_notification_email?: string;
          brand_name?: string;
          footer_tagline?: string | null;
          hero_eyebrow?: string | null;
          hero_headline?: string | null;
          hero_image_url?: string | null;
          hero_subhead?: string | null;
          homepage_category_ids?: string[];
          id?: number;
          logo_url?: string | null;
          marquee_items?: string[];
          upcoming_body?: string | null;
          upcoming_image_url?: string | null;
          upcoming_title?: string | null;
          updated_at?: string;
        };
        Update: {
          admin_notification_email?: string;
          brand_name?: string;
          footer_tagline?: string | null;
          hero_eyebrow?: string | null;
          hero_headline?: string | null;
          hero_image_url?: string | null;
          hero_subhead?: string | null;
          homepage_category_ids?: string[];
          id?: number;
          logo_url?: string | null;
          marquee_items?: string[];
          upcoming_body?: string | null;
          upcoming_image_url?: string | null;
          upcoming_title?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      place_order_atomic: {
        Args: {
          _customer_name: string;
          _customer_email: string;
          _customer_phone: string | null;
          _shipping_address: string;
          _shipping_city: string;
          _shipping_postal: string | null;
          _shipping_country: string;
          _items: Json;
          _subtotal_cents: number;
          _total_cents: number;
          _currency: string;
          _notes: string | null;
          _user_id: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
