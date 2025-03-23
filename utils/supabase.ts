import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gpqntebcazngisggsgsa.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcW50ZWJjYXpuZ2lzZ2dzZ3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIwMDc1NTIsImV4cCI6MjA1NzU4MzU1Mn0.R609JcPh3B-Uv1jig61yrz3IUjy-gSM5YJ22bKHUPKw';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist the session in localStorage
    detectSessionInUrl: false, // Don't detect the session from the URL
  },
  global: {
    headers: {
      'x-client-info': 'tags-windsurf-app',
    },
  },
});

// Helper function to safely check if a URL exists in the database
export async function checkUrlExists(url: string): Promise<boolean> {
  try {
    console.log(`[DEBUG] checkUrlExists: Checking if URL exists in database: ${url}`);
    
    // Clean the URL by removing query parameters
    let cleanUrl = url;
    try {
      // Parse the URL and remove query parameters
      const urlObj = new URL(url);
      urlObj.search = '';
      cleanUrl = urlObj.toString();
      
      // Remove trailing slashes for consistency
      cleanUrl = cleanUrl.replace(/\/+$/, '');
      
      console.log(`[DEBUG] checkUrlExists: Cleaned URL: ${cleanUrl}`);
    } catch (err) {
      console.error(`[DEBUG] checkUrlExists: Error cleaning URL: ${err}`);
      // If URL parsing fails, use the original URL
    }
    
    // First try exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from('items')
      .select('id, url')
      .eq('url', url)
      .maybeSingle();
    
    if (exactError) {
      console.error('[DEBUG] checkUrlExists: Error checking exact URL match:', exactError);
    } else if (exactMatch) {
      console.log(`[DEBUG] checkUrlExists: Found exact URL match: ${url}`);
      return true;
    }
    
    // Then try with the cleaned URL (without query parameters)
    // Use ilike for case-insensitive matching and handle URLs with and without query parameters
    const { data, error } = await supabase
      .from('items')
      .select('id, url')
      .or(`url.eq.${cleanUrl},url.ilike.${cleanUrl}%`)
      .limit(1);
    
    if (error) {
      console.error('[DEBUG] checkUrlExists: Error checking URL existence:', error);
      console.error('[DEBUG] checkUrlExists: Error details:', JSON.stringify(error));
      return false;
    }
    
    const exists = data && data.length > 0;
    console.log(`[DEBUG] checkUrlExists: URL ${url} exists in database: ${exists}`);
    
    if (exists) {
      console.log(`[DEBUG] checkUrlExists: Matching URL in database: ${data[0].url}`);
    }
    
    return exists;
  } catch (err) {
    console.error('[DEBUG] checkUrlExists: Exception checking URL existence:', err);
    return false;
  }
}

// Helper function to safely get items from the database
export async function getItems() {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('Exception fetching items:', err);
    throw err;
  }
}
