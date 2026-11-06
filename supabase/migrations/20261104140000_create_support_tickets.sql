-- 1. Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT NOT NULL,
  mystery_id UUID REFERENCES public.mysteries(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('bug', 'mystery_content', 'billing', 'feature_request', 'general')),
  subject TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  last_reply_by TEXT NOT NULL DEFAULT 'customer' CHECK (last_reply_by IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_severity ON public.support_tickets (status, severity);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON public.support_tickets (updated_at DESC);

-- 2. Create support_ticket_messages table (the text chain & status timeline)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin', 'system')),
  sender_name TEXT,
  message TEXT NOT NULL,
  attachment_urls TEXT[] NOT NULL DEFAULT '{}',
  status_change_to TEXT CHECK (status_change_to IS NULL OR status_change_to IN ('open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages (ticket_id, created_at ASC);

-- 3. Enable RLS on both tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Helper policy check: Customers can view/insert/update their own tickets, Admins can manage all
CREATE POLICY "Customers can view own support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() = '4903bd39-e54f-42e4-b679-2af5d128bb8f'::uuid
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin')
    )
  );

CREATE POLICY "Authenticated users can insert support tickets"
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Customers and admins can update support tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR auth.uid() = '4903bd39-e54f-42e4-b679-2af5d128bb8f'::uuid
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete support tickets"
  ON public.support_tickets
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = '4903bd39-e54f-42e4-b679-2af5d128bb8f'::uuid
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin')
    )
  );

-- Messages policies
CREATE POLICY "Customers and admins can view ticket messages"
  ON public.support_ticket_messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = '4903bd39-e54f-42e4-b679-2af5d128bb8f'::uuid
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin', 'super_admin')
        )
      )
    )
  );

CREATE POLICY "Authenticated users can insert ticket messages"
  ON public.support_ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Create public storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access ticket-attachments'
  ) THEN
    CREATE POLICY "Public Access ticket-attachments"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'ticket-attachments' );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth Insert ticket-attachments'
  ) THEN
    CREATE POLICY "Auth Insert ticket-attachments"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated' );
  END IF;
END $$;
