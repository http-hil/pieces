-- Check if RLS is enabled for the items table
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'items';

-- Check RLS policies on the items table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'items';

-- Check if the anonymous role has access to the items table
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM
  information_schema.role_table_grants
WHERE
  table_name = 'items'
  AND grantee = 'anon';

-- Create a policy to allow anonymous access if needed
CREATE POLICY allow_anonymous_access_items
ON items
FOR ALL
TO anon
USING (true);
