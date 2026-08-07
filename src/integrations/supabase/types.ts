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
  public: {
    Tables: {
      assessment_answers: {
        Row: {
          created_at: string
          id: string
          question_id: string
          reverse_coded: boolean
          session_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          reverse_coded?: boolean
          session_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          reverse_coded?: boolean
          session_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          is_mini: boolean
          level: number
          reverse_coded: boolean
          sort_order: number
          text_en: string | null
          text_tr: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          is_mini?: boolean
          level: number
          reverse_coded?: boolean
          sort_order?: number
          text_en?: string | null
          text_tr: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          is_mini?: boolean
          level?: number
          reverse_coded?: boolean
          sort_order?: number
          text_en?: string | null
          text_tr?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          created_at: string
          id: string
          intelligence_scores: Json
          level_scores: Json
          session_id: string
          summary_band: Json
        }
        Insert: {
          created_at?: string
          id?: string
          intelligence_scores?: Json
          level_scores?: Json
          session_id: string
          summary_band?: Json
        }
        Update: {
          created_at?: string
          id?: string
          intelligence_scores?: Json
          level_scores?: Json
          session_id?: string
          summary_band?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_sessions: {
        Row: {
          client_invite_id: string | null
          completed_at: string | null
          created_at: string
          guest_token: string | null
          id: string
          instrument_version: number
          locale: string
          research_consent: boolean
          research_consent_at: string | null
          research_consent_version: string | null
          research_consent_withdrawn_at: string | null
          research_id: string
          started_at: string
          status: Database["public"]["Enums"]["assessment_status"]
          type: Database["public"]["Enums"]["assessment_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_invite_id?: string | null
          completed_at?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          instrument_version?: number
          locale?: string
          research_consent?: boolean
          research_consent_at?: string | null
          research_consent_version?: string | null
          research_consent_withdrawn_at?: string | null
          research_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          type: Database["public"]["Enums"]["assessment_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_invite_id?: string | null
          completed_at?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          instrument_version?: number
          locale?: string
          research_consent?: boolean
          research_consent_at?: string | null
          research_consent_version?: string | null
          research_consent_withdrawn_at?: string | null
          research_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_status"]
          type?: Database["public"]["Enums"]["assessment_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bank_transfer_details: {
        Row: {
          account_holder: string
          bank_name: string
          created_at: string
          currency: string
          iban: string
          id: boolean
          note: string | null
          updated_at: string
        }
        Insert: {
          account_holder?: string
          bank_name?: string
          created_at?: string
          currency?: string
          iban?: string
          id?: boolean
          note?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string
          bank_name?: string
          created_at?: string
          currency?: string
          iban?: string
          id?: boolean
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string
          content: string
          content_en: string | null
          cover_image_url: string | null
          cover_image_url_en: string | null
          created_at: string
          id: string
          published: boolean
          published_at: string
          seo_description: string
          seo_description_en: string | null
          slug: string
          sort_order: number
          title: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          content_en?: string | null
          cover_image_url?: string | null
          cover_image_url_en?: string | null
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string
          seo_description: string
          seo_description_en?: string | null
          slug: string
          sort_order?: number
          title: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          content_en?: string | null
          cover_image_url?: string | null
          cover_image_url_en?: string | null
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string
          seo_description?: string
          seo_description_en?: string | null
          slug?: string
          sort_order?: number
          title?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      book_editions: {
        Row: {
          active: boolean
          asin: string | null
          book_key: string
          created_at: string
          external_url: string | null
          format: string
          id: string
          language: string
          marketplaces: string[]
          overrides: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          asin?: string | null
          book_key: string
          created_at?: string
          external_url?: string | null
          format: string
          id?: string
          language?: string
          marketplaces?: string[]
          overrides?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          asin?: string | null
          book_key?: string
          created_at?: string
          external_url?: string | null
          format?: string
          id?: string
          language?: string
          marketplaces?: string[]
          overrides?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          id: string
          product_slug: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          id?: string
          product_slug: string
          quantity?: number
        }
        Update: {
          bundle_id?: string
          id?: string
          product_slug?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          activate_at: string | null
          active: boolean
          book_key: string
          created_at: string
          description_en: string | null
          description_tr: string | null
          discount_percent: number
          id: string
          includes_book: boolean
          locked_to_product_slug: string | null
          name_en: string | null
          name_tr: string
          price_override_cents: number | null
          pricing_mode: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          activate_at?: string | null
          active?: boolean
          book_key: string
          created_at?: string
          description_en?: string | null
          description_tr?: string | null
          discount_percent?: number
          id?: string
          includes_book?: boolean
          locked_to_product_slug?: string | null
          name_en?: string | null
          name_tr: string
          price_override_cents?: number | null
          pricing_mode: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          activate_at?: string | null
          active?: boolean
          book_key?: string
          created_at?: string
          description_en?: string | null
          description_tr?: string | null
          discount_percent?: number
          id?: string
          includes_book?: boolean
          locked_to_product_slug?: string | null
          name_en?: string | null
          name_tr?: string
          price_override_cents?: number | null
          pricing_mode?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          ip_hash: string | null
          is_read: boolean
          locale: string
          message: string
          read_at: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          ip_hash?: string | null
          is_read?: boolean
          locale?: string
          message: string
          read_at?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          ip_hash?: string | null
          is_read?: boolean
          locale?: string
          message?: string
          read_at?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      ebook_dedication_templates: {
        Row: {
          author_name: string
          body_template: string
          footer_template: string
          id: string
          locale: string
          signature_path: string | null
          updated_at: string
        }
        Insert: {
          author_name?: string
          body_template: string
          footer_template: string
          id?: string
          locale: string
          signature_path?: string | null
          updated_at?: string
        }
        Update: {
          author_name?: string
          body_template?: string
          footer_template?: string
          id?: string
          locale?: string
          signature_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ebook_gifts: {
        Row: {
          buyer_user_id: string
          claim_token: string
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          gift_note: string | null
          id: string
          order_id: string
          personalized_pdf_path: string | null
          product_slug: string
          recipient_email: string
          recipient_name: string
          status: string
        }
        Insert: {
          buyer_user_id: string
          claim_token: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          gift_note?: string | null
          id?: string
          order_id: string
          personalized_pdf_path?: string | null
          product_slug: string
          recipient_email: string
          recipient_name: string
          status?: string
        }
        Update: {
          buyer_user_id?: string
          claim_token?: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          gift_note?: string | null
          id?: string
          order_id?: string
          personalized_pdf_path?: string | null
          product_slug?: string
          recipient_email?: string
          recipient_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebook_gifts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      instrument_item_snapshots: {
        Row: {
          active: boolean
          awareness_item: boolean
          capacity: string | null
          created_at: string
          id: string
          instrument: string
          instrument_version_id: string
          is_mini: boolean
          is_pilot_only: boolean
          item_code: string | null
          level: number
          question_id: string
          reverse_coded: boolean
          sort_order: number
          text_en: string | null
          text_tr: string
          version: number
        }
        Insert: {
          active?: boolean
          awareness_item?: boolean
          capacity?: string | null
          created_at?: string
          id?: string
          instrument: string
          instrument_version_id: string
          is_mini?: boolean
          is_pilot_only?: boolean
          item_code?: string | null
          level: number
          question_id: string
          reverse_coded?: boolean
          sort_order?: number
          text_en?: string | null
          text_tr: string
          version: number
        }
        Update: {
          active?: boolean
          awareness_item?: boolean
          capacity?: string | null
          created_at?: string
          id?: string
          instrument?: string
          instrument_version_id?: string
          is_mini?: boolean
          is_pilot_only?: boolean
          item_code?: string | null
          level?: number
          question_id?: string
          reverse_coded?: boolean
          sort_order?: number
          text_en?: string | null
          text_tr?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "instrument_item_snapshots_instrument_version_id_fkey"
            columns: ["instrument_version_id"]
            isOneToOne: false
            referencedRelation: "instrument_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      instrument_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          instrument: string
          is_current: boolean
          label: string | null
          notes: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          instrument: string
          is_current?: boolean
          label?: string | null
          notes?: string | null
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          instrument?: string
          is_current?: boolean
          label?: string | null
          notes?: string | null
          version?: number
        }
        Relationships: []
      }
      license_inquiries: {
        Row: {
          admin_note: string | null
          annual_trainee_volume: number | null
          city: string | null
          consent: boolean
          country: string | null
          created_at: string
          current_programmes: string | null
          email: string
          existing_business_area: string | null
          expected_timeline: string | null
          full_name: string
          gtm_approach: string | null
          id: string
          institution_type: string | null
          intended_use: string | null
          ip_hash: string | null
          message: string
          organisation: string | null
          phone: string | null
          role: string | null
          status: string
          target_territory: string | null
          team_size: number | null
          trainer_count: number | null
          type: string
          updated_at: string
          website: string | null
          why_pfa: string | null
          years_in_field: number | null
        }
        Insert: {
          admin_note?: string | null
          annual_trainee_volume?: number | null
          city?: string | null
          consent?: boolean
          country?: string | null
          created_at?: string
          current_programmes?: string | null
          email: string
          existing_business_area?: string | null
          expected_timeline?: string | null
          full_name: string
          gtm_approach?: string | null
          id?: string
          institution_type?: string | null
          intended_use?: string | null
          ip_hash?: string | null
          message: string
          organisation?: string | null
          phone?: string | null
          role?: string | null
          status?: string
          target_territory?: string | null
          team_size?: number | null
          trainer_count?: number | null
          type: string
          updated_at?: string
          website?: string | null
          why_pfa?: string | null
          years_in_field?: number | null
        }
        Update: {
          admin_note?: string | null
          annual_trainee_volume?: number | null
          city?: string | null
          consent?: boolean
          country?: string | null
          created_at?: string
          current_programmes?: string | null
          email?: string
          existing_business_area?: string | null
          expected_timeline?: string | null
          full_name?: string
          gtm_approach?: string | null
          id?: string
          institution_type?: string | null
          intended_use?: string | null
          ip_hash?: string | null
          message?: string
          organisation?: string | null
          phone?: string | null
          role?: string | null
          status?: string
          target_territory?: string | null
          team_size?: number | null
          trainer_count?: number | null
          type?: string
          updated_at?: string
          website?: string | null
          why_pfa?: string | null
          years_in_field?: number | null
        }
        Relationships: []
      }
      newsletter_issues: {
        Row: {
          content_md: string
          created_at: string
          id: string
          scheduled_note: string | null
          segment: Database["public"]["Enums"]["newsletter_target_segment"]
          sent_at: string | null
          sent_count: number | null
          status: Database["public"]["Enums"]["newsletter_issue_status"]
          title: string
          updated_at: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          id?: string
          scheduled_note?: string | null
          segment?: Database["public"]["Enums"]["newsletter_target_segment"]
          sent_at?: string | null
          sent_count?: number | null
          status?: Database["public"]["Enums"]["newsletter_issue_status"]
          title: string
          updated_at?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          scheduled_note?: string | null
          segment?: Database["public"]["Enums"]["newsletter_target_segment"]
          sent_at?: string | null
          sent_count?: number | null
          status?: Database["public"]["Enums"]["newsletter_issue_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          confirm_token: string
          confirmed: boolean
          confirmed_at: string | null
          consent: boolean
          created_at: string
          email: string
          full_name: string | null
          id: string
          locale: string
          segment: Database["public"]["Enums"]["newsletter_segment"]
          source: string | null
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confirm_token?: string
          confirmed?: boolean
          confirmed_at?: string | null
          consent?: boolean
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          locale?: string
          segment: Database["public"]["Enums"]["newsletter_segment"]
          source?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confirm_token?: string
          confirmed?: boolean
          confirmed_at?: string | null
          consent?: boolean
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          segment?: Database["public"]["Enums"]["newsletter_segment"]
          source?: string | null
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      newsletter_suppressions: {
        Row: {
          email: string
          source: string | null
          unsubscribed_at: string
        }
        Insert: {
          email: string
          source?: string | null
          unsubscribed_at?: string
        }
        Update: {
          email?: string
          source?: string | null
          unsubscribed_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          bundle_slug: string | null
          created_at: string
          currency: string
          id: string
          is_test: boolean
          metadata: Json
          product_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          bundle_slug?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_test?: boolean
          metadata?: Json
          product_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          bundle_slug?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_test?: boolean
          metadata?: Json
          product_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_episodes: {
        Row: {
          created_at: string
          description: string
          description_en: string | null
          episode_number: number
          id: string
          published: boolean
          spotify_embed_url: string
          spotify_url: string
          title: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          description_en?: string | null
          episode_number: number
          id?: string
          published?: boolean
          spotify_embed_url: string
          spotify_url: string
          title: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          description_en?: string | null
          episode_number?: number
          id?: string
          published?: boolean
          spotify_embed_url?: string
          spotify_url?: string
          title?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      practitioner_applications: {
        Row: {
          admin_note: string | null
          category: Database["public"]["Enums"]["practitioner_category"]
          city: string | null
          created_at: string
          cv_path: string | null
          diploma_path: string | null
          email: string
          experience_years: number | null
          full_name: string
          id: string
          ip_hash: string | null
          kvkk_accepted: boolean
          motivation: string
          phone: string | null
          profession_title: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          category: Database["public"]["Enums"]["practitioner_category"]
          city?: string | null
          created_at?: string
          cv_path?: string | null
          diploma_path?: string | null
          email: string
          experience_years?: number | null
          full_name: string
          id?: string
          ip_hash?: string | null
          kvkk_accepted?: boolean
          motivation: string
          phone?: string | null
          profession_title?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          category?: Database["public"]["Enums"]["practitioner_category"]
          city?: string | null
          created_at?: string
          cv_path?: string | null
          diploma_path?: string | null
          email?: string
          experience_years?: number | null
          full_name?: string
          id?: string
          ip_hash?: string | null
          kvkk_accepted?: boolean
          motivation?: string
          phone?: string | null
          profession_title?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      practitioner_inquiries: {
        Row: {
          created_at: string
          id: string
          locale: string
          message: string
          practitioner_id: string
          sender_email: string
          sender_name: string
          status: Database["public"]["Enums"]["practitioner_inquiry_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string
          message: string
          practitioner_id: string
          sender_email: string
          sender_name: string
          status?: Database["public"]["Enums"]["practitioner_inquiry_status"]
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          message?: string
          practitioner_id?: string
          sender_email?: string
          sender_name?: string
          status?: Database["public"]["Enums"]["practitioner_inquiry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_inquiries_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_inquiries_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioners: {
        Row: {
          category: Database["public"]["Enums"]["practitioner_category"]
          city: string | null
          country: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          languages: string[]
          long_bio: string | null
          mode: Database["public"]["Enums"]["practitioner_mode"]
          photo_url: string | null
          published: boolean
          short_bio: string | null
          sort_order: number
          specializations: string[]
          title: string | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["practitioner_category"]
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          languages?: string[]
          long_bio?: string | null
          mode?: Database["public"]["Enums"]["practitioner_mode"]
          photo_url?: string | null
          published?: boolean
          short_bio?: string | null
          sort_order?: number
          specializations?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["practitioner_category"]
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          languages?: string[]
          long_bio?: string | null
          mode?: Database["public"]["Enums"]["practitioner_mode"]
          photo_url?: string | null
          published?: boolean
          short_bio?: string | null
          sort_order?: number
          specializations?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pro_client_invites: {
        Row: {
          client_name: string
          created_at: string
          id: string
          pro_user_id: string
          status: Database["public"]["Enums"]["invite_status"]
          token: string
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          id?: string
          pro_user_id: string
          status?: Database["public"]["Enums"]["invite_status"]
          token: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          pro_user_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          activate_at: string | null
          active: boolean
          book_key: string | null
          category: string
          cover_image_url: string | null
          created_at: string
          currency: string
          description_en: string | null
          description_tr: string | null
          id: string
          language: string
          master_epub_path: string | null
          master_pdf_path: string | null
          name_en: string
          name_tr: string
          price_cents: number
          slug: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
        }
        Insert: {
          activate_at?: string | null
          active?: boolean
          book_key?: string | null
          category?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description_en?: string | null
          description_tr?: string | null
          id?: string
          language?: string
          master_epub_path?: string | null
          master_pdf_path?: string | null
          name_en: string
          name_tr: string
          price_cents: number
          slug: string
          type: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Update: {
          activate_at?: string | null
          active?: boolean
          book_key?: string | null
          category?: string
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description_en?: string | null
          description_tr?: string | null
          id?: string
          language?: string
          master_epub_path?: string | null
          master_pdf_path?: string | null
          name_en?: string
          name_tr?: string
          price_cents?: number
          slug?: string
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          preferred_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_inquiries: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          ip_hash: string | null
          kind: string
          locale: string
          message: string | null
          payment_reference: string | null
          phone: string | null
          preferred_slot: string | null
          product_label: string | null
          product_slug: string
          status: string
          transfer_amount: number | null
          transfer_currency: string
          transfer_sent_at: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          ip_hash?: string | null
          kind?: string
          locale?: string
          message?: string | null
          payment_reference?: string | null
          phone?: string | null
          preferred_slot?: string | null
          product_label?: string | null
          product_slug: string
          status?: string
          transfer_amount?: number | null
          transfer_currency?: string
          transfer_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          ip_hash?: string | null
          kind?: string
          locale?: string
          message?: string | null
          payment_reference?: string | null
          phone?: string | null
          preferred_slot?: string | null
          product_label?: string | null
          product_slug?: string
          status?: string
          transfer_amount?: number | null
          transfer_currency?: string
          transfer_sent_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      research_consent_versions: {
        Row: {
          active: boolean
          body_md: string
          created_at: string
          effective_at: string
          locale: string
          title: string
          version: string
        }
        Insert: {
          active?: boolean
          body_md: string
          created_at?: string
          effective_at?: string
          locale?: string
          title: string
          version: string
        }
        Update: {
          active?: boolean
          body_md?: string
          created_at?: string
          effective_at?: string
          locale?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      respondent_demographics: {
        Row: {
          age_band: string | null
          created_at: string
          education: string | null
          gender: string | null
          occupation_field: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_band?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          occupation_field?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_band?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          occupation_field?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_availability: {
        Row: {
          active: boolean
          created_at: string
          id: string
          note: string | null
          practitioner_id: string | null
          slot_time: string
          sort_order: number
          updated_at: string
          weekday: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          note?: string | null
          practitioner_id?: string | null
          slot_time: string
          sort_order?: number
          updated_at?: string
          weekday: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          note?: string | null
          practitioner_id?: string | null
          slot_time?: string
          sort_order?: number
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_availability_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_availability_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sevenq_answers: {
        Row: {
          created_at: string
          id: string
          question_id: string
          session_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          session_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          session_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sevenq_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sevenq_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sevenq_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sevenq_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sevenq_questions: {
        Row: {
          active: boolean
          awareness_item: boolean
          capacity: string
          created_at: string
          id: string
          is_pilot_only: boolean
          item_code: string
          level: number
          sort_order: number
          text_en: string | null
          text_tr: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          awareness_item?: boolean
          capacity: string
          created_at?: string
          id?: string
          is_pilot_only?: boolean
          item_code: string
          level: number
          sort_order: number
          text_en?: string | null
          text_tr: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          awareness_item?: boolean
          capacity?: string
          created_at?: string
          id?: string
          is_pilot_only?: boolean
          item_code?: string
          level?: number
          sort_order?: number
          text_en?: string | null
          text_tr?: string
          updated_at?: string
        }
        Relationships: []
      }
      sevenq_results: {
        Row: {
          akort: number
          awareness_score: number
          capacity_scores: Json
          created_at: string
          id: string
          level_scores: Json
          session_id: string
          total_score: number
        }
        Insert: {
          akort?: number
          awareness_score?: number
          capacity_scores?: Json
          created_at?: string
          id?: string
          level_scores?: Json
          session_id: string
          total_score?: number
        }
        Update: {
          akort?: number
          awareness_score?: number
          capacity_scores?: Json
          created_at?: string
          id?: string
          level_scores?: Json
          session_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "sevenq_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sevenq_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sevenq_sessions: {
        Row: {
          client_invite_id: string | null
          completed_at: string | null
          created_at: string
          guest_token: string | null
          id: string
          instrument_version: number
          locale: string
          research_consent: boolean
          research_consent_at: string | null
          research_consent_version: string | null
          research_consent_withdrawn_at: string | null
          research_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_invite_id?: string | null
          completed_at?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          instrument_version?: number
          locale?: string
          research_consent?: boolean
          research_consent_at?: string | null
          research_consent_version?: string | null
          research_consent_withdrawn_at?: string | null
          research_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_invite_id?: string | null
          completed_at?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          instrument_version?: number
          locale?: string
          research_consent?: boolean
          research_consent_at?: string | null
          research_consent_version?: string | null
          research_consent_withdrawn_at?: string | null
          research_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sevenq_sessions_client_invite_id_fkey"
            columns: ["client_invite_id"]
            isOneToOne: false
            referencedRelation: "pro_client_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_media: {
        Row: {
          byte_size: number
          created_at: string
          has_transparency: boolean
          height: number
          id: string
          label: string | null
          mime_type: string
          original_filename: string
          public_url: string
          storage_path: string
          tags: string[]
          updated_at: string
          uploaded_by: string | null
          width: number
        }
        Insert: {
          byte_size: number
          created_at?: string
          has_transparency?: boolean
          height?: number
          id?: string
          label?: string | null
          mime_type: string
          original_filename: string
          public_url: string
          storage_path: string
          tags?: string[]
          updated_at?: string
          uploaded_by?: string | null
          width?: number
        }
        Update: {
          byte_size?: number
          created_at?: string
          has_transparency?: boolean
          height?: number
          id?: string
          label?: string | null
          mime_type?: string
          original_filename?: string
          public_url?: string
          storage_path?: string
          tags?: string[]
          updated_at?: string
          uploaded_by?: string | null
          width?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          source_order_id: string | null
          type: Database["public"]["Enums"]["entitlement_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          source_order_id?: string | null
          type: Database["public"]["Enums"]["entitlement_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          source_order_id?: string | null
          type?: Database["public"]["Enums"]["entitlement_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlements_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webinar_reminders: {
        Row: {
          created_at: string
          email: string
          id: string
          reminder_sent_at: string
          updated_at: string
          user_id: string | null
          webinar_session_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reminder_sent_at?: string
          updated_at?: string
          user_id?: string | null
          webinar_session_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reminder_sent_at?: string
          updated_at?: string
          user_id?: string | null
          webinar_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_reminders_webinar_session_id_fkey"
            columns: ["webinar_session_id"]
            isOneToOne: false
            referencedRelation: "webinar_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinar_reminders_webinar_session_id_fkey"
            columns: ["webinar_session_id"]
            isOneToOne: false
            referencedRelation: "webinar_sessions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      webinar_sessions: {
        Row: {
          banner_url: string | null
          capacity: number | null
          created_at: string
          id: string
          join_url: string | null
          notes: string | null
          product_id: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          join_url?: string | null
          notes?: string | null
          product_id: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          join_url?: string | null
          notes?: string | null
          product_id?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_sessions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      practitioners_public: {
        Row: {
          category: Database["public"]["Enums"]["practitioner_category"] | null
          city: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          languages: string[] | null
          long_bio: string | null
          mode: Database["public"]["Enums"]["practitioner_mode"] | null
          photo_url: string | null
          short_bio: string | null
          sort_order: number | null
          specializations: string[] | null
          title: string | null
          website: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["practitioner_category"] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          languages?: string[] | null
          long_bio?: string | null
          mode?: Database["public"]["Enums"]["practitioner_mode"] | null
          photo_url?: string | null
          short_bio?: string | null
          sort_order?: number | null
          specializations?: string[] | null
          title?: string | null
          website?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["practitioner_category"] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          languages?: string[] | null
          long_bio?: string | null
          mode?: Database["public"]["Enums"]["practitioner_mode"] | null
          photo_url?: string | null
          short_bio?: string | null
          sort_order?: number | null
          specializations?: string[] | null
          title?: string | null
          website?: string | null
        }
        Relationships: []
      }
      research_pfa_responses: {
        Row: {
          age_band: string | null
          completed_at: string | null
          education: string | null
          gender: string | null
          instrument_version: number | null
          item_code: string | null
          item_text_tr: string | null
          level: number | null
          occupation_field: string | null
          question_id: string | null
          research_consent_version: string | null
          research_id: string | null
          reverse_coded: boolean | null
          session_type: string | null
          started_at: string | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sevenq_responses: {
        Row: {
          age_band: string | null
          awareness_item: boolean | null
          capacity: string | null
          completed_at: string | null
          education: string | null
          gender: string | null
          instrument_version: number | null
          is_pilot_only: boolean | null
          item_code: string | null
          item_text_tr: string | null
          level: number | null
          occupation_field: string | null
          question_id: string | null
          research_consent_version: string | null
          research_id: string | null
          started_at: string | null
          status: string | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sevenq_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sevenq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      webinar_sessions_public: {
        Row: {
          banner_url: string | null
          capacity: number | null
          created_at: string | null
          id: string | null
          product_id: string | null
          starts_at: string | null
          title: string | null
        }
        Insert: {
          banner_url?: string | null
          capacity?: number | null
          created_at?: string | null
          id?: string | null
          product_id?: string | null
          starts_at?: string | null
          title?: string | null
        }
        Update: {
          banner_url?: string | null
          capacity?: number | null
          created_at?: string | null
          id?: string | null
          product_id?: string | null
          starts_at?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webinar_sessions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_set_client_quota: {
        Args: { _entitlement_id: string; _quota: number; _used: number }
        Returns: undefined
      }
      bump_instrument_version: {
        Args: { _instrument: string; _label?: string; _notes?: string }
        Returns: number
      }
      can_view_assessment_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      can_view_sevenq_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      claim_ebook_gift: { Args: { _token: string }; Returns: string }
      create_pro_invite: {
        Args: { _client_name: string }
        Returns: {
          client_name: string
          created_at: string
          id: string
          pro_user_id: string
          status: Database["public"]["Enums"]["invite_status"]
          token: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "pro_client_invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_instrument_version: {
        Args: { _instrument: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      instrument_version_locked: {
        Args: { _instrument: string }
        Returns: boolean
      }
      my_research_consent: {
        Args: never
        Returns: {
          consent_version: string
          consented: boolean
          consented_at: string
          session_count: number
        }[]
      }
      refresh_instrument_snapshot: {
        Args: { _instrument: string }
        Returns: undefined
      }
      withdraw_research_consent: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "user" | "pro" | "admin"
      application_status: "yeni" | "incelemede" | "gorusme" | "kabul" | "red"
      assessment_status: "in_progress" | "completed"
      assessment_type: "mini" | "full"
      entitlement_type:
        | "ebook"
        | "assessment_full"
        | "webinar_bsc"
        | "pfa_pro"
        | "session"
      invite_status: "pending" | "completed"
      newsletter_issue_status: "taslak" | "gonderildi"
      newsletter_segment: "merakli" | "profesyonel" | "kurumsal"
      newsletter_target_segment: "merakli" | "profesyonel" | "kurumsal" | "tumu"
      order_status: "pending" | "paid" | "failed"
      practitioner_category: "terapotik" | "kocluk" | "pedagojik" | "kurumsal"
      practitioner_inquiry_status: "acik" | "yanitlandi"
      practitioner_mode: "online" | "yuz_yuze" | "her_ikisi"
      product_type: "session" | "webinar" | "assessment" | "ebook"
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
      app_role: ["user", "pro", "admin"],
      application_status: ["yeni", "incelemede", "gorusme", "kabul", "red"],
      assessment_status: ["in_progress", "completed"],
      assessment_type: ["mini", "full"],
      entitlement_type: [
        "ebook",
        "assessment_full",
        "webinar_bsc",
        "pfa_pro",
        "session",
      ],
      invite_status: ["pending", "completed"],
      newsletter_issue_status: ["taslak", "gonderildi"],
      newsletter_segment: ["merakli", "profesyonel", "kurumsal"],
      newsletter_target_segment: ["merakli", "profesyonel", "kurumsal", "tumu"],
      order_status: ["pending", "paid", "failed"],
      practitioner_category: ["terapotik", "kocluk", "pedagojik", "kurumsal"],
      practitioner_inquiry_status: ["acik", "yanitlandi"],
      practitioner_mode: ["online", "yuz_yuze", "her_ikisi"],
      product_type: ["session", "webinar", "assessment", "ebook"],
    },
  },
} as const
