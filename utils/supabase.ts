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

/**
 * Check if a URL exists and is accessible
 * @param url The URL to check
 * @returns A promise that resolves to true if the URL exists, or false if it doesn't
 */
export async function checkUrlExists(url: string): Promise<boolean> {
  try {
    // Ensure URL has a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Parse the URL to ensure it's valid
    new URL(url);
    
    // Try to fetch the URL with a HEAD request first (faster)
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (response.ok) {
        return true; // URL exists and is accessible
      }
      
      // If HEAD request fails, try a GET request as some servers don't support HEAD
      const getResponse = await fetch(url, { 
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (getResponse.ok) {
        return true; // URL exists and is accessible
      }
      
      return false; // URL is not accessible
    } catch (fetchError) {
      // If fetch fails (e.g., CORS issues), we'll still consider the URL valid
      // as Firecrawl can often access URLs that fetch cannot due to CORS
      console.warn(`Fetch check failed for ${url}, but proceeding anyway as Firecrawl may be able to access it:`, fetchError);
      return true;
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      console.error(`Invalid URL format: ${url}`);
      return false;
    }
    console.error(`Error checking URL ${url}:`, error);
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
