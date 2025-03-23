import { NextRequest, NextResponse } from 'next/server';

// Define the secret key for authentication
const CRON_SECRET = process.env.CRON_SECRET || 'default-secret-key-change-me';

/**
 * This API route is designed to be called by a cron job service (like Vercel Cron Jobs)
 * to trigger the daily scraping of Stüssy collection pages.
 * 
 * It should be set up to run once per day.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization');
    
    // Verify the authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== CRON_SECRET) {
      console.error('[DAILY-SCRAPE] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[DAILY-SCRAPE] Starting daily scrape job');
    
    // Get the base URL for API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!baseUrl) {
      console.warn('[DAILY-SCRAPE] NEXT_PUBLIC_APP_URL is not set. Using default localhost:3000');
    }
    
    const apiUrl = `${baseUrl || 'http://localhost:3000'}/api/auto-scrape`;
    
    // Call the auto-scrape API to start the scraping process
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to start auto-scrape: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`[DAILY-SCRAPE] Auto-scrape job started successfully with ID: ${data.jobId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Daily scrape job started successfully',
      jobId: data.jobId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DAILY-SCRAPE] Error starting daily scrape job:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
