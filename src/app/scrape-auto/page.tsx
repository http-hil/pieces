'use client';

import { useState, useEffect } from 'react';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon, StopIcon } from '@heroicons/react/24/outline';

type AutoScrapeJob = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'stopped';
  startTime: string;
  endTime?: string;
  totalPages: number;
  processedPages: number;
  savedProducts: number;
  skippedProducts: number;
  error?: string;
  progress: number;
  collections: string[];
};

export default function AutoScrapePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<AutoScrapeJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to start a new scrape-auto job
  const startAutoScrape = async () => {
    setIsLoading(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);

    try {
      const response = await fetch('/api/scrape-auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start scrape-auto job');
      }

      setJobId(data.jobId);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to stop the scrape-auto process
  const stopAutoScrape = async () => {
    if (!jobId) return;

    setIsStopping(true);

    try {
      const response = await fetch('/api/scrape-auto/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the job status immediately to show it's stopped
        if (jobStatus) {
          setJobStatus({
            ...jobStatus,
            status: 'stopped'
          });
        }
      } else {
        setError(data.message || 'Failed to stop scrape-auto');
      }
    } catch (error) {
      console.error('Error stopping scrape-auto:', error);
      setError('An error occurred while stopping the scrape-auto');
    } finally {
      setIsStopping(false);
    }
  };

  // Function to check the status of a scrape-auto job
  const checkJobStatus = async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/scrape-auto?jobId=${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check job status');
      }

      setJobStatus(data.job);
    } catch (err: any) {
      setError(err.message || 'An error occurred while checking job status');
    }
  };

  // Poll for status updates when a job is in progress
  useEffect(() => {
    if (jobId && (!jobStatus || ['pending', 'processing'].includes(jobStatus.status))) {
      const interval = setInterval(checkJobStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [jobId, jobStatus]);

  // Format date string
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Scrape-Auto - Stüssy Collections</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <p className="mb-4">
          This tool will automatically scrape all Stüssy collection pages and save new products to the database.
          It is scheduled to run daily, but you can also trigger it manually.
        </p>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={startAutoScrape}
            disabled={isLoading || jobStatus?.status === 'processing'}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              isLoading || jobStatus?.status === 'processing'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading && !jobId ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-5 w-5" />
                <span>Start Scrape-Auto</span>
              </>
            )}
          </button>
          
          {jobStatus?.status === 'processing' && (
            <button
              onClick={stopAutoScrape}
              disabled={isStopping || jobStatus?.status !== 'processing'}
              className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
                isStopping
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isStopping ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  <span>Stopping...</span>
                </>
              ) : (
                <>
                  <StopIcon className="h-5 w-5" />
                  <span>Stop Scraping</span>
                </>
              )}
            </button>
          )}
        </div>
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
          
          {jobStatus ? (
            <div>
              <p className="mb-2">Status: <span className={`font-semibold ${
                jobStatus.status === 'completed' ? 'text-green-600' : 
                jobStatus.status === 'error' ? 'text-red-600' : 
                jobStatus.status === 'stopped' ? 'text-yellow-600' : 
                'text-blue-600'
              }`}>{jobStatus.status}</span></p>
              
              <p className="mb-2">Started: {formatDate(jobStatus.startTime)}</p>
              {jobStatus.endTime && (
                <p className="mb-2">Completed: {formatDate(jobStatus.endTime)}</p>
              )}
              
              {jobStatus.status === 'processing' && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${jobStatus.progress}%` }}
                  ></div>
                </div>
              )}
              
              <div className="mb-4 text-sm">
                <p className="font-medium">
                  Progress: {jobStatus.processedPages} of {jobStatus.totalPages} collections processed
                </p>
                <p className="text-gray-600">
                  Saved {jobStatus.savedProducts} products, skipped {jobStatus.skippedProducts} products
                </p>
              </div>
              
              {jobStatus.error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
                  Error: {jobStatus.error}
                </div>
              )}
              
              {jobStatus.collections && jobStatus.collections.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Collections</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {jobStatus.collections && jobStatus.collections.map((collection, index) => {
                      // Extract the collection name from the URL
                      const collectionName = collection.split('/collections/')[1];
                      return (
                        <li key={index}>
                          <a 
                            href={collection} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {collectionName}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              {jobStatus.status === 'completed' && (
                <div className="mt-4 p-4 bg-green-100 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800">Scrape-Auto Completed</h3>
                  <p className="text-green-700">
                    Successfully processed {jobStatus.processedPages} of {jobStatus.totalPages} collections.
                  </p>
                  <div className="mt-2">
                    <p className="font-medium">Results:</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li className="text-green-700">Saved: {jobStatus.savedProducts} products</li>
                      <li className="text-amber-700">Skipped: {jobStatus.skippedProducts} products (already in database)</li>
                    </ul>
                  </div>
                  <p className="mt-3 text-sm text-green-600">
                    The next scheduled scrape-auto will run at midnight UTC.
                  </p>
                </div>
              )}
              
              {jobStatus.status === 'stopped' && (
                <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-800">Scrape-Auto Stopped</h3>
                  <p className="text-yellow-700">
                    The scrape-auto process was manually stopped after processing {jobStatus.processedPages} of {jobStatus.totalPages} collections.
                  </p>
                  <div className="mt-2">
                    <p className="font-medium">Partial Results:</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li className="text-green-700">Saved: {jobStatus.savedProducts} products</li>
                      <li className="text-amber-700">Skipped: {jobStatus.skippedProducts} products (already in database)</li>
                    </ul>
                  </div>
                  <p className="mt-3 text-sm text-yellow-600">
                    You can start a new scrape-auto job to continue processing the remaining collections.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600">Loading job status...</p>
          )}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">About Daily Scraping</h2>
        <p className="mb-2">
          This tool is configured to run automatically <span className="font-semibold">every day at 00:00 UTC (midnight)</span> to keep your wardrobe updated with the latest Stüssy products.
        </p>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="font-medium text-blue-800 mb-1">Scheduled Time:</p>
          <ul className="list-disc pl-5 text-blue-700">
            <li>00:00 UTC (Midnight Universal Time)</li>
            <li>02:00 CET (Central European Time) during standard time</li>
            <li>03:00 CEST (Central European Summer Time) during daylight saving</li>
            <li>19:00 EST (Eastern Standard Time) the previous day during standard time</li>
            <li>20:00 EDT (Eastern Daylight Time) the previous day during daylight saving</li>
          </ul>
        </div>
        <p className="mb-2">
          The daily scrape is triggered by a cron job that calls the <code>/api/cron/daily-scrape</code> endpoint.
        </p>
        <p className="text-sm text-gray-600">
          To configure the cron job, you can use a service like Vercel Cron Jobs or set up a traditional cron job on your server.
        </p>
      </div>
    </div>
  );
}
