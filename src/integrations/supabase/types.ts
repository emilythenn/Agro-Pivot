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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      active_crops: {
        Row: {
          ai_monitoring: boolean | null
          created_at: string
          crop_name: string
          crop_variety: string | null
          current_season: string | null
          drainage_condition: string | null
          expected_harvest_date: string | null
          fertilizer_plan: string | null
          growth_stage: string | null
          id: string
          labor_cost: number | null
          notes: string | null
          planting_date: string | null
          plot_name: string | null
          plot_size: number | null
          priority_goal: string | null
          risk_tolerance: string | null
          seed_cost: number | null
          seed_source: string | null
          soil_condition: string | null
          status: string | null
          total_budget: number | null
          updated_at: string
          user_id: string
          water_source: string | null
        }
        Insert: {
          ai_monitoring?: boolean | null
          created_at?: string
          crop_name: string
          crop_variety?: string | null
          current_season?: string | null
          drainage_condition?: string | null
          expected_harvest_date?: string | null
          fertilizer_plan?: string | null
          growth_stage?: string | null
          id?: string
          labor_cost?: number | null
          notes?: string | null
          planting_date?: string | null
          plot_name?: string | null
          plot_size?: number | null
          priority_goal?: string | null
          risk_tolerance?: string | null
          seed_cost?: number | null
          seed_source?: string | null
          soil_condition?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string
          user_id: string
          water_source?: string | null
        }
        Update: {
          ai_monitoring?: boolean | null
          created_at?: string
          crop_name?: string
          crop_variety?: string | null
          current_season?: string | null
          drainage_condition?: string | null
          expected_harvest_date?: string | null
          fertilizer_plan?: string | null
          growth_stage?: string | null
          id?: string
          labor_cost?: number | null
          notes?: string | null
          planting_date?: string | null
          plot_name?: string | null
          plot_size?: number | null
          priority_goal?: string | null
          risk_tolerance?: string | null
          seed_cost?: number | null
          seed_source?: string | null
          soil_condition?: string | null
          status?: string | null
          total_budget?: number | null
          updated_at?: string
          user_id?: string
          water_source?: string | null
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          expires_at: string | null
          id: string
          message: string | null
          read: boolean | null
          severity: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          severity?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          severity?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      evidence_reports: {
        Row: {
          ai_analysis: string | null
          created_at: string
          gps_data: Json | null
          id: string
          report_hash: string | null
          report_title: string
          report_type: string | null
          scan_id: string | null
          user_id: string
          weather_data: Json | null
        }
        Insert: {
          ai_analysis?: string | null
          created_at?: string
          gps_data?: Json | null
          id?: string
          report_hash?: string | null
          report_title: string
          report_type?: string | null
          scan_id?: string | null
          user_id: string
          weather_data?: Json | null
        }
        Update: {
          ai_analysis?: string | null
          created_at?: string
          gps_data?: Json | null
          id?: string
          report_hash?: string | null
          report_title?: string
          report_type?: string | null
          scan_id?: string | null
          user_id?: string
          weather_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_reports_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scan_results"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_orders: {
        Row: {
          buyer_id: string
          buyer_notes: string | null
          buyer_phone: string | null
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          seller_id: string
          seller_notes: string | null
          status: string | null
          total_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_notes?: string | null
          buyer_phone?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          seller_id: string
          seller_notes?: string | null
          status?: string | null
          total_price?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_notes?: string | null
          buyer_phone?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          seller_id?: string
          seller_notes?: string | null
          status?: string | null
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          location_district: string | null
          location_state: string | null
          name: string
          price: number
          product_type: string
          quantity_available: number | null
          seller_id: string
          status: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location_district?: string | null
          location_state?: string | null
          name: string
          price?: number
          product_type?: string
          quantity_available?: number | null
          seller_id: string
          status?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location_district?: string | null
          location_state?: string | null
          name?: string
          price?: number
          product_type?: string
          quantity_available?: number | null
          seller_id?: string
          status?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_ratings: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          rated_user_id: string
          rater_id: string
          rating: number
          review: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          rated_user_id: string
          rater_id: string
          rating: number
          review?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          rated_user_id?: string
          rater_id?: string
          rating?: number
          review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acreage: number | null
          avatar_url: string | null
          budget_per_season: number | null
          created_at: string
          current_crops: string | null
          district: string | null
          drainage_condition: string | null
          email: string | null
          expected_yield_target: string | null
          farm_name: string | null
          farm_type: string | null
          farming_style: string | null
          flood_risk: string | null
          full_name: string | null
          gps_lat: number | null
          gps_lng: number | null
          historical_issues: string | null
          id: string
          irrigation_type: string | null
          main_crop_income: boolean | null
          notification_email: boolean | null
          notification_sms: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          planting_season: string | null
          preferred_crops: string | null
          primary_crop: string | null
          risk_tolerance: string | null
          role: string | null
          secondary_crops: string | null
          selling_method: string | null
          soil_ph: number | null
          soil_type: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          acreage?: number | null
          avatar_url?: string | null
          budget_per_season?: number | null
          created_at?: string
          current_crops?: string | null
          district?: string | null
          drainage_condition?: string | null
          email?: string | null
          expected_yield_target?: string | null
          farm_name?: string | null
          farm_type?: string | null
          farming_style?: string | null
          flood_risk?: string | null
          full_name?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          historical_issues?: string | null
          id: string
          irrigation_type?: string | null
          main_crop_income?: boolean | null
          notification_email?: boolean | null
          notification_sms?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          planting_season?: string | null
          preferred_crops?: string | null
          primary_crop?: string | null
          risk_tolerance?: string | null
          role?: string | null
          secondary_crops?: string | null
          selling_method?: string | null
          soil_ph?: number | null
          soil_type?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          acreage?: number | null
          avatar_url?: string | null
          budget_per_season?: number | null
          created_at?: string
          current_crops?: string | null
          district?: string | null
          drainage_condition?: string | null
          email?: string | null
          expected_yield_target?: string | null
          farm_name?: string | null
          farm_type?: string | null
          farming_style?: string | null
          flood_risk?: string | null
          full_name?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          historical_issues?: string | null
          id?: string
          irrigation_type?: string | null
          main_crop_income?: boolean | null
          notification_email?: boolean | null
          notification_sms?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          planting_season?: string | null
          preferred_crops?: string | null
          primary_crop?: string | null
          risk_tolerance?: string | null
          role?: string | null
          secondary_crops?: string | null
          selling_method?: string | null
          soil_ph?: number | null
          soil_type?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scan_results: {
        Row: {
          ai_analysis: Json | null
          confidence: number | null
          created_at: string
          crop_name: string
          germination_rate: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          image_url: string | null
          status: string
          user_id: string
          weather_snapshot: Json | null
        }
        Insert: {
          ai_analysis?: Json | null
          confidence?: number | null
          created_at?: string
          crop_name: string
          germination_rate?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          image_url?: string | null
          status?: string
          user_id: string
          weather_snapshot?: Json | null
        }
        Update: {
          ai_analysis?: Json | null
          confidence?: number | null
          created_at?: string
          crop_name?: string
          germination_rate?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          image_url?: string | null
          status?: string
          user_id?: string
          weather_snapshot?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          analytics_opt_in: boolean | null
          created_at: string
          crop_advisory: boolean | null
          currency: string | null
          data_export: boolean | null
          date_format: string | null
          email_digest: boolean | null
          id: string
          market_updates: boolean | null
          public_profile: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          seed_scan_results: boolean | null
          share_location: boolean | null
          sms_alerts: boolean | null
          sound_effects: boolean | null
          temp_unit: string | null
          timezone: string | null
          two_factor: boolean | null
          updated_at: string
          user_id: string
          weather_alerts: boolean | null
        }
        Insert: {
          analytics_opt_in?: boolean | null
          created_at?: string
          crop_advisory?: boolean | null
          currency?: string | null
          data_export?: boolean | null
          date_format?: string | null
          email_digest?: boolean | null
          id?: string
          market_updates?: boolean | null
          public_profile?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          seed_scan_results?: boolean | null
          share_location?: boolean | null
          sms_alerts?: boolean | null
          sound_effects?: boolean | null
          temp_unit?: string | null
          timezone?: string | null
          two_factor?: boolean | null
          updated_at?: string
          user_id: string
          weather_alerts?: boolean | null
        }
        Update: {
          analytics_opt_in?: boolean | null
          created_at?: string
          crop_advisory?: boolean | null
          currency?: string | null
          data_export?: boolean | null
          date_format?: string | null
          email_digest?: boolean | null
          id?: string
          market_updates?: boolean | null
          public_profile?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          seed_scan_results?: boolean | null
          share_location?: boolean | null
          sms_alerts?: boolean | null
          sound_effects?: boolean | null
          temp_unit?: string | null
          timezone?: string | null
          two_factor?: boolean | null
          updated_at?: string
          user_id?: string
          weather_alerts?: boolean | null
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          documents: Json | null
          id: string
          reference_numbers: Json | null
          rejection_reason: string | null
          status: string | null
          submitted_at: string
          user_id: string
          verification_type: string
          verified_at: string | null
        }
        Insert: {
          documents?: Json | null
          id?: string
          reference_numbers?: Json | null
          rejection_reason?: string | null
          status?: string | null
          submitted_at?: string
          user_id: string
          verification_type?: string
          verified_at?: string | null
        }
        Update: {
          documents?: Json | null
          id?: string
          reference_numbers?: Json | null
          rejection_reason?: string | null
          status?: string | null
          submitted_at?: string
          user_id?: string
          verification_type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_seller_profiles: {
        Args: { seller_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_user_avg_rating: { Args: { _user_id: string }; Returns: number }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "farmer" | "seed_seller" | "consumer"
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
      app_role: ["farmer", "seed_seller", "consumer"],
    },
  },
} as const
