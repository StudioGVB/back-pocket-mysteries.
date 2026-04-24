export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRoleType = 'admin' | 'superadmin' | 'customer' | string
export type MysteryStatus = 'draft' | 'published' | 'archived'
export type Archetype = 'hero' | 'villain' | 'sidekick' | 'victim' | 'witness' | 'investigator'
export type VictimRelationship = 'spouse' | 'sibling' | 'friend' | 'enemy' | 'stranger' | 'colleague'
export type MotiveType = 'revenge' | 'greed' | 'love' | 'fear' | 'justice' | 'power' | 'jealousy' | 'betrayal' | 'heartbreak' | 'desperation' | 'blackmail' | 'hatred'
export type ClueType = 'physical' | 'testimony' | 'background' | 'secret'
export type ImplicationType = 'direct' | 'circumstantial' | 'red_herring'
export type EvidenceStatus = 'real' | 'fake' | 'planted'
export type InvestigationRole = 'lead' | 'supporting' | 'background'
export type BeatType = 'discovery' | 'confrontation' | 'clue_reveal' | 'twist' | 'conclusion'
export type TimelinePhase = 'pre_crime' | 'crime' | 'investigation' | 'resolution'
export type MotiveStrength = 'low' | 'moderate' | 'high' | 'critical'
export type MysteryComplexity = 'easy' | 'medium' | 'hard'
export type MysterySpiceLevel = 'low' | 'medium' | 'high'
export type OrderStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'
export type PlotRole = 'innocent' | 'killer' | 'assistant' | 'victim'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: UserRoleType
        }
        Insert: {
          id?: string
          user_id: string
          role: UserRoleType
        }
        Update: {
          id?: string
          user_id?: string
          role?: UserRoleType
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      leads: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      mysteries: {
        Row: {
          id: string
          title: string
          theme: string | null
          status: MysteryStatus
          min_players: number
          max_players: number
          complexity: MysteryComplexity | null
          spice_level: MysterySpiceLevel | null
          description: string | null
          image_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          theme?: string | null
          status?: MysteryStatus
          min_players?: number
          max_players?: number
          complexity?: MysteryComplexity | null
          spice_level?: MysterySpiceLevel | null
          description?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          theme?: string | null
          status?: MysteryStatus
          min_players?: number
          max_players?: number
          complexity?: MysteryComplexity | null
          spice_level?: MysterySpiceLevel | null
          description?: string | null
          image_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      plot_beats: {
        Row: {
          id: string
          mystery_id: string
          beat_number: number
          event_title: string
          description: string | null
          characters_involved: string[]
          is_required: boolean
          beat_type: BeatType | null
          timeline_phase: TimelinePhase | null
          story_function: string | null
          intensity_level: number | null
          suspect_pressure: number | null
          twist_weight: number | null
          recommended_clue_count: number | null
          is_crime_adjacent: boolean | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          mystery_id: string
          beat_number: number
          event_title: string
          description?: string | null
          characters_involved?: string[]
          is_required?: boolean
          beat_type?: BeatType | null
          timeline_phase?: TimelinePhase | null
          story_function?: string | null
          intensity_level?: number | null
          suspect_pressure?: number | null
          twist_weight?: number | null
          recommended_clue_count?: number | null
          is_crime_adjacent?: boolean | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          mystery_id?: string
          beat_number?: number
          event_title?: string
          description?: string | null
          characters_involved?: string[]
          is_required?: boolean
          beat_type?: BeatType | null
          timeline_phase?: TimelinePhase | null
          story_function?: string | null
          intensity_level?: number | null
          suspect_pressure?: number | null
          twist_weight?: number | null
          recommended_clue_count?: number | null
          is_crime_adjacent?: boolean | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      characters: {
        Row: {
          id: string
          mystery_id: string
          name: string
          archetype: Archetype | null
          is_mandatory: boolean
          min_player_count: number | null
          victim_relationship: VictimRelationship | null
          murder_involvement: string[]
          motive_type: MotiveType | null
          motive_linked_character_id: string | null
          created_at: string
          is_victim: boolean
          plot_role: PlotRole | null
          profile_data: Json | null
          gender: 'male' | 'female' | 'adaptable' | null
        }
        Insert: {
          id?: string
          mystery_id: string
          name: string
          archetype?: Archetype | null
          is_mandatory?: boolean
          min_player_count?: number | null
          victim_relationship?: VictimRelationship | null
          murder_involvement?: string[]
          motive_type?: MotiveType | null
          motive_linked_character_id?: string | null
          created_at?: string
          is_victim?: boolean
          plot_role?: PlotRole | null
          profile_data?: Json | null
          gender?: 'male' | 'female' | 'adaptable' | null
        }
        Update: {
          id?: string
          mystery_id?: string
          name?: string
          archetype?: Archetype | null
          is_mandatory?: boolean
          min_player_count?: number | null
          victim_relationship?: VictimRelationship | null
          murder_involvement?: string[]
          motive_type?: MotiveType | null
          motive_linked_character_id?: string | null
          created_at?: string
          is_victim?: boolean
          plot_role?: PlotRole | null
          profile_data?: Json | null
          gender?: 'male' | 'female' | 'adaptable' | null
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      clues: {
        Row: {
          id: string
          mystery_id: string
          title: string
          clue_type: ClueType | null
          implication_type: ImplicationType | null
          round_number: number | null
          is_essential: boolean
          created_at: string
          linked_plot_beat_id: string | null
          is_optional: boolean
          evidence_status: EvidenceStatus | null
          description: string | null
          internal_notes: string | null
          updated_at: string
          reveal_round_priority: number | null
          investigation_role: InvestigationRole | null
          asset_mode: 'static' | 'generated' | null
          static_image_url: string | null
          generation_prompt: string | null
          template_text: string | null
          linked_subplot_beat_id: string | null
        }
        Insert: {
          id?: string
          mystery_id: string
          title: string
          clue_type?: ClueType | null
          implication_type?: ImplicationType | null
          round_number?: number | null
          is_essential?: boolean
          created_at?: string
          linked_plot_beat_id?: string | null
          is_optional?: boolean
          evidence_status?: EvidenceStatus | null
          description?: string | null
          internal_notes?: string | null
          updated_at?: string
          reveal_round_priority?: number | null
          investigation_role?: InvestigationRole | null
          asset_mode?: 'static' | 'generated' | null
          static_image_url?: string | null
          generation_prompt?: string | null
          template_text?: string | null
          linked_subplot_beat_id?: string | null
        }
        Update: {
          id?: string
          mystery_id?: string
          title?: string
          clue_type?: ClueType | null
          implication_type?: ImplicationType | null
          round_number?: number | null
          is_essential?: boolean
          created_at?: string
          linked_plot_beat_id?: string | null
          is_optional?: boolean
          evidence_status?: EvidenceStatus | null
          description?: string | null
          internal_notes?: string | null
          updated_at?: string
          reveal_round_priority?: number | null
          investigation_role?: InvestigationRole | null
          asset_mode?: 'static' | 'generated' | null
          static_image_url?: string | null
          generation_prompt?: string | null
          template_text?: string | null
          linked_subplot_beat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      subplots: {
        Row: {
          id: string
          mystery_id: string
          title: string
          description: string | null
          primary_character_id: string | null
          secondary_character_id: string | null
          theme: string | null
          created_at: string
        }
        Insert: {
          id?: string
          mystery_id: string
          title: string
          description?: string | null
          primary_character_id?: string | null
          secondary_character_id?: string | null
          theme?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          mystery_id?: string
          title?: string
          description?: string | null
          primary_character_id?: string | null
          secondary_character_id?: string | null
          theme?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      subplot_beats: {
        Row: {
          id: string
          subplot_id: string
          beat_number: number
          description: string
          linked_plot_beat_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subplot_id: string
          beat_number: number
          description: string
          linked_plot_beat_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subplot_id?: string
          beat_number?: number
          description?: string
          linked_plot_beat_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      motives: {
        Row: {
          id: string
          mystery_id: string
          character_id: string
          motive_type: MotiveType | null
          strength: MotiveStrength | null
          linked_character_id: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          mystery_id: string
          character_id: string
          motive_type?: MotiveType | null
          strength?: MotiveStrength | null
          linked_character_id?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          mystery_id?: string
          character_id?: string
          motive_type?: MotiveType | null
          strength?: MotiveStrength | null
          linked_character_id?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      relationships: {
        Row: {
          id: string
          mystery_id: string
          character_a_id: string
          character_b_id: string
          know_each_other: boolean
          dynamics: string[] | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mystery_id: string
          character_a_id: string
          character_b_id: string
          know_each_other?: boolean
          dynamics?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mystery_id?: string
          character_a_id?: string
          character_b_id?: string
          know_each_other?: boolean
          dynamics?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          user_id: string
          mystery_id: string
          amount: number
          currency: string
          status: OrderStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mystery_id: string
          amount: number
          currency?: string
          status?: OrderStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mystery_id?: string
          amount?: number
          currency?: string
          status?: OrderStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: string
            columns: string[]
            isOneToOne?: boolean
            referencedRelation: string
            referencedColumns: string[]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

