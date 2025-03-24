'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, getItems } from '../../../../utils/supabase';
import WardrobeTable from '@/components/WardrobeTable';

type ClothingItem = {
  id: number;
  name: string;
  created_at: string;
  product_img: string | null;
  tags: string;
  url: string;
  secondary_img: string | null;
  description: string;
  brand?: string;
  category?: string;
  color?: string;
};

export default function WardrobePage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    console.log('Wardrobe page mounted, fetching items...');
    fetchItems();
    
    // Add a refresh button for debugging
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing items...');
      fetchItems();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      console.log('Fetching items from Supabase...');
      
      try {
        // Use the new helper function to get items
        const data = await getItems();
        
        console.log('Items fetched successfully:', JSON.stringify(data));
        
        if (!data || data.length === 0) {
          console.log('No items found');
          setItems([]);
          setCategories([]);
          return;
        }
        
        // Process the results
        setItems(data as ClothingItem[]);
        
        // Extract unique categories and filter out empty ones
        const uniqueCategories = [...new Set(data
          .map((item: any) => item.tags)
          .filter(Boolean))] as string[];
        
        console.log('Unique categories:', uniqueCategories);
        setCategories(uniqueCategories);
      } catch (error: any) {
        console.error('Error fetching items:', error);
        setError(`Failed to load your wardrobe items: ${error.message || 'Unknown error'}`);
        setItems([]);
        setCategories([]);
      }
    } catch (err: any) {
      console.error('Error in fetchItems function:', err);
      setError(`Failed to load your wardrobe items: ${err.message || 'Unknown error'}`);
      setItems([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.tags === filter);

  return (
    <div>
      <div className="container-slamjam">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12">
          <h1 className="text-3xl font-medium uppercase tracking-tight mb-6 sm:mb-0">My Wardrobe</h1>
          <div className="flex items-center gap-4">
            <div className="flex rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'grid' 
                    ? 'bg-[#1a1a1a] text-white' 
                    : 'bg-[#f0f0f0] hover:bg-[#e5e5e5]'
                }`}
                tabIndex={0}
                aria-label="Switch to grid view"
                aria-pressed={viewMode === 'grid'}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'table' 
                    ? 'bg-[#1a1a1a] text-white' 
                    : 'bg-[#f0f0f0] hover:bg-[#e5e5e5]'
                }`}
                tabIndex={0}
                aria-label="Switch to table view"
                aria-pressed={viewMode === 'table'}
              >
                Table
              </button>
            </div>
            <Link 
              href="/add-item" 
              className="btn-primary"
              tabIndex={0}
              aria-label="Add a new item to your wardrobe"
            >
              Add New Item
            </Link>
          </div>
        </div>

        {/* Category filters */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm uppercase tracking-wide transition-colors ${
                filter === 'all' 
                  ? 'bg-[#1a1a1a] text-white' 
                  : 'bg-[#f0f0f0] hover:bg-[#e5e5e5]'
              }`}
              tabIndex={0}
              aria-label="Show all items"
              aria-pressed={filter === 'all'}
            >
              All Items
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`px-4 py-2 text-sm uppercase tracking-wide transition-colors ${
                  filter === category 
                    ? 'bg-[#1a1a1a] text-white' 
                    : 'bg-[#f0f0f0] hover:bg-[#e5e5e5]'
                }`}
                tabIndex={0}
                aria-label={`Show ${category} items`}
                aria-pressed={filter === category}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin h-8 w-8 border-2 border-[#1a1a1a] border-t-transparent rounded-full"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 mb-8">
            <p>{error}</p>
            <button 
              onClick={fetchItems}
              className="mt-3 text-sm underline hover:text-[#ff4d00]"
              tabIndex={0}
              aria-label="Try loading items again"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="text-center py-24">
            <p className="text-xl text-[#767676] mb-6">Your wardrobe is empty</p>
            <div className="mb-6">
              <button 
                onClick={fetchItems}
                className="px-4 py-2 bg-[#f0f0f0] text-[#1a1a1a] hover:bg-[#e5e5e5] transition-colors mr-4"
                tabIndex={0}
                aria-label="Refresh items list"
              >
                Refresh Items
              </button>
              <Link 
                href="/add-item" 
                className="px-4 py-2 bg-[#ff4d00] text-white hover:bg-opacity-90 transition-colors"
                tabIndex={0}
                aria-label="Add your first item to the wardrobe"
              >
                Add Your First Item
              </Link>
            </div>
            <Link 
              href="/add-item" 
              className="btn-primary"
              tabIndex={0}
              aria-label="Add your first item to the wardrobe"
            >
              Add Your First Item
            </Link>
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-16">
                {filteredItems.map((item) => (
                  <div key={item.id} className="product-card group">
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <Link href={`/item/${item.id}`} className="block" tabIndex={0} aria-label={`View details for ${item.name}`}>
                        {item.product_img ? (
                          <img
                            src={item.product_img}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              // Fallback if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = '/placeholder-image.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">No image</span>
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="mt-3">
                      <Link href={`/item/${item.id}`} className="block" tabIndex={0} aria-label={`View details for ${item.name}`}>
                        <h3 className="font-medium text-lg truncate">{item.name}</h3>
                      </Link>
                      <div className="text-sm text-gray-500 mt-1 truncate">
                        {item.tags || 'No tags'}
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-[#ff4d00] hover:underline"
                          tabIndex={0}
                          aria-label={`Visit original product page for ${item.name}`}
                        >
                          View Original
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-16">
                <WardrobeTable items={filteredItems} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
