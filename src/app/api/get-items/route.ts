import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching items from Supabase...');
    
    // Try direct query with no filters
    const { data, error } = await supabase
      .from('items')
      .select('*');
    
    if (error) {
      console.error('API: Error fetching items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log(`API: Found ${data?.length || 0} items`);
    
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    console.error('API: Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
