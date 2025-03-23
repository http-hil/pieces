-- Create a function to get the count of items
CREATE OR REPLACE FUNCTION get_item_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM items;
$$;
