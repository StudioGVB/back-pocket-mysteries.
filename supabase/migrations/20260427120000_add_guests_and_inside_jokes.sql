-- Add inside_jokes to mysteries table
ALTER TABLE mysteries ADD COLUMN IF NOT EXISTS inside_jokes TEXT;

-- Create guests table
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  gender TEXT,
  eye_color TEXT,
  height TEXT,
  avatar_url TEXT,
  traits TEXT[] DEFAULT '{}',
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for guests
CREATE POLICY "Users can view their own guests"
  ON guests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own guests"
  ON guests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guests"
  ON guests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own guests"
  ON guests FOR DELETE
  USING (auth.uid() = user_id);
