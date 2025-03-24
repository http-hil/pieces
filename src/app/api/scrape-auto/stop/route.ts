import { NextRequest, NextResponse } from 'next/server';

// Import the autoScrapeJobs from the parent route
// Since we can't directly import from a sibling file, we'll need to recreate the interface
interface AutoScrapeJob {
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
}

// Access the global autoScrapeJobs
declare global {
  var autoScrapeJobs: Map<string, AutoScrapeJob>;
}

// Initialize if it doesn't exist
if (!global.autoScrapeJobs) {
  global.autoScrapeJobs = new Map<string, AutoScrapeJob>();
}

export async function POST(request: NextRequest) {
  try {
    // Get the job ID from the request
    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json({ success: false, message: 'Job ID is required' }, { status: 400 });
    }
    
    // Get the job from memory
    const job = global.autoScrapeJobs.get(jobId);
    
    if (!job) {
      return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 });
    }
    
    // Only allow stopping jobs that are in progress
    if (job.status !== 'processing' && job.status !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        message: `Job cannot be stopped because it is already ${job.status}` 
      }, { status: 400 });
    }
    
    // Update the job status to stopped
    job.status = 'stopped';
    job.endTime = new Date();
    global.autoScrapeJobs.set(jobId, job);
    
    console.log(`[SCRAPE-AUTO] Job ${jobId} has been stopped manually`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Job stopped successfully',
      job
    });
  } catch (error) {
    console.error('[SCRAPE-AUTO] Error stopping job:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error stopping job', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}
