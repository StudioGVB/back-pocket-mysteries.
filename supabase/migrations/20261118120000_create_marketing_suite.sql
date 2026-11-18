-- ============================================================================
-- Back Pocket Mysteries Marketing Suite Schema:
-- 1. blog_posts
-- 2. social_posts
-- 3. social_post_captions
-- 4. edm_audience_groups, edm_campaigns, edm_events
-- ============================================================================

-- Ensure leads table exists
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  source VARCHAR(100) DEFAULT 'website',
  vip_rank INTEGER,
  qualifies_for_free_mystery BOOLEAN DEFAULT FALSE,
  free_mystery_code VARCHAR(100),
  code_sent_at TIMESTAMPTZ,
  marketing_consent BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage leads" ON public.leads;
CREATE POLICY "Admins can view and manage leads"
  ON public.leads
  FOR ALL
  TO authenticated
  USING (true);

-- 1. blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  excerpt TEXT,
  content TEXT,
  content_markdown TEXT,
  category TEXT DEFAULT 'Guides',
  tags TEXT[] DEFAULT '{}',
  featured_image_url TEXT,
  featured_image_alt TEXT,
  author_id UUID,
  author_name TEXT DEFAULT 'Alex Sterling',
  author_role TEXT DEFAULT 'Lead Story Architect',
  read_time TEXT DEFAULT '8 min read',
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  publish_date TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  meta_title TEXT,
  seo_description TEXT,
  focus_keyword TEXT,
  secondary_keywords TEXT[] DEFAULT '{}',
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  cta_enabled BOOLEAN DEFAULT TRUE,
  cta_type TEXT DEFAULT 'themes',
  no_index BOOLEAN DEFAULT FALSE,
  no_follow BOOLEAN DEFAULT FALSE,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_publish_date ON public.blog_posts(publish_date DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Allow scheduled (future-dated, non-draft) blog posts to be read by direct URL.
-- Public listings and sitemap filter on publish_date <= now() in application code,
-- and the post page sets noindex until publish_date <= now().
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
CREATE POLICY "Anyone can view published blog posts"
  ON public.blog_posts
  FOR SELECT
  TO public
  USING (is_draft = false);

DROP POLICY IF EXISTS "Authenticated users can manage blog posts" ON public.blog_posts;
CREATE POLICY "Authenticated users can manage blog posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. social_posts
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posting', 'posted', 'published', 'failed', 'partial_failed')),
  scheduled_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'Australia/Sydney',
  posted_at TIMESTAMPTZ,
  source_blog_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  content_type TEXT DEFAULT 'article_summary',
  slide_content JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON public.social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_source_blog_id ON public.social_posts(source_blog_id);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read social posts for card rendering" ON public.social_posts;
CREATE POLICY "Anyone can read social posts for card rendering"
  ON public.social_posts
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage social posts" ON public.social_posts;
CREATE POLICY "Authenticated users can manage social posts"
  ON public.social_posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. social_post_captions
CREATE TABLE IF NOT EXISTS public.social_post_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'instagram', 'facebook', 'instagram_facebook')),
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  post_url TEXT,
  engagement_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_post_captions_post_id ON public.social_post_captions(post_id);
CREATE INDEX IF NOT EXISTS idx_social_post_captions_platform ON public.social_post_captions(platform);

ALTER TABLE public.social_post_captions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read social post captions" ON public.social_post_captions;
CREATE POLICY "Anyone can read social post captions"
  ON public.social_post_captions
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage social post captions" ON public.social_post_captions;
CREATE POLICY "Authenticated users can manage social post captions"
  ON public.social_post_captions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. edm_audience_groups, edm_campaigns, edm_events
CREATE TABLE IF NOT EXISTS public.edm_audience_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#fe04c6',
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.edm_audience_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage edm_audience_groups" ON public.edm_audience_groups;
CREATE POLICY "Authenticated users can manage edm_audience_groups"
  ON public.edm_audience_groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.edm_audience_groups (id, name, description, color, member_count)
VALUES
  ('67858376-44bc-4956-a899-354c9f65cbe8', 'All Newsletter & VIP Leads', 'Subscribers from blog newsletter and First 50 VIP launch list', '#fe04c6', 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.edm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  preheader TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'archived')),
  scheduled_at TIMESTAMPTZ,
  scheduled_at_tz TEXT DEFAULT 'Australia/Sydney',
  sent_at TIMESTAMPTZ,
  audience_type TEXT DEFAULT 'group',
  audience_group_id UUID REFERENCES public.edm_audience_groups(id) ON DELETE SET NULL,
  from_name TEXT DEFAULT 'Gabby from Back Pocket Mysteries',
  from_email TEXT DEFAULT 'hello@backpocketmysteries.com',
  blocks_json JSONB DEFAULT '[]'::jsonb,
  html_content TEXT,
  global_styles_json JSONB DEFAULT '{}'::jsonb,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edm_campaigns_scheduled_at ON public.edm_campaigns(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_edm_campaigns_status ON public.edm_campaigns(status);

ALTER TABLE public.edm_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage edm_campaigns" ON public.edm_campaigns;
CREATE POLICY "Authenticated users can manage edm_campaigns"
  ON public.edm_campaigns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.edm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.edm_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID,
  recipient_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'opened', 'clicked', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edm_events_campaign_id ON public.edm_events(campaign_id);

ALTER TABLE public.edm_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage edm_events" ON public.edm_events;
CREATE POLICY "Authenticated users can manage edm_events"
  ON public.edm_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
