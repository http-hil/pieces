import { supabase } from '../../../utils/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DebugDbPage() {
  // Try to check if RLS is enabled - this might fail due to permissions
  let rlsData = null;
  let rlsError = null;
  try {
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('tablename', 'items')
      .single();
    
    rlsData = data;
    rlsError = error;
  } catch (err: any) {
    rlsError = { message: err.message };
  }

  // Check table contents
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*');

  // Get count directly
  const { count, error: countError } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true });

  // Try a raw query approach
  let rawData = null;
  let rawError = null;
  try {
    const { data, error } = await supabase.rpc('get_item_count');
    rawData = data;
    rawError = error;
  } catch (err: any) {
    rawError = { message: err.message };
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Database Debug Page</h1>
      
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-3">RLS Status</h2>
        {rlsError ? (
          <div className="text-red-500">Error checking RLS: {rlsError.message}</div>
        ) : (
          <pre className="bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(rlsData, null, 2)}
          </pre>
        )}
      </div>
      
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-3">Item Count</h2>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Direct Count</h3>
          {countError ? (
            <div className="text-red-500">Error getting count: {countError.message}</div>
          ) : (
            <div className="bg-gray-100 p-3 rounded">
              Count: {count}
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-2">RPC Count (may fail)</h3>
          {rawError ? (
            <div className="text-red-500">Error with RPC: {rawError.message}</div>
          ) : (
            <pre className="bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(rawData, null, 2)}
            </pre>
          )}
        </div>
      </div>
      
      <div className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-3">Items Data</h2>
        {itemsError ? (
          <div className="text-red-500">Error fetching items: {itemsError.message}</div>
        ) : (
          <>
            <p className="mb-2">Found {items?.length || 0} items</p>
            <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(items, null, 2)}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}
