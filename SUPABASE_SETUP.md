# Supabase Setup Guide

## Installation Complete

I've installed the Supabase JavaScript client (`@supabase/supabase-js`) and set up the basic configuration files for your Next.js project.

## Next Steps to Complete Setup

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up or log in
2. Create a new project
3. Give your project a name and set a secure database password
4. Choose a region closest to your users
5. Wait for your database to be provisioned (this may take a few minutes)

### 2. Get Your API Keys

1. Once your project is ready, go to the project dashboard
2. Click on the "Settings" icon (gear icon) in the sidebar
3. Click on "API" in the settings menu
4. You'll find your:
   - **Project URL** (labeled as "URL")
   - **API Key** (labeled as "anon" or "public")

### 3. Set Up Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Replace `your-project-url` and `your-anon-key` with the values from step 2.

### 4. Create a Table in Supabase

1. Go to the "Table Editor" in your Supabase dashboard
2. Click "New Table"
3. Name it "items" (or update the table name in the example component)
4. Add the following columns:
   - `id` (type: int8, primary key, auto-increment)
   - `name` (type: text)
   - `created_at` (type: timestamptz, default: now())
5. Click "Save" to create the table
6. Add some sample data to test with

### 5. Use the Example Component

I've created a sample component at `components/SupabaseExample.tsx` that you can import into any of your pages to test the Supabase connection.

Example usage in a page:

```tsx
import SupabaseExample from '../components/SupabaseExample';

export default function Home() {
  return (
    <main>
      <h1>My App</h1>
      <SupabaseExample />
    </main>
  );
}
```

## Troubleshooting

- If you see errors about missing environment variables, make sure your `.env.local` file is set up correctly
- If you're not seeing any data, check that your Supabase table exists and has data
- For authentication issues, verify that your API keys are correct

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
