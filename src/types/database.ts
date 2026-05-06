export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
        }
        Relationships: []
      }
      org_members: {
        Row: {
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          org_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          project_id: string
          user_id: string
          role: 'admin' | 'member'
          created_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          role: 'admin' | 'member'
          created_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'done'
          priority: 'low' | 'medium' | 'high'
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'done'
          priority?: 'low' | 'medium' | 'high'
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'done'
          priority?: 'low' | 'medium' | 'high'
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          project_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          project_id: string
          title: string
          content: string | null
          updated_by: string | null
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title?: string
          content?: string | null
          updated_by?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          content?: string | null
          updated_by?: string | null
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          id: string
          project_id: string | null
          user_id: string | null
          entity_type: 'task' | 'message' | 'document' | 'member' | null
          action: 'created' | 'updated' | 'deleted' | 'joined' | 'left' | null
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          user_id?: string | null
          entity_type?: 'task' | 'message' | 'document' | 'member' | null
          action?: 'created' | 'updated' | 'deleted' | 'joined' | 'left' | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          user_id?: string | null
          entity_type?: 'task' | 'message' | 'document' | 'member' | null
          action?: 'created' | 'updated' | 'deleted' | 'joined' | 'left' | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_project_member: {
        Args: { pid: string }
        Returns: boolean
      }
      get_project_role: {
        Args: { pid: string }
        Returns: string
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

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrgMember = Database['public']['Tables']['org_members']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type ActivityLog = Database['public']['Tables']['activity_log']['Row']

export type TaskStatus = Task['status']
export type TaskPriority = Task['priority']
export type ProjectRole = ProjectMember['role']
