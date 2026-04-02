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
      client_folders: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_agency: string | null
          contact: string | null
          created_at: string | null
          dependents_count: number | null
          doc_bank_slip: string | null
          doc_birth_cert: string | null
          doc_caixa_simulator: string | null
          doc_cnh: string | null
          doc_income_tax_full: string | null
          doc_income_tax_receipt: string | null
          doc_payslip: string | null
          doc_work_card: string | null
          email_participant: string | null
          email_proponent: string | null
          fgts_three_years: boolean | null
          fgts_value: number | null
          financing_type: string | null
          folder_created_at: string | null
          folder_status: string | null
          has_dependents: boolean | null
          has_participant: boolean | null
          id: string
          income_formal_par_job: string | null
          income_formal_par_start: string | null
          income_formal_par_value: number | null
          income_formal_pro_job: string | null
          income_formal_pro_start: string | null
          income_formal_pro_value: number | null
          income_informal_par_job: string | null
          income_informal_par_start: string | null
          income_informal_par_value: number | null
          income_informal_pro_job: string | null
          income_informal_pro_start: string | null
          income_informal_pro_value: number | null
          lead_id: string
          participant_cpf: string | null
          participant_education: string | null
          participant_marital_status: string | null
          participant_name: string | null
          participant_pis: string | null
          participant_property_type: string | null
          phone_message: string | null
          phone_mobile: string | null
          phone_residential: string | null
          property_value: number | null
          proponent_cpf: string | null
          proponent_education: string | null
          proponent_marital_status: string | null
          proponent_name: string | null
          proponent_pis: string | null
          proponent_property_type: string | null
          responsible_name: string | null
          updated_at: string | null
          use_fgts: boolean | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_agency?: string | null
          contact?: string | null
          created_at?: string | null
          dependents_count?: number | null
          doc_bank_slip?: string | null
          doc_birth_cert?: string | null
          doc_caixa_simulator?: string | null
          doc_cnh?: string | null
          doc_income_tax_full?: string | null
          doc_income_tax_receipt?: string | null
          doc_payslip?: string | null
          doc_work_card?: string | null
          email_participant?: string | null
          email_proponent?: string | null
          fgts_three_years?: boolean | null
          fgts_value?: number | null
          financing_type?: string | null
          folder_created_at?: string | null
          folder_status?: string | null
          has_dependents?: boolean | null
          has_participant?: boolean | null
          id?: string
          income_formal_par_job?: string | null
          income_formal_par_start?: string | null
          income_formal_par_value?: number | null
          income_formal_pro_job?: string | null
          income_formal_pro_start?: string | null
          income_formal_pro_value?: number | null
          income_informal_par_job?: string | null
          income_informal_par_start?: string | null
          income_informal_par_value?: number | null
          income_informal_pro_job?: string | null
          income_informal_pro_start?: string | null
          income_informal_pro_value?: number | null
          lead_id: string
          participant_cpf?: string | null
          participant_education?: string | null
          participant_marital_status?: string | null
          participant_name?: string | null
          participant_pis?: string | null
          participant_property_type?: string | null
          phone_message?: string | null
          phone_mobile?: string | null
          phone_residential?: string | null
          property_value?: number | null
          proponent_cpf?: string | null
          proponent_education?: string | null
          proponent_marital_status?: string | null
          proponent_name?: string | null
          proponent_pis?: string | null
          proponent_property_type?: string | null
          responsible_name?: string | null
          updated_at?: string | null
          use_fgts?: boolean | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_agency?: string | null
          contact?: string | null
          created_at?: string | null
          dependents_count?: number | null
          doc_bank_slip?: string | null
          doc_birth_cert?: string | null
          doc_caixa_simulator?: string | null
          doc_cnh?: string | null
          doc_income_tax_full?: string | null
          doc_income_tax_receipt?: string | null
          doc_payslip?: string | null
          doc_work_card?: string | null
          email_participant?: string | null
          email_proponent?: string | null
          fgts_three_years?: boolean | null
          fgts_value?: number | null
          financing_type?: string | null
          folder_created_at?: string | null
          folder_status?: string | null
          has_dependents?: boolean | null
          has_participant?: boolean | null
          id?: string
          income_formal_par_job?: string | null
          income_formal_par_start?: string | null
          income_formal_par_value?: number | null
          income_formal_pro_job?: string | null
          income_formal_pro_start?: string | null
          income_formal_pro_value?: number | null
          income_informal_par_job?: string | null
          income_informal_par_start?: string | null
          income_informal_par_value?: number | null
          income_informal_pro_job?: string | null
          income_informal_pro_start?: string | null
          income_informal_pro_value?: number | null
          lead_id?: string
          participant_cpf?: string | null
          participant_education?: string | null
          participant_marital_status?: string | null
          participant_name?: string | null
          participant_pis?: string | null
          participant_property_type?: string | null
          phone_message?: string | null
          phone_mobile?: string | null
          phone_residential?: string | null
          property_value?: number | null
          proponent_cpf?: string | null
          proponent_education?: string | null
          proponent_marital_status?: string | null
          proponent_name?: string | null
          proponent_pis?: string | null
          proponent_property_type?: string | null
          responsible_name?: string | null
          updated_at?: string | null
          use_fgts?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_folders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_history: {
        Row: {
          action: string
          id: string
          lead_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          lead_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          lead_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          cca_assigned_to: string | null
          chatwoot_contact_id: string | null
          chatwoot_conversation_id: string | null
          cpf: string | null
          created_at: string
          email: string
          expected_value: number | null
          folder_status: string | null
          followup_at: string | null
          id: string
          is_archived: boolean
          is_cca_lead: boolean | null
          last_activity_at: string
          moved_to_cca_at: string | null
          name: string
          notes: string | null
          operation_type: string | null
          origin: Database["public"]["Enums"]["lead_origin"]
          phone: string
          property_code_ref: string | null
          property_interest: string | null
          service_order_number: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cca_assigned_to?: string | null
          chatwoot_contact_id?: string | null
          chatwoot_conversation_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          expected_value?: number | null
          folder_status?: string | null
          followup_at?: string | null
          id?: string
          is_archived?: boolean
          is_cca_lead?: boolean | null
          last_activity_at?: string
          moved_to_cca_at?: string | null
          name: string
          notes?: string | null
          operation_type?: string | null
          origin?: Database["public"]["Enums"]["lead_origin"]
          phone?: string
          property_code_ref?: string | null
          property_interest?: string | null
          service_order_number?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cca_assigned_to?: string | null
          chatwoot_contact_id?: string | null
          chatwoot_conversation_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          expected_value?: number | null
          folder_status?: string | null
          followup_at?: string | null
          id?: string
          is_archived?: boolean
          is_cca_lead?: boolean | null
          last_activity_at?: string
          moved_to_cca_at?: string | null
          name?: string
          notes?: string | null
          operation_type?: string | null
          origin?: Database["public"]["Enums"]["lead_origin"]
          phone?: string
          property_code_ref?: string | null
          property_interest?: string | null
          service_order_number?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_cca_assigned_to_fkey"
            columns: ["cca_assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          message: string
          read: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message: string
          read?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string
          read?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          id: string
          is_cca_active: boolean | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          is_cca_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          is_cca_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_brokers: {
        Row: {
          broker_id: string | null
          property_id: number
        }
        Insert: {
          broker_id?: string | null
          property_id: number
        }
        Update: {
          broker_id?: string | null
          property_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_brokers_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_abandoned_cca_leads: { Args: never; Returns: undefined }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      toggle_user_status: {
        Args: { new_status: boolean; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "corretor" | "assistente" | "cca"
      lead_origin: "site" | "indicacao" | "portal" | "outro"
      lead_stage:
        | "novo_lead"
        | "contato"
        | "visita"
        | "proposta"
        | "negociacao"
        | "contrato"
        | "fechado"
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
      app_role: ["admin", "gerente", "corretor", "assistente", "cca"],
      lead_origin: ["site", "indicacao", "portal", "outro"],
      lead_stage: [
        "novo_lead",
        "contato",
        "visita",
        "proposta",
        "negociacao",
        "contrato",
        "fechado",
      ],
    },
  },
} as const
