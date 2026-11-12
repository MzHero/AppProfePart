export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: number;
          match_id: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: never;
          match_id: number;
        };
        Update: {
          created_at?: string;
          id?: never;
          match_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: true;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
        ];
      };
      matches: {
        Row: {
          created_at: string;
          id: number;
          user_one_id: string;
          user_two_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: never;
          user_one_id: string;
          user_two_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          user_one_id?: string;
          user_two_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_user_one_id_fkey';
            columns: ['user_one_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'matches_user_two_id_fkey';
            columns: ['user_two_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: number;
          id: number;
          read_at: string | null;
          sender_id: string;
          sent_at: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          conversation_id: number;
          id?: never;
          read_at?: string | null;
          sender_id: string;
          sent_at?: string;
        };
        Update: {
          body?: string;
          conversation_id?: number;
          id?: never;
          read_at?: string | null;
          sender_id?: string;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: number;
          reason: string;
          reported_id: string;
          reporter_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: never;
          reason: string;
          reported_id: string;
          reporter_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: never;
          reason?: string;
          reported_id?: string;
          reporter_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reported_id_fkey';
            columns: ['reported_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          id: number;
          match_id: number | null;
          rating: number;
          reviewer_id: string;
          teacher_id: string;
        };
        ComputedFields: never;
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: never;
          match_id?: number | null;
          rating: number;
          reviewer_id: string;
          teacher_id: string;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: never;
          match_id?: number | null;
          rating?: number;
          reviewer_id?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      subjects: {
        Row: {
          id: number;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          id?: never;
          name: string;
        };
        Update: {
          id?: never;
          name?: string;
        };
        Relationships: [];
      };
      swipes: {
        Row: {
          action: string;
          created_at: string;
          id: number;
          swiper_id: string;
          target_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          created_at?: string;
          id?: never;
          swiper_id: string;
          target_id: string;
          updated_at?: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: never;
          swiper_id?: string;
          target_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'swipes_swiper_id_fkey';
            columns: ['swiper_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'swipes_target_id_fkey';
            columns: ['target_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_profiles: {
        Row: {
          cv: string | null;
          hourly_rate: number | null;
          location: unknown;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          cv?: string | null;
          hourly_rate?: number | null;
          location?: unknown;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cv?: string | null;
          hourly_rate?: number | null;
          location?: unknown;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      teacher_subjects: {
        Row: {
          subject_id: number;
          teacher_id: string;
        };
        ComputedFields: never;
        Insert: {
          subject_id: number;
          teacher_id: string;
        };
        Update: {
          subject_id?: number;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teacher_subjects_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'teacher_subjects_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teacher_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          birth_date: string | null;
          created_at: string;
          email: string;
          id: string;
          name: string;
          role: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email: string;
          id: string;
          name: string;
          role: string;
          status?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          role?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      available_subjects: {
        Args: { p_lat?: number; p_lng?: number; p_max_km?: number };
        Returns: {
          id: number;
          name: string;
          teachers_in_range: number;
        }[];
      };
      can_swipe: { Args: { p_target: string }; Returns: boolean };
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      get_match: {
        Args: { p_match_id: number };
        Returns: {
          conversation_id: number;
          created_at: string;
          match_id: number;
          student_avatar_url: string;
          student_id: string;
          student_name: string;
          teacher_avatar_url: string;
          teacher_id: string;
          teacher_name: string;
        }[];
      };
      get_my_profile: {
        Args: Record<PropertyKey, never>;
        Returns: {
          avatar_url: string;
          bio: string;
          birth_date: string;
          cv: string;
          email: string;
          has_location: boolean;
          hourly_rate: number;
          id: string;
          name: string;
          role: string;
          subjects: string[];
        }[];
      };
      incoming_requests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          student_avatar_url: string;
          student_id: string;
          student_name: string;
        }[];
      };
      is_blocked_with: { Args: { p_other: string }; Returns: boolean };
      is_conversation_participant: { Args: { p_conversation_id: number }; Returns: boolean };
      my_conversations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          conversation_id: number;
          created_at: string;
          last_message_body: string;
          last_message_id: number;
          last_message_sender_id: string;
          last_message_sent_at: string;
          match_id: number;
          other_avatar_url: string;
          other_id: string;
          other_name: string;
          other_role: string;
        }[];
      };
      my_pending_requests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          teacher_avatar_url: string;
          teacher_id: string;
          teacher_name: string;
        }[];
      };
      search_teachers: {
        Args: {
          p_lat?: number;
          p_limit?: number;
          p_lng?: number;
          p_max_km?: number;
          p_only_unseen?: boolean;
          p_query?: string;
          p_subject_id?: number;
          p_teacher_id?: string;
        };
        Returns: {
          age: number;
          avatar_url: string;
          bio: string;
          cv: string;
          distance_km: number;
          hourly_rate: number;
          id: string;
          name: string;
          rating: number;
          review_count: number;
          subjects: string[];
        }[];
      };
      set_my_location: { Args: { p_lat: number; p_lng: number }; Returns: undefined };
      set_my_subjects: { Args: { p_names: string[] }; Returns: undefined };
      swipe: {
        Args: { p_action: string; p_target: string };
        Returns: {
          match_id: number;
          matched: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
