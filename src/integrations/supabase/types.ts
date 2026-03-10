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
      access_control: {
        Row: {
          area_id: string | null
          arl: string
          companion_user_id: string | null
          company_name: string
          created_at: string
          created_by: string | null
          document_id: string
          entry_datetime: string
          estimated_exit_time: string | null
          exit_datetime: string | null
          id: string
          photo_url: string | null
          subarea_id: string | null
          visitor_name: string
          zone_requirement: string
        }
        Insert: {
          area_id?: string | null
          arl?: string
          companion_user_id?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          document_id: string
          entry_datetime?: string
          estimated_exit_time?: string | null
          exit_datetime?: string | null
          id?: string
          photo_url?: string | null
          subarea_id?: string | null
          visitor_name: string
          zone_requirement?: string
        }
        Update: {
          area_id?: string | null
          arl?: string
          companion_user_id?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          entry_datetime?: string
          estimated_exit_time?: string | null
          exit_datetime?: string | null
          id?: string
          photo_url?: string | null
          subarea_id?: string | null
          visitor_name?: string
          zone_requirement?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_control_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_control_companion_user_id_fkey"
            columns: ["companion_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_control_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_control_subarea_id_fkey"
            columns: ["subarea_id"]
            isOneToOne: false
            referencedRelation: "subareas"
            referencedColumns: ["id"]
          },
        ]
      }
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
      asset_movements: {
        Row: {
          area_id: string | null
          asset_serial: string
          asset_type: string
          collaborator_user_id: string | null
          created_at: string
          created_by: string | null
          entry_datetime: string | null
          exit_datetime: string | null
          id: string
          movement_type: string
          photo_url: string | null
          reason: string
          subarea_id: string | null
        }
        Insert: {
          area_id?: string | null
          asset_serial?: string
          asset_type: string
          collaborator_user_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_datetime?: string | null
          exit_datetime?: string | null
          id?: string
          movement_type: string
          photo_url?: string | null
          reason?: string
          subarea_id?: string | null
        }
        Update: {
          area_id?: string | null
          asset_serial?: string
          asset_type?: string
          collaborator_user_id?: string | null
          created_at?: string
          created_by?: string | null
          entry_datetime?: string | null
          exit_datetime?: string | null
          id?: string
          movement_type?: string
          photo_url?: string | null
          reason?: string
          subarea_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_movements_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_collaborator_user_id_fkey"
            columns: ["collaborator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_movements_subarea_id_fkey"
            columns: ["subarea_id"]
            isOneToOne: false
            referencedRelation: "subareas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_comments: {
        Row: {
          comment: string
          created_at: string
          finding_id: string
          id: string
          role_label: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          finding_id: string
          id?: string
          role_label?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          finding_id?: string
          id?: string
          role_label?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_comments_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "audit_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          action_description: string | null
          audit_plan_id: string
          created_at: string
          description: string
          due_date: string | null
          finding_type: Database["public"]["Enums"]["finding_status"]
          id: string
          responsible_user_id: string | null
          severity: Database["public"]["Enums"]["finding_severity"]
          updated_at: string
        }
        Insert: {
          action_description?: string | null
          audit_plan_id: string
          created_at?: string
          description: string
          due_date?: string | null
          finding_type?: Database["public"]["Enums"]["finding_status"]
          id?: string
          responsible_user_id?: string | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          updated_at?: string
        }
        Update: {
          action_description?: string | null
          audit_plan_id?: string
          created_at?: string
          description?: string
          due_date?: string | null
          finding_type?: Database["public"]["Enums"]["finding_status"]
          id?: string
          responsible_user_id?: string | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_plan_id_fkey"
            columns: ["audit_plan_id"]
            isOneToOne: false
            referencedRelation: "audit_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_plans: {
        Row: {
          area_id: string
          auditor_user_id: string
          created_at: string
          description: string | null
          id: string
          planned_date: string
          responsible_user_id: string
          status: Database["public"]["Enums"]["audit_plan_status"]
          title: string
          updated_at: string
        }
        Insert: {
          area_id: string
          auditor_user_id: string
          created_at?: string
          description?: string | null
          id?: string
          planned_date?: string
          responsible_user_id: string
          status?: Database["public"]["Enums"]["audit_plan_status"]
          title: string
          updated_at?: string
        }
        Update: {
          area_id?: string
          auditor_user_id?: string
          created_at?: string
          description?: string | null
          id?: string
          planned_date?: string
          responsible_user_id?: string
          status?: Database["public"]["Enums"]["audit_plan_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_plans_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      comfort_assignments: {
        Row: {
          assigned_user_id: string | null
          assignment_date: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          room_id: string
          status: string
          task_type: string
        }
        Insert: {
          assigned_user_id?: string | null
          assignment_date?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          room_id: string
          status?: string
          task_type: string
        }
        Update: {
          assigned_user_id?: string | null
          assignment_date?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          room_id?: string
          status?: string
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "comfort_assignments_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comfort_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comfort_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "comfort_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      comfort_rooms: {
        Row: {
          created_at: string
          floor: number
          id: string
          room_number: string
          status: string
          tower: string
        }
        Insert: {
          created_at?: string
          floor: number
          id?: string
          room_number: string
          status?: string
          tower: string
        }
        Update: {
          created_at?: string
          floor?: number
          id?: string
          room_number?: string
          status?: string
          tower?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      evaluation_criteria: {
        Row: {
          created_at: string
          criterion_name: string
          id: string
          is_comment: boolean
          position_name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          criterion_name: string
          id?: string
          is_comment?: boolean
          position_name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          criterion_name?: string
          id?: string
          is_comment?: boolean
          position_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      evaluation_scores: {
        Row: {
          comment: string | null
          created_at: string
          criterion_id: string
          evaluation_id: string
          id: string
          score: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          criterion_id: string
          evaluation_id: string
          id?: string
          score?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          criterion_id?: string
          evaluation_id?: string
          id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "evaluation_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_scores_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
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
      leader_pass_activities: {
        Row: {
          created_at: string
          description: string | null
          frequency: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      leader_pass_records: {
        Row: {
          activity_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leader_pass_records_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "leader_pass_activities"
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
      menu_permissions: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          menu_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          menu_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          menu_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_comments: {
        Row: {
          avatar: string | null
          comment: string
          created_at: string
          id: string
          post_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          avatar?: string | null
          comment: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          avatar?: string | null
          comment?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "newsletter_posts"
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
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_area_id: { Args: { _user_id: string }; Returns: string }
      get_user_subarea_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_area"
        | "lider_subarea"
        | "colaborador"
        | "solo_lectura"
      audit_plan_status:
        | "pendiente"
        | "en_proceso"
        | "cumple"
        | "no_cumple"
        | "pendiente_cierre"
      entity_status: "activo" | "inactivo"
      evaluation_type: "feedback" | "desempeno" | "performance" | "one_to_one"
      finding_severity: "critico" | "leve" | "bajo"
      finding_status: "abierta" | "cerrada"
      kpi_frequency: "semanal" | "mensual" | "trimestral"
      objective_status:
        | "borrador"
        | "activo"
        | "en_riesgo"
        | "cerrado"
        | "cumplido"
        | "no_cumplido"
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
      audit_plan_status: [
        "pendiente",
        "en_proceso",
        "cumple",
        "no_cumple",
        "pendiente_cierre",
      ],
      entity_status: ["activo", "inactivo"],
      evaluation_type: ["feedback", "desempeno", "performance", "one_to_one"],
      finding_severity: ["critico", "leve", "bajo"],
      finding_status: ["abierta", "cerrada"],
      kpi_frequency: ["semanal", "mensual", "trimestral"],
      objective_status: [
        "borrador",
        "activo",
        "en_riesgo",
        "cerrado",
        "cumplido",
        "no_cumplido",
      ],
      priority_level: ["alta", "media", "baja"],
    },
  },
} as const
