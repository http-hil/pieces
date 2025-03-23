-- Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "Name" TEXT NOT NULL,
  "Main image URL" TEXT,
  "Tags" TEXT,
  "URL" TEXT UNIQUE,
  "Secundary image" TEXT,
  "Description" TEXT
);

-- Create index on URL for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_url ON public.items("URL");

-- Set up Row Level Security (RLS)
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now
-- In a production app, you would want to restrict this to authenticated users
CREATE POLICY "Allow all operations" ON public.items
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
