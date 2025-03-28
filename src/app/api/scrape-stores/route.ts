import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabase';

// Using the 'stores' table in Supabase
// Table structure:
/*
stores (
  id integer PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  last_scraped timestamp with time zone,
  total_items_scraped integer,
  firecrawl_code text
)
*/

export async function GET() {
  try {
    // Get all stores
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching stores:', error);
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }
    
    // Map the data to match the expected format in the frontend
    const mappedStores = data.map(store => ({
      id: store.id,
      brand: store.name,
      store_url: store.url,
      last_scraped_at: store.last_scraped,
      items_count: store.total_items_scraped || 0,
      created_at: new Date().toISOString(), // These fields don't exist in the new table
      updated_at: new Date().toISOString()  // so we're providing default values
    }));
    
    return NextResponse.json({ stores: mappedStores });
  } catch (error) {
    console.error('Error in stores API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brand, store_url } = body;
    
    if (!brand || !store_url) {
      return NextResponse.json({ error: 'Brand and store_url are required' }, { status: 400 });
    }
    
    // Check if store already exists
    const { data: existingStore, error: checkError } = await supabase
      .from('stores')
      .select('id')
      .eq('url', store_url)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking existing store:', checkError);
      return NextResponse.json({ error: 'Failed to check existing store' }, { status: 500 });
    }
    
    if (existingStore) {
      return NextResponse.json({ error: 'Store with this URL already exists' }, { status: 409 });
    }
    
    // Insert new store
    const { data, error } = await supabase
      .from('stores')
      .insert([
        {
          name: brand,
          url: store_url,
          last_scraped: null,
          total_items_scraped: 0
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating store:', error);
      return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
    }
    
    // Map the response to match the expected format in the frontend
    const mappedStore = {
      id: data.id,
      brand: data.name,
      store_url: data.url,
      last_scraped_at: data.last_scraped,
      items_count: data.total_items_scraped || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return NextResponse.json({ store: mappedStore });
  } catch (error) {
    console.error('Error in stores POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, brand, store_url } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }
    
    const updates: any = {};
    if (brand) updates.name = brand;
    if (store_url) updates.url = store_url;
    
    // Update store
    const { data, error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating store:', error);
      return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
    }
    
    // Map the response to match the expected format in the frontend
    const mappedStore = {
      id: data.id,
      brand: data.name,
      store_url: data.url,
      last_scraped_at: data.last_scraped,
      items_count: data.total_items_scraped || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return NextResponse.json({ store: mappedStore });
  } catch (error) {
    console.error('Error in stores PUT API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }
    
    // Delete store
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting store:', error);
      return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in stores DELETE API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
