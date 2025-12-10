export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: {
          id: string
          name_zh: string
          name_en: string
          country: string
          country_en: string
          url: string | null
          second_exchange_eligible: boolean
          application_group: string | null
          gpa_requirement: string | null
          grade_requirement: string | null
          language_requirement: string | null
          restricted_colleges: string | null
          quota: string | null
          academic_calendar: string | null
          registration_fee: string | null
          accommodation_info: string | null
          notes: string | null
          latitude: number | null
          longitude: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name_zh: string
          name_en: string
          country: string
          country_en: string
          url?: string | null
          second_exchange_eligible?: boolean
          application_group?: string | null
          gpa_requirement?: string | null
          grade_requirement?: string | null
          language_requirement?: string | null
          restricted_colleges?: string | null
          quota?: string | null
          academic_calendar?: string | null
          registration_fee?: string | null
          accommodation_info?: string | null
          notes?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_zh?: string
          name_en?: string
          country?: string
          country_en?: string
          url?: string | null
          second_exchange_eligible?: boolean
          application_group?: string | null
          gpa_requirement?: string | null
          grade_requirement?: string | null
          language_requirement?: string | null
          restricted_colleges?: string | null
          quota?: string | null
          academic_calendar?: string | null
          registration_fee?: string | null
          accommodation_info?: string | null
          notes?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_schools: {
        Args: {
          search_query: string
        }
        Returns: Database['public']['Tables']['schools']['Row'][]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
