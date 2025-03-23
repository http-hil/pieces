-- Insert a test item into the items table
INSERT INTO public.items ("Name", "Main image URL", "Tags", "URL", "Secundary image", "Description")
VALUES (
  'Test Stussy Cap',
  'https://placehold.co/400x400/e2e8f0/64748b?text=Test+Cap',
  'hat',
  'https://example.com/test-cap',
  NULL,
  'This is a test item to verify database functionality'
)
ON CONFLICT ("URL") DO NOTHING;
