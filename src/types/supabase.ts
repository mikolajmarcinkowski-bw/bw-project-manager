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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_project_suggestions: {
        Row: {
          accepted_steps: Json | null
          created_at: string
          diff_summary: string | null
          id: string
          project_id: string
          suggested_steps: Json | null
        }
        Insert: {
          accepted_steps?: Json | null
          created_at?: string
          diff_summary?: string | null
          id?: string
          project_id: string
          suggested_steps?: Json | null
        }
        Update: {
          accepted_steps?: Json | null
          created_at?: string
          diff_summary?: string | null
          id?: string
          project_id?: string
          suggested_steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_project_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          created_at: string | null
          id: string
          name: string
          revoked_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          revoked_at?: string | null
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          revoked_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          actual_h: number | null
          created_at: string
          description: string | null
          est_h: number | null
          id: string
          phase: string | null
          project_id: string
          rate_type: Database["public"]["Enums"]["rate_type"]
          task_id: string | null
        }
        Insert: {
          actual_h?: number | null
          created_at?: string
          description?: string | null
          est_h?: number | null
          id?: string
          phase?: string | null
          project_id: string
          rate_type: Database["public"]["Enums"]["rate_type"]
          task_id?: string | null
        }
        Update: {
          actual_h?: number | null
          created_at?: string
          description?: string | null
          est_h?: number | null
          id?: string
          phase?: string | null
          project_id?: string
          rate_type?: Database["public"]["Enums"]["rate_type"]
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_settings: {
        Row: {
          budget_max: number | null
          buffer_pct: number | null
          created_at: string
          pm_overhead_pct: number | null
          project_id: string
          rate_d: number | null
          rate_k: number | null
          rate_w: number | null
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          buffer_pct?: number | null
          created_at?: string
          pm_overhead_pct?: number | null
          project_id: string
          rate_d?: number | null
          rate_k?: number | null
          rate_w?: number | null
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          buffer_pct?: number | null
          created_at?: string
          pm_overhead_pct?: number | null
          project_id?: string
          rate_d?: number | null
          rate_k?: number | null
          rate_w?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          actual_close_date: string | null
          business_rationale: string | null
          bw_approval: Database["public"]["Enums"]["approval_status"] | null
          bw_approval_date: string | null
          bw_approver: string | null
          client_approval: Database["public"]["Enums"]["approval_status"] | null
          client_approval_date: string | null
          client_approver: string | null
          cr_number: string | null
          cr_type: Database["public"]["Enums"]["cr_type"]
          created_at: string
          current_state: string | null
          description: string | null
          desired_state: string | null
          id: string
          impact_cost: number | null
          impact_hours: number | null
          impact_level: Database["public"]["Enums"]["cr_impact"] | null
          implementation_plan: string | null
          notes: string | null
          project_id: string
          schedule_impact: string | null
          status: Database["public"]["Enums"]["cr_status"]
          submitted_by: string | null
          submitted_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_close_date?: string | null
          business_rationale?: string | null
          bw_approval?: Database["public"]["Enums"]["approval_status"] | null
          bw_approval_date?: string | null
          bw_approver?: string | null
          client_approval?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          client_approval_date?: string | null
          client_approver?: string | null
          cr_number?: string | null
          cr_type?: Database["public"]["Enums"]["cr_type"]
          created_at?: string
          current_state?: string | null
          description?: string | null
          desired_state?: string | null
          id?: string
          impact_cost?: number | null
          impact_hours?: number | null
          impact_level?: Database["public"]["Enums"]["cr_impact"] | null
          implementation_plan?: string | null
          notes?: string | null
          project_id: string
          schedule_impact?: string | null
          status?: Database["public"]["Enums"]["cr_status"]
          submitted_by?: string | null
          submitted_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_close_date?: string | null
          business_rationale?: string | null
          bw_approval?: Database["public"]["Enums"]["approval_status"] | null
          bw_approval_date?: string | null
          bw_approver?: string | null
          client_approval?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          client_approval_date?: string | null
          client_approver?: string | null
          cr_number?: string | null
          cr_type?: Database["public"]["Enums"]["cr_type"]
          created_at?: string
          current_state?: string | null
          description?: string | null
          desired_state?: string | null
          id?: string
          impact_cost?: number | null
          impact_hours?: number | null
          impact_level?: Database["public"]["Enums"]["cr_impact"] | null
          implementation_plan?: string | null
          notes?: string | null
          project_id?: string
          schedule_impact?: string | null
          status?: Database["public"]["Enums"]["cr_status"]
          submitted_by?: string | null
          submitted_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_bw_approver_fkey"
            columns: ["bw_approver"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          hubspot_url: string | null
          id: string
          name: string
          nip: string | null
        }
        Insert: {
          created_at?: string
          hubspot_url?: string | null
          id?: string
          name: string
          nip?: string | null
        }
        Update: {
          created_at?: string
          hubspot_url?: string | null
          id?: string
          name?: string
          nip?: string | null
        }
        Relationships: []
      }
      communications: {
        Row: {
          audience: string | null
          cadence: string | null
          channel: string | null
          created_at: string
          id: string
          owner: string | null
          project_id: string
        }
        Insert: {
          audience?: string | null
          cadence?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          owner?: string | null
          project_id: string
        }
        Update: {
          audience?: string | null
          cadence?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          owner?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_points: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          notes: string | null
          project_id: string
          status: Database["public"]["Enums"]["decision_status"]
          step_id: string | null
          title: string
          type: Database["public"]["Enums"]["decision_type"]
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          notes?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["decision_status"]
          step_id?: string | null
          title: string
          type: Database["public"]["Enums"]["decision_type"]
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["decision_status"]
          step_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["decision_type"]
        }
        Relationships: [
          {
            foreignKeyName: "decision_points_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_points_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "project_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_levels: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          level: number
          owner: string | null
          project_id: string
          trigger: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          level: number
          owner?: string | null
          project_id: string
          trigger?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          level?: number
          owner?: string | null
          project_id?: string
          trigger?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_levels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      external_refs: {
        Row: {
          created_at: string
          entity: string
          entity_id: string
          external_id: string
          id: string
          sync_status: string | null
          system: Database["public"]["Enums"]["external_system"]
        }
        Insert: {
          created_at?: string
          entity: string
          entity_id: string
          external_id: string
          id?: string
          sync_status?: string | null
          system: Database["public"]["Enums"]["external_system"]
        }
        Update: {
          created_at?: string
          entity?: string
          entity_id?: string
          external_id?: string
          id?: string
          sync_status?: string | null
          system?: Database["public"]["Enums"]["external_system"]
        }
        Relationships: []
      }
      kpis: {
        Row: {
          actual_value: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          project_id: string
          status: Database["public"]["Enums"]["kpi_status"]
          target: string | null
        }
        Insert: {
          actual_value?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["kpi_status"]
          target?: string | null
        }
        Update: {
          actual_value?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["kpi_status"]
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kpis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_packages: {
        Row: {
          created_at: string
          hours_base: number
          hours_rollover: number
          hours_used: number
          id: string
          month: string
          project_id: string
        }
        Insert: {
          created_at?: string
          hours_base?: number
          hours_rollover?: number
          hours_used?: number
          id?: string
          month: string
          project_id: string
        }
        Update: {
          created_at?: string
          hours_base?: number
          hours_rollover?: number
          hours_used?: number
          id?: string
          month?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          cadence: string | null
          channel: string | null
          created_at: string
          id: string
          name: string
          owner: string | null
          project_id: string
        }
        Insert: {
          cadence?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          name: string
          owner?: string | null
          project_id: string
        }
        Update: {
          cadence?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          name?: string
          owner?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          id: string
          ms_code: string | null
          name: string
          project_id: string
          status: Database["public"]["Enums"]["milestone_status"]
          target_date: string | null
          task_id: string | null
          week: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ms_code?: string | null
          name: string
          project_id: string
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          task_id?: string | null
          week?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ms_code?: string | null
          name?: string
          project_id?: string
          status?: Database["public"]["Enums"]["milestone_status"]
          target_date?: string | null
          task_id?: string | null
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_tester: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          is_tester?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_tester?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          name: string
          project_id: string
          storage_path: string | null
          type: string
          uploaded_by: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          name: string
          project_id: string
          storage_path?: string | null
          type: string
          uploaded_by?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          storage_path?: string | null
          type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_pms: {
        Row: {
          profile_id: string
          project_id: string
        }
        Insert: {
          profile_id: string
          project_id: string
        }
        Update: {
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_pms_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_pms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_steps: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          is_active: boolean
          is_decision: boolean
          is_parallel: boolean
          is_recurring: boolean
          kind: string | null
          notes: string | null
          phase_name: string
          phase_number: number
          project_id: string
          status: Database["public"]["Enums"]["step_status"]
          step_order: number
          step_template_id: string | null
          step_title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_active?: boolean
          is_decision?: boolean
          is_parallel?: boolean
          is_recurring?: boolean
          kind?: string | null
          notes?: string | null
          phase_name: string
          phase_number: number
          project_id: string
          status?: Database["public"]["Enums"]["step_status"]
          step_order: number
          step_template_id?: string | null
          step_title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_active?: boolean
          is_decision?: boolean
          is_parallel?: boolean
          is_recurring?: boolean
          kind?: string | null
          notes?: string | null
          phase_name?: string
          phase_number?: number
          project_id?: string
          status?: Database["public"]["Enums"]["step_status"]
          step_order?: number
          step_template_id?: string | null
          step_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_steps_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_steps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_steps_step_template_id_fkey"
            columns: ["step_template_id"]
            isOneToOne: false
            referencedRelation: "step_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_types: {
        Row: {
          project_id: string
          type: Database["public"]["Enums"]["impl_type"]
        }
        Insert: {
          project_id: string
          type: Database["public"]["Enums"]["impl_type"]
        }
        Update: {
          project_id?: string
          type?: Database["public"]["Enums"]["impl_type"]
        }
        Relationships: [
          {
            foreignKeyName: "project_types_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          variant: Database["public"]["Enums"]["project_variant"]
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          variant?: Database["public"]["Enums"]["project_variant"]
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          variant?: Database["public"]["Enums"]["project_variant"]
        }
        Relationships: [
          {
            foreignKeyName: "projects_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      questions_doubts: {
        Row: {
          answer: string | null
          asked_date: string | null
          created_at: string
          id: string
          project_id: string
          question: string
          rag: Database["public"]["Enums"]["rag"] | null
          status: Database["public"]["Enums"]["question_status"]
        }
        Insert: {
          answer?: string | null
          asked_date?: string | null
          created_at?: string
          id?: string
          project_id: string
          question: string
          rag?: Database["public"]["Enums"]["rag"] | null
          status?: Database["public"]["Enums"]["question_status"]
        }
        Update: {
          answer?: string | null
          asked_date?: string | null
          created_at?: string
          id?: string
          project_id?: string
          question?: string
          rag?: Database["public"]["Enums"]["rag"] | null
          status?: Database["public"]["Enums"]["question_status"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_doubts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      risks: {
        Row: {
          category: string | null
          created_at: string
          description: string
          id: string
          impact: number | null
          mitigation: string | null
          owner: string | null
          phase: string | null
          probability: number | null
          project_id: string
          rag: Database["public"]["Enums"]["rag"] | null
          score: number | null
          status: Database["public"]["Enums"]["risk_status"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          id?: string
          impact?: number | null
          mitigation?: string | null
          owner?: string | null
          phase?: string | null
          probability?: number | null
          project_id: string
          rag?: Database["public"]["Enums"]["rag"] | null
          score?: number | null
          status?: Database["public"]["Enums"]["risk_status"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          impact?: number | null
          mitigation?: string | null
          owner?: string | null
          phase?: string | null
          probability?: number | null
          project_id?: string
          rag?: Database["public"]["Enums"]["rag"] | null
          score?: number | null
          status?: Database["public"]["Enums"]["risk_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          category: Database["public"]["Enums"]["stakeholder_cat"] | null
          created_at: string
          expectations: string | null
          id: string
          interest: string | null
          name: string
          project_id: string
          role: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["stakeholder_cat"] | null
          created_at?: string
          expectations?: string | null
          id?: string
          interest?: string | null
          name: string
          project_id: string
          role?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["stakeholder_cat"] | null
          created_at?: string
          expectations?: string | null
          id?: string
          interest?: string | null
          name?: string
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      step_task_templates: {
        Row: {
          applies_to_types: Database["public"]["Enums"]["impl_type"][]
          est: number | null
          id: string
          is_milestone: boolean
          kind: Database["public"]["Enums"]["task_kind"]
          step_template_id: string
          task_order: number
          task_title: string
          w_end: number | null
          w_start: number | null
        }
        Insert: {
          applies_to_types?: Database["public"]["Enums"]["impl_type"][]
          est?: number | null
          id?: string
          is_milestone?: boolean
          kind?: Database["public"]["Enums"]["task_kind"]
          step_template_id: string
          task_order: number
          task_title: string
          w_end?: number | null
          w_start?: number | null
        }
        Update: {
          applies_to_types?: Database["public"]["Enums"]["impl_type"][]
          est?: number | null
          id?: string
          is_milestone?: boolean
          kind?: Database["public"]["Enums"]["task_kind"]
          step_template_id?: string
          task_order?: number
          task_title?: string
          w_end?: number | null
          w_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "step_task_templates_step_template_id_fkey"
            columns: ["step_template_id"]
            isOneToOne: false
            referencedRelation: "step_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      step_templates: {
        Row: {
          applies_to_types: Database["public"]["Enums"]["impl_type"][]
          id: string
          is_decision: boolean
          is_parallel: boolean
          is_recurring: boolean
          is_required: boolean
          kind: string | null
          owner_role: string | null
          phase_name: string
          phase_number: number
          step_order: number
          step_title: string
          tags: string[]
        }
        Insert: {
          applies_to_types?: Database["public"]["Enums"]["impl_type"][]
          id?: string
          is_decision?: boolean
          is_parallel?: boolean
          is_recurring?: boolean
          is_required?: boolean
          kind?: string | null
          owner_role?: string | null
          phase_name: string
          phase_number: number
          step_order: number
          step_title: string
          tags?: string[]
        }
        Update: {
          applies_to_types?: Database["public"]["Enums"]["impl_type"][]
          id?: string
          is_decision?: boolean
          is_parallel?: boolean
          is_recurring?: boolean
          is_required?: boolean
          kind?: string | null
          owner_role?: string | null
          phase_name?: string
          phase_number?: number
          step_order?: number
          step_title?: string
          tags?: string[]
        }
        Relationships: []
      }
      task_role_assignments: {
        Row: {
          id: string
          raci: Database["public"]["Enums"]["raci"]
          role: string
          task_id: string
        }
        Insert: {
          id?: string
          raci: Database["public"]["Enums"]["raci"]
          role: string
          task_id: string
        }
        Update: {
          id?: string
          raci?: Database["public"]["Enums"]["raci"]
          role?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_role_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_name: string | null
          completion_date: string | null
          created_at: string
          due_date: string | null
          est: number | null
          hidden: boolean
          id: string
          is_milestone: boolean
          kind: Database["public"]["Enums"]["task_kind"]
          muted_at: string | null
          muted_by: string | null
          note: string | null
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          step_id: string
          task_order: number
          title: string
          type: Database["public"]["Enums"]["impl_type"][]
          updated_at: string
          w_end: number | null
          w_start: number | null
          warning_muted: boolean
        }
        Insert: {
          assignee_name?: string | null
          completion_date?: string | null
          created_at?: string
          due_date?: string | null
          est?: number | null
          hidden?: boolean
          id?: string
          is_milestone?: boolean
          kind?: Database["public"]["Enums"]["task_kind"]
          muted_at?: string | null
          muted_by?: string | null
          note?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          step_id: string
          task_order?: number
          title: string
          type?: Database["public"]["Enums"]["impl_type"][]
          updated_at?: string
          w_end?: number | null
          w_start?: number | null
          warning_muted?: boolean
        }
        Update: {
          assignee_name?: string | null
          completion_date?: string | null
          created_at?: string
          due_date?: string | null
          est?: number | null
          hidden?: boolean
          id?: string
          is_milestone?: boolean
          kind?: Database["public"]["Enums"]["task_kind"]
          muted_at?: string | null
          muted_by?: string | null
          note?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          step_id?: string
          task_order?: number
          title?: string
          type?: Database["public"]["Enums"]["impl_type"][]
          updated_at?: string
          w_end?: number | null
          w_start?: number | null
          warning_muted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tasks_muted_by_fkey"
            columns: ["muted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "project_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          is_pm: boolean
          role: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          is_pm?: boolean
          role?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_pm?: boolean
          role?: string | null
        }
        Relationships: []
      }
      ui_feedback: {
        Row: {
          author_id: string | null
          category: Database["public"]["Enums"]["feedback_category"] | null
          comment: string
          created_at: string
          css_selector: string | null
          element_tag: string | null
          element_text: string | null
          id: string
          page_path: string
          priority: Database["public"]["Enums"]["feedback_priority"]
          status: Database["public"]["Enums"]["feedback_status"]
          theme: string | null
          user_agent: string | null
          viewport_h: number | null
          viewport_w: number | null
        }
        Insert: {
          author_id?: string | null
          category?: Database["public"]["Enums"]["feedback_category"] | null
          comment: string
          created_at?: string
          css_selector?: string | null
          element_tag?: string | null
          element_text?: string | null
          id?: string
          page_path: string
          priority?: Database["public"]["Enums"]["feedback_priority"]
          status?: Database["public"]["Enums"]["feedback_status"]
          theme?: string | null
          user_agent?: string | null
          viewport_h?: number | null
          viewport_w?: number | null
        }
        Update: {
          author_id?: string | null
          category?: Database["public"]["Enums"]["feedback_category"] | null
          comment?: string
          created_at?: string
          css_selector?: string | null
          element_tag?: string | null
          element_text?: string | null
          id?: string
          page_path?: string
          priority?: Database["public"]["Enums"]["feedback_priority"]
          status?: Database["public"]["Enums"]["feedback_status"]
          theme?: string | null
          user_agent?: string | null
          viewport_h?: number | null
          viewport_w?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ui_feedback_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      working_calendar: {
        Row: {
          day: string
          is_working_day: boolean
          label: string | null
        }
        Insert: {
          day: string
          is_working_day?: boolean
          label?: string | null
        }
        Update: {
          day?: string
          is_working_day?: boolean
          label?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_tester: { Args: never; Returns: boolean }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      cr_impact: "low" | "medium" | "high"
      cr_status: "draft" | "pending" | "approved" | "rejected" | "implemented"
      cr_type: "scope" | "timeline" | "budget" | "arch" | "resource" | "other"
      decision_status: "pending" | "yes" | "no"
      decision_type: "uat" | "change_request" | "deviation" | "other"
      external_system: "jira" | "gmail" | "gcal" | "clockify"
      feedback_category: "bug" | "visual" | "content" | "ux"
      feedback_priority: "low" | "medium" | "high"
      feedback_status: "new" | "in_progress" | "resolved"
      impl_type: "CRM" | "SPO" | "INT" | "MKT" | "ERP"
      kpi_status: "on" | "at" | "off" | "done"
      milestone_status: "on" | "at" | "off" | "done"
      project_status: "active" | "completed" | "archived"
      project_variant: "standard" | "dev"
      question_status: "open" | "closed"
      raci: "R" | "A" | "C" | "I"
      rag: "R" | "A" | "G"
      rate_type: "K" | "W" | "D"
      risk_status: "open" | "monitor" | "closed"
      stakeholder_cat: "kp" | "ks" | "ki" | "mo"
      step_status: "todo" | "in_progress" | "done" | "skipped"
      task_kind: "ws" | "own" | "config" | "test" | "ms" | "pm"
      task_status: "todo" | "in_progress" | "done" | "for_quality" | "na"
      user_role: "dev_admin" | "admin" | "user"
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
    Enums: {
      approval_status: ["pending", "approved", "rejected"],
      cr_impact: ["low", "medium", "high"],
      cr_status: ["draft", "pending", "approved", "rejected", "implemented"],
      cr_type: ["scope", "timeline", "budget", "arch", "resource", "other"],
      decision_status: ["pending", "yes", "no"],
      decision_type: ["uat", "change_request", "deviation", "other"],
      external_system: ["jira", "gmail", "gcal", "clockify"],
      feedback_category: ["bug", "visual", "content", "ux"],
      feedback_priority: ["low", "medium", "high"],
      feedback_status: ["new", "in_progress", "resolved"],
      impl_type: ["CRM", "SPO", "INT", "MKT", "ERP"],
      kpi_status: ["on", "at", "off", "done"],
      milestone_status: ["on", "at", "off", "done"],
      project_status: ["active", "completed", "archived"],
      project_variant: ["standard", "dev"],
      question_status: ["open", "closed"],
      raci: ["R", "A", "C", "I"],
      rag: ["R", "A", "G"],
      rate_type: ["K", "W", "D"],
      risk_status: ["open", "monitor", "closed"],
      stakeholder_cat: ["kp", "ks", "ki", "mo"],
      step_status: ["todo", "in_progress", "done", "skipped"],
      task_kind: ["ws", "own", "config", "test", "ms", "pm"],
      task_status: ["todo", "in_progress", "done", "for_quality", "na"],
      user_role: ["dev_admin", "admin", "user"],
    },
  },
} as const
