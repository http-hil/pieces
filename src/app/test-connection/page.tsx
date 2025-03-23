'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';

export default function TestConnectionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
    fetchApiTest();
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      console.log('Fetching items directly from client...');
      
      // Direct query with no filters
      const { data, error } = await supabase
        .from('items')
        .select('*');
      
      if (error) {
        console.error('Direct query error:', error);
        setError(error.message);
        return;
      }
      
      console.log(`Found ${data?.length || 0} items directly`);
      setItems(data || []);
    } catch (err: any) {
      console.error('Error fetching items:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchApiTest() {
    try {
      const response = await fetch('/api/test-supabase');
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API test response:', data);
      setApiResponse(data);
    } catch (err: any) {
      console.error('API test error:', err);
      setApiError(err.message);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-3">Direct Client Query</h2>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <div className="text-red-500">Error: {error}</div>
        ) : (
          <>
            <p className="mb-2">Found {items.length} items</p>
            <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(items, null, 2)}
            </pre>
          </>
        )}
      </div>
      
      <div className="p-4 border rounded">
        <h2 className="text-xl font-semibold mb-3">API Test Results</h2>
        {!apiResponse && !apiError ? (
          <p>Loading API test results...</p>
        ) : apiError ? (
          <div className="text-red-500">API Error: {apiError}</div>
        ) : (
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-96">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
