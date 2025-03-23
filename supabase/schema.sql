-- Create a table for clothing items
CREATE TABLE IF NOT EXISTS clothing_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  price DECIMAL(10,2),
  currency TEXT,
  category TEXT,
  color TEXT,
  image_url TEXT,
  product_url TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clothing_items_category ON clothing_items(category);
CREATE INDEX IF NOT EXISTS idx_clothing_items_brand ON clothing_items(brand);
CREATE INDEX IF NOT EXISTS idx_clothing_items_created_at ON clothing_items(created_at);
