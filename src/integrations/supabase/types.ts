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
      academic_disciplines: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      academic_streams: {
        Row: {
          created_at: string
          description: string | null
          discipline_id: string
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discipline_id: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discipline_id?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_streams_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "academic_disciplines"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_subjects: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          stream_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          stream_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          stream_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_subjects_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "academic_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempt_responses: {
        Row: {
          answered_at: string | null
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option: number | null
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option?: number | null
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempt_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempt_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          answered_questions: number | null
          created_at: string
          id: string
          is_passed: boolean | null
          provider_id: string
          score_percentage: number | null
          started_at: string
          submitted_at: string | null
          time_limit_minutes: number
          total_questions: number
        }
        Insert: {
          answered_questions?: number | null
          created_at?: string
          id?: string
          is_passed?: boolean | null
          provider_id: string
          score_percentage?: number | null
          started_at?: string
          submitted_at?: string | null
          time_limit_minutes?: number
          total_questions: number
        }
        Update: {
          answered_questions?: number | null
          created_at?: string
          id?: string
          is_passed?: boolean | null
          provider_id?: string
          score_percentage?: number | null
          started_at?: string
          submitted_at?: string | null
          time_limit_minutes?: number
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results_rollup: {
        Row: {
          attempt_id: string
          correct_answers: number
          created_at: string
          id: string
          proficiency_area_id: string
          score_percentage: number | null
          total_questions: number
        }
        Insert: {
          attempt_id: string
          correct_answers?: number
          created_at?: string
          id?: string
          proficiency_area_id: string
          score_percentage?: number | null
          total_questions: number
        }
        Update: {
          attempt_id?: string
          correct_answers?: number
          created_at?: string
          id?: string
          proficiency_area_id?: string
          score_percentage?: number | null
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_rollup_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_results_rollup_proficiency_area_id_fkey"
            columns: ["proficiency_area_id"]
            isOneToOne: false
            referencedRelation: "proficiency_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_tags: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          phone_code: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          phone_code?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          phone_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expertise_levels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level_number: number
          max_years: number | null
          min_years: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_number: number
          max_years?: number | null
          min_years: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level_number?: number
          max_years?: number | null
          min_years?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      industry_segments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      level_speciality_map: {
        Row: {
          created_at: string
          expertise_level_id: string
          id: string
          speciality_id: string
        }
        Insert: {
          created_at?: string
          expertise_level_id: string
          id?: string
          speciality_id: string
        }
        Update: {
          created_at?: string
          expertise_level_id?: string
          id?: string
          speciality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_speciality_map_expertise_level_id_fkey"
            columns: ["expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_speciality_map_speciality_id_fkey"
            columns: ["speciality_id"]
            isOneToOne: false
            referencedRelation: "specialities"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_types: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      participation_modes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          requires_org_info: boolean
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          requires_org_info?: boolean
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          requires_org_info?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      proficiency_areas: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          expertise_level_id: string
          id: string
          industry_segment_id: string
          is_active: boolean
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          expertise_level_id: string
          id?: string
          industry_segment_id: string
          is_active?: boolean
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          expertise_level_id?: string
          id?: string
          industry_segment_id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proficiency_areas_expertise_level_id_fkey"
            columns: ["expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proficiency_areas_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      proof_point_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          proof_point_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          proof_point_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          proof_point_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_point_files_proof_point_id_fkey"
            columns: ["proof_point_id"]
            isOneToOne: false
            referencedRelation: "proof_points"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_point_links: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          proof_point_id: string
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          proof_point_id: string
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          proof_point_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_point_links_proof_point_id_fkey"
            columns: ["proof_point_id"]
            isOneToOne: false
            referencedRelation: "proof_points"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_point_speciality_tags: {
        Row: {
          created_at: string
          id: string
          proof_point_id: string
          speciality_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof_point_id: string
          speciality_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proof_point_id?: string
          speciality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_point_speciality_tags_proof_point_id_fkey"
            columns: ["proof_point_id"]
            isOneToOne: false
            referencedRelation: "proof_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_point_speciality_tags_speciality_id_fkey"
            columns: ["speciality_id"]
            isOneToOne: false
            referencedRelation: "specialities"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_points: {
        Row: {
          category: Database["public"]["Enums"]["proof_point_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          id: string
          is_deleted: boolean
          provider_id: string
          title: string
          type: Database["public"]["Enums"]["proof_point_type"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["proof_point_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          id?: string
          is_deleted?: boolean
          provider_id: string
          title: string
          type: Database["public"]["Enums"]["proof_point_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["proof_point_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          id?: string
          is_deleted?: boolean
          provider_id?: string
          title?: string
          type?: Database["public"]["Enums"]["proof_point_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_points_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_proficiency_areas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          proficiency_area_id: string
          provider_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          proficiency_area_id: string
          provider_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          proficiency_area_id?: string
          provider_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_proficiency_areas_proficiency_area_id_fkey"
            columns: ["proficiency_area_id"]
            isOneToOne: false
            referencedRelation: "proficiency_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_proficiency_areas_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_specialities: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          speciality_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          speciality_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          speciality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_specialities_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_specialities_speciality_id_fkey"
            columns: ["speciality_id"]
            isOneToOne: false
            referencedRelation: "specialities"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank: {
        Row: {
          correct_option: number
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["question_difficulty"] | null
          expected_answer_guidance: string | null
          id: string
          is_active: boolean
          options: Json
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          speciality_id: string
          updated_at: string | null
          updated_by: string | null
          usage_mode: Database["public"]["Enums"]["question_usage_mode"]
        }
        Insert: {
          correct_option: number
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          expected_answer_guidance?: string | null
          id?: string
          is_active?: boolean
          options: Json
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          speciality_id: string
          updated_at?: string | null
          updated_by?: string | null
          usage_mode?: Database["public"]["Enums"]["question_usage_mode"]
        }
        Update: {
          correct_option?: number
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          expected_answer_guidance?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          speciality_id?: string
          updated_at?: string | null
          updated_by?: string | null
          usage_mode?: Database["public"]["Enums"]["question_usage_mode"]
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_speciality_id_fkey"
            columns: ["speciality_id"]
            isOneToOne: false
            referencedRelation: "specialities"
            referencedColumns: ["id"]
          },
        ]
      }
      question_capability_tags: {
        Row: {
          capability_tag_id: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          capability_tag_id: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          capability_tag_id?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_capability_tags_capability_tag_id_fkey"
            columns: ["capability_tag_id"]
            isOneToOne: false
            referencedRelation: "capability_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_capability_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      question_exposure_log: {
        Row: {
          attempt_id: string | null
          created_at: string
          exposed_at: string
          exposure_mode: Database["public"]["Enums"]["question_usage_mode"]
          id: string
          provider_id: string
          question_id: string
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          exposed_at?: string
          exposure_mode: Database["public"]["Enums"]["question_usage_mode"]
          id?: string
          provider_id: string
          question_id: string
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          exposed_at?: string
          exposure_mode?: Database["public"]["Enums"]["question_usage_mode"]
          id?: string
          provider_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_exposure_log_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_exposure_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_exposure_log_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_provider_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          declined_at: string | null
          email: string
          expires_at: string
          first_name: string | null
          id: string
          industry_segment_id: string | null
          invitation_type: Database["public"]["Enums"]["invitation_type"]
          invited_by: string | null
          last_name: string | null
          message: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          email: string
          expires_at: string
          first_name?: string | null
          id?: string
          industry_segment_id?: string | null
          invitation_type?: Database["public"]["Enums"]["invitation_type"]
          invited_by?: string | null
          last_name?: string | null
          message?: string | null
          token: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          industry_segment_id?: string | null
          invitation_type?: Database["public"]["Enums"]["invitation_type"]
          invited_by?: string | null
          last_name?: string | null
          message?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_provider_invitations_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_provider_organizations: {
        Row: {
          approval_status: string | null
          approval_token: string | null
          approved_at: string | null
          created_at: string
          credentials_expire_at: string | null
          decline_reason: string | null
          declined_at: string | null
          designation: string | null
          id: string
          is_verified: boolean | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          manager_temp_password_hash: string | null
          org_name: string
          org_type_id: string | null
          org_website: string | null
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string | null
          approval_token?: string | null
          approved_at?: string | null
          created_at?: string
          credentials_expire_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          designation?: string | null
          id?: string
          is_verified?: boolean | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          manager_temp_password_hash?: string | null
          org_name: string
          org_type_id?: string | null
          org_website?: string | null
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string | null
          approval_token?: string | null
          approved_at?: string | null
          created_at?: string
          credentials_expire_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          designation?: string | null
          id?: string
          is_verified?: boolean | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          manager_temp_password_hash?: string | null
          org_name?: string
          org_type_id?: string | null
          org_website?: string | null
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_provider_organizations_org_type_id_fkey"
            columns: ["org_type_id"]
            isOneToOne: false
            referencedRelation: "organization_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_provider_organizations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_providers: {
        Row: {
          address: string | null
          country_id: string | null
          created_at: string
          created_by: string | null
          expertise_level_id: string | null
          first_name: string
          id: string
          industry_segment_id: string | null
          is_student: boolean
          last_name: string
          lifecycle_rank: number
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          participation_mode_id: string | null
          pin_code: string | null
          profile_completion_percentage: number | null
          updated_at: string | null
          updated_by: string | null
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          address?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          expertise_level_id?: string | null
          first_name: string
          id?: string
          industry_segment_id?: string | null
          is_student?: boolean
          last_name: string
          lifecycle_rank?: number
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          participation_mode_id?: string | null
          pin_code?: string | null
          profile_completion_percentage?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          address?: string | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          expertise_level_id?: string | null
          first_name?: string
          id?: string
          industry_segment_id?: string | null
          is_student?: boolean
          last_name?: string
          lifecycle_rank?: number
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          participation_mode_id?: string | null
          pin_code?: string | null
          profile_completion_percentage?: number | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "solution_providers_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_providers_expertise_level_id_fkey"
            columns: ["expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_providers_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solution_providers_participation_mode_id_fkey"
            columns: ["participation_mode_id"]
            isOneToOne: false
            referencedRelation: "participation_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      specialities: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          sub_domain_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          sub_domain_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          sub_domain_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "specialities_sub_domain_id_fkey"
            columns: ["sub_domain_id"]
            isOneToOne: false
            referencedRelation: "sub_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          created_at: string
          discipline_id: string | null
          graduation_year: number | null
          id: string
          institution: string | null
          provider_id: string
          stream_id: string | null
          subject_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          discipline_id?: string | null
          graduation_year?: number | null
          id?: string
          institution?: string | null
          provider_id: string
          stream_id?: string | null
          subject_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          discipline_id?: string | null
          graduation_year?: number | null
          id?: string
          institution?: string | null
          provider_id?: string
          stream_id?: string | null
          subject_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "academic_disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "academic_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "academic_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_domains: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          proficiency_area_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          proficiency_area_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          proficiency_area_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_domains_proficiency_area_id_fkey"
            columns: ["proficiency_area_id"]
            isOneToOne: false
            referencedRelation: "proficiency_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
        | "platform_admin"
        | "tenant_admin"
        | "solution_provider"
        | "seeker"
      invitation_type: "standard" | "vip_expert"
      lifecycle_status:
        | "invited"
        | "registered"
        | "enrolled"
        | "profile_building"
        | "assessment_pending"
        | "assessment_completed"
        | "verified"
        | "active"
        | "suspended"
        | "inactive"
      onboarding_status: "not_started" | "in_progress" | "completed"
      proof_point_category: "general" | "specialty_specific"
      proof_point_type:
        | "project"
        | "case_study"
        | "certification"
        | "award"
        | "publication"
        | "portfolio"
        | "testimonial"
        | "other"
      question_difficulty: "introductory" | "applied" | "advanced" | "strategic"
      question_type:
        | "conceptual"
        | "scenario"
        | "experience"
        | "decision"
        | "proof"
      question_usage_mode: "self_assessment" | "interview" | "both"
      verification_status: "pending" | "in_progress" | "verified" | "rejected"
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
        "platform_admin",
        "tenant_admin",
        "solution_provider",
        "seeker",
      ],
      invitation_type: ["standard", "vip_expert"],
      lifecycle_status: [
        "invited",
        "registered",
        "enrolled",
        "profile_building",
        "assessment_pending",
        "assessment_completed",
        "verified",
        "active",
        "suspended",
        "inactive",
      ],
      onboarding_status: ["not_started", "in_progress", "completed"],
      proof_point_category: ["general", "specialty_specific"],
      proof_point_type: [
        "project",
        "case_study",
        "certification",
        "award",
        "publication",
        "portfolio",
        "testimonial",
        "other",
      ],
      question_difficulty: ["introductory", "applied", "advanced", "strategic"],
      question_type: [
        "conceptual",
        "scenario",
        "experience",
        "decision",
        "proof",
      ],
      question_usage_mode: ["self_assessment", "interview", "both"],
      verification_status: ["pending", "in_progress", "verified", "rejected"],
    },
  },
} as const
