'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import Link from 'next/link';

export default function TestDbPage() {
  const [items, setItems] = useState<any[]>([]);
  const [tableInfo, setTableInfo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  async function fetchDatabaseInfo() {
    try {
      setLoading(true);
      console.log('Fetching database information...');
      
      // Instead of querying information_schema directly, let's use a simpler approach
      // Just check if we can access the items table
      const { count, error: countError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error checking items count:', countError);
        throw countError;
      }
      
      console.log('Items count in database:', count);
      
      // Set some basic column info manually since we know the structure
      const columns = [
        { column_name: 'id', data_type: 'bigint' },
        { column_name: 'created_at', data_type: 'timestamp with time zone' },
        { column_name: 'Name', data_type: 'text' },
        { column_name: 'Main image URL', data_type: 'text' },
        { column_name: 'Tags', data_type: 'text' },
        { column_name: 'URL', data_type: 'text' },
        { column_name: 'Secundary image', data_type: 'text' },
        { column_name: 'Description', data_type: 'text' }
      ];
      
      setTableInfo(columns);
      
      // Fetch items
      await fetchItems();
    } catch (err: any) {
      console.error('Error fetching database info:', err);
      setError(err.message || 'Failed to load database information');
      setLoading(false);
    }
  }

  async function fetchItems() {
    try {
      console.log('Fetching items from Supabase...');
      
      // First, check if the table exists and has data
      const { count, error: countError } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error checking items count:', countError);
        throw countError;
      }
      
      console.log('Items count in database:', count);
      
      // Then fetch the actual data
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Items fetched:', data);
      
      // Log each item for debugging
      if (data && data.length > 0) {
        data.forEach((item, index) => {
          console.log(`Item ${index + 1}:`, {
            id: item.id,
            name: item.Name,
            imageUrl: item["Main image URL"],
            tags: item.Tags,
            url: item.URL
          });
        });
      } else {
        console.log('No items found in the database');
      }
      
      setItems(data || []);
    } catch (err: any) {
      console.error('Error fetching items:', err);
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      
      <div className="mb-4">
        <Link 
          href="/wardrobe"
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors mr-4"
        >
          Back to Wardrobe
        </Link>
        <button
          onClick={fetchItems}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Refresh Data
        </button>
      </div>
      
      {loading && <p>Loading database information...</p>}
      
      {error && (
        <div className="bg-red-100 p-4 rounded mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Database Structure</h2>
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-medium mb-2">Items Table Columns:</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2 text-left">Column Name</th>
                <th className="border p-2 text-left">Data Type</th>
              </tr>
            </thead>
            <tbody>
              {tableInfo.map((column, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border p-2">{column.column_name}</td>
                  <td className="border p-2">{column.data_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Items Count: {items.length}</h2>
        {items.length === 0 ? (
          <p className="text-gray-600">No items found in the database.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="border p-4 rounded bg-white shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                  {item["Main image URL"] ? (
                    <div className="w-full md:w-40 h-40">
                      <img 
                        src={item["Main image URL"]} 
                        alt={item.Name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full md:w-40 h-40 bg-gray-200 flex items-center justify-center">
                      <p className="text-gray-500">No image</p>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{item.Name}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <p><span className="font-medium">ID:</span> {item.id}</p>
                      <p><span className="font-medium">Created:</span> {new Date(item.created_at).toLocaleString()}</p>
                      <p><span className="font-medium">Tags:</span> {item.Tags || 'None'}</p>
                      <p><span className="font-medium">Description:</span> {item.Description || 'None'}</p>
                    </div>
                    <div className="mt-3">
                      <p className="font-medium">URL:</p>
                      <a href={item.URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">{item.URL}</a>
                    </div>
                    <div className="mt-3">
                      <p className="font-medium">Image URL:</p>
                      <span className="text-sm break-all">{item["Main image URL"] || 'None'}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Raw Database Items</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
          {JSON.stringify(items, null, 2)}
        </pre>
      </div>
    </div>
  );
}
