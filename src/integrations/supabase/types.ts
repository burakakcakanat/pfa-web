export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessment_answers: {
        Row: {
          created_at: string
          id: string
          question_id: string
          session_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          session_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          session_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_mini: boolean
          level: number
          reverse_coded: boolean
          sort_order: number
          text_en: string | null
          text_tr: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_mini?: boolean
          level: number
          reverse_coded?: boolean
          sort_order?: number
          text_en?: string | null
          text_tr: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_mini?: boolean
          level?: number
          reverse_coded?: boolean
          sort_order?: number
          text_en?: string | null
          text_tr?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          created_at: string
          id: string
          intelligence_scores: Json
          level_scores: Json
          session_id: string
          summary_band: Json
        }
        Insert: {
          created_at?: string
          id?: string
          intelligence_scores?: Json
          level_scores?: Json
          session_id: string
          summary_band?: Json
        }
        Update: {
          created_at?: string
          id?: string
          intelligence_scores?: Json
          level_scores?: Json
          session_id?: string
          summary_band?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          client_invite_id: string | null
          completed_at: string | null
          created_at: string
          guest_token: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["assessment_status"]
          type: Database["public"]["Enums"]["assessment_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_invite_id?: string | null
          completed_at?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          type: Database["public"]["Enums"]["assessment_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_invite_id?: string | null
          completed_at?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          type?: Database["public"]["Enums"]["assessment_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          product_id: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          product_id: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          product_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_client_invites: {
        Row: {
          client_name: string
          created_at: string
          id: string
          pro_user_id: string
          status: Database["public"]["Enums"]["invite_status"]
          token: string
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          id?: string
          pro_user_id: string
          status?: Database["public"]["Enums"]["invite_status"]
          token: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          pro_user_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description_en: string | null
          description_tr: string | null
          id: string
          name_en: string
          name_tr: string
          price_cents: number
          slug: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description_en?: string | null
          description_tr?: string | null
          id?: string
          name_en: string
          name_tr: string
          price_cents: number
          slug: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description_en?: string | null
          description_tr?: string | null
          id?: string
          name_en?: string
          name_tr?: string
          price_cents?: number
          slug?: string
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          preferred_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          source_order_id: string | null
          type: Database["public"]["Enums"]["entitlement_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          source_order_id?: string | null
          type: Database["public"]["Enums"]["entitlement_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          source_order_id?: string | null
          type?: Database["public"]["Enums"]["entitlement_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlements_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_pro_invite: {
        Args: { _client_name: string }
        Returns: {
          client_name: string
          created_at: string
          id: string
          pro_user_id: string
          status: Database["public"]["Enums"]["invite_status"]
          token: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pro_client_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "pro" | "admin"
      assessment_status: "in_progress" | "completed"
      assessment_type: "mini" | "full"
      entitlement_type:
        | "ebook"
        | "assessment_full"
        | "webinar_bsc"
        | "pfa_pro"
        | "session"
      invite_status: "pending" | "completed"
      order_status: "pending" | "paid" | "failed"
      product_type: "session" | "webinar" | "assessment" | "ebook"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "pro", "admin"],
      assessment_status: ["in_progress", "completed"],
      assessment_type: ["mini", "full"],
      entitlement_type: [
        "ebook",
        "assessment_full",
        "webinar_bsc",
        "pfa_pro",
        "session",
      ],
      invite_status: ["pending", "completed"],
      order_status: ["pending", "paid", "failed"],
      product_type: ["session", "webinar", "assessment", "ebook"],
    },
  },
} as const
