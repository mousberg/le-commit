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
          variables?: Json
          operationName?: string
          query?: string
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
          analysis_result: Json | null
          ashby_candidate_id: string | null
          ashby_last_synced_at: string | null
          ashby_sync_status: string | null
          created_at: string | null
          cross_reference_analysis: Json | null
          cv_data: Json | null
          email: string | null
          github_data: Json | null
          id: string
          individual_analysis: Json | null
          linkedin_data: Json | null
          linkedin_job_completed_at: string | null
          linkedin_job_id: string | null
          linkedin_job_started_at: string | null
          linkedin_job_status: string | null
          name: string
          original_filename: string | null
          original_github_url: string | null
          original_linkedin_url: string | null
          priority: string | null
          role: string | null
          score: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          ashby_candidate_id?: string | null
          ashby_last_synced_at?: string | null
          ashby_sync_status?: string | null
          created_at?: string | null
          cross_reference_analysis?: Json | null
          cv_data?: Json | null
          email?: string | null
          github_data?: Json | null
          id?: string
          individual_analysis?: Json | null
          linkedin_data?: Json | null
          linkedin_job_completed_at?: string | null
          linkedin_job_id?: string | null
          linkedin_job_started_at?: string | null
          linkedin_job_status?: string | null
          name: string
          original_filename?: string | null
          original_github_url?: string | null
          original_linkedin_url?: string | null
          priority?: string | null
          role?: string | null
          score?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          ashby_candidate_id?: string | null
          ashby_last_synced_at?: string | null
          ashby_sync_status?: string | null
          created_at?: string | null
          cross_reference_analysis?: Json | null
          cv_data?: Json | null
          email?: string | null
          github_data?: Json | null
          id?: string
          individual_analysis?: Json | null
          linkedin_data?: Json | null
          linkedin_job_completed_at?: string | null
          linkedin_job_id?: string | null
          linkedin_job_started_at?: string | null
          linkedin_job_status?: string | null
          name?: string
          original_filename?: string | null
          original_github_url?: string | null
          original_linkedin_url?: string | null
          priority?: string | null
          role?: string | null
          score?: number | null
          status?: string
          updated_at?: string | null
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
          all_emails: Json | null
          all_file_handles: Json | null
          all_phone_numbers: Json | null
          analysis_summary: Json | null
          ashby_created_at: string | null
          ashby_id: string
          company: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          fraud_likelihood: string | null
          fraud_reason: string | null
          github_url: string | null
          has_resume: boolean | null
          id: string
          last_synced_at: string | null
          linkedin_url: string | null
          location_details: Json | null
          location_summary: string | null
          name: string
          phone_number: string | null
          position: string | null
          profile_url: string | null
          resume_file_handle: string | null
          resume_url: string | null
          school: string | null
          social_links: Json | null
          source_info: Json | null
          sync_status: string | null
          tags: string[] | null
          timezone: string | null
          unmask_applicant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_emails?: Json | null
          all_file_handles?: Json | null
          all_phone_numbers?: Json | null
          analysis_summary?: Json | null
          ashby_created_at?: string | null
          ashby_id: string
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          fraud_likelihood?: string | null
          fraud_reason?: string | null
          github_url?: string | null
          has_resume?: boolean | null
          id?: string
          last_synced_at?: string | null
          linkedin_url?: string | null
          location_details?: Json | null
          location_summary?: string | null
          name: string
          phone_number?: string | null
          position?: string | null
          profile_url?: string | null
          resume_file_handle?: string | null
          resume_url?: string | null
          school?: string | null
          social_links?: Json | null
          source_info?: Json | null
          sync_status?: string | null
          tags?: string[] | null
          timezone?: string | null
          unmask_applicant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_emails?: Json | null
          all_file_handles?: Json | null
          all_phone_numbers?: Json | null
          analysis_summary?: Json | null
          ashby_created_at?: string | null
          ashby_id?: string
          company?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          fraud_likelihood?: string | null
          fraud_reason?: string | null
          github_url?: string | null
          has_resume?: boolean | null
          id?: string
          last_synced_at?: string | null
          linkedin_url?: string | null
          location_details?: Json | null
          location_summary?: string | null
          name?: string
          phone_number?: string | null
          position?: string | null
          profile_url?: string | null
          resume_file_handle?: string | null
          resume_url?: string | null
          school?: string | null
          social_links?: Json | null
          source_info?: Json | null
          sync_status?: string | null
          tags?: string[] | null
          timezone?: string | null
          unmask_applicant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ashby_candidates_unmask_applicant_id_fkey"
            columns: ["unmask_applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ashby_candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          applicant_id: string
          created_at: string | null
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          original_filename: string
          storage_bucket: string
          storage_path: string
        }
        Insert: {
          applicant_id: string
          created_at?: string | null
          file_size?: number | null
          file_type: string
          id?: string
          mime_type?: string | null
          original_filename: string
          storage_bucket: string
          storage_path: string
        }
        Update: {
          applicant_id?: string
          created_at?: string | null
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          original_filename?: string
          storage_bucket?: string
          storage_path?: string
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
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_applicants: {
        Args: Record<PropertyKey, never>
        Returns: {
          applicant_id: string
          applicant_name: string
          applicant_email: string
          status: string
          score: number
          role: string
          file_count: number
          created_at: string
          updated_at: string
        }[]
      }
      get_user_ashby_candidates: {
        Args: Record<PropertyKey, never>
        Returns: {
          ashby_id: string
          name: string
          email: string
          linkedin_url: string
          has_resume: boolean
          resume_url: string
          tags: string[]
          unmask_applicant_id: string
          fraud_likelihood: string
          last_synced_at: string
          fraud_reason: string
          ashby_created_at: string
        }[]
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

