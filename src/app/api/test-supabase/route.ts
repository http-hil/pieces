import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get the Supabase URL and key from the environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    // Create a new client
    const newClient = createClient(supabaseUrl, supabaseKey);
    
    // Test with the existing client
    console.log('Testing with existing client...');
    const { data: existingData, error: existingError } = await supabase
      .from('items')
      .select('*');
    
    // Test with a new client
    console.log('Testing with new client...');
    const { data: newData, error: newError } = await newClient
      .from('items')
      .select('*');
    
    // Test with a direct fetch
    console.log('Testing with direct fetch...');
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(`${supabaseUrl}/rest/v1/items?select=*`, {
      method: 'GET',
      headers
    });
    
    const fetchData = await response.json();
    
    return NextResponse.json({
      existingClient: {
        data: existingData,
        error: existingError ? existingError.message : null,
        count: existingData?.length || 0
      },
      newClient: {
        data: newData,
        error: newError ? newError.message : null,
        count: newData?.length || 0
      },
      directFetch: {
        data: fetchData,
        count: fetchData?.length || 0
      },
      env: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        url: supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : null,
        key: supabaseKey ? supabaseKey.substring(0, 10) + '...' : null
      }
    });
  } catch (err: any) {
    console.error('API: Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
