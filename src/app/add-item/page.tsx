'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import { Heading } from '@/components/heading';

type ScrapedProduct = {
  item_name: string;
  brand: string;
  price: number;
  currency: string;
  item_category: string;
  item_color: string;
  image_url: string;
  product_url: string;
  item_description: string;
};

export default function AddItemPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrapedData, setScrapedData] = useState<ScrapedProduct | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'scraping' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      setError('Please enter a product URL');
      return;
    }

    try {
      setLoading(true);
      setScrapeStatus('scraping');
      setError(null);

      // Check if the item already exists in the database
      try {
        const { data: existingItem, error: supabaseError } = await supabase
          .from('items')
          .select('id')
          .eq('URL', url)
          .single();

        if (supabaseError && supabaseError.code !== 'PGRST116') { // PGRST116 means no rows returned
          console.error('Error checking for existing item:', supabaseError);
          throw supabaseError;
        }

        if (existingItem) {
          setError('This item is already in your wardrobe');
          setScrapeStatus('error');
          setLoading(false);
          return;
        }
      } catch (err: any) {
        // If the error is not "no rows returned", rethrow it
        if (err.code !== 'PGRST116') {
          throw err;
        }
        // Otherwise, continue - no existing item found
      }

      // Use Firecrawl to scrape the product page
      console.log('Scraping product URL:', url);
      const response = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const responseData = await response.json();
      console.log('Scraped product data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to scrape product');
      }

      // Validate the scraped data
      if (!responseData.item_name) {
        throw new Error('Could not extract product name from the URL');
      }

      setScrapedData(responseData);
      setScrapeStatus('success');

      // Save the item to Supabase
      const itemToSave = {
        Name: responseData.item_name,
        "Main image URL": responseData.image_url || "https://placehold.co/400x400/e2e8f0/64748b?text=No+Image",
        Tags: responseData.item_category || null,
        URL: url,
        "Secundary image": null,
        Description: responseData.item_description || null,
      };
      
      console.log('Saving item to Supabase:', itemToSave);
      
      const { error: saveError } = await supabase
        .from('items')
        .insert([itemToSave]);

      if (saveError) {
        console.error('Error saving to Supabase:', saveError);
        throw saveError;
      }

      console.log('Item saved successfully to Supabase');

      // Redirect to wardrobe page after successful save
      setTimeout(() => {
        router.push('/wardrobe');
      }, 1500);
      
    } catch (err: any) {
      console.error('Error scraping or saving product:', JSON.stringify(err));
      setError(typeof err.message === 'string' ? err.message : 'Failed to add item to wardrobe');
      setScrapeStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
      <Heading>Add Item to Wardrobe</Heading>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Paste a Product URL</h2>
        <p className="text-gray-600 mb-6">
          Enter the URL of a clothing item you want to add to your virtual wardrobe.
          We'll automatically extract the product details.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="product-url" className="block text-sm font-medium text-gray-700 mb-1">
              Product URL
            </label>
            <input
              id="product-url"
              type="url"
              placeholder="https://www.example.com/product"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-black focus:outline-none"
              required
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 rounded-md text-white font-medium ${
              loading ? 'bg-gray-400' : 'bg-black hover:bg-gray-800'
            } transition-colors`}
          >
            {loading ? 'Processing...' : 'Add to Wardrobe'}
          </button>
        </form>
      </div>
      
      {scrapeStatus === 'scraping' && (
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <h3 className="text-lg font-medium text-blue-800">Scraping Product Details</h3>
          </div>
          <p className="text-blue-600">
            We're extracting information from the product page. This may take a few moments...
          </p>
        </div>
      )}
      
      {scrapeStatus === 'success' && scrapedData && (
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-green-800 mb-4">
            Item Added Successfully!
          </h3>
          
          <div className="flex flex-col md:flex-row gap-6">
            {scrapedData.image_url && (
              <div className="relative w-full md:w-1/3 aspect-square">
                <img
                  src={scrapedData.image_url}
                  alt={scrapedData.item_name}
                  className="object-cover rounded-md w-full h-full"
                />
              </div>
            )}
            
            <div className="flex-1">
              <h4 className="font-semibold text-xl mb-2">{scrapedData.item_name}</h4>
              
              <div className="space-y-2 text-gray-700">
                {scrapedData.brand && (
                  <p><span className="font-medium">Brand:</span> {scrapedData.brand}</p>
                )}
                {scrapedData.price && (
                  <p><span className="font-medium">Price:</span> {scrapedData.currency || '$'}{scrapedData.price}</p>
                )}
                {scrapedData.item_category && (
                  <p><span className="font-medium">Category:</span> {scrapedData.item_category}</p>
                )}
                {scrapedData.item_color && (
                  <p><span className="font-medium">Color:</span> {scrapedData.item_color}</p>
                )}
              </div>
              
              <p className="mt-4 text-green-600">
                Redirecting to your wardrobe...
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-3">Supported Stores</h3>
        <p className="text-gray-600">
          Our scraper works with most major clothing retailers. If you encounter any issues,
          please try a different store or contact support.
        </p>
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-500">
            Example URL: https://www.stussy.com/collections/new-arrivals/products/1311163-basic-stussy-cap-ink-blue
          </p>
        </div>
      </div>
    </div>
  );
}
