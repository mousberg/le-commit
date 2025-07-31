export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applicants: {
        Row: {
          analysis: Json | null
          ashby_candidate_id: string | null
          ashby_last_synced_at: string | null
          ashby_sync_status: string | null
          created_at: string
          email: string
          github_url: string | null
          id: string
          linkedin_url: string | null
          name: string
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          ashby_candidate_id?: string | null
          ashby_last_synced_at?: string | null
          ashby_sync_status?: string | null
          created_at?: string
          email: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          ashby_candidate_id?: string | null
          ashby_last_synced_at?: string | null
          ashby_sync_status?: string | null
          created_at?: string
          email?: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ashby_candidates: {
        Row: {
          all_file_handles: Json | null
          analysis_completed_at: string | null
          analysis_result: Json | null
          analysis_status: string | null
          application_archived_at: string | null
          application_id: string | null
          application_stage: string | null
          application_status: string | null
          ashby_created_at: string | null
          ashby_id: string
          ashby_updated_at: string | null
          cached_at: string
          company: string | null
          credited_to_id: string | null
          credited_to_name: string | null
          custom_fields: Json | null
          cv_storage_path: string | null
          degree: string | null
          email: string | null
          emails: Json | null
          fraud_likelihood: string | null
          fraud_reason: string | null
          github_url: string | null
          has_resume: boolean | null
          id: string
          job_id: string | null
          job_title: string | null
          last_synced_at: string
          linkedin_url: string | null
          location: string | null
          location_details: Json | null
          location_summary: string | null
          name: string
          phone: string | null
          phone_number: string | null
          phone_numbers: Json | null
          position: string | null
          profile_url: string | null
          resume_file_handle: string | null
          resume_url: string | null
          school: string | null
          social_links: Json | null
          source: string | null
          source_id: string | null
          source_info: Json | null
          tags: Json | null
          timezone: string | null
          title: string | null
          unmask_applicant_id: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          websites: Json | null
        }
        Insert: {
          all_file_handles?: Json | null
          analysis_completed_at?: string | null
          analysis_result?: Json | null
          analysis_status?: string | null
          application_archived_at?: string | null
          application_id?: string | null
          application_stage?: string | null
          application_status?: string | null
          ashby_created_at?: string | null
          ashby_id: string
          ashby_updated_at?: string | null
          cached_at?: string
          company?: string | null
          credited_to_id?: string | null
          credited_to_name?: string | null
          custom_fields?: Json | null
          cv_storage_path?: string | null
          degree?: string | null
          email?: string | null
          emails?: Json | null
          fraud_likelihood?: string | null
          fraud_reason?: string | null
          github_url?: string | null
          has_resume?: boolean | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          last_synced_at?: string
          linkedin_url?: string | null
          location?: string | null
          location_details?: Json | null
          location_summary?: string | null
          name: string
          phone?: string | null
          phone_number?: string | null
          phone_numbers?: Json | null
          position?: string | null
          profile_url?: string | null
          resume_file_handle?: string | null
          resume_url?: string | null
          school?: string | null
          social_links?: Json | null
          source?: string | null
          source_id?: string | null
          source_info?: Json | null
          tags?: Json | null
          timezone?: string | null
          title?: string | null
          unmask_applicant_id?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          websites?: Json | null
        }
        Update: {
          all_file_handles?: Json | null
          analysis_completed_at?: string | null
          analysis_result?: Json | null
          analysis_status?: string | null
          application_archived_at?: string | null
          application_id?: string | null
          application_stage?: string | null
          application_status?: string | null
          ashby_created_at?: string | null
          ashby_id?: string
          ashby_updated_at?: string | null
          cached_at?: string
          company?: string | null
          credited_to_id?: string | null
          credited_to_name?: string | null
          custom_fields?: Json | null
          cv_storage_path?: string | null
          degree?: string | null
          email?: string | null
          emails?: Json | null
          fraud_likelihood?: string | null
          fraud_reason?: string | null
          github_url?: string | null
          has_resume?: boolean | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          last_synced_at?: string
          linkedin_url?: string | null
          location?: string | null
          location_details?: Json | null
          location_summary?: string | null
          name?: string
          phone?: string | null
          phone_number?: string | null
          phone_numbers?: Json | null
          position?: string | null
          profile_url?: string | null
          resume_file_handle?: string | null
          resume_url?: string | null
          school?: string | null
          social_links?: Json | null
          source?: string | null
          source_id?: string | null
          source_info?: Json | null
          tags?: Json | null
          timezone?: string | null
          title?: string | null
          unmask_applicant_id?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          websites?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ashby_candidates_unmask_applicant_id_fkey"
            columns: ["unmask_applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          applicant_id: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          uploaded_at: string
        }
        Insert: {
          applicant_id: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          uploaded_at?: string
        }
        Update: {
          applicant_id?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_applicants: {
        Args: { user_uuid: string }
        Returns: {
          analysis: Json | null
          ashby_candidate_id: string | null
          ashby_last_synced_at: string | null
          ashby_sync_status: string | null
          created_at: string
          email: string
          github_url: string | null
          id: string
          linkedin_url: string | null
          name: string
          phone: string | null
          status: string | null
          updated_at: string
          user_id: string
        }[]
      }
      get_user_ashby_candidates: {
        Args: { p_user_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          candidate: Json
        }[]
      }
      link_applicant_to_ashby_candidate: {
        Args: {
          p_user_id: string
          p_applicant_id: string
          p_ashby_candidate_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

