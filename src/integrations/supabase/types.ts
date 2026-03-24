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
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      academic_streams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          discipline_id: string
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline_id: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discipline_id?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
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
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          stream_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          stream_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          stream_id?: string
          updated_at?: string | null
          updated_by?: string | null
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
      admin_access_codes: {
        Row: {
          admin_tier: string
          code_hash: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          admin_tier?: string
          code_hash: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          admin_tier?: string
          code_hash?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      admin_activation_links: {
        Row: {
          admin_id: string | null
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          reminders_sent: number
          status: string
          token: string
          used_at: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id: string
          reminders_sent?: number
          status?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          reminders_sent?: number
          status?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activation_links_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "seeking_org_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_activation_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          admin_id: string
          body: string
          created_at: string
          deep_link: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          admin_id: string
          body: string
          created_at?: string
          deep_link?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          admin_id?: string
          body?: string
          created_at?: string
          deep_link?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_performance_metrics: {
        Row: {
          admin_id: string
          avg_processing_hours: number | null
          computed_at: string | null
          created_at: string
          id: string
          open_queue_claims: number
          period_end: string | null
          period_start: string | null
          reassignments_received: number
          reassignments_sent: number
          sla_breached_count: number
          sla_compliance_rate_pct: number | null
          sla_compliant_count: number
          updated_at: string | null
          verifications_completed: number
        }
        Insert: {
          admin_id: string
          avg_processing_hours?: number | null
          computed_at?: string | null
          created_at?: string
          id?: string
          open_queue_claims?: number
          period_end?: string | null
          period_start?: string | null
          reassignments_received?: number
          reassignments_sent?: number
          sla_breached_count?: number
          sla_compliance_rate_pct?: number | null
          sla_compliant_count?: number
          updated_at?: string | null
          verifications_completed?: number
        }
        Update: {
          admin_id?: string
          avg_processing_hours?: number | null
          computed_at?: string | null
          created_at?: string
          id?: string
          open_queue_claims?: number
          period_end?: string | null
          period_start?: string | null
          reassignments_received?: number
          reassignments_sent?: number
          sla_breached_count?: number
          sla_compliance_rate_pct?: number | null
          sla_compliant_count?: number
          updated_at?: string | null
          verifications_completed?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_performance_metrics_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_transfer_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          expires_at: string | null
          from_admin_id: string
          id: string
          initiated_by: string | null
          justification: string | null
          organization_id: string
          rejection_reason: string | null
          requested_at: string
          status: string
          to_admin_email: string
          to_admin_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expires_at?: string | null
          from_admin_id: string
          id?: string
          initiated_by?: string | null
          justification?: string | null
          organization_id: string
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          to_admin_email: string
          to_admin_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          expires_at?: string | null
          from_admin_id?: string
          id?: string
          initiated_by?: string | null
          justification?: string | null
          organization_id?: string
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          to_admin_email?: string
          to_admin_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_transfer_requests_from_admin_id_fkey"
            columns: ["from_admin_id"]
            isOneToOne: false
            referencedRelation: "seeking_org_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_transfer_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_review_global_config: {
        Row: {
          batch_split_threshold: number
          default_model: string
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_split_threshold?: number
          default_model?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_split_threshold?: number
          default_model?: string
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ai_review_section_config: {
        Row: {
          donts: string | null
          dos: string | null
          example_good: string | null
          example_poor: string | null
          importance_level: string
          is_active: boolean
          max_words: number
          min_words: number
          required_elements: string[]
          review_instructions: string | null
          role_context: string
          section_description: string | null
          section_key: string
          section_label: string
          tone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          donts?: string | null
          dos?: string | null
          example_good?: string | null
          example_poor?: string | null
          importance_level?: string
          is_active?: boolean
          max_words?: number
          min_words?: number
          required_elements?: string[]
          review_instructions?: string | null
          role_context: string
          section_description?: string | null
          section_key: string
          section_label: string
          tone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          donts?: string | null
          dos?: string | null
          example_good?: string | null
          example_poor?: string | null
          importance_level?: string
          is_active?: boolean
          max_words?: number
          min_words?: number
          required_elements?: string[]
          review_instructions?: string | null
          role_context?: string
          section_description?: string | null
          section_key?: string
          section_label?: string
          tone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      amendment_records: {
        Row: {
          amendment_number: number
          challenge_id: string
          created_at: string
          created_by: string | null
          id: string
          initiated_by: string | null
          reason: string | null
          scope_of_change: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          version_after: number | null
          version_before: number | null
          withdrawal_deadline: string | null
        }
        Insert: {
          amendment_number: number
          challenge_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          initiated_by?: string | null
          reason?: string | null
          scope_of_change?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version_after?: number | null
          version_before?: number | null
          withdrawal_deadline?: string | null
        }
        Update: {
          amendment_number?: number
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          initiated_by?: string | null
          reason?: string | null
          scope_of_change?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version_after?: number | null
          version_before?: number | null
          withdrawal_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "amendment_records_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
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
          question_order: number | null
          selected_option: number | null
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          question_order?: number | null
          selected_option?: number | null
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          question_order?: number | null
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
          enrollment_id: string | null
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
          enrollment_id?: string | null
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
          enrollment_id?: string | null
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
            foreignKeyName: "assessment_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "provider_industry_enrollments"
            referencedColumns: ["id"]
          },
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
      audit_trail: {
        Row: {
          action: string
          challenge_id: string | null
          created_at: string
          created_by: string | null
          details: Json | null
          id: string
          method: string
          phase_from: number | null
          phase_to: number | null
          solution_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          challenge_id?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          method: string
          phase_from?: number | null
          phase_to?: number | null
          solution_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          challenge_id?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          method?: string
          phase_from?: number | null
          phase_to?: number | null
          solution_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_trail_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reviewers: {
        Row: {
          acceptance_status: string | null
          accepted_at: string | null
          booking_id: string
          created_at: string | null
          declined_at: string | null
          declined_reason: string | null
          id: string
          reviewer_id: string
          slot_id: string
          status: string | null
        }
        Insert: {
          acceptance_status?: string | null
          accepted_at?: string | null
          booking_id: string
          created_at?: string | null
          declined_at?: string | null
          declined_reason?: string | null
          id?: string
          reviewer_id: string
          slot_id: string
          status?: string | null
        }
        Update: {
          acceptance_status?: string | null
          accepted_at?: string | null
          booking_id?: string
          created_at?: string | null
          declined_at?: string | null
          declined_reason?: string | null
          id?: string
          reviewer_id?: string
          slot_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reviewers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "interview_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviewers_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "panel_reviewers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviewers_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "reviewer_workload_distribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviewers_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "interview_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_tags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      challenge_legal_docs: {
        Row: {
          attached_by: string | null
          challenge_id: string
          content_summary: string | null
          created_at: string
          created_by: string | null
          document_name: string | null
          document_type: string
          id: string
          lc_review_notes: string | null
          lc_reviewed_at: string | null
          lc_reviewed_by: string | null
          lc_status: string | null
          maturity_level: string | null
          priority: string | null
          rationale: string | null
          status: string | null
          template_version: string | null
          tier: string
          updated_at: string | null
          updated_by: string | null
          version_history: Json
        }
        Insert: {
          attached_by?: string | null
          challenge_id: string
          content_summary?: string | null
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_type: string
          id?: string
          lc_review_notes?: string | null
          lc_reviewed_at?: string | null
          lc_reviewed_by?: string | null
          lc_status?: string | null
          maturity_level?: string | null
          priority?: string | null
          rationale?: string | null
          status?: string | null
          template_version?: string | null
          tier: string
          updated_at?: string | null
          updated_by?: string | null
          version_history?: Json
        }
        Update: {
          attached_by?: string | null
          challenge_id?: string
          content_summary?: string | null
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_type?: string
          id?: string
          lc_review_notes?: string | null
          lc_reviewed_at?: string | null
          lc_reviewed_by?: string | null
          lc_status?: string | null
          maturity_level?: string | null
          priority?: string | null
          rationale?: string | null
          status?: string | null
          template_version?: string | null
          tier?: string
          updated_at?: string | null
          updated_by?: string | null
          version_history?: Json
        }
        Relationships: [
          {
            foreignKeyName: "challenge_legal_docs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_package_versions: {
        Row: {
          challenge_id: string
          created_at: string
          created_by: string | null
          id: string
          snapshot: Json | null
          updated_at: string | null
          updated_by: string | null
          version_number: number
        }
        Insert: {
          challenge_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          version_number: number
        }
        Update: {
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          snapshot?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_package_versions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_qa: {
        Row: {
          anonymous_id: string | null
          answer_text: string | null
          answered_at: string | null
          answered_by: string | null
          asked_at: string
          asked_by: string
          challenge_id: string
          compliance_flag_reason: string | null
          compliance_flagged: boolean
          compliance_flagged_at: string | null
          created_at: string
          created_by: string | null
          is_closed: boolean
          is_published: boolean
          qa_id: string
          question_text: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          anonymous_id?: string | null
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_at?: string
          asked_by: string
          challenge_id: string
          compliance_flag_reason?: string | null
          compliance_flagged?: boolean
          compliance_flagged_at?: string | null
          created_at?: string
          created_by?: string | null
          is_closed?: boolean
          is_published?: boolean
          qa_id?: string
          question_text: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          anonymous_id?: string | null
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_at?: string
          asked_by?: string
          challenge_id?: string
          compliance_flag_reason?: string | null
          compliance_flagged?: boolean
          compliance_flagged_at?: string | null
          created_at?: string
          created_by?: string | null
          is_closed?: boolean
          is_published?: boolean
          qa_id?: string
          question_text?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_qa_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_phase: string | null
          challenge_id: string
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          pool_member_id: string
          reassigned_at: string | null
          reassignment_reason: string | null
          replaced_by: string | null
          role_code: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_phase?: string | null
          challenge_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          pool_member_id: string
          reassigned_at?: string | null
          reassignment_reason?: string | null
          replaced_by?: string | null
          role_code: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_phase?: string | null
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          pool_member_id?: string
          reassigned_at?: string | null
          reassignment_reason?: string | null
          replaced_by?: string | null
          role_code?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_role_assignments_pool_member_id_fkey"
            columns: ["pool_member_id"]
            isOneToOne: false
            referencedRelation: "platform_provider_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_role_assignments_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "challenge_role_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email_verified: boolean
          email_verified_at: string | null
          id: string
          is_deleted: boolean
          payment_details: Json | null
          prize_status: string | null
          provider_id: string | null
          solver_eligibility_code: string
          status: string
          submission_files: Json | null
          submission_text: string | null
          submitter_email: string
          submitter_name: string
          submitter_phone: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email_verified?: boolean
          email_verified_at?: string | null
          id?: string
          is_deleted?: boolean
          payment_details?: Json | null
          prize_status?: string | null
          provider_id?: string | null
          solver_eligibility_code: string
          status?: string
          submission_files?: Json | null
          submission_text?: string | null
          submitter_email: string
          submitter_name: string
          submitter_phone?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email_verified?: boolean
          email_verified_at?: string | null
          id?: string
          is_deleted?: boolean
          payment_details?: Json | null
          prize_status?: string | null
          provider_id?: string | null
          solver_eligibility_code?: string
          status?: string
          submission_files?: Json | null
          submission_text?: string | null
          submitter_email?: string
          submitter_name?: string
          submitter_phone?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          ai_section_reviews: Json | null
          challenge_model_is_agg: boolean
          challenge_visibility: string | null
          completed_at: string | null
          complexity_id: string | null
          complexity_level: string | null
          complexity_parameters: Json | null
          complexity_score: number | null
          consulting_fee: number | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          current_phase: number | null
          deleted_at: string | null
          deleted_by: string | null
          deliverables: Json | null
          description: string | null
          domain_tags: Json | null
          effort_level: string | null
          eligibility: string | null
          eligibility_model: string | null
          engagement_model_id: string | null
          evaluation_criteria: Json | null
          extended_brief: Json | null
          governance_mode_override: string | null
          governance_profile: string | null
          hook: string | null
          id: string
          ip_model: string | null
          is_active: boolean
          is_deleted: boolean
          is_qa_closed: boolean
          lc_review_required: boolean
          management_fee: number | null
          master_status: string | null
          maturity_level: string | null
          max_solutions: number | null
          operating_model: string | null
          organization_id: string
          payment_status: string | null
          phase_schedule: Json | null
          phase_status: string | null
          problem_statement: string | null
          published_at: string | null
          rejection_fee_percentage: number | null
          reward_structure: Json | null
          scope: string | null
          shadow_fee_amount: number | null
          solutions_awarded: number
          solver_eligibility_id: string | null
          solver_eligibility_types: Json | null
          solver_expertise_requirements: Json | null
          solver_visibility_types: Json | null
          status: string
          submission_deadline: string | null
          submission_template_url: string | null
          targeting_filters: Json | null
          tenant_id: string
          termination_type: string | null
          title: string
          total_fee: number | null
          updated_at: string | null
          updated_by: string | null
          visibility: string | null
        }
        Insert: {
          ai_section_reviews?: Json | null
          challenge_model_is_agg?: boolean
          challenge_visibility?: string | null
          completed_at?: string | null
          complexity_id?: string | null
          complexity_level?: string | null
          complexity_parameters?: Json | null
          complexity_score?: number | null
          consulting_fee?: number | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          current_phase?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deliverables?: Json | null
          description?: string | null
          domain_tags?: Json | null
          effort_level?: string | null
          eligibility?: string | null
          eligibility_model?: string | null
          engagement_model_id?: string | null
          evaluation_criteria?: Json | null
          extended_brief?: Json | null
          governance_mode_override?: string | null
          governance_profile?: string | null
          hook?: string | null
          id?: string
          ip_model?: string | null
          is_active?: boolean
          is_deleted?: boolean
          is_qa_closed?: boolean
          lc_review_required?: boolean
          management_fee?: number | null
          master_status?: string | null
          maturity_level?: string | null
          max_solutions?: number | null
          operating_model?: string | null
          organization_id: string
          payment_status?: string | null
          phase_schedule?: Json | null
          phase_status?: string | null
          problem_statement?: string | null
          published_at?: string | null
          rejection_fee_percentage?: number | null
          reward_structure?: Json | null
          scope?: string | null
          shadow_fee_amount?: number | null
          solutions_awarded?: number
          solver_eligibility_id?: string | null
          solver_eligibility_types?: Json | null
          solver_expertise_requirements?: Json | null
          solver_visibility_types?: Json | null
          status?: string
          submission_deadline?: string | null
          submission_template_url?: string | null
          targeting_filters?: Json | null
          tenant_id: string
          termination_type?: string | null
          title: string
          total_fee?: number | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string | null
        }
        Update: {
          ai_section_reviews?: Json | null
          challenge_model_is_agg?: boolean
          challenge_visibility?: string | null
          completed_at?: string | null
          complexity_id?: string | null
          complexity_level?: string | null
          complexity_parameters?: Json | null
          complexity_score?: number | null
          consulting_fee?: number | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          current_phase?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deliverables?: Json | null
          description?: string | null
          domain_tags?: Json | null
          effort_level?: string | null
          eligibility?: string | null
          eligibility_model?: string | null
          engagement_model_id?: string | null
          evaluation_criteria?: Json | null
          extended_brief?: Json | null
          governance_mode_override?: string | null
          governance_profile?: string | null
          hook?: string | null
          id?: string
          ip_model?: string | null
          is_active?: boolean
          is_deleted?: boolean
          is_qa_closed?: boolean
          lc_review_required?: boolean
          management_fee?: number | null
          master_status?: string | null
          maturity_level?: string | null
          max_solutions?: number | null
          operating_model?: string | null
          organization_id?: string
          payment_status?: string | null
          phase_schedule?: Json | null
          phase_status?: string | null
          problem_statement?: string | null
          published_at?: string | null
          rejection_fee_percentage?: number | null
          reward_structure?: Json | null
          scope?: string | null
          shadow_fee_amount?: number | null
          solutions_awarded?: number
          solver_eligibility_id?: string | null
          solver_eligibility_types?: Json | null
          solver_expertise_requirements?: Json | null
          solver_visibility_types?: Json | null
          status?: string
          submission_deadline?: string | null
          submission_template_url?: string | null
          targeting_filters?: Json | null
          tenant_id?: string
          termination_type?: string | null
          title?: string
          total_fee?: number | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_complexity_id_fkey"
            columns: ["complexity_id"]
            isOneToOne: false
            referencedRelation: "md_challenge_complexity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "md_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_solver_eligibility_id_fkey"
            columns: ["solver_eligibility_id"]
            isOneToOne: false
            referencedRelation: "md_solver_eligibility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cogni_notifications: {
        Row: {
          challenge_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cogni_notifications_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_log: {
        Row: {
          challenge_id: string
          channel: string
          created_at: string
          created_by: string | null
          flag_reason: string | null
          flagged: boolean
          log_id: string
          logged_at: string
          message_text: string
          review_action: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_id: string
        }
        Insert: {
          challenge_id: string
          channel: string
          created_at?: string
          created_by?: string | null
          flag_reason?: string | null
          flagged?: boolean
          log_id?: string
          logged_at?: string
          message_text: string
          review_action?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id: string
        }
        Update: {
          challenge_id?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          flag_reason?: string | null
          flagged?: boolean
          log_id?: string
          logged_at?: string
          message_text?: string
          review_action?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_log_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_permissions: {
        Row: {
          allowed: boolean
          challenge_phase_max: number
          challenge_phase_min: number
          created_at: string
          from_role: string
          id: string
          to_role: string
          updated_at: string | null
        }
        Insert: {
          allowed?: boolean
          challenge_phase_max?: number
          challenge_phase_min?: number
          created_at?: string
          from_role: string
          id?: string
          to_role: string
          updated_at?: string | null
        }
        Update: {
          allowed?: boolean
          challenge_phase_max?: number
          challenge_phase_min?: number
          created_at?: string
          from_role?: string
          id?: string
          to_role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      composite_interview_slots: {
        Row: {
          available_reviewer_count: number
          backing_slot_ids: string[]
          created_at: string | null
          end_at: string
          expertise_level_id: string
          id: string
          industry_segment_id: string
          start_at: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          available_reviewer_count: number
          backing_slot_ids?: string[]
          created_at?: string | null
          end_at: string
          expertise_level_id: string
          id?: string
          industry_segment_id: string
          start_at: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          available_reviewer_count?: number
          backing_slot_ids?: string[]
          created_at?: string | null
          end_at?: string
          expertise_level_id?: string
          id?: string
          industry_segment_id?: string
          start_at?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "composite_interview_slots_expertise_level_id_fkey"
            columns: ["expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composite_interview_slots_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          address_format_template: Json | null
          code: string
          created_at: string
          created_by: string | null
          currency_code: string | null
          currency_symbol: string
          date_format: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          is_ofac_restricted: boolean
          iso_alpha3: string | null
          name: string
          number_format: string
          phone_code: string | null
          phone_code_display: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address_format_template?: Json | null
          code: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          currency_symbol?: string
          date_format?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_ofac_restricted?: boolean
          iso_alpha3?: string | null
          name: string
          number_format?: string
          phone_code?: string | null
          phone_code_display?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address_format_template?: Json | null
          code?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          currency_symbol?: string
          date_format?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_ofac_restricted?: boolean
          iso_alpha3?: string | null
          name?: string
          number_format?: string
          phone_code?: string | null
          phone_code_display?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      curator_section_actions: {
        Row: {
          action_type: string
          addressed_to: string | null
          ai_original_comments: string | null
          challenge_id: string
          comment_html: string | null
          created_at: string
          created_by: string | null
          id: string
          priority: string | null
          responded_at: string | null
          response_html: string | null
          section_key: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          action_type: string
          addressed_to?: string | null
          ai_original_comments?: string | null
          challenge_id: string
          comment_html?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string | null
          responded_at?: string | null
          response_html?: string | null
          section_key: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          action_type?: string
          addressed_to?: string | null
          ai_original_comments?: string | null
          challenge_id?: string
          comment_html?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string | null
          responded_at?: string | null
          response_html?: string | null
          section_key?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curator_section_actions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      delegated_soa_scope_audit: {
        Row: {
          confirmation_given: boolean
          created_at: string
          id: string
          modified_by: string | null
          new_scope: Json
          organization_id: string
          orphan_count: number
          previous_scope: Json
          soa_id: string
        }
        Insert: {
          confirmation_given?: boolean
          created_at?: string
          id?: string
          modified_by?: string | null
          new_scope?: Json
          organization_id: string
          orphan_count?: number
          previous_scope?: Json
          soa_id: string
        }
        Update: {
          confirmation_given?: boolean
          created_at?: string
          id?: string
          modified_by?: string | null
          new_scope?: Json
          organization_id?: string
          orphan_count?: number
          previous_scope?: Json
          soa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegated_soa_scope_audit_soa_id_fkey"
            columns: ["soa_id"]
            isOneToOne: false
            referencedRelation: "seeking_org_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_records: {
        Row: {
          arbitrator_id: string | null
          challenge_id: string
          created_at: string
          created_by: string | null
          dispute_type: string
          evidence: Json
          filed_at: string
          id: string
          raised_by: string
          resolution: string | null
          resolved_at: string | null
          solution_id: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          arbitrator_id?: string | null
          challenge_id: string
          created_at?: string
          created_by?: string | null
          dispute_type: string
          evidence?: Json
          filed_at?: string
          id?: string
          raised_by: string
          resolution?: string | null
          resolved_at?: string | null
          solution_id?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          arbitrator_id?: string | null
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          dispute_type?: string
          evidence?: Json
          filed_at?: string
          id?: string
          raised_by?: string
          resolution?: string | null
          resolved_at?: string | null
          solution_id?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_records_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_records_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_reviews: {
        Row: {
          challenge_id: string
          created_at: string
          created_by: string | null
          id: string
          matched_challenge_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          similarity_percent: number
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          matched_challenge_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_percent?: number
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          matched_challenge_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          similarity_percent?: number
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_reviews_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_reviews_matched_challenge_id_fkey"
            columns: ["matched_challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otp_verifications: {
        Row: {
          attempts: number
          created_at: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          locked_until: string | null
          max_attempts: number
          organization_id: string | null
          otp_hash: string
          tenant_id: string
          total_failed_attempts: number
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          email: string
          expires_at: string
          id?: string
          is_used?: boolean
          locked_until?: string | null
          max_attempts?: number
          organization_id?: string | null
          otp_hash: string
          tenant_id: string
          total_failed_attempts?: number
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          locked_until?: string | null
          max_attempts?: number
          organization_id?: string | null
          otp_hash?: string
          tenant_id?: string
          total_failed_attempts?: number
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_otp_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_otp_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_deletion_audit: {
        Row: {
          affected_data: Json | null
          blockers_overridden: Json | null
          created_at: string | null
          deleted_by: string
          deletion_reason: string | null
          enrollment_id: string
          id: string
          industry_name: string | null
          industry_segment_id: string
          provider_id: string
          stakeholders_notified: Json | null
          was_force_delete: boolean | null
        }
        Insert: {
          affected_data?: Json | null
          blockers_overridden?: Json | null
          created_at?: string | null
          deleted_by: string
          deletion_reason?: string | null
          enrollment_id: string
          id?: string
          industry_name?: string | null
          industry_segment_id: string
          provider_id: string
          stakeholders_notified?: Json | null
          was_force_delete?: boolean | null
        }
        Update: {
          affected_data?: Json | null
          blockers_overridden?: Json | null
          created_at?: string | null
          deleted_by?: string
          deletion_reason?: string | null
          enrollment_id?: string
          id?: string
          industry_name?: string | null
          industry_segment_id?: string
          provider_id?: string
          stakeholders_notified?: Json | null
          was_force_delete?: boolean | null
        }
        Relationships: []
      }
      enterprise_contact_requests: {
        Row: {
          assigned_to: string | null
          company_size: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string | null
          notes: string | null
          organization_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["enterprise_request_status_enum"]
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_size?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          notes?: string | null
          organization_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["enterprise_request_status_enum"]
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_size?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string | null
          notes?: string | null
          organization_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["enterprise_request_status_enum"]
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enterprise_contact_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enterprise_contact_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_records: {
        Row: {
          bank_address: string | null
          bank_branch: string | null
          bank_name: string | null
          challenge_id: string
          created_at: string
          created_by: string | null
          currency: string
          deposit_amount: number
          deposit_date: string | null
          deposit_reference: string | null
          escrow_status: string
          fc_notes: string | null
          id: string
          rejection_fee_percentage: number
          released_amount: number
          remaining_amount: number
          transaction_log: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bank_address?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          challenge_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_amount?: number
          deposit_date?: string | null
          deposit_reference?: string | null
          escrow_status?: string
          fc_notes?: string | null
          id?: string
          rejection_fee_percentage?: number
          released_amount?: number
          remaining_amount?: number
          transaction_log?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bank_address?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_amount?: number
          deposit_date?: string | null
          deposit_reference?: string | null
          escrow_status?: string
          fc_notes?: string | null
          id?: string
          rejection_fee_percentage?: number
          released_amount?: number
          remaining_amount?: number
          transaction_log?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_records_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: true
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_records: {
        Row: {
          ai_feasibility_score: number | null
          ai_novelty_score: number | null
          ai_plagiarism_score: number | null
          commentary: string | null
          conflict_action: string | null
          conflict_declared: boolean
          created_at: string
          created_by: string | null
          id: string
          individual_score: number | null
          review_round: number
          reviewer_id: string
          rubric_scores: Json | null
          solution_id: string
          submitted_at: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ai_feasibility_score?: number | null
          ai_novelty_score?: number | null
          ai_plagiarism_score?: number | null
          commentary?: string | null
          conflict_action?: string | null
          conflict_declared?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          individual_score?: number | null
          review_round?: number
          reviewer_id: string
          rubric_scores?: Json | null
          solution_id: string
          submitted_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ai_feasibility_score?: number | null
          ai_novelty_score?: number | null
          ai_plagiarism_score?: number | null
          commentary?: string | null
          conflict_action?: string | null
          conflict_declared?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          individual_score?: number | null
          review_round?: number
          reviewer_id?: string
          rubric_scores?: Json | null
          solution_id?: string
          submitted_at?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_records_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      expertise_levels: {
        Row: {
          created_at: string
          created_by: string | null
          default_quorum_count: number
          description: string | null
          id: string
          is_active: boolean
          level_number: number
          max_years: number | null
          min_years: number
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_quorum_count?: number
          description?: string | null
          id?: string
          is_active?: boolean
          level_number: number
          max_years?: number | null
          min_years: number
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_quorum_count?: number
          description?: string | null
          id?: string
          is_active?: boolean
          level_number?: number
          max_years?: number | null
          min_years?: number
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      industry_segments: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "industry_segments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_bookings: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          composite_slot_id: string | null
          created_at: string | null
          created_by: string | null
          enrollment_id: string
          flag_for_clarification: boolean | null
          id: string
          interview_correct_count: number | null
          interview_outcome: string | null
          interview_score_out_of_10: number | null
          interview_score_percentage: number | null
          interview_submitted_at: string | null
          interview_submitted_by: string | null
          interview_total_questions: number | null
          notes: string | null
          panel_recommendation: string | null
          provider_id: string
          reschedule_count: number | null
          reviewer_notes: string | null
          scheduled_at: string
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          composite_slot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          enrollment_id: string
          flag_for_clarification?: boolean | null
          id?: string
          interview_correct_count?: number | null
          interview_outcome?: string | null
          interview_score_out_of_10?: number | null
          interview_score_percentage?: number | null
          interview_submitted_at?: string | null
          interview_submitted_by?: string | null
          interview_total_questions?: number | null
          notes?: string | null
          panel_recommendation?: string | null
          provider_id: string
          reschedule_count?: number | null
          reviewer_notes?: string | null
          scheduled_at: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          composite_slot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          enrollment_id?: string
          flag_for_clarification?: boolean | null
          id?: string
          interview_correct_count?: number | null
          interview_outcome?: string | null
          interview_score_out_of_10?: number | null
          interview_score_percentage?: number | null
          interview_submitted_at?: string | null
          interview_submitted_by?: string | null
          interview_total_questions?: number | null
          notes?: string | null
          panel_recommendation?: string | null
          provider_id?: string
          reschedule_count?: number | null
          reviewer_notes?: string | null
          scheduled_at?: string
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_bookings_composite_slot_id_fkey"
            columns: ["composite_slot_id"]
            isOneToOne: false
            referencedRelation: "available_composite_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_bookings_composite_slot_id_fkey"
            columns: ["composite_slot_id"]
            isOneToOne: false
            referencedRelation: "composite_interview_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_bookings_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "provider_industry_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_evaluations: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string | null
          evaluated_at: string | null
          id: string
          notes: string | null
          outcome: string | null
          overall_score: number | null
          reviewer_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by?: string | null
          evaluated_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          overall_score?: number | null
          reviewer_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string | null
          evaluated_at?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          overall_score?: number | null
          reviewer_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_evaluations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "interview_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "panel_reviewers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_evaluations_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "reviewer_workload_distribution"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_kit_competencies: {
        Row: {
          code: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      interview_kit_questions: {
        Row: {
          competency_id: string
          created_at: string
          created_by: string | null
          display_order: number | null
          expected_answer: string | null
          expertise_level_id: string
          id: string
          industry_segment_id: string
          is_active: boolean
          question_text: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          competency_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          expected_answer?: string | null
          expertise_level_id: string
          id?: string
          industry_segment_id: string
          is_active?: boolean
          question_text: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          competency_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          expected_answer?: string | null
          expertise_level_id?: string
          id?: string
          industry_segment_id?: string
          is_active?: boolean
          question_text?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_kit_questions_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "interview_kit_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_kit_questions_expertise_level_id_fkey"
            columns: ["expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_kit_questions_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_question_responses: {
        Row: {
          comments: string | null
          created_at: string
          created_by: string | null
          display_order: number
          evaluation_id: string
          expected_answer: string | null
          id: string
          interview_kit_question_id: string | null
          is_deleted: boolean | null
          proof_point_id: string | null
          question_bank_id: string | null
          question_id: string | null
          question_source: string
          question_text: string
          rating: string | null
          score: number | null
          section_label: string | null
          section_name: string
          section_type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          evaluation_id: string
          expected_answer?: string | null
          id?: string
          interview_kit_question_id?: string | null
          is_deleted?: boolean | null
          proof_point_id?: string | null
          question_bank_id?: string | null
          question_id?: string | null
          question_source: string
          question_text: string
          rating?: string | null
          score?: number | null
          section_label?: string | null
          section_name: string
          section_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          evaluation_id?: string
          expected_answer?: string | null
          id?: string
          interview_kit_question_id?: string | null
          is_deleted?: boolean | null
          proof_point_id?: string | null
          question_bank_id?: string | null
          question_id?: string | null
          question_source?: string
          question_text?: string
          rating?: string | null
          score?: number | null
          section_label?: string | null
          section_name?: string
          section_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_question_responses_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "interview_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_question_responses_interview_kit_question_id_fkey"
            columns: ["interview_kit_question_id"]
            isOneToOne: false
            referencedRelation: "interview_kit_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_question_responses_proof_point_id_fkey"
            columns: ["proof_point_id"]
            isOneToOne: false
            referencedRelation: "proof_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_question_responses_question_bank_id_fkey"
            columns: ["question_bank_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_quorum_requirements: {
        Row: {
          created_at: string | null
          created_by: string | null
          expertise_level_id: string
          id: string
          industry_segment_id: string | null
          interview_duration_minutes: number | null
          is_active: boolean | null
          required_quorum_count: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expertise_level_id: string
          id?: string
          industry_segment_id?: string | null
          interview_duration_minutes?: number | null
          is_active?: boolean | null
          required_quorum_count?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expertise_level_id?: string
          id?: string
          industry_segment_id?: string | null
          interview_duration_minutes?: number | null
          is_active?: boolean | null
          required_quorum_count?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_quorum_requirements_expertise_level_id_fkey"
            columns: ["expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_quorum_requirements_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_slots: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string | null
          end_at: string
          hold_expires_at: string | null
          id: string
          reviewer_id: string
          slot_expertise_ids: string[] | null
          slot_industry_ids: string[] | null
          start_at: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          end_at: string
          hold_expires_at?: string | null
          id?: string
          reviewer_id: string
          slot_expertise_ids?: string[] | null
          slot_industry_ids?: string[] | null
          start_at: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          end_at?: string
          hold_expires_at?: string | null
          id?: string
          reviewer_id?: string
          slot_expertise_ids?: string[] | null
          slot_industry_ids?: string[] | null
          start_at?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_slots_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "panel_reviewers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_slots_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "reviewer_workload_distribution"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_transfer_records: {
        Row: {
          challenge_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          initiated_at: string | null
          ip_model: string
          registration_reference: string | null
          seeker_signed_at: string | null
          solution_id: string
          solver_signed_at: string | null
          transfer_status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          challenge_id: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          initiated_at?: string | null
          ip_model: string
          registration_reference?: string | null
          seeker_signed_at?: string | null
          solution_id: string
          solver_signed_at?: string | null
          transfer_status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          challenge_id?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          initiated_at?: string | null
          ip_model?: string
          registration_reference?: string | null
          seeker_signed_at?: string | null
          solution_id?: string
          solver_signed_at?: string | null
          transfer_status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_transfer_records_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_transfer_records_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_acceptance_ledger: {
        Row: {
          accepted_at: string
          challenge_id: string
          created_at: string
          created_by: string | null
          document_name: string | null
          document_type: string
          document_version: string | null
          id: string
          ip_address: string | null
          phase_triggered: number | null
          scroll_confirmed: boolean
          tier: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          challenge_id: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_type: string
          document_version?: string | null
          id?: string
          ip_address?: string | null
          phase_triggered?: number | null
          scroll_confirmed?: boolean
          tier?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_type?: string
          document_version?: string | null
          id?: string
          ip_address?: string | null
          phase_triggered?: number | null
          scroll_confirmed?: boolean
          tier?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptance_ledger_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_templates: {
        Row: {
          created_at: string
          default_template_url: string | null
          description: string | null
          document_name: string
          document_type: string
          is_active: boolean
          required_for_maturity: Json
          template_id: string
          tier: string
          trigger_phase: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          default_template_url?: string | null
          description?: string | null
          document_name: string
          document_type: string
          is_active?: boolean
          required_for_maturity?: Json
          template_id?: string
          tier: string
          trigger_phase?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          default_template_url?: string | null
          description?: string | null
          document_name?: string
          document_type?: string
          is_active?: boolean
          required_for_maturity?: Json
          template_id?: string
          tier?: string
          trigger_phase?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_reacceptance_records: {
        Row: {
          accepted_at: string | null
          amendment_id: string
          challenge_id: string
          created_at: string
          created_by: string | null
          deadline_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          amendment_id: string
          challenge_id: string
          created_at?: string
          created_by?: string | null
          deadline_at: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          amendment_id?: string
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          deadline_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_reacceptance_records_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "amendment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_reacceptance_records_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_review_requests: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          document_id: string | null
          id: string
          is_mandatory: boolean
          lc_user_id: string | null
          notes: string | null
          requested_at: string
          requested_by: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          is_mandatory?: boolean
          lc_user_id?: string | null
          notes?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          id?: string
          is_mandatory?: boolean
          lc_user_id?: string | null
          notes?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_review_requests_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_review_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "challenge_legal_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      level_speciality_map: {
        Row: {
          created_at: string
          created_by: string | null
          expertise_level_id: string
          id: string
          speciality_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expertise_level_id: string
          id?: string
          speciality_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expertise_level_id?: string
          id?: string
          speciality_id?: string
          updated_at?: string | null
          updated_by?: string | null
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
      lifecycle_stages: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          locks_configuration: boolean | null
          locks_content: boolean | null
          locks_everything: boolean | null
          rank: number
          status_code: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          locks_configuration?: boolean | null
          locks_content?: boolean | null
          locks_everything?: boolean | null
          rank: number
          status_code: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          locks_configuration?: boolean | null
          locks_content?: boolean | null
          locks_everything?: boolean | null
          rank?: number
          status_code?: string
        }
        Relationships: []
      }
      master_complexity_params: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          param_key: string
          updated_at: string | null
          updated_by: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          param_key: string
          updated_at?: string | null
          updated_by?: string | null
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          param_key?: string
          updated_at?: string | null
          updated_by?: string | null
          weight?: number
        }
        Relationships: []
      }
      md_availability_statuses: {
        Row: {
          code: string
          color_class: string | null
          created_at: string
          created_by: string | null
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          color_class?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          color_class?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_billing_cycles: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_percentage: number
          display_order: number | null
          id: string
          is_active: boolean
          months: number
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_percentage?: number
          display_order?: number | null
          id?: string
          is_active?: boolean
          months: number
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_percentage?: number
          display_order?: number | null
          id?: string
          is_active?: boolean
          months?: number
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_blocked_email_domains: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string
          id: string
          is_active: boolean
          reason: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain: string
          id?: string
          is_active?: boolean
          reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_challenge_active_statuses: {
        Row: {
          blocks_model_switch: boolean
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          status_code: string
          status_label: string
        }
        Insert: {
          blocks_model_switch?: boolean
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          status_code: string
          status_label: string
        }
        Update: {
          blocks_model_switch?: boolean
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          status_code?: string
          status_label?: string
        }
        Relationships: []
      }
      md_challenge_base_fees: {
        Row: {
          consulting_base_fee: number
          country_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          engagement_model_id: string | null
          id: string
          is_active: boolean
          management_base_fee: number
          tier_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          consulting_base_fee: number
          country_id: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          engagement_model_id?: string | null
          id?: string
          is_active?: boolean
          management_base_fee: number
          tier_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          consulting_base_fee?: number
          country_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          engagement_model_id?: string | null
          id?: string
          is_active?: boolean
          management_base_fee?: number
          tier_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_challenge_base_fees_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_challenge_base_fees_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "md_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_challenge_base_fees_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      md_challenge_complexity: {
        Row: {
          complexity_code: string
          complexity_label: string
          complexity_level: number
          consulting_fee_multiplier: number
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          management_fee_multiplier: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          complexity_code: string
          complexity_label: string
          complexity_level: number
          consulting_fee_multiplier?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          management_fee_multiplier?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          complexity_code?: string
          complexity_label?: string
          complexity_level?: number
          consulting_fee_multiplier?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          management_fee_multiplier?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_company_sizes: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          size_range: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          size_range: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          size_range?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_country_subdivisions: {
        Row: {
          code: string | null
          country_id: string
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          subdivision_type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          country_id: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          subdivision_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          country_id?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          subdivision_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_country_subdivisions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      md_data_residency: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_departments: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_engagement_models: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_export_control_statuses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          requires_itar_compliance: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          requires_itar_compliance?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          requires_itar_compliance?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_functional_areas: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_functional_areas_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "md_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      md_governance_field_rules: {
        Row: {
          created_at: string
          created_by: string | null
          default_value: string | null
          display_order: number
          field_key: string
          governance_mode: string
          id: string
          is_active: boolean
          max_length: number | null
          min_length: number | null
          updated_at: string | null
          updated_by: string | null
          visibility: string
          wizard_step: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_value?: string | null
          display_order?: number
          field_key: string
          governance_mode: string
          id?: string
          is_active?: boolean
          max_length?: number | null
          min_length?: number | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string
          wizard_step: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_value?: string | null
          display_order?: number
          field_key?: string
          governance_mode?: string
          id?: string
          is_active?: boolean
          max_length?: number | null
          min_length?: number | null
          updated_at?: string | null
          updated_by?: string | null
          visibility?: string
          wizard_step?: number
        }
        Relationships: []
      }
      md_industries: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_languages: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          native_name: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          native_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          native_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_membership_tiers: {
        Row: {
          annual_fee_usd: number | null
          code: string
          commission_rate_pct: number
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          duration_months: number
          fee_discount_pct: number
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          annual_fee_usd?: number | null
          code: string
          commission_rate_pct?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          duration_months: number
          fee_discount_pct?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          annual_fee_usd?: number | null
          code?: string
          commission_rate_pct?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          duration_months?: number
          fee_discount_pct?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_mpa_config: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_critical: boolean
          label: string
          max_value: string | null
          min_value: string | null
          param_group: string
          param_key: string
          param_type: string
          param_value: string | null
          requires_restart: boolean
          unit: string | null
          updated_at: string | null
          updated_by: string | null
          updated_by_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean
          label?: string
          max_value?: string | null
          min_value?: string | null
          param_group?: string
          param_key: string
          param_type?: string
          param_value?: string | null
          requires_restart?: boolean
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
          updated_by_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_critical?: boolean
          label?: string
          max_value?: string | null
          min_value?: string | null
          param_group?: string
          param_key?: string
          param_type?: string
          param_value?: string | null
          requires_restart?: boolean
          unit?: string | null
          updated_at?: string | null
          updated_by?: string | null
          updated_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_mpa_config_updated_by_id_fkey"
            columns: ["updated_by_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      md_mpa_config_audit: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by_id: string
          id: string
          ip_address: string | null
          new_value: string
          param_key: string
          previous_value: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by_id: string
          id?: string
          ip_address?: string | null
          new_value: string
          param_key: string
          previous_value?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by_id?: string
          id?: string
          ip_address?: string | null
          new_value?: string
          param_key?: string
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_mpa_config_audit_changed_by_id_fkey"
            columns: ["changed_by_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      md_org_types: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_payment_methods_availability: {
        Row: {
          country_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          payment_method: Database["public"]["Enums"]["payment_method_type_enum"]
          tier_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          country_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          payment_method: Database["public"]["Enums"]["payment_method_type_enum"]
          tier_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method_type_enum"]
          tier_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_payment_methods_availability_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_payment_methods_availability_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      md_platform_fees: {
        Row: {
          country_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          description: string | null
          engagement_model_id: string
          id: string
          is_active: boolean
          platform_fee_pct: number
          tier_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          engagement_model_id: string
          id?: string
          is_active?: boolean
          platform_fee_pct: number
          tier_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          engagement_model_id?: string
          id?: string
          is_active?: boolean
          platform_fee_pct?: number
          tier_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_platform_fees_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_platform_fees_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "md_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_platform_fees_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      md_postal_formats: {
        Row: {
          country_id: string
          created_at: string
          created_by: string | null
          example: string | null
          format_regex: string | null
          id: string
          is_active: boolean
          label: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          country_id: string
          created_at?: string
          created_by?: string | null
          example?: string | null
          format_regex?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string
          created_by?: string | null
          example?: string | null
          format_regex?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_postal_formats_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: true
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      md_proficiency_levels: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_rbac_msme_config: {
        Row: {
          challenge_requestor_enabled: boolean
          enabled_at: string | null
          enabled_by: string | null
          is_enabled: boolean | null
          org_id: string
        }
        Insert: {
          challenge_requestor_enabled?: boolean
          enabled_at?: string | null
          enabled_by?: string | null
          is_enabled?: boolean | null
          org_id: string
        }
        Update: {
          challenge_requestor_enabled?: boolean
          enabled_at?: string | null
          enabled_by?: string | null
          is_enabled?: boolean | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "md_rbac_msme_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      md_role_assignment_statuses: {
        Row: {
          code: string
          color_class: string | null
          created_at: string
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean
          updated_at: string | null
        }
        Insert: {
          code: string
          color_class?: string | null
          created_at?: string
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Update: {
          code?: string
          color_class?: string | null
          created_at?: string
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      md_shadow_pricing: {
        Row: {
          country_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          currency_symbol: string
          description: string | null
          id: string
          is_active: boolean
          shadow_charge_per_challenge: number
          tier_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          currency_symbol?: string
          description?: string | null
          id?: string
          is_active?: boolean
          shadow_charge_per_challenge: number
          tier_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          currency_symbol?: string
          description?: string | null
          id?: string
          is_active?: boolean
          shadow_charge_per_challenge?: number
          tier_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_shadow_pricing_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_shadow_pricing_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      md_slm_role_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean
          is_core: boolean
          min_required: number
          model_applicability: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_core?: boolean
          min_required?: number
          model_applicability?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_core?: boolean
          min_required?: number
          model_applicability?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_solver_eligibility: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          default_enrollment: string | null
          default_submission: string | null
          default_visibility: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          label: string
          min_star_rating: number | null
          model_category: string | null
          requires_auth: boolean
          requires_certification: boolean
          requires_provider_record: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          default_enrollment?: string | null
          default_submission?: string | null
          default_visibility?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          min_star_rating?: number | null
          model_category?: string | null
          requires_auth?: boolean
          requires_certification?: boolean
          requires_provider_record?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          default_enrollment?: string | null
          default_submission?: string | null
          default_visibility?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          min_star_rating?: number | null
          model_category?: string | null
          requires_auth?: boolean
          requires_certification?: boolean
          requires_provider_record?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_states_provinces: {
        Row: {
          code: string
          country_id: string
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          country_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          country_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_states_provinces_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      md_subscription_tiers: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          is_enterprise: boolean
          max_challenges: number | null
          max_users: number | null
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_enterprise?: boolean
          max_challenges?: number | null
          max_users?: number | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          is_enterprise?: boolean
          max_challenges?: number | null
          max_users?: number | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_subsidized_pricing: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          discount_percentage: number
          id: string
          is_active: boolean
          max_duration_months: number | null
          org_type_rule_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean
          max_duration_months?: number | null
          org_type_rule_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean
          max_duration_months?: number | null
          org_type_rule_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_subsidized_pricing_org_type_rule_id_fkey"
            columns: ["org_type_rule_id"]
            isOneToOne: false
            referencedRelation: "org_type_seeker_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      md_system_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string
          created_by: string | null
          data_type: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string
          created_by?: string | null
          data_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string
          created_by?: string | null
          data_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      md_tax_formats: {
        Row: {
          country_id: string
          created_at: string
          created_by: string | null
          display_order: number | null
          example: string | null
          format_regex: string | null
          id: string
          is_active: boolean
          is_required: boolean
          tax_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          country_id: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          example?: string | null
          format_regex?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          tax_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          example?: string | null
          format_regex?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          tax_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_tax_formats_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      md_tier_country_pricing: {
        Row: {
          country_id: string
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          is_active: boolean
          local_price: number | null
          monthly_price_usd: number
          tier_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          country_id: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          is_active?: boolean
          local_price?: number | null
          monthly_price_usd: number
          tier_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          is_active?: boolean
          local_price?: number | null
          monthly_price_usd?: number
          tier_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_tier_country_pricing_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_tier_country_pricing_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      md_tier_engagement_access: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type_enum"]
          created_at: string
          created_by: string | null
          engagement_model_id: string
          id: string
          is_active: boolean
          tier_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["access_type_enum"]
          created_at?: string
          created_by?: string | null
          engagement_model_id: string
          id?: string
          is_active?: boolean
          tier_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          access_type?: Database["public"]["Enums"]["access_type_enum"]
          created_at?: string
          created_by?: string | null
          engagement_model_id?: string
          id?: string
          is_active?: boolean
          tier_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "md_tier_engagement_access_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "md_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "md_tier_engagement_access_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      md_tier_features: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type_enum"]
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          feature_code: string
          feature_name: string
          id: string
          is_active: boolean
          tier_id: string
          updated_at: string | null
          updated_by: string | null
          usage_limit: number | null
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["access_type_enum"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          feature_code: string
          feature_name: string
          id?: string
          is_active?: boolean
          tier_id: string
          updated_at?: string | null
          updated_by?: string | null
          usage_limit?: number | null
        }
        Update: {
          access_type?: Database["public"]["Enums"]["access_type_enum"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          feature_code?: string
          feature_name?: string
          id?: string
          is_active?: boolean
          tier_id?: string
          updated_at?: string | null
          updated_by?: string | null
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "md_tier_features_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      modification_points: {
        Row: {
          addressed_at: string | null
          addressed_by: string | null
          amendment_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          severity: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          addressed_at?: string | null
          addressed_by?: string | null
          amendment_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          severity: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          addressed_at?: string | null
          addressed_by?: string | null
          amendment_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          severity?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modification_points_amendment_id_fkey"
            columns: ["amendment_id"]
            isOneToOne: false
            referencedRelation: "amendment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_audit_log: {
        Row: {
          created_at: string
          email_error_message: string | null
          email_provider_id: string | null
          email_retry_count: number
          email_status: string
          id: string
          in_app_status: string
          last_retry_at: string | null
          notification_type: string
          recipient_email: string | null
          recipient_id: string | null
          recipient_name: string | null
          recipient_type: string
          sms_status: string | null
          status: string
          triggered_by: string | null
          updated_at: string
          verification_id: string | null
        }
        Insert: {
          created_at?: string
          email_error_message?: string | null
          email_provider_id?: string | null
          email_retry_count?: number
          email_status?: string
          id?: string
          in_app_status?: string
          last_retry_at?: string | null
          notification_type: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          sms_status?: string | null
          status?: string
          triggered_by?: string | null
          updated_at?: string
          verification_id?: string | null
        }
        Update: {
          created_at?: string
          email_error_message?: string | null
          email_provider_id?: string | null
          email_retry_count?: number
          email_status?: string
          id?: string
          in_app_status?: string
          last_retry_at?: string | null
          notification_type?: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          sms_status?: string | null
          status?: string
          triggered_by?: string | null
          updated_at?: string
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_audit_log_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_retry_queue: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string
          notification_audit_log_id: string
          notification_type: string
          recipient_email: string
          retry_count: number
          status: string
          updated_at: string | null
          verification_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          notification_audit_log_id: string
          notification_type: string
          recipient_email: string
          retry_count?: number
          status?: string
          updated_at?: string | null
          verification_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string
          notification_audit_log_id?: string
          notification_type?: string
          recipient_email?: string
          retry_count?: number
          status?: string
          updated_at?: string | null
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_retry_queue_notification_audit_log_id_fkey"
            columns: ["notification_audit_log_id"]
            isOneToOne: false
            referencedRelation: "notification_audit_log"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_routing: {
        Row: {
          cc_roles: string[]
          created_at: string
          created_by: string | null
          escalation_roles: string[]
          event_type: string
          id: string
          is_active: boolean
          phase: number
          primary_recipient_role: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          cc_roles?: string[]
          created_at?: string
          created_by?: string | null
          escalation_roles?: string[]
          event_type: string
          id?: string
          is_active?: boolean
          phase: number
          primary_recipient_role: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          cc_roles?: string[]
          created_at?: string
          created_by?: string | null
          escalation_roles?: string[]
          event_type?: string
          id?: string
          is_active?: boolean
          phase?: number
          primary_recipient_role?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      open_queue_entries: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          entered_at: string
          escalation_count: number
          fallback_reason: string | null
          id: string
          is_critical: boolean
          is_pinned: boolean
          last_escalated_at: string | null
          sla_deadline: string | null
          verification_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          entered_at?: string
          escalation_count?: number
          fallback_reason?: string | null
          id?: string
          is_critical?: boolean
          is_pinned?: boolean
          last_escalated_at?: string | null
          sla_deadline?: string | null
          verification_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          entered_at?: string
          escalation_count?: number
          fallback_reason?: string | null
          id?: string
          is_critical?: boolean
          is_pinned?: boolean
          last_escalated_at?: string | null
          sla_deadline?: string | null
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_queue_entries_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_admin_change_requests: {
        Row: {
          created_at: string
          created_by: string | null
          current_admin_user_id: string | null
          id: string
          lifecycle_status: string
          new_admin_email: string
          new_admin_name: string | null
          new_admin_phone: string | null
          new_admin_relationship_to_org: string | null
          new_admin_title: string | null
          organization_id: string
          platform_notes: string | null
          request_type: string
          requested_by: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_admin_user_id?: string | null
          id?: string
          lifecycle_status?: string
          new_admin_email: string
          new_admin_name?: string | null
          new_admin_phone?: string | null
          new_admin_relationship_to_org?: string | null
          new_admin_title?: string | null
          organization_id: string
          platform_notes?: string | null
          request_type: string
          requested_by?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_admin_user_id?: string | null
          id?: string
          lifecycle_status?: string
          new_admin_email?: string
          new_admin_name?: string | null
          new_admin_phone?: string | null
          new_admin_relationship_to_org?: string | null
          new_admin_title?: string | null
          organization_id?: string
          platform_notes?: string | null
          request_type?: string
          requested_by?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_admin_change_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_admin_change_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_roles: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_system_role: boolean
          name: string
          permissions: Json
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          name: string
          permissions?: Json
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          name?: string
          permissions?: Json
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_shadow_pricing: {
        Row: {
          country_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          currency_symbol: string
          description: string | null
          id: string
          is_active: boolean
          organization_id: string
          shadow_charge_per_challenge: number
          tenant_id: string
          tier_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          currency_symbol?: string
          description?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          shadow_charge_per_challenge?: number
          tenant_id: string
          tier_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          currency_symbol?: string
          description?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          shadow_charge_per_challenge?: number
          tenant_id?: string
          tier_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_shadow_pricing_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_shadow_pricing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_shadow_pricing_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      org_state_audit_log: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_status: string
          organization_id: string
          previous_status: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status: string
          organization_id: string
          previous_status: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string
          organization_id?: string
          previous_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_state_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_type_seeker_rules: {
        Row: {
          compliance_required: boolean
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean
          org_type_id: string
          startup_eligible: boolean
          subsidized_eligible: boolean
          tier_recommendation: string | null
          updated_at: string | null
          updated_by: string | null
          zero_fee_eligible: boolean
        }
        Insert: {
          compliance_required?: boolean
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          org_type_id: string
          startup_eligible?: boolean
          subsidized_eligible?: boolean
          tier_recommendation?: string | null
          updated_at?: string | null
          updated_by?: string | null
          zero_fee_eligible?: boolean
        }
        Update: {
          compliance_required?: boolean
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          org_type_id?: string
          startup_eligible?: boolean
          subsidized_eligible?: boolean
          tier_recommendation?: string | null
          updated_at?: string | null
          updated_by?: string | null
          zero_fee_eligible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "org_type_seeker_rules_org_type_id_fkey"
            columns: ["org_type_id"]
            isOneToOne: true
            referencedRelation: "organization_types"
            referencedColumns: ["id"]
          },
        ]
      }
      org_users: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invitation_status: string | null
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          joined_at: string
          org_role_id: string | null
          organization_id: string
          role: string
          subsidiary_org_id: string | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          org_role_id?: string | null
          organization_id: string
          role?: string
          subsidiary_org_id?: string | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          org_role_id?: string | null
          organization_id?: string
          role?: string
          subsidiary_org_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_users_org_role_id_fkey"
            columns: ["org_role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_users_subsidiary_org_id_fkey"
            columns: ["subsidiary_org_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_types: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      panel_reviewers: {
        Row: {
          approval_notes: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          created_by: string | null
          email: string
          enrollment_source: string | null
          expertise_level_ids: string[]
          id: string
          industry_segment_ids: string[]
          invitation_accepted_at: string | null
          invitation_channel: string | null
          invitation_message: string | null
          invitation_sent_at: string | null
          invitation_status: string | null
          invitation_token_expires_at: string | null
          invitation_token_hash: string | null
          is_active: boolean | null
          languages: Json | null
          max_interviews_per_day: number | null
          name: string
          notes: string | null
          phone: string | null
          timezone: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          why_join_statement: string | null
          years_experience: number | null
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          enrollment_source?: string | null
          expertise_level_ids?: string[]
          id?: string
          industry_segment_ids?: string[]
          invitation_accepted_at?: string | null
          invitation_channel?: string | null
          invitation_message?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string | null
          invitation_token_expires_at?: string | null
          invitation_token_hash?: string | null
          is_active?: boolean | null
          languages?: Json | null
          max_interviews_per_day?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          why_join_statement?: string | null
          years_experience?: number | null
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          enrollment_source?: string | null
          expertise_level_ids?: string[]
          id?: string
          industry_segment_ids?: string[]
          invitation_accepted_at?: string | null
          invitation_channel?: string | null
          invitation_message?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string | null
          invitation_token_expires_at?: string | null
          invitation_token_hash?: string | null
          is_active?: boolean | null
          languages?: Json | null
          max_interviews_per_day?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          why_join_statement?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      participation_modes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          requires_org_info: boolean
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          requires_org_info?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          requires_org_info?: boolean
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      pending_challenge_refs: {
        Row: {
          blocking_reason: string
          challenge_id: string
          created_at: string
          created_by: string | null
          engagement_model: string
          id: string
          is_resolved: boolean
          missing_role_codes: string[]
          org_id: string
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          blocking_reason?: string
          challenge_id: string
          created_at?: string
          created_by?: string | null
          engagement_model?: string
          id?: string
          is_resolved?: boolean
          missing_role_codes?: string[]
          org_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          blocking_reason?: string
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          engagement_model?: string
          id?: string
          is_resolved?: boolean
          missing_role_codes?: string[]
          org_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_challenge_refs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admin_profile_audit_log: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          admin_id: string
          created_at: string
          event_type: string
          field_changed: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          admin_id: string
          created_at?: string
          event_type: string
          field_changed?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          admin_id?: string
          created_at?: string
          event_type?: string
          field_changed?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_admin_profile_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admin_profiles: {
        Row: {
          admin_tier: string
          assignment_priority: number
          availability_status: string
          country_region_expertise: string[] | null
          created_at: string
          created_by: string | null
          current_active_verifications: number
          email: string
          full_name: string
          id: string
          industry_expertise: string[]
          is_supervisor: boolean
          last_assignment_timestamp: string | null
          leave_end_date: string | null
          leave_start_date: string | null
          max_concurrent_verifications: number
          org_type_expertise: string[] | null
          phone: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          admin_tier?: string
          assignment_priority?: number
          availability_status?: string
          country_region_expertise?: string[] | null
          created_at?: string
          created_by?: string | null
          current_active_verifications?: number
          email: string
          full_name: string
          id?: string
          industry_expertise?: string[]
          is_supervisor?: boolean
          last_assignment_timestamp?: string | null
          leave_end_date?: string | null
          leave_start_date?: string | null
          max_concurrent_verifications?: number
          org_type_expertise?: string[] | null
          phone: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          admin_tier?: string
          assignment_priority?: number
          availability_status?: string
          country_region_expertise?: string[] | null
          created_at?: string
          created_by?: string | null
          current_active_verifications?: number
          email?: string
          full_name?: string
          id?: string
          industry_expertise?: string[]
          is_supervisor?: boolean
          last_assignment_timestamp?: string | null
          leave_end_date?: string | null
          leave_start_date?: string | null
          max_concurrent_verifications?: number
          org_type_expertise?: string[] | null
          phone?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_admin_verifications: {
        Row: {
          assigned_admin_id: string | null
          assignment_method: string | null
          completed_at: string | null
          completed_by_admin_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          organization_id: string
          reassignment_count: number
          sla_breach_tier: string
          sla_breached: boolean
          sla_duration_seconds: number
          sla_paused_duration_hours: number
          sla_start_at: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          assignment_method?: string | null
          completed_at?: string | null
          completed_by_admin_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          organization_id: string
          reassignment_count?: number
          sla_breach_tier?: string
          sla_breached?: boolean
          sla_duration_seconds?: number
          sla_paused_duration_hours?: number
          sla_start_at?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          assignment_method?: string | null
          completed_at?: string | null
          completed_by_admin_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          organization_id?: string
          reassignment_count?: number
          sla_breach_tier?: string
          sla_breached?: boolean
          sla_duration_seconds?: number
          sla_paused_duration_hours?: number
          sla_start_at?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_admin_verifications_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admin_verifications_completed_by_admin_id_fkey"
            columns: ["completed_by_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admin_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_provider_pool: {
        Row: {
          availability_status: string
          created_at: string
          created_by: string | null
          current_assignments: number
          domain_scope: Json
          email: string
          full_name: string
          id: string
          is_active: boolean
          max_concurrent: number
          phone: string | null
          role_codes: string[]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          availability_status?: string
          created_at?: string
          created_by?: string | null
          current_assignments?: number
          domain_scope?: Json
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          max_concurrent?: number
          phone?: string | null
          role_codes?: string[]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          availability_status?: string
          created_at?: string
          created_by?: string | null
          current_assignments?: number
          domain_scope?: Json
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          max_concurrent?: number
          phone?: string | null
          role_codes?: string[]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          applicable_model: string
          created_at: string
          created_by: string | null
          is_active: boolean
          role_code: string
          role_description: string | null
          role_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          applicable_model: string
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          role_code: string
          role_description?: string | null
          role_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          applicable_model?: string
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          role_code?: string
          role_description?: string | null
          role_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_terms: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          is_active: boolean
          published_at: string | null
          published_by: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          is_active?: boolean
          published_at?: string | null
          published_by?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean
          published_at?: string | null
          published_by?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      proficiency_areas: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          expertise_level_id: string
          id: string
          industry_segment_id: string
          is_active: boolean
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          expertise_level_id: string
          id?: string
          industry_segment_id: string
          is_active?: boolean
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          expertise_level_id?: string
          id?: string
          industry_segment_id?: string
          is_active?: boolean
          name?: string
          updated_at?: string | null
          updated_by?: string | null
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
      proof_point_reviews: {
        Row: {
          created_at: string
          created_by: string | null
          evidence_strength: string | null
          id: string
          notes: string | null
          proof_point_id: string
          reviewed_at: string | null
          reviewer_id: string
          updated_at: string | null
          updated_by: string | null
          verification_status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evidence_strength?: string | null
          id?: string
          notes?: string | null
          proof_point_id: string
          reviewed_at?: string | null
          reviewer_id: string
          updated_at?: string | null
          updated_by?: string | null
          verification_status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evidence_strength?: string | null
          id?: string
          notes?: string | null
          proof_point_id?: string
          reviewed_at?: string | null
          reviewer_id?: string
          updated_at?: string | null
          updated_by?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_point_reviews_proof_point_id_fkey"
            columns: ["proof_point_id"]
            isOneToOne: false
            referencedRelation: "proof_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_point_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "panel_reviewers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_point_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "reviewer_workload_distribution"
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
          enrollment_id: string | null
          id: string
          industry_segment_id: string | null
          is_deleted: boolean
          provider_id: string
          review_comments: string | null
          review_relevance_rating: string | null
          review_score_rating: number | null
          reviewed_at: string | null
          reviewed_by: string | null
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
          enrollment_id?: string | null
          id?: string
          industry_segment_id?: string | null
          is_deleted?: boolean
          provider_id: string
          review_comments?: string | null
          review_relevance_rating?: string | null
          review_score_rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          enrollment_id?: string | null
          id?: string
          industry_segment_id?: string | null
          is_deleted?: boolean
          provider_id?: string
          review_comments?: string | null
          review_relevance_rating?: string | null
          review_score_rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          title?: string
          type?: Database["public"]["Enums"]["proof_point_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_points_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "provider_industry_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_points_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_points_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_industry_enrollments: {
        Row: {
          certification_level: string | null
          certified_at: string | null
          certified_by: string | null
          composite_score: number | null
          created_at: string
          created_by: string | null
          expertise_flag_for_clarification: string | null
          expertise_level_id: string | null
          expertise_review_status: string | null
          expertise_reviewed_at: string | null
          expertise_reviewed_by: string | null
          expertise_reviewer_notes: string | null
          id: string
          industry_segment_id: string
          interview_attempt_count: number
          is_primary: boolean
          last_certified_at: string | null
          last_interview_failed_at: string | null
          lifecycle_rank: number
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          org_approval_status: string | null
          organization: Json | null
          participation_mode_id: string | null
          previous_expertise_level_id: string | null
          proof_points_final_score: number | null
          proof_points_review_status: string | null
          proof_points_reviewed_at: string | null
          proof_points_reviewed_by: string | null
          proof_points_reviewer_notes: string | null
          provider_id: string
          reattempt_eligible_after: string | null
          star_rating: number | null
          updated_at: string | null
          updated_by: string | null
          upgrade_attempt_count: number | null
        }
        Insert: {
          certification_level?: string | null
          certified_at?: string | null
          certified_by?: string | null
          composite_score?: number | null
          created_at?: string
          created_by?: string | null
          expertise_flag_for_clarification?: string | null
          expertise_level_id?: string | null
          expertise_review_status?: string | null
          expertise_reviewed_at?: string | null
          expertise_reviewed_by?: string | null
          expertise_reviewer_notes?: string | null
          id?: string
          industry_segment_id: string
          interview_attempt_count?: number
          is_primary?: boolean
          last_certified_at?: string | null
          last_interview_failed_at?: string | null
          lifecycle_rank?: number
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          org_approval_status?: string | null
          organization?: Json | null
          participation_mode_id?: string | null
          previous_expertise_level_id?: string | null
          proof_points_final_score?: number | null
          proof_points_review_status?: string | null
          proof_points_reviewed_at?: string | null
          proof_points_reviewed_by?: string | null
          proof_points_reviewer_notes?: string | null
          provider_id: string
          reattempt_eligible_after?: string | null
          star_rating?: number | null
          updated_at?: string | null
          updated_by?: string | null
          upgrade_attempt_count?: number | null
        }
        Update: {
          certification_level?: string | null
          certified_at?: string | null
          certified_by?: string | null
          composite_score?: number | null
          created_at?: string
          created_by?: string | null
          expertise_flag_for_clarification?: string | null
          expertise_level_id?: string | null
          expertise_review_status?: string | null
          expertise_reviewed_at?: string | null
          expertise_reviewed_by?: string | null
          expertise_reviewer_notes?: string | null
          id?: string
          industry_segment_id?: string
          interview_attempt_count?: number
          is_primary?: boolean
          last_certified_at?: string | null
          last_interview_failed_at?: string | null
          lifecycle_rank?: number
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          org_approval_status?: string | null
          organization?: Json | null
          participation_mode_id?: string | null
          previous_expertise_level_id?: string | null
          proof_points_final_score?: number | null
          proof_points_review_status?: string | null
          proof_points_reviewed_at?: string | null
          proof_points_reviewed_by?: string | null
          proof_points_reviewer_notes?: string | null
          provider_id?: string
          reattempt_eligible_after?: string | null
          star_rating?: number | null
          updated_at?: string | null
          updated_by?: string | null
          upgrade_attempt_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_industry_enrollments_expertise_level_id_fkey"
            columns: ["expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_industry_enrollments_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_industry_enrollments_participation_mode_id_fkey"
            columns: ["participation_mode_id"]
            isOneToOne: false
            referencedRelation: "participation_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_industry_enrollments_previous_expertise_level_id_fkey"
            columns: ["previous_expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_industry_enrollments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          enrollment_id: string | null
          id: string
          is_immutable: boolean | null
          is_read: boolean | null
          is_system_generated: boolean | null
          message: string
          notification_type: string
          provider_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enrollment_id?: string | null
          id?: string
          is_immutable?: boolean | null
          is_read?: boolean | null
          is_system_generated?: boolean | null
          message: string
          notification_type: string
          provider_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enrollment_id?: string | null
          id?: string
          is_immutable?: boolean | null
          is_read?: boolean | null
          is_system_generated?: boolean | null
          message?: string
          notification_type?: string
          provider_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_notifications_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "provider_industry_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_notifications_provider_id_fkey"
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
          enrollment_id: string | null
          id: string
          proficiency_area_id: string
          provider_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enrollment_id?: string | null
          id?: string
          proficiency_area_id: string
          provider_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enrollment_id?: string | null
          id?: string
          proficiency_area_id?: string
          provider_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_proficiency_areas_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "provider_industry_enrollments"
            referencedColumns: ["id"]
          },
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
          enrollment_id: string | null
          id: string
          provider_id: string
          speciality_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id?: string | null
          id?: string
          provider_id: string
          speciality_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string | null
          id?: string
          provider_id?: string
          speciality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_specialities_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "provider_industry_enrollments"
            referencedColumns: ["id"]
          },
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
      pulse_card_engagements: {
        Row: {
          card_id: string
          created_at: string | null
          deleted_at: string | null
          engagement_type: Database["public"]["Enums"]["pulse_engagement_type"]
          id: string
          is_deleted: boolean | null
          provider_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          deleted_at?: string | null
          engagement_type: Database["public"]["Enums"]["pulse_engagement_type"]
          id?: string
          is_deleted?: boolean | null
          provider_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          deleted_at?: string | null
          engagement_type?: Database["public"]["Enums"]["pulse_engagement_type"]
          id?: string
          is_deleted?: boolean | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_card_engagements_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pulse_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_card_engagements_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_card_flags: {
        Row: {
          created_at: string | null
          description: string | null
          flag_type: string
          id: string
          reporter_id: string
          resolution_reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          flag_type: string
          id?: string
          reporter_id: string
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          flag_type?: string
          id?: string
          reporter_id?: string
          resolution_reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_card_flags_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_card_layers: {
        Row: {
          card_id: string
          content_text: string
          created_at: string | null
          created_by: string | null
          creator_id: string
          featured_at: string | null
          id: string
          is_featured: boolean | null
          layer_order: number | null
          media_type: string | null
          media_url: string | null
          parent_layer_id: string | null
          status: string
          updated_at: string | null
          updated_by: string | null
          vote_score: number | null
          votes_down: number | null
          votes_up: number | null
          voting_ends_at: string | null
        }
        Insert: {
          card_id: string
          content_text: string
          created_at?: string | null
          created_by?: string | null
          creator_id: string
          featured_at?: string | null
          id?: string
          is_featured?: boolean | null
          layer_order?: number | null
          media_type?: string | null
          media_url?: string | null
          parent_layer_id?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          vote_score?: number | null
          votes_down?: number | null
          votes_up?: number | null
          voting_ends_at?: string | null
        }
        Update: {
          card_id?: string
          content_text?: string
          created_at?: string | null
          created_by?: string | null
          creator_id?: string
          featured_at?: string | null
          id?: string
          is_featured?: boolean | null
          layer_order?: number | null
          media_type?: string | null
          media_url?: string | null
          parent_layer_id?: string | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          vote_score?: number | null
          votes_down?: number | null
          votes_up?: number | null
          voting_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_card_layers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "pulse_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_card_layers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_card_layers_parent_layer_id_fkey"
            columns: ["parent_layer_id"]
            isOneToOne: false
            referencedRelation: "pulse_card_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_card_topics: {
        Row: {
          card_count: number | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          industry_segment_id: string | null
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          card_count?: number | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          industry_segment_id?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          card_count?: number | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          industry_segment_id?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_card_topics_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_card_votes: {
        Row: {
          created_at: string | null
          id: string
          layer_id: string
          vote_type: string
          vote_weight: number | null
          voter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          layer_id: string
          vote_type: string
          vote_weight?: number | null
          voter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          layer_id?: string
          vote_type?: string
          vote_weight?: number | null
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_card_votes_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "pulse_card_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_card_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_cards: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          build_count: number | null
          comment_count: number | null
          compilation_stale: boolean
          compiled_at: string | null
          compiled_narrative: string | null
          created_at: string | null
          created_by: string | null
          current_featured_layer_id: string | null
          fire_count: number | null
          gold_count: number | null
          id: string
          save_count: number | null
          seed_creator_id: string
          share_count: number | null
          status: string
          topic_id: string
          updated_at: string | null
          updated_by: string | null
          view_count: number | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          build_count?: number | null
          comment_count?: number | null
          compilation_stale?: boolean
          compiled_at?: string | null
          compiled_narrative?: string | null
          created_at?: string | null
          created_by?: string | null
          current_featured_layer_id?: string | null
          fire_count?: number | null
          gold_count?: number | null
          id?: string
          save_count?: number | null
          seed_creator_id: string
          share_count?: number | null
          status?: string
          topic_id: string
          updated_at?: string | null
          updated_by?: string | null
          view_count?: number | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          build_count?: number | null
          comment_count?: number | null
          compilation_stale?: boolean
          compiled_at?: string | null
          compiled_narrative?: string | null
          created_at?: string | null
          created_by?: string | null
          current_featured_layer_id?: string | null
          fire_count?: number | null
          gold_count?: number | null
          id?: string
          save_count?: number | null
          seed_creator_id?: string
          share_count?: number | null
          status?: string
          topic_id?: string
          updated_at?: string | null
          updated_by?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pulse_cards_featured_layer"
            columns: ["current_featured_layer_id"]
            isOneToOne: false
            referencedRelation: "pulse_card_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_cards_seed_creator_id_fkey"
            columns: ["seed_creator_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_cards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "pulse_card_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_cards_reputation_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          points_delta: number
          provider_id: string
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          points_delta: number
          provider_id: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          points_delta?: number
          provider_id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_cards_reputation_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_comments: {
        Row: {
          comment_text: string
          content_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          parent_comment_id: string | null
          provider_id: string
          updated_at: string | null
        }
        Insert: {
          comment_text: string
          content_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          provider_id: string
          updated_at?: string | null
        }
        Update: {
          comment_text?: string
          content_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          provider_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "pulse_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "pulse_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_comments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_connections: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_connections_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_connections_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_content: {
        Row: {
          ai_enhanced: boolean
          body_text: string | null
          caption: string | null
          comment_count: number
          content_status: Database["public"]["Enums"]["pulse_content_status"]
          content_type: Database["public"]["Enums"]["pulse_content_type"]
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          duration_seconds: number | null
          enrollment_id: string | null
          fire_count: number
          gold_count: number
          headline: string | null
          id: string
          industry_segment_id: string | null
          is_deleted: boolean
          is_published: boolean | null
          key_insight: string | null
          media_urls: Json
          original_caption: string | null
          provider_id: string
          save_count: number
          scheduled_publish_at: string | null
          secondary_industry_ids: string[]
          title: string | null
          updated_at: string | null
          updated_by: string | null
          visibility_boost_expires_at: string | null
          visibility_boost_multiplier: number
        }
        Insert: {
          ai_enhanced?: boolean
          body_text?: string | null
          caption?: string | null
          comment_count?: number
          content_status?: Database["public"]["Enums"]["pulse_content_status"]
          content_type: Database["public"]["Enums"]["pulse_content_type"]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_seconds?: number | null
          enrollment_id?: string | null
          fire_count?: number
          gold_count?: number
          headline?: string | null
          id?: string
          industry_segment_id?: string | null
          is_deleted?: boolean
          is_published?: boolean | null
          key_insight?: string | null
          media_urls?: Json
          original_caption?: string | null
          provider_id: string
          save_count?: number
          scheduled_publish_at?: string | null
          secondary_industry_ids?: string[]
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility_boost_expires_at?: string | null
          visibility_boost_multiplier?: number
        }
        Update: {
          ai_enhanced?: boolean
          body_text?: string | null
          caption?: string | null
          comment_count?: number
          content_status?: Database["public"]["Enums"]["pulse_content_status"]
          content_type?: Database["public"]["Enums"]["pulse_content_type"]
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          duration_seconds?: number | null
          enrollment_id?: string | null
          fire_count?: number
          gold_count?: number
          headline?: string | null
          id?: string
          industry_segment_id?: string | null
          is_deleted?: boolean
          is_published?: boolean | null
          key_insight?: string | null
          media_urls?: Json
          original_caption?: string | null
          provider_id?: string
          save_count?: number
          scheduled_publish_at?: string | null
          secondary_industry_ids?: string[]
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          visibility_boost_expires_at?: string | null
          visibility_boost_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_content_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "provider_industry_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_content_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_content_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_content_impressions: {
        Row: {
          content_id: string
          created_at: string
          id: string
          impression_type: string
          viewer_id: string | null
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          impression_type?: string
          viewer_id?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          impression_type?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_content_impressions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "pulse_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_content_impressions_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_content_reports: {
        Row: {
          action_taken: string | null
          content_id: string
          created_at: string
          description: string | null
          id: string
          report_type: Database["public"]["Enums"]["pulse_report_type"]
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["pulse_report_status"]
        }
        Insert: {
          action_taken?: string | null
          content_id: string
          created_at?: string
          description?: string | null
          id?: string
          report_type: Database["public"]["Enums"]["pulse_report_type"]
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["pulse_report_status"]
        }
        Update: {
          action_taken?: string | null
          content_id?: string
          created_at?: string
          description?: string | null
          id?: string
          report_type?: Database["public"]["Enums"]["pulse_report_type"]
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["pulse_report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pulse_content_reports_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "pulse_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_content_tags: {
        Row: {
          content_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_content_tags_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "pulse_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_content_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "pulse_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_daily_standups: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          provider_id: string
          standup_date: string
          updates_viewed: number
          visibility_boost_earned: boolean
          window_start: string | null
          xp_awarded: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          provider_id: string
          standup_date: string
          updates_viewed?: number
          visibility_boost_earned?: boolean
          window_start?: string | null
          xp_awarded?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          standup_date?: string
          updates_viewed?: number
          visibility_boost_earned?: boolean
          window_start?: string | null
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_daily_standups_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_engagements: {
        Row: {
          content_id: string
          created_at: string
          deleted_at: string | null
          engagement_type: Database["public"]["Enums"]["pulse_engagement_type"]
          id: string
          is_deleted: boolean
          provider_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          deleted_at?: string | null
          engagement_type: Database["public"]["Enums"]["pulse_engagement_type"]
          id?: string
          is_deleted?: boolean
          provider_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          deleted_at?: string | null
          engagement_type?: Database["public"]["Enums"]["pulse_engagement_type"]
          id?: string
          is_deleted?: boolean
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_engagements_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "pulse_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_engagements_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_loot_boxes: {
        Row: {
          available_at: string
          claim_date: string
          created_at: string
          expires_at: string
          id: string
          opened_at: string | null
          provider_id: string
          rewards: Json
          streak_at_claim: number
          streak_multiplier: number
        }
        Insert: {
          available_at: string
          claim_date: string
          created_at?: string
          expires_at: string
          id?: string
          opened_at?: string | null
          provider_id: string
          rewards?: Json
          streak_at_claim?: number
          streak_multiplier?: number
        }
        Update: {
          available_at?: string
          claim_date?: string
          created_at?: string
          expires_at?: string
          id?: string
          opened_at?: string | null
          provider_id?: string
          rewards?: Json
          streak_at_claim?: number
          streak_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_loot_boxes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_moderation_actions: {
        Row: {
          action_type: string
          council_votes: Json | null
          created_at: string | null
          created_by: string | null
          flag_id: string | null
          id: string
          outcome: string
          reasoning: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          council_votes?: Json | null
          created_at?: string | null
          created_by?: string | null
          flag_id?: string | null
          id?: string
          outcome: string
          reasoning: string
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          council_votes?: Json | null
          created_at?: string | null
          created_by?: string | null
          flag_id?: string | null
          id?: string
          outcome?: string
          reasoning?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_moderation_actions_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "pulse_card_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          is_read: boolean
          notification_type: Database["public"]["Enums"]["pulse_notification_type"]
          provider_id: string
          read_at: string | null
          related_content_id: string | null
          related_provider_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          notification_type: Database["public"]["Enums"]["pulse_notification_type"]
          provider_id: string
          read_at?: string | null
          related_content_id?: string | null
          related_provider_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          notification_type?: Database["public"]["Enums"]["pulse_notification_type"]
          provider_id?: string
          read_at?: string | null
          related_content_id?: string | null
          related_provider_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_notifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_notifications_related_content_id_fkey"
            columns: ["related_content_id"]
            isOneToOne: false
            referencedRelation: "pulse_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_notifications_related_provider_id_fkey"
            columns: ["related_provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_provider_stats: {
        Row: {
          created_at: string
          current_level: number
          current_streak: number
          follower_count: number
          following_count: number
          gold_token_balance: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          provider_id: string
          pulse_headline: string | null
          timezone: string
          total_articles: number
          total_card_fire_received: number | null
          total_card_gold_received: number | null
          total_card_saves_received: number | null
          total_cards: number | null
          total_comments_received: number
          total_contributions: number
          total_fire_received: number
          total_galleries: number
          total_gold_received: number
          total_layers: number | null
          total_podcasts: number
          total_posts: number
          total_reels: number
          total_saves_received: number
          total_sparks: number
          total_xp: number
          updated_at: string | null
          visibility_boost_tokens: number
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_streak?: number
          follower_count?: number
          following_count?: number
          gold_token_balance?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          provider_id: string
          pulse_headline?: string | null
          timezone?: string
          total_articles?: number
          total_card_fire_received?: number | null
          total_card_gold_received?: number | null
          total_card_saves_received?: number | null
          total_cards?: number | null
          total_comments_received?: number
          total_contributions?: number
          total_fire_received?: number
          total_galleries?: number
          total_gold_received?: number
          total_layers?: number | null
          total_podcasts?: number
          total_posts?: number
          total_reels?: number
          total_saves_received?: number
          total_sparks?: number
          total_xp?: number
          updated_at?: string | null
          visibility_boost_tokens?: number
        }
        Update: {
          created_at?: string
          current_level?: number
          current_streak?: number
          follower_count?: number
          following_count?: number
          gold_token_balance?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          provider_id?: string
          pulse_headline?: string | null
          timezone?: string
          total_articles?: number
          total_card_fire_received?: number | null
          total_card_gold_received?: number | null
          total_card_saves_received?: number | null
          total_cards?: number | null
          total_comments_received?: number
          total_contributions?: number
          total_fire_received?: number
          total_galleries?: number
          total_gold_received?: number
          total_layers?: number | null
          total_podcasts?: number
          total_posts?: number
          total_reels?: number
          total_saves_received?: number
          total_sparks?: number
          total_xp?: number
          updated_at?: string | null
          visibility_boost_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_provider_stats_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_skills: {
        Row: {
          created_at: string
          current_level: number
          current_xp: number
          expertise_level_id: string | null
          id: string
          industry_segment_id: string
          is_verified: boolean
          provider_id: string
          skill_name: string
          updated_at: string | null
          verification_enrollment_id: string | null
          verification_source:
            | Database["public"]["Enums"]["pulse_verification_source"]
            | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_xp?: number
          expertise_level_id?: string | null
          id?: string
          industry_segment_id: string
          is_verified?: boolean
          provider_id: string
          skill_name: string
          updated_at?: string | null
          verification_enrollment_id?: string | null
          verification_source?:
            | Database["public"]["Enums"]["pulse_verification_source"]
            | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          current_level?: number
          current_xp?: number
          expertise_level_id?: string | null
          id?: string
          industry_segment_id?: string
          is_verified?: boolean
          provider_id?: string
          skill_name?: string
          updated_at?: string | null
          verification_enrollment_id?: string | null
          verification_source?:
            | Database["public"]["Enums"]["pulse_verification_source"]
            | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_skills_expertise_level_id_fkey"
            columns: ["expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_skills_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_skills_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_skills_verification_enrollment_id_fkey"
            columns: ["verification_enrollment_id"]
            isOneToOne: false
            referencedRelation: "provider_industry_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_tags: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          updated_at: string | null
          usage_count: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          updated_at?: string | null
          usage_count?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          updated_at?: string | null
          usage_count?: number
        }
        Relationships: []
      }
      pulse_trust_council: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          provider_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_trust_council_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_xp_audit_log: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          id: string
          new_total: number
          notes: string | null
          previous_total: number
          provider_id: string
          reference_id: string | null
          reference_type: string | null
          xp_change: number
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_total: number
          notes?: string | null
          previous_total: number
          provider_id: string
          reference_id?: string | null
          reference_type?: string | null
          xp_change: number
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_total?: number
          notes?: string | null
          previous_total?: number
          provider_id?: string
          reference_id?: string | null
          reference_type?: string | null
          xp_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_xp_audit_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_xp_snapshots: {
        Row: {
          created_at: string
          current_level_at_date: number
          follower_count_at_date: number
          id: string
          provider_id: string
          snapshot_date: string
          snapshot_type: string
          total_xp_at_date: number
        }
        Insert: {
          created_at?: string
          current_level_at_date?: number
          follower_count_at_date?: number
          id?: string
          provider_id: string
          snapshot_date: string
          snapshot_type?: string
          total_xp_at_date?: number
        }
        Update: {
          created_at?: string
          current_level_at_date?: number
          follower_count_at_date?: number
          id?: string
          provider_id?: string
          snapshot_date?: string
          snapshot_type?: string
          total_xp_at_date?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulse_xp_snapshots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
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
      rating_records: {
        Row: {
          challenge_id: string
          created_at: string
          created_by: string | null
          feedback_text: string | null
          id: string
          ratee_id: string
          rater_id: string
          rating: number
          submitted_at: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          created_by?: string | null
          feedback_text?: string | null
          id?: string
          ratee_id: string
          rater_id: string
          rating: number
          submitted_at?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          feedback_text?: string | null
          id?: string
          ratee_id?: string
          rater_id?: string
          rating?: number
          submitted_at?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rating_records_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_admin_contact: {
        Row: {
          email: string
          id: string
          name: string
          phone_intl: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          email: string
          id?: string
          name: string
          phone_intl?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          email?: string
          id?: string
          name?: string
          phone_intl?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      reassignment_requests: {
        Row: {
          actioned_at: string | null
          actioned_by_id: string | null
          created_at: string
          decline_reason: string | null
          id: string
          reason: string
          requesting_admin_id: string
          status: string
          suggested_admin_id: string | null
          verification_id: string
        }
        Insert: {
          actioned_at?: string | null
          actioned_by_id?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          reason: string
          requesting_admin_id: string
          status?: string
          suggested_admin_id?: string | null
          verification_id: string
        }
        Update: {
          actioned_at?: string | null
          actioned_by_id?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          reason?: string
          requesting_admin_id?: string
          status?: string
          suggested_admin_id?: string | null
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reassignment_requests_actioned_by_id_fkey"
            columns: ["actioned_by_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reassignment_requests_requesting_admin_id_fkey"
            columns: ["requesting_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reassignment_requests_suggested_admin_id_fkey"
            columns: ["suggested_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reassignment_requests_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      registrant_communications: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          direction: string
          email_retry_count: number
          email_status: string
          id: string
          last_retry_at: string | null
          message_type: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          sent_by_admin_id: string | null
          subject: string
          verification_id: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          direction?: string
          email_retry_count?: number
          email_status?: string
          id?: string
          last_retry_at?: string | null
          message_type?: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          sent_by_admin_id?: string | null
          subject: string
          verification_id: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          direction?: string
          email_retry_count?: number
          email_status?: string
          id?: string
          last_retry_at?: string | null
          message_type?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          sent_by_admin_id?: string | null
          subject?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrant_communications_sent_by_admin_id_fkey"
            columns: ["sent_by_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrant_communications_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_payments: {
        Row: {
          created_at: string
          created_by: string | null
          currency_code: string
          failure_reason: string | null
          gateway_reference: string | null
          id: string
          organization_id: string
          payment_amount: number
          payment_attempts: number
          payment_method: string
          payment_timestamp: string
          status: string
          tenant_id: string
          transaction_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency_code?: string
          failure_reason?: string | null
          gateway_reference?: string | null
          id?: string
          organization_id: string
          payment_amount?: number
          payment_attempts?: number
          payment_method?: string
          payment_timestamp?: string
          status?: string
          tenant_id: string
          transaction_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency_code?: string
          failure_reason?: string | null
          gateway_reference?: string | null
          id?: string
          organization_id?: string
          payment_amount?: number
          payment_attempts?: number
          payment_method?: string
          payment_timestamp?: string
          status?: string
          tenant_id?: string
          transaction_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments: {
        Row: {
          acceptance_token: string | null
          activated_at: string | null
          created_at: string
          created_by: string | null
          decline_reason: string | null
          declined_at: string | null
          department_id: string | null
          domain_tags: Json | null
          expires_at: string | null
          id: string
          invited_at: string | null
          model_applicability: string
          org_id: string
          role_code: string
          status: string
          updated_at: string | null
          updated_by: string | null
          user_email: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          acceptance_token?: string | null
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          department_id?: string | null
          domain_tags?: Json | null
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          model_applicability?: string
          org_id: string
          role_code: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          user_email: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          acceptance_token?: string | null
          activated_at?: string | null
          created_at?: string
          created_by?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          department_id?: string | null
          domain_tags?: Json | null
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          model_applicability?: string
          org_id?: string
          role_code?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "md_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          org_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
        }
        Relationships: []
      }
      role_authority_matrix: {
        Row: {
          created_at: string
          description: string | null
          from_status: string
          id: string
          phase: number
          required_role: string
          to_status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          from_status: string
          id?: string
          phase: number
          required_role: string
          to_status: string
        }
        Update: {
          created_at?: string
          description?: string | null
          from_status?: string
          id?: string
          phase?: number
          required_role?: string
          to_status?: string
        }
        Relationships: []
      }
      role_conflict_rules: {
        Row: {
          applies_scope: string
          conflict_type: string
          created_at: string
          created_by: string | null
          governance_profile: string
          is_active: boolean
          role_a: string
          role_b: string
          rule_id: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          applies_scope: string
          conflict_type: string
          created_at?: string
          created_by?: string | null
          governance_profile: string
          is_active?: boolean
          role_a: string
          role_b: string
          rule_id?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          applies_scope?: string
          conflict_type?: string
          created_at?: string
          created_by?: string | null
          governance_profile?: string
          is_active?: boolean
          role_a?: string
          role_b?: string
          rule_id?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_conflict_rules_role_a_fkey"
            columns: ["role_a"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["role_code"]
          },
          {
            foreignKeyName: "role_conflict_rules_role_b_fkey"
            columns: ["role_b"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["role_code"]
          },
        ]
      }
      role_readiness_cache: {
        Row: {
          created_at: string
          engagement_model: string
          id: string
          last_computed_at: string | null
          missing_roles: string[] | null
          org_id: string
          overall_status: string
          responsible_admin_contact: Json | null
          total_filled: number | null
          total_required: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          engagement_model: string
          id?: string
          last_computed_at?: string | null
          missing_roles?: string[] | null
          org_id: string
          overall_status?: string
          responsible_admin_contact?: Json | null
          total_filled?: number | null
          total_required?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          engagement_model?: string
          id?: string
          last_computed_at?: string | null
          missing_roles?: string[] | null
          org_id?: string
          overall_status?: string
          responsible_admin_contact?: Json | null
          total_filled?: number | null
          total_required?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_readiness_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_agreements: {
        Row: {
          agreement_type: string
          auto_renew: boolean
          base_platform_fee: number | null
          billing_frequency: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          child_organization_id: string | null
          created_at: string
          created_by: string | null
          custom_fee_1_amount: number | null
          custom_fee_1_label: string | null
          custom_fee_2_amount: number | null
          custom_fee_2_label: string | null
          department_id: string | null
          ends_at: string | null
          fee_amount: number
          fee_currency: string
          fee_frequency: string
          functional_area_id: string | null
          id: string
          lifecycle_status: string
          msa_document_url: string | null
          msa_reference_number: string | null
          notes: string | null
          parent_organization_id: string
          per_department_fee: number | null
          shadow_charge_rate: number | null
          starts_at: string
          support_tier_fee: number | null
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          agreement_type?: string
          auto_renew?: boolean
          base_platform_fee?: number | null
          billing_frequency?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          child_organization_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fee_1_amount?: number | null
          custom_fee_1_label?: string | null
          custom_fee_2_amount?: number | null
          custom_fee_2_label?: string | null
          department_id?: string | null
          ends_at?: string | null
          fee_amount?: number
          fee_currency?: string
          fee_frequency?: string
          functional_area_id?: string | null
          id?: string
          lifecycle_status?: string
          msa_document_url?: string | null
          msa_reference_number?: string | null
          notes?: string | null
          parent_organization_id: string
          per_department_fee?: number | null
          shadow_charge_rate?: number | null
          starts_at?: string
          support_tier_fee?: number | null
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          agreement_type?: string
          auto_renew?: boolean
          base_platform_fee?: number | null
          billing_frequency?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          child_organization_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_fee_1_amount?: number | null
          custom_fee_1_label?: string | null
          custom_fee_2_amount?: number | null
          custom_fee_2_label?: string | null
          department_id?: string | null
          ends_at?: string | null
          fee_amount?: number
          fee_currency?: string
          fee_frequency?: string
          functional_area_id?: string | null
          id?: string
          lifecycle_status?: string
          msa_document_url?: string | null
          msa_reference_number?: string | null
          notes?: string | null
          parent_organization_id?: string
          per_department_fee?: number | null
          shadow_charge_rate?: number | null
          starts_at?: string
          support_tier_fee?: number | null
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_agreements_child_organization_id_fkey"
            columns: ["child_organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_agreements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "md_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_agreements_functional_area_id_fkey"
            columns: ["functional_area_id"]
            isOneToOne: false
            referencedRelation: "md_functional_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_agreements_parent_organization_id_fkey"
            columns: ["parent_organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_billing_info: {
        Row: {
          bank_name: string | null
          bank_transaction_id: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country_id: string | null
          billing_cycle_id: string | null
          billing_email: string | null
          billing_entity_name: string | null
          billing_postal_code: string | null
          billing_rejection_reason: string | null
          billing_state_province_id: string | null
          billing_verification_notes: string | null
          billing_verification_status: string
          billing_verified_at: string | null
          billing_verified_by: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          payment_method:
            | Database["public"]["Enums"]["payment_method_type_enum"]
            | null
          payment_received_date: string | null
          payment_reference: string | null
          po_number: string | null
          tax_id: string | null
          tax_id_verified: boolean
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          bank_name?: string | null
          bank_transaction_id?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country_id?: string | null
          billing_cycle_id?: string | null
          billing_email?: string | null
          billing_entity_name?: string | null
          billing_postal_code?: string | null
          billing_rejection_reason?: string | null
          billing_state_province_id?: string | null
          billing_verification_notes?: string | null
          billing_verification_status?: string
          billing_verified_at?: string | null
          billing_verified_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type_enum"]
            | null
          payment_received_date?: string | null
          payment_reference?: string | null
          po_number?: string | null
          tax_id?: string | null
          tax_id_verified?: boolean
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          bank_name?: string | null
          bank_transaction_id?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country_id?: string | null
          billing_cycle_id?: string | null
          billing_email?: string | null
          billing_entity_name?: string | null
          billing_postal_code?: string | null
          billing_rejection_reason?: string | null
          billing_state_province_id?: string | null
          billing_verification_notes?: string | null
          billing_verification_status?: string
          billing_verified_at?: string | null
          billing_verified_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type_enum"]
            | null
          payment_received_date?: string | null
          payment_reference?: string | null
          po_number?: string | null
          tax_id?: string | null
          tax_id_verified?: boolean
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_billing_info_billing_country_id_fkey"
            columns: ["billing_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_billing_info_billing_cycle_id_fkey"
            columns: ["billing_cycle_id"]
            isOneToOne: false
            referencedRelation: "md_billing_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_billing_info_billing_state_province_id_fkey"
            columns: ["billing_state_province_id"]
            isOneToOne: false
            referencedRelation: "md_states_provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_billing_info_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_billing_info_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_challenge_topups: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          created_by: string | null
          currency_code: string
          id: string
          organization_id: string
          payment_status: string
          per_challenge_fee: number
          quantity: number
          stripe_payment_intent_id: string | null
          tenant_id: string
          total_amount: number
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          id?: string
          organization_id: string
          payment_status?: string
          per_challenge_fee: number
          quantity: number
          stripe_payment_intent_id?: string | null
          tenant_id: string
          total_amount: number
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          id?: string
          organization_id?: string
          payment_status?: string
          per_challenge_fee?: number
          quantity?: number
          stripe_payment_intent_id?: string | null
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "seeker_challenge_topups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_compliance: {
        Row: {
          additional_certifications: Json | null
          compliance_notes: string | null
          created_at: string
          created_by: string | null
          data_residency_id: string | null
          dpa_accepted: boolean
          export_control_status_id: string | null
          gdpr_compliant: boolean
          hipaa_compliant: boolean
          id: string
          is_active: boolean
          iso27001_certified: boolean
          itar_certification_expiry: string | null
          itar_certified: boolean
          organization_id: string
          privacy_policy_accepted: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          soc2_compliant: boolean
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          additional_certifications?: Json | null
          compliance_notes?: string | null
          created_at?: string
          created_by?: string | null
          data_residency_id?: string | null
          dpa_accepted?: boolean
          export_control_status_id?: string | null
          gdpr_compliant?: boolean
          hipaa_compliant?: boolean
          id?: string
          is_active?: boolean
          iso27001_certified?: boolean
          itar_certification_expiry?: string | null
          itar_certified?: boolean
          organization_id: string
          privacy_policy_accepted?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          soc2_compliant?: boolean
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          additional_certifications?: Json | null
          compliance_notes?: string | null
          created_at?: string
          created_by?: string | null
          data_residency_id?: string | null
          dpa_accepted?: boolean
          export_control_status_id?: string | null
          gdpr_compliant?: boolean
          hipaa_compliant?: boolean
          id?: string
          is_active?: boolean
          iso27001_certified?: boolean
          itar_certification_expiry?: string | null
          itar_certified?: boolean
          organization_id?: string
          privacy_policy_accepted?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          soc2_compliant?: boolean
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_compliance_data_residency_id_fkey"
            columns: ["data_residency_id"]
            isOneToOne: false
            referencedRelation: "md_data_residency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_compliance_export_control_status_id_fkey"
            columns: ["export_control_status_id"]
            isOneToOne: false
            referencedRelation: "md_export_control_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_compliance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_compliance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_contacts: {
        Row: {
          contact_type: Database["public"]["Enums"]["contact_type_enum"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          department: string | null
          department_functional_area_id: string | null
          email: string
          email_verified: boolean
          email_verified_at: string | null
          first_name: string
          functional_area_id: string | null
          id: string
          is_active: boolean
          is_decision_maker: boolean
          is_deleted: boolean
          is_primary: boolean
          job_title: string | null
          last_name: string
          organization_id: string
          phone_country_code: string | null
          phone_number: string | null
          preferred_language_id: string | null
          tenant_id: string
          timezone: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          contact_type?: Database["public"]["Enums"]["contact_type_enum"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          department_functional_area_id?: string | null
          email: string
          email_verified?: boolean
          email_verified_at?: string | null
          first_name: string
          functional_area_id?: string | null
          id?: string
          is_active?: boolean
          is_decision_maker?: boolean
          is_deleted?: boolean
          is_primary?: boolean
          job_title?: string | null
          last_name: string
          organization_id: string
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_language_id?: string | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          contact_type?: Database["public"]["Enums"]["contact_type_enum"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          department_functional_area_id?: string | null
          email?: string
          email_verified?: boolean
          email_verified_at?: string | null
          first_name?: string
          functional_area_id?: string | null
          id?: string
          is_active?: boolean
          is_decision_maker?: boolean
          is_deleted?: boolean
          is_primary?: boolean
          job_title?: string | null
          last_name?: string
          organization_id?: string
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_language_id?: string | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_contacts_department_functional_area_id_fkey"
            columns: ["department_functional_area_id"]
            isOneToOne: false
            referencedRelation: "md_functional_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_contacts_functional_area_id_fkey"
            columns: ["functional_area_id"]
            isOneToOne: false
            referencedRelation: "md_functional_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_contacts_preferred_language_id_fkey"
            columns: ["preferred_language_id"]
            isOneToOne: false
            referencedRelation: "md_languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_invoice_line_items: {
        Row: {
          amount: number
          challenge_id: string | null
          created_at: string
          description: string
          display_order: number
          id: string
          invoice_id: string
          line_type: string
          metadata: Json | null
          quantity: number
          unit_price: number
        }
        Insert: {
          amount?: number
          challenge_id?: string | null
          created_at?: string
          description: string
          display_order?: number
          id?: string
          invoice_id: string
          line_type?: string
          metadata?: Json | null
          quantity?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          challenge_id?: string | null
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          invoice_id?: string
          line_type?: string
          metadata?: Json | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "seeker_invoice_line_items_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "seeker_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_invoices: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          discount_amount: number
          due_at: string | null
          id: string
          invoice_number: string
          invoice_type: string
          is_active: boolean
          is_shadow: boolean
          issued_at: string | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string | null
          subtotal: number
          tax_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_amount?: number
          due_at?: string | null
          id?: string
          invoice_number: string
          invoice_type?: string
          is_active?: boolean
          is_shadow?: boolean
          issued_at?: string | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          subtotal?: number
          tax_amount?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          discount_amount?: number
          due_at?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          is_active?: boolean
          is_shadow?: boolean
          issued_at?: string | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          subtotal?: number
          tax_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "seeker_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_memberships: {
        Row: {
          auto_renew: boolean
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_rate_pct: number
          created_at: string
          created_by: string | null
          ends_at: string | null
          fee_discount_pct: number
          id: string
          lifecycle_status: string
          membership_tier_id: string
          organization_id: string
          renewed_from_id: string | null
          starts_at: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_renew?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_rate_pct?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          fee_discount_pct?: number
          id?: string
          lifecycle_status?: string
          membership_tier_id: string
          organization_id: string
          renewed_from_id?: string | null
          starts_at?: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_renew?: boolean
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_rate_pct?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          fee_discount_pct?: number
          id?: string
          lifecycle_status?: string
          membership_tier_id?: string
          organization_id?: string
          renewed_from_id?: string | null
          starts_at?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_memberships_membership_tier_id_fkey"
            columns: ["membership_tier_id"]
            isOneToOne: false
            referencedRelation: "md_membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_memberships_renewed_from_id_fkey"
            columns: ["renewed_from_id"]
            isOneToOne: false
            referencedRelation: "seeker_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_onboarding: {
        Row: {
          created_at: string
          created_by: string | null
          current_step: number
          has_invited_team_member: boolean
          has_posted_challenge: boolean
          has_viewed_provider_profiles: boolean
          id: string
          is_active: boolean
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          organization_id: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_step?: number
          has_invited_team_member?: boolean
          has_posted_challenge?: boolean
          has_viewed_provider_profiles?: boolean
          id?: string
          is_active?: boolean
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          organization_id: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_step?: number
          has_invited_team_member?: boolean
          has_posted_challenge?: boolean
          has_viewed_provider_profiles?: boolean
          id?: string
          is_active?: boolean
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          organization_id?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_onboarding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_org_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          expires_at: string | null
          file_name: string
          file_size: number | null
          id: string
          is_active: boolean
          mime_type: string | null
          organization_id: string
          rejection_reason: string | null
          storage_path: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          verification_status: Database["public"]["Enums"]["document_verification_status_enum"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          expires_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          organization_id: string
          rejection_reason?: string | null
          storage_path: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["document_verification_status_enum"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["document_type_enum"]
          expires_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          organization_id?: string
          rejection_reason?: string | null
          storage_path?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          verification_status?: Database["public"]["Enums"]["document_verification_status_enum"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_org_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_org_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_org_geographies: {
        Row: {
          country_id: string
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          organization_id: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          country_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          organization_id: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          organization_id?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_org_geographies_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_org_geographies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_org_geographies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_org_industries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          industry_id: string
          is_primary: boolean
          organization_id: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry_id: string
          is_primary?: boolean
          organization_id: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry_id?: string
          is_primary?: boolean
          organization_id?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_org_industries_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_org_industries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_org_industries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_org_operating_geographies: {
        Row: {
          country_id: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          country_id: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          country_id?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seeker_org_operating_geographies_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_org_operating_geographies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_organization_audit: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string
          field_name: string
          id: string
          ip_address: unknown
          new_value: string | null
          old_value: string | null
          organization_id: string
          tenant_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          field_name: string
          id?: string
          ip_address?: unknown
          new_value?: string | null
          old_value?: string | null
          organization_id: string
          tenant_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          field_name?: string
          id?: string
          ip_address?: unknown
          new_value?: string | null
          old_value?: string | null
          organization_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seeker_organization_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_organizations: {
        Row: {
          address_format_template: Json | null
          annual_revenue_range: string | null
          correction_count: number
          correction_instructions: string | null
          created_at: string
          created_by: string | null
          custom_nda_document_id: string | null
          date_format: string | null
          deleted_at: string | null
          deleted_by: string | null
          employee_count_range: string | null
          founding_year: number | null
          governance_profile: string
          hq_address_line1: string | null
          hq_address_line2: string | null
          hq_city: string | null
          hq_country_id: string | null
          hq_postal_code: string | null
          hq_state_province_id: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          is_enterprise: boolean
          lc_review_required: boolean
          legal_entity_name: string | null
          logo_url: string | null
          max_concurrent_active: number
          max_cumulative_quota: number
          nda_preference:
            | Database["public"]["Enums"]["nda_preference_enum"]
            | null
          nda_review_status:
            | Database["public"]["Enums"]["nda_review_status_enum"]
            | null
          number_format: string | null
          operating_model: string
          organization_description: string | null
          organization_name: string
          organization_type_id: string | null
          phase1_bypass: boolean
          preferred_currency: string | null
          preferred_language_id: string | null
          registrant_contact: Json | null
          registration_number: string | null
          registration_step: number
          rejection_reason: string | null
          subscription_tier: string | null
          subsidized_discount_pct: number
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          tax_id: string | null
          tc_version_accepted: string | null
          tenant_id: string
          timezone: string | null
          trade_brand_name: string | null
          updated_at: string | null
          updated_by: string | null
          verification_checklist_results: Json | null
          verification_expiry_date: string | null
          verification_started_at: string | null
          verification_status: Database["public"]["Enums"]["org_verification_status_enum"]
          verified_at: string | null
          verified_by: string | null
          website_url: string | null
        }
        Insert: {
          address_format_template?: Json | null
          annual_revenue_range?: string | null
          correction_count?: number
          correction_instructions?: string | null
          created_at?: string
          created_by?: string | null
          custom_nda_document_id?: string | null
          date_format?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          employee_count_range?: string | null
          founding_year?: number | null
          governance_profile?: string
          hq_address_line1?: string | null
          hq_address_line2?: string | null
          hq_city?: string | null
          hq_country_id?: string | null
          hq_postal_code?: string | null
          hq_state_province_id?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          is_enterprise?: boolean
          lc_review_required?: boolean
          legal_entity_name?: string | null
          logo_url?: string | null
          max_concurrent_active?: number
          max_cumulative_quota?: number
          nda_preference?:
            | Database["public"]["Enums"]["nda_preference_enum"]
            | null
          nda_review_status?:
            | Database["public"]["Enums"]["nda_review_status_enum"]
            | null
          number_format?: string | null
          operating_model?: string
          organization_description?: string | null
          organization_name: string
          organization_type_id?: string | null
          phase1_bypass?: boolean
          preferred_currency?: string | null
          preferred_language_id?: string | null
          registrant_contact?: Json | null
          registration_number?: string | null
          registration_step?: number
          rejection_reason?: string | null
          subscription_tier?: string | null
          subsidized_discount_pct?: number
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tax_id?: string | null
          tc_version_accepted?: string | null
          tenant_id: string
          timezone?: string | null
          trade_brand_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verification_checklist_results?: Json | null
          verification_expiry_date?: string | null
          verification_started_at?: string | null
          verification_status?: Database["public"]["Enums"]["org_verification_status_enum"]
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Update: {
          address_format_template?: Json | null
          annual_revenue_range?: string | null
          correction_count?: number
          correction_instructions?: string | null
          created_at?: string
          created_by?: string | null
          custom_nda_document_id?: string | null
          date_format?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          employee_count_range?: string | null
          founding_year?: number | null
          governance_profile?: string
          hq_address_line1?: string | null
          hq_address_line2?: string | null
          hq_city?: string | null
          hq_country_id?: string | null
          hq_postal_code?: string | null
          hq_state_province_id?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          is_enterprise?: boolean
          lc_review_required?: boolean
          legal_entity_name?: string | null
          logo_url?: string | null
          max_concurrent_active?: number
          max_cumulative_quota?: number
          nda_preference?:
            | Database["public"]["Enums"]["nda_preference_enum"]
            | null
          nda_review_status?:
            | Database["public"]["Enums"]["nda_review_status_enum"]
            | null
          number_format?: string | null
          operating_model?: string
          organization_description?: string | null
          organization_name?: string
          organization_type_id?: string | null
          phase1_bypass?: boolean
          preferred_currency?: string | null
          preferred_language_id?: string | null
          registrant_contact?: Json | null
          registration_number?: string | null
          registration_step?: number
          rejection_reason?: string | null
          subscription_tier?: string | null
          subsidized_discount_pct?: number
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tax_id?: string | null
          tc_version_accepted?: string | null
          tenant_id?: string
          timezone?: string | null
          trade_brand_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verification_checklist_results?: Json | null
          verification_expiry_date?: string | null
          verification_started_at?: string | null
          verification_status?: Database["public"]["Enums"]["org_verification_status_enum"]
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_seeker_org_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_organizations_hq_country_id_fkey"
            columns: ["hq_country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_organizations_hq_state_province_id_fkey"
            columns: ["hq_state_province_id"]
            isOneToOne: false
            referencedRelation: "md_states_provinces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_organizations_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "organization_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_organizations_preferred_language_id_fkey"
            columns: ["preferred_language_id"]
            isOneToOne: false
            referencedRelation: "md_languages"
            referencedColumns: ["id"]
          },
        ]
      }
      seeker_subscriptions: {
        Row: {
          auto_renew: boolean
          billing_cycle_id: string
          challenge_limit_snapshot: number
          challenges_used: number
          created_at: string
          created_by: string | null
          current_period_end: string | null
          current_period_start: string | null
          discount_percentage: number | null
          effective_monthly_cost: number | null
          ends_at: string | null
          engagement_model_id: string | null
          id: string
          is_active: boolean
          max_solutions_snapshot: number
          monthly_base_price: number | null
          organization_id: string
          payment_type: Database["public"]["Enums"]["payment_type_enum"]
          pending_downgrade_date: string | null
          pending_downgrade_tier_id: string | null
          per_challenge_fee_snapshot: number | null
          shadow_charge_per_challenge: number | null
          shadow_currency_code: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["subscription_status_enum"]
          tenant_id: string
          terms_acceptance_hash: string | null
          terms_accepted_at: string | null
          terms_accepted_by: string | null
          terms_version: string | null
          tier_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auto_renew?: boolean
          billing_cycle_id: string
          challenge_limit_snapshot?: number
          challenges_used?: number
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          discount_percentage?: number | null
          effective_monthly_cost?: number | null
          ends_at?: string | null
          engagement_model_id?: string | null
          id?: string
          is_active?: boolean
          max_solutions_snapshot?: number
          monthly_base_price?: number | null
          organization_id: string
          payment_type?: Database["public"]["Enums"]["payment_type_enum"]
          pending_downgrade_date?: string | null
          pending_downgrade_tier_id?: string | null
          per_challenge_fee_snapshot?: number | null
          shadow_charge_per_challenge?: number | null
          shadow_currency_code?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          tenant_id: string
          terms_acceptance_hash?: string | null
          terms_accepted_at?: string | null
          terms_accepted_by?: string | null
          terms_version?: string | null
          tier_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auto_renew?: boolean
          billing_cycle_id?: string
          challenge_limit_snapshot?: number
          challenges_used?: number
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          discount_percentage?: number | null
          effective_monthly_cost?: number | null
          ends_at?: string | null
          engagement_model_id?: string | null
          id?: string
          is_active?: boolean
          max_solutions_snapshot?: number
          monthly_base_price?: number | null
          organization_id?: string
          payment_type?: Database["public"]["Enums"]["payment_type_enum"]
          pending_downgrade_date?: string | null
          pending_downgrade_tier_id?: string | null
          per_challenge_fee_snapshot?: number | null
          shadow_charge_per_challenge?: number | null
          shadow_currency_code?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          tenant_id?: string
          terms_acceptance_hash?: string | null
          terms_accepted_at?: string | null
          terms_accepted_by?: string | null
          terms_version?: string | null
          tier_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeker_subscriptions_billing_cycle_id_fkey"
            columns: ["billing_cycle_id"]
            isOneToOne: false
            referencedRelation: "md_billing_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_subscriptions_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "md_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_subscriptions_pending_downgrade_tier_id_fkey"
            columns: ["pending_downgrade_tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeker_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "md_subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      seeking_org_admins: {
        Row: {
          activated_at: string | null
          admin_tier: string
          created_at: string
          created_by: string | null
          designated_by: string | null
          designation_method: string | null
          domain_scope: Json
          email: string | null
          full_name: string | null
          id: string
          organization_id: string
          phone: string | null
          status: string
          title: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          admin_tier?: string
          created_at?: string
          created_by?: string | null
          designated_by?: string | null
          designation_method?: string | null
          domain_scope?: Json
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id: string
          phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          admin_tier?: string
          created_at?: string
          created_by?: string | null
          designated_by?: string | null
          designation_method?: string | null
          domain_scope?: Json
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string
          phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seeking_org_admins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_timers: {
        Row: {
          auto_hold_on_breach: boolean
          breached_at: string | null
          challenge_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deadline_at: string
          escalation_tier: number
          last_escalated_at: string | null
          max_hold_days: number
          phase: number
          phase_duration_days: number | null
          role_code: string
          started_at: string
          status: string
          timer_id: string
          updated_at: string | null
          updated_by: string | null
          warning_sent_at: string | null
        }
        Insert: {
          auto_hold_on_breach?: boolean
          breached_at?: string | null
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at: string
          escalation_tier?: number
          last_escalated_at?: string | null
          max_hold_days?: number
          phase: number
          phase_duration_days?: number | null
          role_code: string
          started_at?: string
          status?: string
          timer_id?: string
          updated_at?: string | null
          updated_by?: string | null
          warning_sent_at?: string | null
        }
        Update: {
          auto_hold_on_breach?: boolean
          breached_at?: string | null
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string
          escalation_tier?: number
          last_escalated_at?: string | null
          max_hold_days?: number
          phase?: number
          phase_duration_days?: number | null
          role_code?: string
          started_at?: string
          status?: string
          timer_id?: string
          updated_at?: string | null
          updated_by?: string | null
          warning_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_timers_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_access_log: {
        Row: {
          access_type: string
          accessor_id: string
          accessor_role: string | null
          device_fingerprint: string | null
          duration_seconds: number | null
          id: string
          ip_address: string | null
          solution_id: string
          timestamp: string
        }
        Insert: {
          access_type: string
          accessor_id: string
          accessor_role?: string | null
          device_fingerprint?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          solution_id: string
          timestamp?: string
        }
        Update: {
          access_type?: string
          accessor_id?: string
          accessor_role?: string | null
          device_fingerprint?: string | null
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          solution_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_access_log_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
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
          previous_manager_email: string | null
          provider_id: string
          updated_at: string | null
          withdrawal_reason: string | null
          withdrawn_at: string | null
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
          previous_manager_email?: string | null
          provider_id: string
          updated_at?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
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
          previous_manager_email?: string | null
          provider_id?: string
          updated_at?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
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
          invitation_id: string | null
          is_student: boolean
          last_name: string
          lifecycle_rank: number
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          participation_mode_id: string | null
          pin_code: string | null
          profile_completion_percentage: number | null
          registration_mode: Database["public"]["Enums"]["registration_mode"]
          timezone: string | null
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
          invitation_id?: string | null
          is_student?: boolean
          last_name: string
          lifecycle_rank?: number
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          participation_mode_id?: string | null
          pin_code?: string | null
          profile_completion_percentage?: number | null
          registration_mode?: Database["public"]["Enums"]["registration_mode"]
          timezone?: string | null
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
          invitation_id?: string | null
          is_student?: boolean
          last_name?: string
          lifecycle_rank?: number
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          participation_mode_id?: string | null
          pin_code?: string | null
          profile_completion_percentage?: number | null
          registration_mode?: Database["public"]["Enums"]["registration_mode"]
          timezone?: string | null
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
            foreignKeyName: "solution_providers_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "solution_provider_invitations"
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
      solutions: {
        Row: {
          abstract_text: string | null
          ai_usage_declaration: string | null
          challenge_id: string
          created_at: string
          created_by: string | null
          current_phase: number | null
          encryption_key_ref: string | null
          evaluation_grade: string | null
          experience: string | null
          full_solution_url: string | null
          governance_profile: string | null
          id: string
          ip_transfer_status: string | null
          is_encrypted: boolean
          methodology: string | null
          payment_status: string | null
          phase_status: string | null
          provider_id: string
          selection_status: string | null
          submitted_at: string | null
          timeline: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          abstract_text?: string | null
          ai_usage_declaration?: string | null
          challenge_id: string
          created_at?: string
          created_by?: string | null
          current_phase?: number | null
          encryption_key_ref?: string | null
          evaluation_grade?: string | null
          experience?: string | null
          full_solution_url?: string | null
          governance_profile?: string | null
          id?: string
          ip_transfer_status?: string | null
          is_encrypted?: boolean
          methodology?: string | null
          payment_status?: string | null
          phase_status?: string | null
          provider_id: string
          selection_status?: string | null
          submitted_at?: string | null
          timeline?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          abstract_text?: string | null
          ai_usage_declaration?: string | null
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          current_phase?: number | null
          encryption_key_ref?: string | null
          evaluation_grade?: string | null
          experience?: string | null
          full_solution_url?: string | null
          governance_profile?: string | null
          id?: string
          ip_transfer_status?: string | null
          is_encrypted?: boolean
          methodology?: string | null
          payment_status?: string | null
          phase_status?: string | null
          provider_id?: string
          selection_status?: string | null
          submitted_at?: string | null
          timeline?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solutions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      solver_enrollments: {
        Row: {
          ad_accepted: boolean
          approved_at: string | null
          approved_by: string | null
          challenge_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          enrolled_at: string
          enrollment_model: string
          id: string
          is_deleted: boolean
          legal_accepted_at: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          solver_id: string
          status: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ad_accepted?: boolean
          approved_at?: string | null
          approved_by?: string | null
          challenge_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          enrolled_at?: string
          enrollment_model: string
          id?: string
          is_deleted?: boolean
          legal_accepted_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          solver_id: string
          status?: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ad_accepted?: boolean
          approved_at?: string | null
          approved_by?: string | null
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          enrolled_at?: string
          enrollment_model?: string
          id?: string
          is_deleted?: boolean
          legal_accepted_at?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          solver_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solver_enrollments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solver_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      solver_profile_views: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          provider_id: string
          tenant_id: string
          viewed_at: string
          viewed_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          provider_id: string
          tenant_id: string
          viewed_at?: string
          viewed_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          provider_id?: string
          tenant_id?: string
          viewed_at?: string
          viewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solver_profile_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solver_profile_views_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "solution_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solver_profile_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      solver_profiles: {
        Row: {
          avg_grade: number | null
          avg_rating: number | null
          challenge_count: number
          created_at: string
          created_by: string | null
          expertise_domains: Json
          id: string
          portfolio_settings: Json
          portfolio_visible: boolean
          reputation_score: number
          updated_at: string | null
          updated_by: string | null
          user_id: string
          verification_level: string
          win_count: number
        }
        Insert: {
          avg_grade?: number | null
          avg_rating?: number | null
          challenge_count?: number
          created_at?: string
          created_by?: string | null
          expertise_domains?: Json
          id?: string
          portfolio_settings?: Json
          portfolio_visible?: boolean
          reputation_score?: number
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
          verification_level?: string
          win_count?: number
        }
        Update: {
          avg_grade?: number | null
          avg_rating?: number | null
          challenge_count?: number
          created_at?: string
          created_by?: string | null
          expertise_domains?: Json
          id?: string
          portfolio_settings?: Json
          portfolio_visible?: boolean
          reputation_score?: number
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
          verification_level?: string
          win_count?: number
        }
        Relationships: []
      }
      specialities: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          sub_domain_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          sub_domain_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          sub_domain_id?: string
          updated_at?: string | null
          updated_by?: string | null
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
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          proficiency_area_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          proficiency_area_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          proficiency_area_id?: string
          updated_at?: string | null
          updated_by?: string | null
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
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      tc_acceptances: {
        Row: {
          acceptance_hash: string | null
          accepted_at: string
          created_at: string
          id: string
          ip_address: string | null
          platform_terms_id: string
          user_id: string
        }
        Insert: {
          acceptance_hash?: string | null
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          platform_terms_id: string
          user_id: string
        }
        Update: {
          acceptance_hash?: string | null
          accepted_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          platform_terms_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tc_acceptances_platform_terms_id_fkey"
            columns: ["platform_terms_id"]
            isOneToOne: false
            referencedRelation: "platform_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      tc_versions: {
        Row: {
          content_url: string | null
          created_at: string
          effective_date: string
          id: string
          version: string
        }
        Insert: {
          content_url?: string | null
          created_at?: string
          effective_date: string
          id?: string
          version: string
        }
        Update: {
          content_url?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          version?: string
        }
        Relationships: []
      }
      tier_permissions: {
        Row: {
          id: string
          is_enabled: boolean
          permission_key: string
          tier: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          permission_key: string
          tier: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_enabled?: boolean
          permission_key?: string
          tier?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      tier_permissions_audit: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by_id: string
          id: string
          new_value: boolean
          permission_key: string
          previous_value: boolean | null
          tier: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by_id: string
          id?: string
          new_value: boolean
          permission_key: string
          previous_value?: boolean | null
          tier: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by_id?: string
          id?: string
          new_value?: boolean
          permission_key?: string
          previous_value?: boolean | null
          tier?: string
        }
        Relationships: []
      }
      user_challenge_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          auto_assigned: boolean
          challenge_id: string
          created_at: string
          created_by: string | null
          is_active: boolean
          revoked_at: string | null
          role_code: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          auto_assigned?: boolean
          challenge_id: string
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          revoked_at?: string | null
          role_code: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          auto_assigned?: boolean
          challenge_id?: string
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          revoked_at?: string | null
          role_code?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_roles_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_challenge_roles_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["role_code"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          organization_id: string
          role: string
          tenant_id: string
          token_hash: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          organization_id: string
          role?: string
          tenant_id: string
          token_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          organization_id?: string
          role?: string
          tenant_id?: string
          token_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "seeker_organizations"
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
      verification_assignment_log: {
        Row: {
          created_at: string
          event_type: string
          from_admin_id: string | null
          id: string
          initiator: string
          reason: string | null
          scoring_snapshot: Json | null
          to_admin_id: string | null
          verification_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          from_admin_id?: string | null
          id?: string
          initiator: string
          reason?: string | null
          scoring_snapshot?: Json | null
          to_admin_id?: string | null
          verification_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          from_admin_id?: string | null
          id?: string
          initiator?: string
          reason?: string | null
          scoring_snapshot?: Json | null
          to_admin_id?: string | null
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_assignment_log_from_admin_id_fkey"
            columns: ["from_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_assignment_log_to_admin_id_fkey"
            columns: ["to_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_assignments: {
        Row: {
          assigned_admin_id: string | null
          assigned_at: string
          assignment_method: string
          close_reason: string | null
          closed_at: string | null
          created_at: string
          domain_match_score: number | null
          fallback_reason: string | null
          id: string
          is_current: boolean
          release_reason: string | null
          released_at: string | null
          scoring_details: Json | null
          verification_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          assigned_at?: string
          assignment_method: string
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          domain_match_score?: number | null
          fallback_reason?: string | null
          id?: string
          is_current?: boolean
          release_reason?: string | null
          released_at?: string | null
          scoring_details?: Json | null
          verification_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          assigned_at?: string
          assignment_method?: string
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          domain_match_score?: number | null
          fallback_reason?: string | null
          id?: string
          is_current?: boolean
          release_reason?: string | null
          released_at?: string | null
          scoring_details?: Json | null
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_assignments_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_check_results: {
        Row: {
          check_id: string
          created_at: string
          id: string
          notes: string | null
          result: string
          updated_at: string | null
          updated_by: string | null
          verification_id: string
        }
        Insert: {
          check_id: string
          created_at?: string
          id?: string
          notes?: string | null
          result?: string
          updated_at?: string | null
          updated_by?: string | null
          verification_id: string
        }
        Update: {
          check_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          result?: string
          updated_at?: string | null
          updated_by?: string | null
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_check_results_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "platform_admin_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      available_composite_slots: {
        Row: {
          available_reviewer_count: number | null
          backing_slot_ids: string[] | null
          created_at: string | null
          end_at: string | null
          expertise_level_id: string | null
          id: string | null
          industry_segment_id: string | null
          start_at: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "composite_interview_slots_expertise_level_id_fkey"
            columns: ["expertise_level_id"]
            isOneToOne: false
            referencedRelation: "expertise_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composite_interview_slots_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "industry_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_activity_view: {
        Row: {
          action: string | null
          audit_id: string | null
          challenge_id: string | null
          challenge_title: string | null
          created_at: string | null
          details: Json | null
          method: string | null
          phase_from: number | null
          phase_to: number | null
          solution_id: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_trail_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      reviewer_workload_distribution: {
        Row: {
          days_since_last: number | null
          email: string | null
          expertise_level_ids: string[] | null
          id: string | null
          industry_segment_ids: string[] | null
          interviews_30d: number | null
          interviews_7d: number | null
          load_bucket: string | null
          name: string | null
          workload_status: string | null
        }
        Insert: {
          days_since_last?: never
          email?: string | null
          expertise_level_ids?: string[] | null
          id?: string | null
          industry_segment_ids?: string[] | null
          interviews_30d?: never
          interviews_7d?: never
          load_bucket?: never
          name?: string | null
          workload_status?: never
        }
        Update: {
          days_since_last?: never
          email?: string | null
          expertise_level_ids?: string[] | null
          id?: string | null
          industry_segment_ids?: string[] | null
          interviews_30d?: never
          interviews_7d?: never
          load_bucket?: never
          name?: string | null
          workload_status?: never
        }
        Relationships: []
      }
    }
    Functions: {
      assign_role_to_challenge: {
        Args: {
          p_assigned_by: string
          p_challenge_id: string
          p_role_code: string
          p_user_id: string
        }
        Returns: Json
      }
      auto_assign_roles_on_creation: {
        Args: {
          p_challenge_id: string
          p_creator_id: string
          p_governance_profile: string
          p_operating_model: string
        }
        Returns: Json
      }
      auto_curate_lightweight: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      book_interview_slot: {
        Args: {
          p_composite_slot_id: string
          p_enrollment_id: string
          p_provider_id: string
          p_user_id: string
        }
        Returns: Json
      }
      bulk_insert_question_capability_tags: {
        Args: { p_mappings: Json }
        Returns: number
      }
      bulk_insert_questions: {
        Args: { p_questions: Json }
        Returns: {
          inserted_id: string
          row_index: number
        }[]
      }
      bulk_reassign_admin: {
        Args: { p_departing_admin_id: string; p_trigger?: string }
        Returns: Json
      }
      bulk_upsert_capability_tags: {
        Args: { p_tag_names: string[] }
        Returns: {
          id: string
          name: string
          was_created: boolean
        }[]
      }
      calculate_effective_monthly_cost: {
        Args: {
          p_base_price: number
          p_billing_months: number
          p_discount_pct: number
        }
        Returns: number
      }
      can_perform: {
        Args: {
          p_challenge_id: string
          p_required_phase?: number
          p_required_role: string
          p_user_id: string
        }
        Returns: boolean
      }
      can_switch_engagement_model: {
        Args: { p_new_model_id: string; p_org_id: string }
        Returns: boolean
      }
      cancel_booked_slot_by_reviewer: {
        Args: { p_reason?: string; p_reviewer_id: string; p_slot_id: string }
        Returns: Json
      }
      cancel_interview_booking: {
        Args: { p_booking_id: string; p_reason: string; p_user_id: string }
        Returns: Json
      }
      check_curation_cycle_limit: {
        Args: { p_challenge_id: string; p_max_cycles?: number }
        Returns: Json
      }
      check_delegated_scope: {
        Args: { p_admin_id: string; p_entity_scope: Json }
        Returns: boolean
      }
      check_duplicate_organization: {
        Args: {
          p_country_id?: string
          p_exclude_id?: string
          p_org_name: string
        }
        Returns: {
          id: string
          organization_name: string
          similarity_score: number
        }[]
      }
      check_enrollment_time_conflict: {
        Args: {
          p_end_at: string
          p_enrollment_id: string
          p_exclude_booking_id?: string
          p_start_at: string
        }
        Returns: boolean
      }
      check_model_authority: {
        Args: { p_engagement_model: string; p_user_id: string }
        Returns: boolean
      }
      check_reviewer_time_conflict: {
        Args: {
          p_end_at: string
          p_exclude_booking_id?: string
          p_reviewer_id: string
          p_start_at: string
        }
        Returns: boolean
      }
      check_sla_status: {
        Args: { p_challenge_id: string; p_phase: number }
        Returns: Json
      }
      check_tier_limit: { Args: { p_org_id: string }; Returns: Json }
      check_user_limit: { Args: { p_org_id: string }; Returns: boolean }
      claim_from_queue: { Args: { p_queue_entry_id: string }; Returns: Json }
      claim_org_for_verification: {
        Args: { p_admin_id: string; p_org_id: string }
        Returns: Json
      }
      cleanup_expired_otps: { Args: never; Returns: number }
      complete_phase: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      complete_verification_action: {
        Args: { p_action: string; p_notes?: string; p_verification_id: string }
        Returns: Json
      }
      delete_questions_by_specialities: {
        Args: { p_speciality_ids: string[] }
        Returns: number
      }
      execute_auto_assignment:
        | {
            Args: {
              p_assignment_method?: string
              p_hq_country_id: string
              p_industry_segment_id: string
              p_org_type_id: string
              p_verification_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_hq_country: string
              p_industry_segments: string[]
              p_org_type?: string
              p_skip_admin_id?: string
              p_verification_id: string
            }
            Returns: Json
          }
      execute_expertise_change_reset: {
        Args: { p_provider_id: string; p_user_id: string }
        Returns: undefined
      }
      execute_expertise_change_reset_v2: {
        Args: { p_enrollment_id: string; p_user_id: string }
        Returns: undefined
      }
      execute_industry_change_reset: {
        Args: { p_provider_id: string; p_user_id: string }
        Returns: undefined
      }
      execute_industry_change_reset_v2: {
        Args: { p_enrollment_id: string; p_user_id: string }
        Returns: undefined
      }
      expire_legal_reacceptances: { Args: never; Returns: number }
      finalize_certification: {
        Args: {
          p_certifying_user_id: string
          p_composite_score: number
          p_enrollment_id: string
        }
        Returns: Json
      }
      finalize_complexity: {
        Args: {
          p_adjusted_score: number
          p_challenge_id: string
          p_user_id: string
        }
        Returns: Json
      }
      generate_terms_acceptance_hash: {
        Args: {
          p_accepted_at: string
          p_accepted_by: string
          p_org_id: string
          p_terms_version: string
        }
        Returns: string
      }
      get_active_reviewer_count: {
        Args: { p_expertise_level_id: string; p_industry_segment_id: string }
        Returns: number
      }
      get_active_rules: {
        Args: { p_governance_profile: string }
        Returns: Json
      }
      get_auth_user_id: { Args: never; Returns: string }
      get_cascade_impact_counts: {
        Args: { p_provider_id: string }
        Returns: {
          general_proof_points_count: number
          proficiency_areas_count: number
          specialities_count: number
          specialty_proof_points_count: number
        }[]
      }
      get_cascade_impact_counts_v2: {
        Args: { p_enrollment_id: string }
        Returns: {
          general_proof_points_count: number
          proficiency_areas_count: number
          specialities_count: number
          specialty_proof_points_count: number
        }[]
      }
      get_config: { Args: never; Returns: Json }
      get_eligible_admins_ranked: {
        Args: {
          p_exclude_admin_id?: string
          p_hq_country: string
          p_industry_segments: string[]
          p_org_type?: string
        }
        Returns: {
          admin_tier: string
          assignment_priority: number
          availability_status: string
          country_score: number
          current_active: number
          email: string
          full_name: string
          id: string
          industry_score: number
          is_supervisor: boolean
          last_assignment_timestamp: string
          max_concurrent: number
          org_type_score: number
          total_score: number
          workload_ratio: number
        }[]
      }
      get_gate_requirements: {
        Args: { p_gate_id: string; p_governance_profile: string }
        Returns: Json
      }
      get_governance_behavior: {
        Args: { p_governance_profile: string; p_phase: number }
        Returns: Json
      }
      get_governance_field_rules: {
        Args: { p_governance_mode: string }
        Returns: Json
      }
      get_mandatory_fields: {
        Args: { p_governance_profile: string }
        Returns: Json
      }
      get_my_admin_profile_id: { Args: never; Returns: string }
      get_my_admin_tier: { Args: { p_user_id: string }; Returns: string }
      get_phase_required_role: { Args: { p_phase: number }; Returns: string }
      get_question_count_by_specialities: {
        Args: { p_speciality_ids: string[] }
        Returns: number
      }
      get_realtime_admin_metrics:
        | {
            Args: { p_admin_id?: string }
            Returns: {
              admin_id: string
              admin_tier: string
              assignment_priority: number
              availability_status: string
              completed_total: number
              current_active_verifications: number
              current_pending: number
              full_name: string
              max_concurrent_verifications: number
              sla_at_risk_count: number
              sla_breached_total: number
              sla_compliant_total: number
            }[]
          }
        | {
            Args: { p_admin_id?: string; p_period_days?: number }
            Returns: {
              admin_id: string
              admin_tier: string
              assignment_priority: number
              availability_status: string
              completed_total: number
              current_active_verifications: number
              current_pending: number
              full_name: string
              max_concurrent_verifications: number
              sla_at_risk_count: number
              sla_breached_total: number
              sla_compliant_total: number
            }[]
          }
      get_required_legal_docs: {
        Args: { p_governance_profile?: string; p_maturity_level: string }
        Returns: Json
      }
      get_reviewer_days_idle: {
        Args: { p_reviewer_id: string }
        Returns: number
      }
      get_reviewer_interview_count: {
        Args: { p_days_lookback?: number; p_reviewer_id: string }
        Returns: number
      }
      get_tier_usage: { Args: { p_org_id: string }; Returns: Json }
      get_unread_count: { Args: { p_user_id: string }; Returns: number }
      get_user_all_challenge_roles: {
        Args: { p_user_id: string }
        Returns: {
          challenge_id: string
          challenge_title: string
          current_phase: number
          master_status: string
          operating_model: string
          phase_status: string
          role_codes: string[]
        }[]
      }
      get_user_dashboard_data: { Args: { p_user_id: string }; Returns: Json }
      get_user_roles: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: string[]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      get_valid_transitions: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: Json
      }
      get_visible_org_ids: {
        Args: { p_parent_org_id: string }
        Returns: string[]
      }
      handle_orphaned_proof_points: {
        Args: { p_provider_id: string; p_removed_area_ids: string[] }
        Returns: number
      }
      handle_orphaned_proof_points_v2: {
        Args: { p_enrollment_id: string; p_removed_area_ids: string[] }
        Returns: number
      }
      handle_phase1_bypass: {
        Args: {
          p_challenge_id: string
          p_operating_model: string
          p_phase1_enabled?: boolean
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_challenge: {
        Args: {
          p_creator_id: string
          p_operating_model: string
          p_org_id: string
          p_title: string
        }
        Returns: string
      }
      is_email_domain_blocked: { Args: { p_email: string }; Returns: boolean }
      is_primary_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_pulse_provider_owner: {
        Args: { p_provider_id: string }
        Returns: boolean
      }
      is_reviewer_assigned_to_booking: {
        Args: { p_booking_id: string }
        Returns: boolean
      }
      is_reviewer_for_enrollment: {
        Args: { p_enrollment_id: string }
        Returns: boolean
      }
      is_reviewer_for_provider: {
        Args: { p_provider_id: string }
        Returns: boolean
      }
      is_supervisor_tier: { Args: { p_user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_challenge_id: string
          p_details?: Json
          p_method: string
          p_phase_from?: number
          p_phase_to?: number
          p_solution_id: string
          p_user_id: string
        }
        Returns: string
      }
      mark_all_read: { Args: { p_user_id: string }; Returns: undefined }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      notify_escalation: {
        Args: {
          p_challenge_id: string
          p_message: string
          p_notification_type: string
          p_phase: number
          p_role_code: string
          p_tier: number
          p_title: string
        }
        Returns: undefined
      }
      place_in_open_queue: {
        Args: {
          p_ip_address?: string
          p_reason?: string
          p_verification_id: string
        }
        Returns: Json
      }
      process_membership_expiry: { Args: never; Returns: undefined }
      process_pending_downgrades: { Args: never; Returns: undefined }
      process_sla_breaches: { Args: never; Returns: number }
      process_sla_escalation: {
        Args: never
        Returns: {
          auto_held_count: number
          escalated_count: number
        }[]
      }
      pulse_award_xp: {
        Args: {
          p_action_type: string
          p_notes?: string
          p_provider_id: string
          p_reference_id?: string
          p_reference_type?: string
          p_xp_amount: number
        }
        Returns: boolean
      }
      pulse_calculate_level: { Args: { p_total_xp: number }; Returns: number }
      pulse_cards_award_reputation: {
        Args: {
          p_action_type: string
          p_points: number
          p_provider_id: string
          p_reason?: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: boolean
      }
      pulse_cards_get_reputation: {
        Args: { p_provider_id: string }
        Returns: number
      }
      pulse_get_ranked_feed: {
        Args: {
          p_content_type?: Database["public"]["Enums"]["pulse_content_type"]
          p_industry_segment_id?: string
          p_limit?: number
          p_offset?: number
          p_viewer_id?: string
        }
        Returns: {
          caption: string
          comment_count: number
          content_type: Database["public"]["Enums"]["pulse_content_type"]
          cover_image_url: string
          created_at: string
          fire_count: number
          gold_count: number
          headline: string
          id: string
          key_insight: string
          media_urls: Json
          provider_id: string
          ranking_score: number
          save_count: number
          title: string
        }[]
      }
      pulse_get_streak_multiplier: {
        Args: { p_streak: number }
        Returns: number
      }
      pulse_update_streak: { Args: { p_provider_id: string }; Returns: number }
      reassign_role: {
        Args: {
          p_challenge_id: string
          p_new_user_id: string
          p_old_user_id: string
          p_reason: string
          p_reassigned_by: string
          p_role_code: string
        }
        Returns: Json
      }
      reassign_verification:
        | {
            Args: {
              p_initiator?: string
              p_ip_address?: string
              p_reason: string
              p_verification_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_initiator?: string
              p_ip_address?: string
              p_reason?: string
              p_to_admin_id?: string
              p_trigger?: string
              p_verification_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_initiator?: string
              p_reason?: string
              p_requesting_admin_id?: string
              p_supervisor_id?: string
              p_to_admin_id?: string
              p_trigger?: string
              p_verification_id: string
            }
            Returns: Json
          }
      refresh_all_composite_slots: { Args: never; Returns: number }
      refresh_composite_slots_for_time: {
        Args: { p_end_at: string; p_start_at: string }
        Returns: undefined
      }
      refresh_performance_metrics: { Args: never; Returns: undefined }
      release_to_queue: {
        Args: { p_reason?: string; p_verification_id: string }
        Returns: Json
      }
      request_reassignment: {
        Args: {
          p_reason: string
          p_target_admin_id?: string
          p_verification_id: string
        }
        Returns: Json
      }
      reset_challenge_counters: { Args: never; Returns: undefined }
      reset_enrollment_for_expertise_change: {
        Args: { p_enrollment_id: string; p_user_id: string }
        Returns: Json
      }
      reset_enrollment_for_expertise_upgrade: {
        Args: { p_enrollment_id: string; p_user_id: string }
        Returns: Json
      }
      resolve_challenge_governance: {
        Args: { p_challenge_id: string }
        Returns: string
      }
      roles_equivalent: {
        Args: { p_actual: string; p_required: string }
        Returns: boolean
      }
      select_reviewers_weighted: {
        Args: {
          p_end_at: string
          p_expertise_level_id: string
          p_industry_segment_id: string
          p_quorum_required: number
          p_slot_ids: string[]
          p_start_at: string
        }
        Returns: string[]
      }
      send_notification: {
        Args: {
          p_challenge_id: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_sla_timer: {
        Args: {
          p_challenge_id: string
          p_duration_days?: number
          p_phase: number
          p_role_code: string
        }
        Returns: undefined
      }
      submit_question: {
        Args: {
          p_challenge_id: string
          p_question_text: string
          p_user_id: string
        }
        Returns: string
      }
      supervisor_reassign_to_self: {
        Args: { p_verification_id: string }
        Returns: Json
      }
      update_config_param: {
        Args: {
          p_change_reason?: string
          p_ip_address?: string
          p_new_value: string
          p_param_key: string
        }
        Returns: Json
      }
      update_domain_weights: {
        Args: {
          p_change_reason?: string
          p_ip_address?: string
          p_l1: number
          p_l2: number
          p_l3: number
        }
        Returns: Json
      }
      update_master_status: {
        Args: { p_challenge_id: string }
        Returns: undefined
      }
      validate_curation_checklist: {
        Args: { p_challenge_id: string }
        Returns: Json
      }
      validate_domain_weights: {
        Args: { p_l1: number; p_l2: number; p_l3: number }
        Returns: Json
      }
      validate_gate_02: { Args: { p_challenge_id: string }; Returns: Json }
      validate_gate_04: { Args: { p_challenge_id: string }; Returns: Json }
      validate_lightweight_publication: {
        Args: { p_challenge_id: string }
        Returns: Json
      }
      validate_phase_transition:
        | {
            Args: {
              p_challenge_id: string
              p_from_status: string
              p_to_status: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_challenge_id: string
              p_from_status: string
              p_to_status: string
              p_user_id: string
            }
            Returns: Json
          }
      validate_role_assignment: {
        Args: {
          p_challenge_id: string
          p_governance_profile: string
          p_new_role: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_tax_id: {
        Args: { p_country_id: string; p_tax_id: string }
        Returns: boolean
      }
    }
    Enums: {
      access_type_enum: "included" | "available" | "not_available"
      app_role:
        | "platform_admin"
        | "tenant_admin"
        | "solution_provider"
        | "seeker"
        | "panel_reviewer"
      contact_type_enum: "primary" | "billing" | "technical"
      document_type_enum: "logo" | "profile" | "verification" | "custom_nda"
      document_verification_status_enum:
        | "pending"
        | "verified"
        | "rejected"
        | "expired"
      enterprise_request_status_enum:
        | "new"
        | "contacted"
        | "qualified"
        | "converted"
        | "rejected"
      invitation_type: "standard" | "vip_expert"
      lifecycle_status:
        | "invited"
        | "registered"
        | "enrolled"
        | "mode_selected"
        | "org_info_pending"
        | "org_validated"
        | "expertise_selected"
        | "proof_points_started"
        | "proof_points_min_met"
        | "assessment_in_progress"
        | "assessment_passed"
        | "panel_scheduled"
        | "panel_completed"
        | "profile_building"
        | "assessment_pending"
        | "assessment_completed"
        | "verified"
        | "certified"
        | "not_certified"
        | "not_verified"
        | "active"
        | "suspended"
        | "inactive"
        | "interview_unsuccessful"
      nda_preference_enum: "standard_platform_nda" | "custom_nda"
      nda_review_status_enum:
        | "not_applicable"
        | "pending_review"
        | "under_review"
        | "approved"
        | "rejected"
      onboarding_status: "not_started" | "in_progress" | "completed"
      org_verification_status_enum:
        | "unverified"
        | "pending"
        | "verified"
        | "rejected"
        | "payment_submitted"
        | "under_verification"
        | "returned_for_correction"
        | "suspended"
        | "active"
      payment_method_type_enum:
        | "credit_card"
        | "ach_bank_transfer"
        | "wire_transfer"
        | "shadow"
      payment_type_enum: "live" | "shadow"
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
      pulse_content_status:
        | "draft"
        | "scheduled"
        | "published"
        | "archived"
        | "removed"
      pulse_content_type:
        | "reel"
        | "podcast"
        | "spark"
        | "article"
        | "gallery"
        | "post"
      pulse_engagement_type: "fire" | "gold" | "save" | "bookmark"
      pulse_notification_type:
        | "new_follower"
        | "fire_reaction"
        | "gold_award"
        | "comment"
        | "comment_reply"
        | "streak_reminder"
        | "loot_box_ready"
        | "level_up"
        | "skill_verified"
        | "leaderboard_rank_change"
        | "content_milestone"
        | "system"
      pulse_report_status: "pending" | "under_review" | "actioned" | "dismissed"
      pulse_report_type:
        | "spam"
        | "harassment"
        | "misinformation"
        | "inappropriate"
        | "copyright"
        | "other"
      pulse_verification_source:
        | "self_declared"
        | "assessment_passed"
        | "interview_verified"
        | "platform_awarded"
      question_difficulty: "introductory" | "applied" | "advanced" | "strategic"
      question_type:
        | "conceptual"
        | "scenario"
        | "experience"
        | "decision"
        | "proof"
      question_usage_mode: "self_assessment" | "interview" | "both"
      registration_mode: "self_registered" | "invitation"
      subscription_status_enum:
        | "pending_billing"
        | "active"
        | "suspended"
        | "cancelled"
        | "expired"
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
      access_type_enum: ["included", "available", "not_available"],
      app_role: [
        "platform_admin",
        "tenant_admin",
        "solution_provider",
        "seeker",
        "panel_reviewer",
      ],
      contact_type_enum: ["primary", "billing", "technical"],
      document_type_enum: ["logo", "profile", "verification", "custom_nda"],
      document_verification_status_enum: [
        "pending",
        "verified",
        "rejected",
        "expired",
      ],
      enterprise_request_status_enum: [
        "new",
        "contacted",
        "qualified",
        "converted",
        "rejected",
      ],
      invitation_type: ["standard", "vip_expert"],
      lifecycle_status: [
        "invited",
        "registered",
        "enrolled",
        "mode_selected",
        "org_info_pending",
        "org_validated",
        "expertise_selected",
        "proof_points_started",
        "proof_points_min_met",
        "assessment_in_progress",
        "assessment_passed",
        "panel_scheduled",
        "panel_completed",
        "profile_building",
        "assessment_pending",
        "assessment_completed",
        "verified",
        "certified",
        "not_certified",
        "not_verified",
        "active",
        "suspended",
        "inactive",
        "interview_unsuccessful",
      ],
      nda_preference_enum: ["standard_platform_nda", "custom_nda"],
      nda_review_status_enum: [
        "not_applicable",
        "pending_review",
        "under_review",
        "approved",
        "rejected",
      ],
      onboarding_status: ["not_started", "in_progress", "completed"],
      org_verification_status_enum: [
        "unverified",
        "pending",
        "verified",
        "rejected",
        "payment_submitted",
        "under_verification",
        "returned_for_correction",
        "suspended",
        "active",
      ],
      payment_method_type_enum: [
        "credit_card",
        "ach_bank_transfer",
        "wire_transfer",
        "shadow",
      ],
      payment_type_enum: ["live", "shadow"],
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
      pulse_content_status: [
        "draft",
        "scheduled",
        "published",
        "archived",
        "removed",
      ],
      pulse_content_type: [
        "reel",
        "podcast",
        "spark",
        "article",
        "gallery",
        "post",
      ],
      pulse_engagement_type: ["fire", "gold", "save", "bookmark"],
      pulse_notification_type: [
        "new_follower",
        "fire_reaction",
        "gold_award",
        "comment",
        "comment_reply",
        "streak_reminder",
        "loot_box_ready",
        "level_up",
        "skill_verified",
        "leaderboard_rank_change",
        "content_milestone",
        "system",
      ],
      pulse_report_status: ["pending", "under_review", "actioned", "dismissed"],
      pulse_report_type: [
        "spam",
        "harassment",
        "misinformation",
        "inappropriate",
        "copyright",
        "other",
      ],
      pulse_verification_source: [
        "self_declared",
        "assessment_passed",
        "interview_verified",
        "platform_awarded",
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
      registration_mode: ["self_registered", "invitation"],
      subscription_status_enum: [
        "pending_billing",
        "active",
        "suspended",
        "cancelled",
        "expired",
      ],
      verification_status: ["pending", "in_progress", "verified", "rejected"],
    },
  },
} as const
