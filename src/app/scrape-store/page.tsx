'use client';

import { useState, useEffect } from 'react';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/table';
import { Button } from '@/components/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Store = {
  id: number;
  brand: string;        // maps to 'name' in Supabase stores table
  store_url: string;    // maps to 'url' in Supabase stores table
  last_scraped_at: string | null; // maps to 'last_scraped' in Supabase stores table
  items_count: number;  // maps to 'total_items_scraped' in Supabase stores table
  created_at: string;   // not in Supabase stores table, but kept for compatibility
  updated_at: string;   // not in Supabase stores table, but kept for compatibility
  firecrawl_code?: string | null; // New field from Supabase stores table
};

type SavedProduct = {
  url: string;
  name: string;
};

type SkippedProduct = {
  url: string;
  reason: string;
};

export default function ScrapeStorePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [newStoreBrand, setNewStoreBrand] = useState('');
  const [newStoreUrl, setNewStoreUrl] = useState('');
  const [maxProducts, setMaxProducts] = useState(10);
  
  // Scraping state
  const [activeScrapingStore, setActiveScrapingStore] = useState<Store | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [savedProducts, setSavedProducts] = useState<Array<SavedProduct>>([]);
  const [skippedProducts, setSkippedProducts] = useState<Array<SkippedProduct>>([]);

  // Fetch stores on component mount
  useEffect(() => {
    fetchStores();
  }, []);

  // Function to fetch stores
  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/scrape-stores');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stores');
      }
      
      setStores(data.stores || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching stores');
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new store
  const addStore = async () => {
    if (!newStoreBrand || !newStoreUrl) {
      setError('Brand and URL are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/scrape-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand: newStoreBrand,
          store_url: newStoreUrl,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add store');
      }
      
      // Reset form and fetch updated stores
      setNewStoreBrand('');
      setNewStoreUrl('');
      setIsAddingStore(false);
      fetchStores();
    } catch (err: any) {
      setError(err.message || 'An error occurred while adding the store');
    } finally {
      setLoading(false);
    }
  };

  // Function to start the scraping process
  const startScraping = async (store: Store) => {
    try {
      setActiveScrapingStore(store);
      setLoading(true);
      setError(null);
      setJobId(null);
      setStatus(null);
      setStatusMessage(null);
      setProgress(0);
      setSavedProducts([]);
      setSkippedProducts([]);

      console.log(`Starting scrape for store: ${store.brand} (${store.store_url})`);

      const response = await fetch('/api/scrape-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          storeUrl: store.store_url, 
          maxProducts 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Scrape store API error:', errorText);
        throw new Error(`Failed to start scraping: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Scrape store API response:', data);

      setJobId(data.jobId);
      setStatus(data.status);
    } catch (err: any) {
      console.error('Error in startScraping:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to check the status of the scraping job
  const checkStatus = async () => {
    if (!jobId || !activeScrapingStore) return;

    try {
      console.log(`Checking status for job: ${jobId}`);
      const response = await fetch(`/api/scrape-store?jobId=${jobId}&storeUrl=${encodeURIComponent(activeScrapingStore.store_url)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status check API error:', errorText);
        throw new Error(`Failed to check status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Status check API response:', data);

      setStatus(data.status);
      
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }
      
      // Handle both new and old response formats
      if (data.savedProducts) {
        setSavedProducts(data.savedProducts);
      }
      
      if (data.skippedProducts) {
        setSkippedProducts(data.skippedProducts);
      }
      
      // Handle the new format with savedCount and skippedCount
      if (data.savedCount !== undefined && !data.savedProducts) {
        setSavedProducts(Array(data.savedCount).fill({ url: '', name: 'Product' }));
      }
      
      if (data.skippedCount !== undefined && !data.skippedProducts) {
        setSkippedProducts(Array(data.skippedCount).fill({ url: '', reason: 'Already exists' }));
      }
      
      // Update message if available
      if (data.message) {
        setStatusMessage(data.message);
      }
      
      // If the job is completed, refresh the stores list
      if (data.status === 'completed') {
        fetchStores();
      }
    } catch (err: any) {
      console.error('Error in checkStatus:', err);
      setError(err.message || 'An error occurred while checking status');
    }
  };

  // Poll for status updates when a job is in progress
  useEffect(() => {
    if (jobId && status === 'processing') {
      const interval = setInterval(checkStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [jobId, status]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Store Scraper</h1>
        <Button 
          onClick={() => setIsAddingStore(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle size={16} />
          Add Store
        </Button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      
      {isAddingStore && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Add New Store</h2>
          
          <div className="mb-4">
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
              Brand Name
            </label>
            <input
              type="text"
              id="brand"
              value={newStoreBrand}
              onChange={(e) => setNewStoreBrand(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="e.g., Stussy"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Store URL
            </label>
            <input
              type="text"
              id="storeUrl"
              value={newStoreUrl}
              onChange={(e) => setNewStoreUrl(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="https://example.com/collections/all"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={addStore} disabled={loading}>
              {loading ? 'Adding...' : 'Add Store'}
            </Button>
            <Button 
              outline
              onClick={() => {
                setIsAddingStore(false);
                setNewStoreBrand('');
                setNewStoreUrl('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="maxProducts" className="block text-sm font-medium text-gray-700 mb-1">
          New Products to Save Per Scrape
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            id="maxProducts"
            value={maxProducts}
            onChange={(e) => setMaxProducts(parseInt(e.target.value))}
            className="w-32 p-2 border border-gray-300 rounded"
            min="1"
            max="100"
          />
          <span className="text-sm text-gray-500">
            The scraper will continue until this many new products are saved.
          </span>
        </div>
      </div>
      
      {loading && !isAddingStore && !activeScrapingStore && (
        <div className="text-center py-4">Loading stores...</div>
      )}
      
      {!loading && stores.length === 0 && !isAddingStore && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No stores have been added yet.</p>
          <Button onClick={() => setIsAddingStore(true)}>Add Your First Store</Button>
        </div>
      )}
      
      {stores.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Brand</TableHeader>
                <TableHeader>Store URL</TableHeader>
                <TableHeader>Last Scraped</TableHeader>
                <TableHeader>Items Count</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.brand}</TableCell>
                  <TableCell>
                    <a 
                      href={store.store_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline truncate block max-w-xs"
                    >
                      {store.store_url}
                    </a>
                  </TableCell>
                  <TableCell>
                    {store.last_scraped_at 
                      ? formatDistanceToNow(new Date(store.last_scraped_at), { addSuffix: true }) 
                      : 'Never'}
                  </TableCell>
                  <TableCell>{store.items_count}</TableCell>
                  <TableCell>
                    <Button 
                      outline
                      className="flex items-center gap-1"
                      onClick={() => startScraping(store)}
                      disabled={activeScrapingStore !== null}
                    >
                      <RefreshCw size={14} />
                      Scrape Now
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {activeScrapingStore && jobId && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Scraping {activeScrapingStore.brand}</h2>
          <p className="mb-2 text-sm text-gray-600">{activeScrapingStore.store_url}</p>
          <p className="mb-2">Status: {status}</p>
          {statusMessage && (
            <p className="mb-2 text-gray-600">{statusMessage}</p>
          )}
          
          {status === 'processing' && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
          
          {status === 'processing' && (
            <div className="mb-4 text-sm">
              <p className="font-medium">
                Progress: {progress}% - Saved {savedProducts.length} of {maxProducts} target products
              </p>
              <p className="text-gray-600">
                {skippedProducts.length > 0 ? (
                  <>Skipped {skippedProducts.length} products (already exist or errors)</>
                ) : (
                  <>No products skipped yet</>
                )}
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-2 p-3 bg-red-100 text-red-700 rounded">
              <p>An error occurred during scraping. Please try again.</p>
              {statusMessage && <p className="mt-2 text-sm">{statusMessage}</p>}
              <Button
                onClick={() => startScraping(activeScrapingStore)}
                className="mt-3"
                color="red"
              >
                Retry
              </Button>
            </div>
          )}
          
          {status === 'completed' && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Results</h3>
              <p>Successfully saved {savedProducts.length} products</p>
              {skippedProducts.length > 0 && (
                <p>Skipped {skippedProducts.length} products</p>
              )}
              
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => {
                    setActiveScrapingStore(null);
                    setJobId(null);
                    setStatus(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
