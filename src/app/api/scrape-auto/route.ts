import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabase';
import crypto from 'crypto';

// Define types for the job status
type AutoScrapeJob = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'stopped';
  startTime: Date;
  endTime?: Date;
  totalPages: number;
  processedPages: number;
  savedProducts: number;
  skippedProducts: number;
  error?: string;
  collections: string[];
};

// Make the job status map globally accessible
declare global {
  var autoScrapeJobs: Map<string, AutoScrapeJob>;
}

// Initialize if it doesn't exist
if (!global.autoScrapeJobs) {
  global.autoScrapeJobs = new Map<string, AutoScrapeJob>();
}

// Function to generate a unique job ID
function generateJobId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Function to get all collection URLs from Stüssy website
async function getAllCollectionUrls(): Promise<string[]> {
  try {
    console.log('[SCRAPE-AUTO] Discovering all collection URLs...');
    
    // Define the base URL for Stüssy
    const baseUrl = 'https://eu.stussy.com';
    
    // Hardcoded collection URLs for now since we can't directly use the MCP tools in API routes
    // In a real implementation, you would use a proper crawling solution or the Firecrawl API directly
    const collectionUrls = [
      'https://eu.stussy.com/collections/new-arrivals',
      'https://eu.stussy.com/collections/tees',
      'https://eu.stussy.com/collections/sweats',
      'https://eu.stussy.com/collections/tops-shirts',
      'https://eu.stussy.com/collections/knits',
      'https://eu.stussy.com/collections/outerwear',
      'https://eu.stussy.com/collections/pants',
      'https://eu.stussy.com/collections/shorts',
      'https://eu.stussy.com/collections/hats',
      'https://eu.stussy.com/collections/bags',
      'https://eu.stussy.com/collections/accessories',
      'https://eu.stussy.com/collections/womens'
    ];
    
    console.log(`[SCRAPE-AUTO] Found ${collectionUrls.length} collection URLs`);
    return collectionUrls;
  } catch (error) {
    console.error('[SCRAPE-AUTO] Error getting collection URLs:', error);
    throw error;
  }
}

// Function to scrape a single collection page
async function scrapeCollectionPage(collectionUrl: string, jobId: string): Promise<{
  savedCount: number;
  skippedCount: number;
}> {
  try {
    console.log(`[SCRAPE-AUTO] Scraping collection: ${collectionUrl}`);
    
    // Check if the job has been stopped
    const job = global.autoScrapeJobs.get(jobId);
    if (!job || job.status === 'stopped') {
      console.log(`[SCRAPE-AUTO] Job ${jobId} has been stopped, skipping collection: ${collectionUrl}`);
      return { savedCount: 0, skippedCount: 0 };
    }
    
    // Get the base URL for API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!baseUrl) {
      console.warn('[SCRAPE-AUTO] NEXT_PUBLIC_APP_URL is not set. Using default localhost:3000');
    }
    
    const apiUrl = `${baseUrl || 'http://localhost:3000'}/api/scrape-store`;
    
    // Use the existing scrape-store API to scrape this collection
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        storeUrl: collectionUrl,
        maxProducts: 20, // Scrape up to 20 products per collection
        autoScrapeJobId: jobId // Pass the job ID for tracking
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to scrape collection: ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json();
    const scrapeJobId = data.jobId;
    
    // Poll for completion
    let status = 'processing';
    let savedCount = 0;
    let skippedCount = 0;
    
    while (status === 'processing') {
      // Wait for 2 seconds between checks
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check status
      const statusUrl = `${baseUrl || 'http://localhost:3000'}/api/scrape-store?jobId=${scrapeJobId}`;
      const statusResponse = await fetch(statusUrl);
      
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(`Failed to check scrape status: ${errorData.message || statusResponse.statusText}`);
      }
      
      const statusData = await statusResponse.json();
      status = statusData.status;
      
      // Update counts if available
      if (statusData.savedCount !== undefined) {
        savedCount = statusData.savedCount;
      }
      
      if (statusData.skippedCount !== undefined) {
        skippedCount = statusData.skippedCount;
      }
      
      // If there's an error, break the loop
      if (status === 'error') {
        throw new Error(`Scraping error: ${statusData.message || 'Unknown error'}`);
      }
    }
    
    console.log(`[SCRAPE-AUTO] Completed scraping ${collectionUrl}: Saved ${savedCount}, Skipped ${skippedCount}`);
    
    return {
      savedCount,
      skippedCount
    };
  } catch (error) {
    console.error(`[SCRAPE-AUTO] Error scraping collection ${collectionUrl}:`, error);
    throw error;
  }
}

