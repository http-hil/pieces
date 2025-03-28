import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from 'firecrawl';

// Define types for the request body
type ScrapeRequest = {
  action: 'scrape';
  url: string;
  formats: Array<'content' | 'html' | 'markdown' | 'links' | 'extract' | 'rawHtml' | 'screenshot' | 'screenshot@fullPage' | 'json'>;
  onlyMainContent?: boolean;
  waitFor?: number;
};

// Define response types
type ScrapeResponseData = {
  html?: string;
  markdown?: string;
  links?: string[];
  content?: string;
  rawHtml?: string;
  extract?: any;
  [key: string]: any;
};

type ScrapeResponse = {
  success: boolean;
  data?: ScrapeResponseData;
  error?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }
    
    if (body.action === 'scrape') {
      return handleScrape(body as ScrapeRequest);
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in Firecrawl MCP API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function handleScrape(request: ScrapeRequest) {
  try {
    if (!request.url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Initialize Firecrawl app with API key from environment variable
    const app = new FirecrawlApp({ 
      apiKey: process.env.FIRECRAWL_API_KEY || 'fc-b4be050554f34ee394b0e7258861e331'
    });
    
    console.log(`Using Firecrawl to scrape URL: ${request.url}`);
    
    // Scrape the URL using Firecrawl
    const scrapedData = await app.scrapeUrl(request.url, {
      formats: request.formats,
      onlyMainContent: request.onlyMainContent,
      waitFor: request.waitFor
    });
    
    if (!scrapedData) {
      console.error('Failed to get data from URL');
      throw new Error('Failed to get data from URL');
    }
    
    if ('error' in scrapedData && scrapedData.error) {
      console.error(`Firecrawl error: ${scrapedData.error}`);
      throw new Error(`Firecrawl error: ${scrapedData.error}`);
    }
    
    if ('data' in scrapedData && scrapedData.data) {
      // Return the scraped data
      return NextResponse.json(scrapedData.data);
    }
    
    return NextResponse.json({ error: 'No data returned from Firecrawl' }, { status: 500 });
  } catch (error) {
    console.error('Error in Firecrawl scrape:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
