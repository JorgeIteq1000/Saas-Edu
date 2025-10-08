export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      // ... (outras tabelas como announcements, etc., permanecem iguais)
      announcements: {
        Row: {
          action_button_text: string | null
          action_button_url: string | null
          active: boolean
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          has_action_button: boolean
          id: string
          image_url: string | null
          is_indefinite: boolean
          target_audience: string
          target_course_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_button_text?: string | null
          action_button_url?: string | null
          active?: boolean
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          has_action_button?: boolean
          id?: string
          image_url?: string | null
          is_indefinite?: boolean
          target_audience?: string
          target_course_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_button_text?: string | null
          action_button_url?: string | null
          active?: boolean
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          has_action_button?: boolean
          id?: string
          image_url?: string | null
          is_indefinite?: boolean
          target_audience?: string
          target_course_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_course_id_fkey"
            columns: ["target_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          certificate_url: string | null
          created_at: string
          enrollment_id: string
          id: string
          notes: string | null
          requested_at: string
          status: string
          student_id: string
          template_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          certificate_url?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          notes?: string | null
          requested_at?: string
          status?: string
          student_id: string
          template_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          certificate_url?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          notes?: string | null
          requested_at?: string
          status?: string
          student_id?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          active: boolean
          certifying_institution: string
          course_type: Database["public"]["Enums"]["course_type"]
          created_at: string
          html_content: string | null
          id: string
          layout_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          certifying_institution: string
          course_type: Database["public"]["Enums"]["course_type"]
          created_at?: string
          html_content?: string | null
          id?: string
          layout_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          certifying_institution?: string
          course_type?: Database["public"]["Enums"]["course_type"]
          created_at?: string
          html_content?: string | null
          id?: string
          layout_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      certifying_institutions: {
        Row: {
          active: boolean
          address: string | null
          cnpj: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      combo_course_types: {
        Row: {
          combo_id: string
          course_type_id: string
        }
        Insert: {
          combo_id: string
          course_type_id: string
        }
        Update: {
          combo_id?: string
          course_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_course_types_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_course_types_course_type_id_fkey"
            columns: ["course_type_id"]
            isOneToOne: false
            referencedRelation: "course_types"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          active: boolean
          certifying_institution_id: string
          contract_content: string
          course_type_id: string
          created_at: string
          id: string
          name: string
          terms_and_conditions: string | null
          updated_at: string
          version: string
        }
        Insert: {
          active?: boolean
          certifying_institution_id: string
          contract_content: string
          course_type_id: string
          created_at?: string
          id?: string
          name: string
          terms_and_conditions?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          active?: boolean
          certifying_institution_id?: string
          contract_content?: string
          course_type_id?: string
          created_at?: string
          id?: string
          name?: string
          terms_and_conditions?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_certifying_institution_id_fkey"
            columns: ["certifying_institution_id"]
            isOneToOne: false
            referencedRelation: "certifying_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_course_type_id_fkey"
            columns: ["course_type_id"]
            isOneToOne: false
            referencedRelation: "course_types"
            referencedColumns: ["id"]
          },
        ]
      }
      course_types: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      
      // LOG: ESTA É A CORREÇÃO PRINCIPAL
      courses: {
        Row: {
          active: boolean
          certifying_institution_id: string | null
          code: string | null
          course_type_id: string | null
          created_at: string
          description: string | null
          duration_months: number
          enrollment_fee: number | null
          id: string
          max_duration_months: number | null
          min_duration_months: number | null
          modality: Database["public"]["Enums"]["course_modality"]
          monthly_fee: number | null
          name: string
          sagah_disciplines_code: string | null
          updated_at: string
          workload_hours: number
        }
        Insert: {
          active?: boolean
          certifying_institution_id?: string | null
          code?: string | null
          course_type_id?: string | null
          created_at?: string
          description?: string | null
          duration_months: number
          enrollment_fee?: number | null
          id?: string
          max_duration_months?: number | null
          min_duration_months?: number | null
          modality: Database["public"]["Enums"]["course_modality"]
          monthly_fee?: number | null
          name: string
          sagah_disciplines_code?: string | null
          updated_at?: string
          workload_hours: number
        }
        Update: {
          active?: boolean
          certifying_institution_id?: string | null
          code?: string | null
          course_type_id?: string | null
          created_at?: string
          description?: string | null
          duration_months?: number
          enrollment_fee?: number | null
          id?: string
          max_duration_months?: number | null
          min_duration_months?: number | null
          modality?: Database["public"]["Enums"]["course_modality"]
          monthly_fee?: number | null
          name?: string
          sagah_disciplines_code?: string | null
          updated_at?: string
          workload_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_courses_certifying_institution"
            columns: ["certifying_institution_id"]
            isOneToOne: false
            referencedRelation: "certifying_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_courses_course_type"
            columns: ["course_type_id"]
            isOneToOne: false
            referencedRelation: "course_types"
            referencedColumns: ["id"]
          },
        ]
      }
      // ... (o resto das tabelas continua igual)
      documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          document_url: string
          id: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          document_url: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          document_url?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          actual_end_date: string | null
          combo_id: string | null
          course_id: string | null
          created_at: string
          enrollment_date: string | null
          enrollment_fee_status: Database["public"]["Enums"]["payment_status"]
          enrollment_number: string
          expected_end_date: string | null
          id: string
          seller_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          combo_id?: string | null
          course_id?: string | null
          created_at?: string
          enrollment_date?: string | null
          enrollment_fee_status?: Database["public"]["Enums"]["payment_status"]
          enrollment_number: string
          expected_end_date?: string | null
          id?: string
          seller_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          combo_id?: string | null
          course_id?: string | null
          created_at?: string
          enrollment_date?: string | null
          enrollment_fee_status?: Database["public"]["Enums"]["payment_status"]
          enrollment_number?: string
          expected_end_date?: string | null
          id?: string
          seller_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_selected_courses: {
        Row: {
          course_id: string
          created_at: string
          enrollment_id: string
          id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          enrollment_id: string
          id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_selected_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_selected_courses_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          document_number: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          document_number?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          document_number?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_team"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          protocol_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          protocol_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          protocol_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_messages_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          assigned_to: string | null
          created_at: string
          department: string
          description: string | null
          id: string
          priority: string
          protocol_number: string
          status: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          priority?: string
          protocol_number: string
          status?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          priority?: string
          protocol_number?: string
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocols_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          course_id: string
          created_at: string
          enrollment_id: string | null
          id: string
          notes: string | null
          seller_id: string
          status: string
          student_id: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          course_id: string
          created_at?: string
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          seller_id: string
          status?: string
          student_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string
          enrollment_id?: string | null
          id?: string
          notes?: string | null
          seller_id?: string
          status?: string
          student_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          active: boolean
          cnpj: string | null
          created_at: string
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_teams_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_enrollment_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_protocol_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_team_id: {
        Args: { user_uuid: string }
        Returns: string
      }
    }
    Enums: {
      course_modality: "ead" | "presencial" | "hibrido"
      // LOG: Esta definição foi re-adicionada para corrigir os erros.
      course_type: "graduacao" | "pos_graduacao" | "especializacao" | "extensao"
      enrollment_status:
        | "pendente"
        | "ativa"
        | "trancada"
        | "cancelada"
        | "concluida"
      payment_status: "pendente" | "pago" | "vencido" | "cancelado"
      user_role: "admin_geral" | "gestor" | "vendedor" | "colaborador" | "aluno"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ... (o resto do arquivo que gera os tipos a partir de 'Database' permanece igual)
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
      course_modality: ["ead", "presencial", "hibrido"],
      course_type: ["graduacao", "pos_graduacao", "especializacao", "extensao"],
      enrollment_status: [
        "pendente",
        "ativa",
        "trancada",
        "cancelada",
        "concluida",
      ],
      payment_status: ["pendente", "pago", "vencido", "cancelado"],
      user_role: ["admin_geral", "gestor", "vendedor", "colaborador", "aluno"],
    },
  },
} as const