// Function to process all collections in the background
async function processCollections(jobId: string, collectionUrls: string[]) {
  try {
    // Get the job from memory
    const job = global.autoScrapeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    // Update job status to processing
    job.status = 'processing';
    global.autoScrapeJobs.set(jobId, job);
    
    console.log(`[SCRAPE-AUTO] Starting to process ${collectionUrls.length} collections for job ${jobId}`);
    
    // Process each collection
    for (let i = 0; i < collectionUrls.length; i++) {
      // Check if the job has been stopped
      const currentJob = global.autoScrapeJobs.get(jobId);
      if (!currentJob || currentJob.status === 'stopped') {
        console.log(`[SCRAPE-AUTO] Job ${jobId} has been stopped, stopping processing`);
        break;
      }
      
      const collectionUrl = collectionUrls[i];
      
      try {
        // Scrape the collection page
        const { savedCount, skippedCount } = await scrapeCollectionPage(collectionUrl, jobId);
        
        // Update job status
        const updatedJob = global.autoScrapeJobs.get(jobId);
        if (updatedJob) {
          updatedJob.processedPages = i + 1;
          updatedJob.savedProducts += savedCount;
          updatedJob.skippedProducts += skippedCount;
          global.autoScrapeJobs.set(jobId, updatedJob);
        }
      } catch (error) {
        console.error(`[SCRAPE-AUTO] Error processing collection ${collectionUrl}:`, error);
        // Continue with the next collection even if this one fails
      }
    }
    
    // Update job status to completed
    const finalJob = global.autoScrapeJobs.get(jobId);
    if (finalJob) {
      if (finalJob.status !== 'stopped') {
        finalJob.status = 'completed';
      }
      finalJob.endTime = new Date();
      global.autoScrapeJobs.set(jobId, finalJob);
    }
    
    console.log(`[SCRAPE-AUTO] Finished processing collections for job ${jobId}`);
  } catch (error) {
    console.error('[SCRAPE-AUTO] Error processing collections:', error);
    
    // Update job status to error
    const job = global.autoScrapeJobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = (error as Error).message;
      job.endTime = new Date();
      global.autoScrapeJobs.set(jobId, job);
    }
  }
}

// POST handler to start a new scrape-auto job
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Generate a unique job ID
    const jobId = generateJobId();
    
    // Get all collection URLs
    const collectionUrls = await getAllCollectionUrls();
    
    // Create a new job
    const job: AutoScrapeJob = {
      id: jobId,
      status: 'pending',
      startTime: new Date(),
      totalPages: collectionUrls.length,
      processedPages: 0,
      savedProducts: 0,
      skippedProducts: 0,
      collections: collectionUrls
    };
    
    // Store the job in memory
    global.autoScrapeJobs.set(jobId, job);
    
    // Start processing the collections in the background
    processCollections(jobId, collectionUrls);
    
    return NextResponse.json({
      success: true,
      message: 'Scrape-auto job started',
      jobId,
      totalPages: collectionUrls.length
    });
  } catch (error) {
    console.error('[SCRAPE-AUTO] Error starting scrape-auto job:', error);
    return NextResponse.json({
      success: false,
      message: 'Error starting scrape-auto job',
      error: (error as Error).message
    }, { status: 500 });
  }
}

// GET handler to check the status of a scrape-auto job
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the job ID from the query string
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      // Return all jobs if no job ID is provided
      return NextResponse.json({
        success: true,
        jobs: Array.from(global.autoScrapeJobs.values())
      });
    }
    
    // Get the job from memory
    const job = global.autoScrapeJobs.get(jobId);
    
    if (!job) {
      return NextResponse.json({
        success: false,
        message: 'Job not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      job
    });
  } catch (error) {
    console.error('[SCRAPE-AUTO] Error getting scrape-auto job status:', error);
    return NextResponse.json({
      success: false,
      message: 'Error getting scrape-auto job status',
      error: (error as Error).message
    }, { status: 500 });
  }
}
