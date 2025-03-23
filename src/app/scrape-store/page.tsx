'use client';

import { useState, useEffect } from 'react';

type SavedProduct = {
  url: string;
  name: string;
};

type SkippedProduct = {
  url: string;
  reason: string;
};

export default function ScrapeStorePage() {
  const [storeUrl, setStoreUrl] = useState('https://eu.stussy.com/collections/new-arrivals');
  const [maxProducts, setMaxProducts] = useState(10);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [savedProducts, setSavedProducts] = useState<Array<SavedProduct>>([]);
  const [skippedProducts, setSkippedProducts] = useState<Array<SkippedProduct>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to start the scraping process
  const startScraping = async () => {
    try {
      setLoading(true);
      setError(null);
      setJobId(null);
      setStatus(null);
      setStatusMessage(null);
      setProgress(0);
      setSavedProducts([]);
      setSkippedProducts([]);

      const response = await fetch('/api/scrape-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeUrl, maxProducts }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start scraping');
      }

      setJobId(data.jobId);
      setStatus(data.status);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Function to check the status of the scraping job
  const checkStatus = async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/scrape-store?jobId=${jobId}&storeUrl=${encodeURIComponent(storeUrl)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check status');
      }

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
    } catch (err: any) {
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
      <h1 className="text-2xl font-bold mb-4">Store Scraper</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <div className="mb-4">
          <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Store URL
          </label>
          <input
            type="text"
            id="storeUrl"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="https://example.com/collections/all"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="maxProducts" className="block text-sm font-medium text-gray-700 mb-1">
            New Products to Save
          </label>
          <input
            type="number"
            id="maxProducts"
            value={maxProducts}
            onChange={(e) => setMaxProducts(parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded"
            min="1"
            max="100"
          />
          <p className="mt-1 text-sm text-gray-500">
            The scraper will continue until this many new products are saved, even if some are skipped.
          </p>
        </div>
        
        <button
          onClick={startScraping}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'Start Scraping'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}
      
      {jobId && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Job Status</h2>
          <p className="mb-2">Job ID: {jobId}</p>
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
              <p className="text-gray-600 mt-1 text-xs">
                The scraper will continue until {maxProducts} new products are saved, even if some are skipped.
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-2 p-3 bg-red-100 text-red-700 rounded">
              <p>An error occurred during scraping. Please try again.</p>
              {statusMessage && <p className="mt-2 text-sm">{statusMessage}</p>}
              <button
                onClick={startScraping}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
          
          {status === 'completed' && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Results</h3>
              <p>Successfully saved {savedProducts.length} products</p>
              {skippedProducts.length > 0 && (
                <p>Skipped {skippedProducts.length} products</p>
              )}
              
              {savedProducts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-md font-semibold mb-2">Saved Products</h4>
                  <ul className="list-disc pl-5">
                    {savedProducts.map((product, index) => (
                      <li key={index}>
                        {product.url ? (
                          <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            {product.name || product.url}
                          </a>
                        ) : (
                          <span>{product.name || 'Product'}</span>
                        )}
                      </li>
                    )).slice(0, 10)}
                    {savedProducts.length > 10 && (
                      <li>...and {savedProducts.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
              
              {skippedProducts.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-md font-semibold mb-2">Skipped Products</h4>
                  <ul className="list-disc pl-5">
                    {skippedProducts.map((product, index) => (
                      <li key={index}>
                        {product.url ? (
                          <>
                            <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                              {product.url}
                            </a>
                            <span className="text-gray-500 ml-2">({product.reason})</span>
                          </>
                        ) : (
                          <span>Product - {product.reason}</span>
                        )}
                      </li>
                    )).slice(0, 10)}
                    {skippedProducts.length > 10 && (
                      <li>...and {skippedProducts.length - 10} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
