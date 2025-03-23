-- Create a stored procedure to get all items
CREATE OR REPLACE FUNCTION get_all_items()
RETURNS SETOF items
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM items ORDER BY created_at DESC;
$$;
