'use client';

import { useState, useEffect } from 'react';
import { ClothingItem } from '@/types';
import Link from 'next/link';
import WardrobeGrid from '@/components/wardrobe/WardrobeGrid';
import { supabase } from '../../../utils/supabase';
import { Heading } from '@/components/heading';

export default function WardrobePage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);

  useEffect(() => {
    async function fetchItems() {
      try {
        console.log('Client: Fetching items from Supabase...');
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        console.log(`Client: Found ${data?.length || 0} items`);
        setItems(data || []);
        
        // Extract unique categories
        const categories = [...new Set(data?.map(item => item.tags).filter(Boolean))];
        setUniqueCategories(categories);
      } catch (err) {
        console.error('Error fetching items:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  if (loading) {
    return (
      <div className="w-full px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Heading>My Wardrobe</Heading>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Heading>My Wardrobe</Heading>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading items: {error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-full px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Heading>My Wardrobe</Heading>
          <Link href="/add-item" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Add Your First Item
          </Link>
        </div>
        <p className="text-gray-600">No items found in your wardrobe.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading>My Wardrobe</Heading>
        <Link href="/add-item" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          Add New Item
        </Link>
      </div>
      
      {uniqueCategories.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {uniqueCategories.map((category) => (
              <span key={category} className="bg-gray-200 px-3 py-1 rounded-full text-sm">
                {category}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <WardrobeGrid items={items} />
    </div>
  );
}
