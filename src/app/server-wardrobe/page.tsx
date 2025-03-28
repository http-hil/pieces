import { supabase } from '../../../utils/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { Heading } from '@/components/heading';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ServerWardrobePage() {
  console.log('Server: Fetching items from Supabase...');
  
  // Try direct query with no filters
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Server: Error fetching items:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Heading>My Wardrobe</Heading>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading items: {error.message}</p>
        </div>
      </div>
    );
  }
  
  console.log(`Server: Found ${data?.length || 0} items`);
  
  if (!data || data.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Heading>My Wardrobe (Server)</Heading>
          <Link href="/add-item" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
            Add Your First Item
          </Link>
        </div>
        <p className="text-gray-600">No items found in your wardrobe.</p>
      </div>
    );
  }
  
  // Extract unique categories
  const uniqueCategories = [...new Set(data.map(item => item.tags).filter(Boolean))];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading>My Wardrobe (Server)</Heading>
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {data.map((item) => (
          <div key={item.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {item.product_img ? (
              <div className="relative h-64 w-full">
                <Image
                  src={item.product_img}
                  alt={item.name || 'Clothing item'}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            ) : (
              <div className="bg-gray-200 h-64 flex items-center justify-center">
                <span className="text-gray-500">No image</span>
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
              {item.tags && (
                <p className="text-sm text-gray-600 mb-2">{item.tags}</p>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm"
                >
                  View Original
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
