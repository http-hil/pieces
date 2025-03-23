'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../../../../utils/supabase';

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

export default function ItemDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [params.id]);

  async function fetchItem() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (error) {
        throw error;
      }
      
      setItem(data);
    } catch (err: any) {
      console.error('Error fetching item details:', err);
      setError('Failed to load item details');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', params.id);
      
      if (error) {
        throw error;
      }
      
      router.push('/wardrobe');
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error || 'Item not found'}</p>
          <Link href="/wardrobe" className="mt-2 underline">
            Return to Wardrobe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/wardrobe" className="text-gray-600 hover:text-black">
          ← Back to Wardrobe
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative aspect-square md:aspect-auto md:h-full">
            {item.product_img ? (
              <Image
                src={item.product_img}
                alt={item.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full min-h-[300px] bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500">No image available</p>
              </div>
            )}
          </div>
          
          <div className="p-6">
            {item.brand && (
              <h2 className="text-xl font-medium text-gray-700 mb-1">{item.brand}</h2>
            )}
            <h1 className="text-2xl font-bold mb-4">{item.name}</h1>
            
            {item.tags && item.tags.includes('price:') && (
              <p className="text-xl font-semibold mb-4">
                {item.tags.match(/price:([^,]+)/)?.[1] || 'Price not available'}
              </p>
            )}
            
            <div className="space-y-4 mb-6">
              {item.category && (
                <div>
                  <span className="text-gray-600 font-medium">Category: </span>
                  <span>{item.category}</span>
                </div>
              )}
              
              {item.color && (
                <div>
                  <span className="text-gray-600 font-medium">Color: </span>
                  <span>{item.color}</span>
                </div>
              )}
              
              <div>
                <span className="text-gray-600 font-medium">Added on: </span>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {item.description && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="text-gray-700">{item.description}</p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-center"
              >
                View Original
              </a>
              
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50 transition-colors"
                >
                  Remove from Wardrobe
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
