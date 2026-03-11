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
          grade_requirement: string | null
          restricted_colleges: string | null
          quota: string | null
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
          grade_requirement?: string | null
          restricted_colleges?: string | null
          quota?: string | null
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
          grade_requirement?: string | null
          restricted_colleges?: string | null
          quota?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      User: {
        Row: {
          id: string
          userID: string | null
          name: string | null
          email: string | null
          emailVerified: string | null
          image: string | null
          bio: string | null
          backgroundImage: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          userID?: string | null
          name?: string | null
          email?: string | null
          emailVerified?: string | null
          image?: string | null
          bio?: string | null
          backgroundImage?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userID?: string | null
          name?: string | null
          email?: string | null
          emailVerified?: string | null
          image?: string | null
          bio?: string | null
          backgroundImage?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      Account: {
        Row: {
          id: string
          userId: string
          type: string
          provider: string
          providerAccountId: string
          refresh_token: string | null
          access_token: string | null
          expires_at: number | null
          token_type: string | null
          scope: string | null
          id_token: string | null
          session_state: string | null
        }
        Insert: {
          id: string
          userId: string
          type: string
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
        }
        Update: {
          id?: string
          userId?: string
          type?: string
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
        }
      }
      Session: {
        Row: {
          id: string
          sessionToken: string
          userId: string
          expires: string
        }
        Insert: {
          id: string
          sessionToken: string
          userId: string
          expires: string
        }
        Update: {
          id?: string
          sessionToken?: string
          userId?: string
          expires?: string
        }
      }
      UserQualification: {
        Row: {
          id: string
          userId: string
          college: string | null
          grade: string | null
          gpa: number | null
          toefl: number | null
          ielts: number | null
          toeic: number | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id: string
          userId: string
          college?: string | null
          grade?: string | null
          gpa?: number | null
          toefl?: number | null
          ielts?: number | null
          toeic?: number | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userId?: string
          college?: string | null
          grade?: string | null
          gpa?: number | null
          toefl?: number | null
          ielts?: number | null
          toeic?: number | null
          createdAt?: string
          updatedAt?: string
        }
      }
      Post: {
        Row: {
          id: string
          content: string
          authorId: string
          repostedPostId: string | null
          deletedAt: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          content: string
          authorId: string
          repostedPostId?: string | null
          deletedAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          content?: string
          authorId?: string
          repostedPostId?: string | null
          deletedAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      PostSchool: {
        Row: {
          id: string
          postId: string
          schoolId: string
        }
        Insert: {
          id?: string
          postId: string
          schoolId: string
        }
        Update: {
          id?: string
          postId?: string
          schoolId?: string
        }
      }
      Board: {
        Row: {
          id: string
          type: string
          name: string
          slug: string
          description: string | null
        }
        Insert: {
          id?: string
          type: string
          name: string
          slug: string
          description?: string | null
        }
        Update: {
          id?: string
          type?: string
          name?: string
          slug?: string
          description?: string | null
        }
      }
      PostBoard: {
        Row: {
          id: string
          postId: string
          boardId: string
        }
        Insert: {
          id?: string
          postId: string
          boardId: string
        }
        Update: {
          id?: string
          postId?: string
          boardId?: string
        }
      }
      BoardFollow: {
        Row: {
          id: string
          userId: string
          boardId: string
        }
        Insert: {
          id?: string
          userId: string
          boardId: string
        }
        Update: {
          id?: string
          userId?: string
          boardId?: string
        }
      }
      Like: {
        Row: {
          id: string
          userId: string
          postId: string
        }
        Insert: {
          id?: string
          userId: string
          postId: string
        }
        Update: {
          id?: string
          userId?: string
          postId?: string
        }
      }
      Repost: {
        Row: {
          id: string
          userId: string
          postId: string
        }
        Insert: {
          id?: string
          userId: string
          postId: string
        }
        Update: {
          id?: string
          userId?: string
          postId?: string
        }
      }
      Comment: {
        Row: {
          id: string
          content: string
          authorId: string
          postId: string
          deletedAt: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          content: string
          authorId: string
          postId: string
          deletedAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          content?: string
          authorId?: string
          postId?: string
          deletedAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      Notification: {
        Row: {
          id: string
          userId: string
          type: string
          actorId: string | null
          postId: string | null
          commentId: string | null
          boardId: string | null
          read: boolean
          createdAt: string
        }
        Insert: {
          id?: string
          userId: string
          type: string
          actorId?: string | null
          postId?: string | null
          commentId?: string | null
          boardId?: string | null
          read?: boolean
          createdAt?: string
        }
        Update: {
          id?: string
          userId?: string
          type?: string
          actorId?: string | null
          postId?: string | null
          commentId?: string | null
          boardId?: string | null
          read?: boolean
          createdAt?: string
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
