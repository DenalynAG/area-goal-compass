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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      areas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          leader_user_id: string | null
          name: string
          status: Database["public"]["Enums"]["entity_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          leader_user_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          leader_user_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Relationships: [
          {
            foreignKeyName: "areas_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          collaborator_user_id: string
          created_at: string
          description: string | null
          evaluation_date: string
          evaluator_user_id: string
          id: string
          notes: string | null
          period: string | null
          score: number | null
          title: string
          type: Database["public"]["Enums"]["evaluation_type"]
          updated_at: string
        }
        Insert: {
          collaborator_user_id: string
          created_at?: string
          description?: string | null
          evaluation_date?: string
          evaluator_user_id: string
          id?: string
          notes?: string | null
          period?: string | null
          score?: number | null
          title: string
          type: Database["public"]["Enums"]["evaluation_type"]
          updated_at?: string
        }
        Update: {
          collaborator_user_id?: string
          created_at?: string
          description?: string | null
          evaluation_date?: string
          evaluator_user_id?: string
          id?: string
          notes?: string | null
          period?: string | null
          score?: number | null
          title?: string
          type?: Database["public"]["Enums"]["evaluation_type"]
          updated_at?: string
        }
        Relationships: []
      }
      evidences: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          uploaded_by: string
          uploaded_by_name: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_by: string
          uploaded_by_name?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_by?: string
          uploaded_by_name?: string | null
        }
        Relationships: []
      }
      kpi_measurements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kpi_id: string
          notes: string | null
          period_date: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kpi_id: string
          notes?: string | null
          period_date: string
          value?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kpi_id?: string
          notes?: string | null
          period_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_measurements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_measurements_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      kpis: {
        Row: {
          baseline: number
          created_at: string
          current_value: number
          definition: string | null
          frequency: Database["public"]["Enums"]["kpi_frequency"]
          id: string
          name: string
          objective_id: string
          target: number
          threshold_green: number
          threshold_red: number
          threshold_yellow: number
          unit: string | null
        }
        Insert: {
          baseline?: number
          created_at?: string
          current_value?: number
          definition?: string | null
          frequency?: Database["public"]["Enums"]["kpi_frequency"]
          id?: string
          name: string
          objective_id: string
          target?: number
          threshold_green?: number
          threshold_red?: number
          threshold_yellow?: number
          unit?: string | null
        }
        Update: {
          baseline?: number
          created_at?: string
          current_value?: number
          definition?: string | null
          frequency?: Database["public"]["Enums"]["kpi_frequency"]
          id?: string
          name?: string
          objective_id?: string
          target?: number
          threshold_green?: number
          threshold_red?: number
          threshold_yellow?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpis_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          area_id: string
          created_at: string
          id: string
          subarea_id: string | null
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          subarea_id?: string | null
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          subarea_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_subarea_id_fkey"
            columns: ["subarea_id"]
            isOneToOne: false
            referencedRelation: "subareas"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_posts: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          target_user_id?: string | null
          title: string
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      objectives: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          owner_user_id: string | null
          period: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          progress_percent: number
          scope_id: string
          scope_type: string
          start_date: string | null
          status: Database["public"]["Enums"]["objective_status"]
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          owner_user_id?: string | null
          period?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          progress_percent?: number
          scope_id: string
          scope_type: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["objective_status"]
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          owner_user_id?: string | null
          period?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          progress_percent?: number
          scope_id?: string
          scope_type?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["objective_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "objectives_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          area_id: string | null
          created_at: string
          id: string
          name: string
          status: string
          subarea_id: string | null
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          subarea_id?: string | null
        }
        Update: {
          area_id?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          subarea_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_subarea_id_fkey"
            columns: ["subarea_id"]
            isOneToOne: false
            referencedRelation: "subareas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          birthday: string | null
          correo_personal: string | null
          created_at: string
          direccion: string | null
          email: string
          entidad_salud: string | null
          fecha_ingreso: string | null
          fondo_cesantias: string | null
          fondo_pensiones: string | null
          id: string
          identificacion: string | null
          municipio: string | null
          name: string
          phone: string | null
          position: string | null
          sexo: string | null
          talla_camisa: string | null
          talla_pantalon: string | null
          talla_zapatos: string | null
          tipo_contrato: string | null
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          birthday?: string | null
          correo_personal?: string | null
          created_at?: string
          direccion?: string | null
          email: string
          entidad_salud?: string | null
          fecha_ingreso?: string | null
          fondo_cesantias?: string | null
          fondo_pensiones?: string | null
          id: string
          identificacion?: string | null
          municipio?: string | null
          name: string
          phone?: string | null
          position?: string | null
          sexo?: string | null
          talla_camisa?: string | null
          talla_pantalon?: string | null
          talla_zapatos?: string | null
          tipo_contrato?: string | null
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          birthday?: string | null
          correo_personal?: string | null
          created_at?: string
          direccion?: string | null
          email?: string
          entidad_salud?: string | null
          fecha_ingreso?: string | null
          fondo_cesantias?: string | null
          fondo_pensiones?: string | null
          id?: string
          identificacion?: string | null
          municipio?: string | null
          name?: string
          phone?: string | null
          position?: string | null
          sexo?: string | null
          talla_camisa?: string | null
          talla_pantalon?: string | null
          talla_zapatos?: string | null
          tipo_contrato?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subareas: {
        Row: {
          area_id: string
          created_at: string
          description: string | null
          id: string
          leader_user_id: string | null
          name: string
          status: Database["public"]["Enums"]["entity_status"]
        }
        Insert: {
          area_id: string
          created_at?: string
          description?: string | null
          id?: string
          leader_user_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Update: {
          area_id?: string
          created_at?: string
          description?: string | null
          id?: string
          leader_user_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Relationships: [
          {
            foreignKeyName: "subareas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subareas_leader_user_id_fkey"
            columns: ["leader_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_parameters: {
        Row: {
          key: string
          label: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          label: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          label?: string
          updated_at?: string
          value?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_user_area_id: { Args: { _user_id: string }; Returns: string }
      get_user_subarea_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_area"
        | "lider_subarea"
        | "colaborador"
        | "solo_lectura"
      entity_status: "activo" | "inactivo"
      evaluation_type: "feedback" | "desempeno" | "performance" | "one_to_one"
      kpi_frequency: "semanal" | "mensual" | "trimestral"
      objective_status: "borrador" | "activo" | "en_riesgo" | "cerrado"
      priority_level: "alta" | "media" | "baja"
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
      app_role: [
        "super_admin",
        "admin_area",
        "lider_subarea",
        "colaborador",
        "solo_lectura",
      ],
      entity_status: ["activo", "inactivo"],
      evaluation_type: ["feedback", "desempeno", "performance", "one_to_one"],
      kpi_frequency: ["semanal", "mensual", "trimestral"],
      objective_status: ["borrador", "activo", "en_riesgo", "cerrado"],
      priority_level: ["alta", "media", "baja"],
    },
  },
} as const
