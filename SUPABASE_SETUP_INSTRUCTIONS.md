# Supabase Setup Instructions

## Creating the Clothing Items Table

Since we can't execute SQL commands directly through the application due to read-only transaction restrictions, you'll need to create the table manually through the Supabase dashboard.

### Table Structure

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Go to the "Table Editor" in the left sidebar
4. Click "Create a new table"
5. Use the following settings:

**Table Name:** `clothing_items`

**Columns:**
- `id` (type: uuid, primary key, default: gen_random_uuid())
- `name` (type: text, not null)
- `brand` (type: text)
- `price` (type: numeric)
- `currency` (type: text)
- `category` (type: text)
- `color` (type: text)
- `image_url` (type: text)
- `product_url` (type: text, not null)
- `description` (type: text)
- `created_at` (type: timestamp with time zone, default: now())

### Enable Row Level Security (RLS)

1. After creating the table, go to the "Authentication" section in the left sidebar
2. Click on "Policies"
3. Find your `clothing_items` table
4. Enable RLS by toggling the switch
5. Add a policy that allows all operations for now (you can restrict this later)

### SQL Command (For Reference)

If you have access to the SQL Editor in Supabase, you can use this command:

```sql
CREATE TABLE clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  price NUMERIC,
  currency TEXT,
  category TEXT,
  color TEXT,
  image_url TEXT,
  product_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add a unique constraint on product_url to prevent duplicates
ALTER TABLE clothing_items ADD CONSTRAINT unique_product_url UNIQUE (product_url);

-- Enable Row Level Security
ALTER TABLE clothing_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for development)
CREATE POLICY "Allow all operations for now" 
  ON clothing_items 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
```

## Environment Variables

Make sure you have the following environment variables set in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase dashboard under Project Settings > API.
