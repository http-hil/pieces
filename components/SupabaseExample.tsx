'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

type Item = {
  id: number;
  name: string;
  created_at: string;
};

export default function SupabaseExample() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        // Replace 'items' with your actual table name
        const { data, error } = await supabase
          .from('items')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        setItems(data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data from Supabase');
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Supabase Example</h2>
      
      {loading && <p>Loading data...</p>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <p>No items found. Make sure your Supabase table is set up and has data.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="border p-3 rounded">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(item.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
