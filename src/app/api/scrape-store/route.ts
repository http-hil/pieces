import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { supabase, checkUrlExists } from '../../../../utils/supabase';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

// Define types for the Firecrawl response
type ScrapeResponse = {
  success: boolean;
  error?: string;
  data?: {
    content?: string;
    html?: string;
    markdown?: string;
    links?: string[];
    llm_extraction?: any;
    extract?: any;
    [key: string]: any;
  };
};

// Define types for our database items
interface StoreItem {
  name: string;
  url: string;
  price: string;
  color?: string;
  description?: string;
  categories?: string[];
  imageUrl?: string;
  image_url?: string;
  product_img?: string;
  category?: string;
}

// Define types for our in-memory job store
interface ProductScrapeJob {
  status: 'processing' | 'completed' | 'error';
  storeUrl: string;
  productCards: Array<{
    url: string;
    name: string;
    price: string;
    imageUrl: string;
    color: string;
  }>;
  progress: number;
  savedProducts: Array<{ url: string; name: string }>;
  skippedProducts: Array<{ url: string; name?: string; reason: string }>;
  error?: string;
  scrapeAutoJobId?: string; // Store the scrape-auto job ID if provided
}

// Extend the global namespace to include our job store
declare global {
  var productScrapeJobs: Record<string, ProductScrapeJob>;
}

// Define the job status type
type JobStatus = {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  progress: number;
  message: string;
  savedCount?: number;
  skippedCount?: number;
  totalProcessed?: number;
};

// Map to store job statuses in memory
const jobStatuses = new Map<string, JobStatus>();

// Function to update job status
async function updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
  // Update the job status in memory
  jobStatuses.set(jobId, status);
  console.log(`[DEBUG] Updated job ${jobId} status: ${status.status}, progress: ${status.progress}%, message: ${status.message}`);
}

// Function to get job status
function getJobStatus(jobId: string): JobStatus | null {
  return jobStatuses.get(jobId) || null;
}

// Function to extract product cards directly from HTML
function extractProductCardsFromHTML(html: string, baseUrl: string): Array<{
  url: string;
  name: string;
  price: string;
  imageUrl: string;
  color: string;
}> {
  try {
    const $ = cheerio.load(html);
    const productCards: Array<{
      url: string;
      name: string;
      price: string;
      imageUrl: string;
      color: string;
    }> = [];
    
    // Check if this is an A Day's March page
    if (baseUrl.includes('adaysmarch.com')) {
      // A Day's March specific extraction
      $('.product-item').each((index: number, card: any) => {
        try {
          const $card = $(card);
          
          // Extract product URL
          const relativeUrl = $card.find('a.product-item__link').attr('href');
          const url = relativeUrl ? new URL(relativeUrl, baseUrl).toString() : '';
          
          // Extract product name
          const name = $card.find('.product-item__title').text().trim();
          
          // Extract product price
          const price = $card.find('.product-item__price').text().trim().replace(/[^\d.]/g, '');
          
          // Extract product image
          const imageUrl = $card.find('.product-item__image img').attr('src') || 
                          $card.find('.product-item__image img').attr('data-src') || '';
          
          // Extract color - A Day's March often has color in the product title or URL
          let color = '';
          if (name.toLowerCase().includes('olive')) {
            color = 'Olive';
          } else if (name.toLowerCase().includes('black')) {
            color = 'Black';
          } else if (name.toLowerCase().includes('navy')) {
            color = 'Navy';
          } else if (name.toLowerCase().includes('clay')) {
            color = 'Clay';
          } else {
            // Try to extract from URL
            const urlLower = url.toLowerCase();
            if (urlLower.includes('olive')) {
              color = 'Olive';
            } else if (urlLower.includes('black')) {
              color = 'Black';
            } else if (urlLower.includes('navy')) {
              color = 'Navy';
            } else if (urlLower.includes('clay')) {
              color = 'Clay';
            }
          }
          
          if (url && name && imageUrl) {
            productCards.push({
              url,
              name,
              price,
              imageUrl,
              color
            });
          }
        } catch (cardError) {
          console.error('Error extracting A Day\'s March product card data:', cardError);
        }
      });
      
      console.log(`Extracted ${productCards.length} A Day's March product cards`);
      return productCards;
    }
    
    // Original Stussy extraction logic
    $('.product-card').each((index: number, card: any) => {
      try {
        const $card = $(card);
        
        // Extract product URL
        const relativeUrl = $card.find('a').attr('href');
        const url = relativeUrl ? new URL(relativeUrl, baseUrl).toString() : '';
        
        // Extract product name
        const name = $card.find('.product-card__title').text().trim();
        
        // Extract product price
        const price = $card.find('.product-card__price').text().trim();
        
        // Extract product image
        const imageUrl = $card.find('.product-card__image img').attr('src') || '';
        
        // Extract color from image alt text
        const imageAlt = $card.find('.product-card__image img').attr('alt') || '';
        const color = imageAlt.split(' ')[0] || ''; // First word in alt text is often the color
        
        if (url && name && imageUrl) {
          productCards.push({
            url,
            name,
            price,
            imageUrl,
            color
          });
        }
      } catch (cardError) {
        console.error('Error extracting product card data:', cardError);
      }
    });
    
    return productCards;
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return [];
  }
}

// Function to extract brand from URL
function extractBrandFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Extract domain without TLD
    const domain = urlObj.hostname.split('.');
    
    // Special case for about---blank.com
    if (domain.join('.').includes('about---blank')) {
      return 'about-blank';
    }
    
    // Special case for A Day's March
    if (domain.join('.').includes('adaysmarch')) {
      return 'adaysmarch';
    }
    
    // Common patterns for brand extraction
    if (domain.length >= 2) {
      // For domains like brand.com, eu.brand.com, etc.
      if (domain[0] === 'www' || domain[0] === 'eu' || domain[0] === 'us') {
        return domain[1];
      } else {
        return domain[0];
      }
    }
    
    return domain[0] || 'unknown';
  } catch (error) {
    console.error('Error extracting brand from URL:', error);
    return 'unknown';
  }
}

// Function to extract category from collection URL
function extractCategoryFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Special case for A Day's March
    if (url.includes('adaysmarch.com')) {
      const pathParts = urlObj.pathname.split('/');
      
      // Check for men's category
      if (pathParts.includes('men')) {
        const menIndex = pathParts.findIndex(part => part === 'men');
        
        if (menIndex !== -1 && menIndex + 1 < pathParts.length) {
          return pathParts[menIndex + 1];
        }
        
        return 'men';
      }
      
      // Check for women's category
      if (pathParts.includes('women')) {
        const womenIndex = pathParts.findIndex(part => part === 'women');
        
        if (womenIndex !== -1 && womenIndex + 1 < pathParts.length) {
          return pathParts[womenIndex + 1];
        }
        
        return 'women';
      }
      
      return 'general';
    }
    
    // Original Stussy logic
    const pathParts = urlObj.pathname.split('/');
    
    // Find the collections part
    const collectionsIndex = pathParts.findIndex(part => part === 'collections');
    
    if (collectionsIndex !== -1 && collectionsIndex + 1 < pathParts.length) {
      const category = pathParts[collectionsIndex + 1];
      
      // Clean up the category
      return category
        .replace(/-/g, ' ')
        .replace(/new arrivals/i, 'new')
        .replace(/all/i, 'general');
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Error extracting category from URL:', error);
    return 'unknown';
  }
}

// Function to normalize a URL
function normalizeUrl(url: string): string {
  try {
    // Ensure URL has a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Remove 'www.' if present
    let hostname = parsedUrl.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
      parsedUrl.hostname = hostname;
    }
    
    // Remove trailing slash if present
    let path = parsedUrl.pathname;
    if (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1);
      parsedUrl.pathname = path;
    }
    
    // Ensure the URL is valid for Firecrawl
    const normalizedUrl = parsedUrl.toString();
    console.log(`Normalized URL: ${url} -> ${normalizedUrl}`);
    
    return normalizedUrl;
  } catch (error) {
    console.error(`Error normalizing URL ${url}:`, error);
    return url; // Return original URL if normalization fails
  }
}

// Function to scrape additional details from product page
async function scrapeProductDetails(productUrl: string): Promise<{ 
  color?: string; 
  description?: string;
  categories?: string[];
  price?: string;
  imageUrl?: string;
}> {
  console.log(`Scraping additional details from ${productUrl}`);
  
  try {
    // Initialize Firecrawl app with API key from environment variable
    const app = new FirecrawlApp({ 
      apiKey: process.env.FIRECRAWL_API_KEY || 'fc-b4be050554f34ee394b0e7258861e331'
    });
    
    // Scrape the product page with Firecrawl
    console.log(`Using Firecrawl to scrape product page: ${productUrl}`);
    
    // Define extraction schema for structured data
    const extractionSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string' },
        categories: { 
          type: 'array',
          items: { type: 'string' }
        },
        imageUrl: { type: 'string' }
      }
    } as any; // Type assertion to avoid TypeScript error with Firecrawl schema
    
    // Scrape the product page with structured extraction
    const scrapedData = await app.scrapeUrl(productUrl, {
      formats: ['html', 'extract'],
      extract: {
        schema: extractionSchema,
        systemPrompt: `You are a product data extractor. Extract structured data from this product page. 
        Look for the product name, price, description, color, categories (from breadcrumbs or tags), and main image URL.
        For color, look for color names in the product title, variant selectors, or product details.
        For categories, look for breadcrumb navigation or product tags.
        For price, extract only the numeric value if possible.
        For imageUrl, find the main product image URL.`
      }
    }) as ScrapeResponse;
    
    if (!scrapedData || !scrapedData.data) {
      console.error('Failed to get data from product page');
      return {};
    }
    
    // Check if we have extracted data
    if (scrapedData.data.extract) {
      console.log('Successfully extracted structured data from product page');
      const extractedData = scrapedData.data.extract;
      
      return {
        color: extractedData.color,
        description: extractedData.description,
        categories: extractedData.categories,
        price: extractedData.price,
        imageUrl: extractedData.imageUrl
      };
    }
    
    // If structured extraction failed, fallback to HTML parsing with Cheerio
    if (scrapedData.data.html) {
      console.log('Structured extraction failed, falling back to HTML parsing');
      const html = scrapedData.data.html;
      const $ = cheerio.load(html);
      
      // Extract data using common selectors
      const result: {
        color?: string;
        description?: string;
        categories?: string[];
        price?: string;
        imageUrl?: string;
      } = {};
      
      // Extract price
      const priceSelectors = [
        '.product-price', 
        '.price', 
        '.product-single__price',
        '[data-product-price]',
        '.money',
        'meta[property="product:price:amount"]'
      ];
      
      for (const selector of priceSelectors) {
        const element = $(selector);
        if (element.length) {
          const priceText = selector.includes('meta') 
            ? element.attr('content') 
            : element.text().trim();
            
          if (priceText) {
            // Extract just the numeric part if possible
            const priceMatch = priceText.match(/[\d,.]+/);
            result.price = priceMatch ? priceMatch[0] : priceText;
            break;
          }
        }
      }
      
      // Extract description
      const descriptionSelectors = [
        '.product-description',
        '.product-single__description',
        '.product-details__description',
        '[data-product-description]',
        'meta[property="og:description"]'
      ];
      
      for (const selector of descriptionSelectors) {
        const element = $(selector);
        if (element.length) {
          const descText = selector.includes('meta') 
            ? element.attr('content') 
            : element.text().trim();
            
          if (descText) {
            result.description = descText;
            break;
          }
        }
      }
      
      // Extract color
      const colorSelectors = [
        '.product-option-value',
        '.swatch-selected',
        '.color-swatch.active',
        '[data-selected-color]',
        '[aria-label*="Color"]'
      ];
      
      for (const selector of colorSelectors) {
        const element = $(selector);
        if (element.length) {
          const colorText = element.attr('data-selected-color') || element.text().trim();
          if (colorText) {
            result.color = colorText;
            break;
          }
        }
      }
      
      // If no color found in selectors, try to extract from URL or title
      if (!result.color) {
        // Try to extract from URL
        if (productUrl.includes('/products/')) {
          const urlParts = productUrl.split('/products/')[1].split('-');
          // Usually the color is the last part after the last dash
          const potentialColor = urlParts[urlParts.length - 1];
          if (potentialColor && !potentialColor.match(/^\d+$/) && potentialColor !== 'ecru') {
            result.color = potentialColor;
          }
        }
        
        // If still no color, try to extract from title
        if (!result.color) {
          const title = $('h1').text().trim();
          if (title.includes('/')) {
            const titleParts = title.split('/');
            result.color = titleParts[titleParts.length - 1].trim();
          }
        }
      }
      
      // Extract categories
      const categories: string[] = [];
      
      // Try breadcrumbs first
      $('.breadcrumb a, .breadcrumbs a, nav[aria-label="breadcrumb"] a').each((_, element) => {
        const $element = $(element);
        const category = $element.text().trim().toLowerCase();
        
        // Check if this is the category filter
        if (category && 
            !category.includes('home') && 
            !category.includes('index') &&
            !category.match(/^\d+$/)) {
          categories.push(category);
        }
      });
      
      // Try product tags
      $('.product-tags a, .tags a').each((_, element) => {
        const $element = $(element);
        const tag = $element.text().trim().toLowerCase();
        if (tag) {
          categories.push(tag);
        }
      });
      
      if (categories.length > 0) {
        result.categories = categories;
      }
      
      // Extract image URL
      const imageSelectors = [
        '.product-featured-img',
        '.product-single__photo img',
        '.product-image img',
        '[data-zoom-image]',
        'meta[property="og:image"]'
      ];
      
      for (const selector of imageSelectors) {
        const element = $(selector);
        if (element.length) {
          const imgSrc = selector.includes('meta') 
            ? element.attr('content') 
            : (element.attr('data-zoom-image') || element.attr('src'));
            
          if (imgSrc) {
            result.imageUrl = imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc;
            break;
          }
        }
      }
      
      return result;
    }
    
    return {};
  } catch (error) {
    console.error(`Error scraping product details: ${error}`);
    return {};
  }
}

// Function to map product card data to database schema
function mapCardToDbSchema(
  card: any, 
  storeUrl: string, 
  additionalDetails?: { 
    color?: string; 
    description?: string;
    categories?: string[];
    price?: string;
    imageUrl?: string;
  },
  storeCategories: string[] = []
): StoreItem {
  // Extract brand from URL
  const brand = extractBrandFromUrl(storeUrl);
  
  // Combine categories from store and product
  const allCategories = [
    ...(storeCategories || []),
    ...(additionalDetails?.categories || [])
  ];
  
  // Get unique categories
  const uniqueCategories = [...new Set(allCategories)];
  
  // Get the first category as the primary category
  const category = uniqueCategories.length > 0 ? uniqueCategories[0] : '';
  
  // Combine color information
  const finalColor = additionalDetails?.color || card.color || '';
  
  // Combine price information
  let finalPriceString = additionalDetails?.price || card.price || '';
  
  // If price is a number, format it as a string
  if (typeof finalPriceString === 'number') {
    finalPriceString = finalPriceString.toString();
  }
  
  // Clean the price string
  const finalPrice = cleanPrice(finalPriceString);
  
  return {
    name: card.name,
    url: card.url,
    price: finalPrice,
    color: finalColor || 'unknown',
    description: additionalDetails?.description || `${card.name} - ${finalColor || 'unknown color'} - ${finalPriceString || 'unknown'}`,
    categories: uniqueCategories,
    category,
    imageUrl: card.imageUrl || '',
    image_url: card.imageUrl || '',
    product_img: card.imageUrl || ''
  };
}

// Function to clean price string
function cleanPrice(priceString: string): string {
  try {
    // Make a copy of the price string
    let finalPriceString = priceString;
    
    // Save the original price for reference
    const originalPrice = finalPriceString;
    
    // Remove currency symbols, commas, spaces, and other non-numeric characters
    // Keep only digits and decimal point
    finalPriceString = finalPriceString.replace(/[^\d.,]/g, '');
    
    // Replace comma with dot for decimal separator if needed
    finalPriceString = finalPriceString.replace(',', '.');
    
    // If the price is empty after cleaning, return the original
    if (!finalPriceString) {
      return originalPrice;
    }
    
    // Parse the price as a float
    const price = parseFloat(finalPriceString);
    
    // If the price is NaN, return the original
    if (isNaN(price)) {
      return originalPrice;
    }
    
    // Return the price as a string with 2 decimal places
    return price.toFixed(2);
  } catch (error) {
    console.error(`Error cleaning price: ${error}`);
    return priceString || ''; // Return original or empty string if null/undefined
  }
}

// Function to save product to database
async function saveProductToDatabase(product: StoreItem, storeUrl: string, categories: string[] = []): Promise<{ success: boolean; message: string; productId?: string }> {
  try {
    console.log(`Saving product to database: ${product.name}`);
    
    // Check if product already exists
    const { data: existingProducts, error: existingError } = await supabase
      .from('products')
      .select('id, url')
      .eq('url', product.url);
    
    if (existingError) {
      console.error('Error checking for existing product:', existingError);
      return { success: false, message: `Database error: ${existingError.message}` };
    }
    
    // Prepare the product data
    const productData = {
      name: product.name,
      url: product.url,
      price: parseFloat(product.price) || null,
      color: product.color || null,
      description: product.description || null,
      store_url: storeUrl,
      categories: categories, // Ensure categories is an array
      image_url: product.imageUrl || product.image_url || product.product_img || null
    };
    
    // If product exists, update it
    if (existingProducts && existingProducts.length > 0) {
      const existingId = existingProducts[0].id;
      
      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', existingId);
      
      if (updateError) {
        console.error('Error updating product:', updateError);
        return { success: false, message: `Database error: ${updateError.message}` };
      }
      
      console.log(`Updated existing product: ${product.name}`);
      return { success: true, message: 'Product updated successfully', productId: existingId };
    }
    
    // Otherwise, insert new product
    const { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert([productData])
      .select();
    
    if (insertError) {
      console.error('Error inserting product:', insertError);
      return { success: false, message: `Database error: ${insertError.message}` };
    }
    
    if (!insertedProduct || insertedProduct.length === 0) {
      return { success: false, message: 'Product was not inserted for unknown reason' };
    }
    
    console.log(`Inserted new product: ${product.name}`);
    return { 
      success: true, 
      message: 'Product added successfully', 
      productId: insertedProduct[0].id 
    };
  } catch (error) {
    console.error('Error saving product to database:', error);
    return { success: false, message: `Unexpected error: ${error}` };
  }
}

// Function to scrape a store page
async function scrapeStorePage(storeUrl: string, maxProducts: number = 50): Promise<{ 
  productCards: any[]; 
  categories?: string[];
}> {
  console.log(`Scraping store page: ${storeUrl}`);
  
  try {
    // Detect platform and use appropriate scraper
    const platform = detectPlatform(storeUrl);
    console.log(`Detected platform: ${platform}`);
    
    switch (platform) {
      case 'shopify':
        if (storeUrl.includes('stussy.com')) {
          return await scrapeStussyStore(storeUrl, maxProducts);
        }
        // TODO: Add general Shopify scraper here
        break;
      case 'carhartt-wip':
        return await scrapeCarharttWipStore(storeUrl, maxProducts);
      default:
        // Continue with generic scraper
        break;
    }
    
    // Normalize the URL to ensure it works without 'www.'
    const normalizedUrl = normalizeUrl(storeUrl);
    
    // Initialize Firecrawl app with API key from environment variable
    const app = new FirecrawlApp({ 
      apiKey: process.env.FIRECRAWL_API_KEY || 'fc-b4be050554f34ee394b0e7258861e331'
    });
    
    console.log(`Using Firecrawl to scrape store page: ${normalizedUrl}`);
    
    // Scrape the store page using Firecrawl
    const scrapedData = await app.scrapeUrl(normalizedUrl, {
      formats: ['html', 'links', 'markdown']
    }) as ScrapeResponse;
    
    // Log the entire response for debugging
    console.log(`Firecrawl response status: ${scrapedData.success ? 'success' : 'failure'}`);
    if (scrapedData.error) {
      console.error(`Firecrawl error: ${scrapedData.error}`);
      throw new Error(`Failed to start scraping: ${scrapedData.error}`);
    }
    
    if (!scrapedData || !scrapedData.data) {
      console.error('Failed to get data from store page');
      throw new Error('Failed to get data from store page');
    }
    
    const html = scrapedData.data.html;
    const links = scrapedData.data.links || [];
    const markdown = scrapedData.data.markdown || '';
    
    if (!html) {
      console.error('Failed to get HTML content from store page');
      throw new Error('Failed to get HTML content from store page');
    }
    
    console.log(`Received HTML of length: ${html.length}`);
    console.log(`Received ${links.length} links from store page`);
    
    // Parse the HTML with Cheerio to extract product information
    const $ = cheerio.load(html);
    
    // Extract categories from the page
    const categories: string[] = [];
    
    // Method 1: Look for category filters
    console.log(`Looking for category filters...`);
    $('.filter-group, .facets__display, .collection-filters').each((_, filterGroup) => {
      const $filterGroup = $(filterGroup);
      const filterTitle = $filterGroup.find('.filter-group__header, .facets__heading, h3').text().trim().toLowerCase();
      
      // Check if this is the category filter
      if (filterTitle.includes('category') || filterTitle.includes('product type')) {
        console.log(`Found category filter: ${filterTitle}`);
        $filterGroup.find('input[type="checkbox"], .filter-group__option, li, .facets__list, .facets__item').each((_, option) => {
          const optionText = $(option).next('label').text().trim() || $(option).text().trim();
          if (optionText && !optionText.toLowerCase().includes('all')) {
            console.log(`Found category: ${optionText}`);
            categories.push(optionText.toLowerCase());
          }
        });
      }
    });
    
    // Method 2: Look for category links in the navigation
    console.log(`Looking for category links in navigation...`);
    $('nav a, .collection-filters a, .facets__list a').each((_, link) => {
      const $link = $(link);
      const href = $link.attr('href') || '';
      const linkText = $link.text().trim();
      
      if (linkText && 
          !linkText.toLowerCase().includes('all') && 
          !linkText.toLowerCase().includes('clear') &&
          !linkText.match(/^\d+$/) && // Skip if it's just a number
          (href.includes('category') || href.includes('collection'))) {
        console.log(`Found category link: ${linkText} (${href})`);
        categories.push(linkText.toLowerCase());
      }
    });
    
    // Process product links to extract product cards
    const productCards: any[] = [];
    const processedUrls = new Set<string>();
    
    // Special handling for Stussy website
    if (storeUrl.includes('stussy.com')) {
      console.log('Detected Stussy website, using specialized extraction');
      
      // Filter links to find product URLs
      const stussyProductLinks = links.filter(link => {
        // Keep only product links and exclude collection links
        return (link.includes('/products/') && 
                !link.includes('/collections/all-products/products/')) || 
               link.includes('/products?variant=');
      });
      
      console.log(`Found ${stussyProductLinks.length} Stussy product links`);
      
      // Process each product link
      for (const link of stussyProductLinks) {
        if (productCards.length >= maxProducts) break;
        
        try {
          // Normalize the URL
          const fullUrl = link.startsWith('http') ? link : `${new URL(storeUrl).origin}${link}`;
          
          // Skip if we've already processed this URL or if it's not a product URL
          if (processedUrls.has(fullUrl) || !fullUrl.includes('/products/')) continue;
          processedUrls.add(fullUrl);
          
          // Extract product information from the URL
          const urlObj = new URL(fullUrl);
          const pathParts = urlObj.pathname.split('/');
          const productSlug = pathParts[pathParts.length - 1].split('?')[0];
          
          // Generate a product name from the slug
          // Stussy product URLs often have a format like: 116618-big-ol-jean-washed-canvas-brown
          // The first part is the product ID, the rest is the product name
          const slugParts = productSlug.split('-');
          const productId = slugParts[0];
          const nameWithoutId = slugParts.slice(1).join(' ');
          
          let name = nameWithoutId || productSlug.replace(/-/g, ' ');
          name = name.replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
          
          // Extract color from URL if possible
          let color = '';
          if (slugParts.length > 2) {
            // Usually the color is in the last parts
            const potentialColors = slugParts.slice(-2);
            color = potentialColors.join(' ');
          }
          
          console.log(`Found Stussy product: ${name} (${fullUrl})`);
          
          productCards.push({
            url: fullUrl,
            name,
            price: '', // We'll get this from product details later
            imageUrl: '', // We'll get this from product details later
            color
          });
        } catch (cardError) {
          console.error('Error extracting A Day\'s March product card data:', cardError);
        }
      }
      
      // If we still don't have enough products, try to extract more from the HTML
      if (productCards.length < maxProducts) {
        console.log('Trying to extract more Stussy products from HTML...');
        
        // Look for product links in the HTML
        $('a[href*="/products/"]').each((_, element) => {
          if (productCards.length >= maxProducts) return false;
          
          const link = $(element).attr('href');
          if (!link) return;
          
          const fullUrl = link.startsWith('http') ? link : `${new URL(storeUrl).origin}${link}`;
          
          // Skip if we've already processed this URL or if it's a collection URL
          if (processedUrls.has(fullUrl) || 
              fullUrl.includes('/collections/all-products/products/') || 
              !fullUrl.includes('/products/')) {
            return;
          }
          
          processedUrls.add(fullUrl);
          
          try {
            // Extract product information from the URL
            const urlObj = new URL(fullUrl);
            const pathParts = urlObj.pathname.split('/');
            const productSlug = pathParts[pathParts.length - 1].split('?')[0];
            
            // Generate a product name from the slug
            const slugParts = productSlug.split('-');
            const productId = slugParts[0];
            const nameWithoutId = slugParts.slice(1).join(' ');
            
            let name = nameWithoutId || productSlug.replace(/-/g, ' ');
            name = name.replace(/\b\w/g, l => l.toUpperCase());
            
            // Extract color from URL if possible
            let color = '';
            if (slugParts.length > 2) {
              const potentialColors = slugParts.slice(-2);
              color = potentialColors.join(' ');
            }
            
            console.log(`Found additional Stussy product from HTML: ${name} (${fullUrl})`);
            
            productCards.push({
              url: fullUrl,
              name,
              price: '', // We'll get this from product details later
              imageUrl: '', // We'll get this from product details later
              color
            });
          } catch (error) {
            console.error(`Error processing additional Stussy product link ${link}:`, error);
          }
        });
      }
    } else {
      // Standard processing for non-Stussy websites
      // Find product links from the scraped links
      const productLinks = links.filter(link => 
        link.includes('/products/') || 
        link.includes('/product/') ||
        link.includes('?variant=')
      );
      
      console.log(`Found ${productLinks.length} potential product links`);
      
      // Process up to maxProducts unique product links
      for (const link of productLinks) {
        if (productCards.length >= maxProducts) break;
        
        // Normalize the URL and check if we've already processed it
        const fullUrl = link.startsWith('http') ? link : `${new URL(storeUrl).origin}${link}`;
        
        // Skip if we've already processed this URL
        if (processedUrls.has(fullUrl)) continue;
        processedUrls.add(fullUrl);
        
        try {
          // Extract product information from the URL
          const urlObj = new URL(fullUrl);
          const pathParts = urlObj.pathname.split('/');
          const productSlug = pathParts[pathParts.length - 1].split('?')[0];
          
          // Generate a product name from the slug
          let name = productSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          // Extract color from URL if possible
          let color = '';
          if (productSlug.includes('-')) {
            const slugParts = productSlug.split('-');
            // Usually the color is the last part
            const potentialColor = slugParts[slugParts.length - 1];
            
            if (potentialColor && !potentialColor.match(/^\d+$/)) {
              color = potentialColor;
            }
          }
          
          console.log(`Found product: ${name} (${fullUrl})`);
          
          productCards.push({
            url: fullUrl,
            name,
            price: '', // We'll get this from product details later
            imageUrl: '', // We'll get this from product details later
            color
          });
        } catch (error) {
          console.error(`Error processing product link ${link}:`, error);
        }
      }
      
      // If no product links found in the links array, try to extract them from the HTML
      if (productCards.length === 0) {
        console.log(`No product links found in links array, trying to extract from HTML...`);
        
        // Try different selectors for product cards
        const selectors = [
          '.product-card',
          '.product-grid-item', 
          '.product-item', 
          '.grid__item',
          '.grid-product',
          'li.grid__item',
          'div[data-product-id]',
          '.collection-products a',
          '.product-grid a',
          'a[href*="/products/"]'
        ];
        
        for (const selector of selectors) {
          const elements = $(selector);
          console.log(`Selector '${selector}' found ${elements.length} elements`);
          
          if (elements.length > 0) {
            // Process each element that might be a product card
            elements.each((index, element) => {
              if (productCards.length >= maxProducts) return false;
              
              const card = $(element);
              
              // Find the link element - either the card itself if it's an <a> or the first <a> inside
              const linkElement = card.is('a') ? card : card.find('a').first();
              const url = linkElement.attr('href');
              
              // Skip if no URL found or if it doesn't look like a product URL
              if (!url || !(url.includes('/product') || url.includes('?variant='))) {
                return;
              }
              
              // Normalize the URL
              const fullUrl = url.startsWith('http') ? url : `${new URL(storeUrl).origin}${url}`;
              
              // Skip if we've already processed this URL
              if (processedUrls.has(fullUrl)) {
                return;
              }
              processedUrls.add(fullUrl);
              
              // Try different selectors for product name
              let name = '';
              const nameSelectors = ['.product-title', '.product-item-title', '.product-name', '.title', 'h3', 'h2', '.product-item__title'];
              for (const nameSelector of nameSelectors) {
                const nameElement = card.find(nameSelector).first();
                if (nameElement.length && nameElement.text().trim()) {
                  name = nameElement.text().trim();
                  break;
                }
              }
              
              // If no name found, try to get it from the URL
              if (!name && url) {
                const urlParts = url.split('/');
                const productSlug = urlParts[urlParts.length - 1];
                name = productSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              }
              
              // Ensure we have a name
              if (!name) {
                name = 'Unknown Product';
              }
              
              // Try different selectors for image
              let imageUrl = '';
              const imgElement = card.find('img').first();
              if (imgElement.length) {
                imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
                
                // Shopify sometimes uses relative URLs for images
                if (imageUrl && !imageUrl.startsWith('http')) {
                  imageUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : `${new URL(storeUrl).origin}${imageUrl}`;
                }
              }
              
              console.log(`Found product from HTML: ${name} (${fullUrl})`);
              
              productCards.push({
                url: fullUrl,
                name,
                price: '', // We'll get this from product details later
                imageUrl,
                color: ''
              });
            });
            
            if (productCards.length > 0) {
              break; // Stop if we found products with this selector
            }
          }
        }
      }
    }
    
    // Remove duplicates from categories and clean them
    const uniqueCategories = [...new Set(categories)]
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);
    
    console.log(`Found ${productCards.length} products on the page`);
    console.log(`Found categories: ${uniqueCategories.join(', ') || 'None'}`);
    
    if (productCards.length === 0) {
      throw new Error('No products found on the store page');
    }
    
    return { productCards, categories: uniqueCategories };
  } catch (error) {
    console.error(`Error scraping store page: ${error}`);
    throw error; // Propagate the error to be handled by the caller
  }
}

// Function to scrape Stussy store specifically
async function scrapeStussyStore(storeUrl: string, maxProducts: number = 50): Promise<{ 
  productCards: any[]; 
  categories?: string[];
}> {
  console.log(`Using specialized Stussy scraper with Shopify JSON API for: ${storeUrl}`);
  
  try {
    // Normalize the Stussy URL to ensure we're using the correct domain
    const normalizedUrl = storeUrl.includes('stussy.com') 
      ? storeUrl 
      : 'https://www.stussy.com/collections/new-arrivals';
    
    console.log(`Using normalized Stussy URL: ${normalizedUrl}`);
    
    // Parse the URL to get the collection handle
    const urlObj = new URL(normalizedUrl);
    const pathParts = urlObj.pathname.split('/');
    let collectionHandle = 'new-arrivals'; // Default collection
    
    // Find the collection handle in the URL path
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'collections' && i + 1 < pathParts.length) {
        collectionHandle = pathParts[i + 1];
        break;
      }
    }
    
    console.log(`Using collection handle: ${collectionHandle}`);
    
    // Construct the Shopify JSON API URL
    // Format: /collections/{collection-handle}/products.json
    const shopifyApiUrl = `https://www.stussy.com/collections/${collectionHandle}/products.json`;
    
    console.log(`Fetching products from Shopify API: ${shopifyApiUrl}`);
    
    // Fetch products from Shopify API
    const response = await fetch(shopifyApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!response.ok) {
      console.error(`Error fetching from Shopify API: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch from Shopify API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      console.error('Invalid response from Shopify API: No products array');
      throw new Error('Invalid response from Shopify API: No products array');
    }
    
    console.log(`Found ${data.products.length} products from Shopify API`);
    
    // Transform Shopify products to our product card format
    const productCards = data.products.slice(0, maxProducts).map((product: any) => {
      // Get the main image URL
      const imageUrl = product.images && product.images.length > 0 
        ? product.images[0].src 
        : '';
      
      // Get the price from the first variant
      let price = '';
      if (product.variants && product.variants.length > 0) {
        price = product.variants[0].price ? `$${product.variants[0].price}` : '';
      }
      
      // Extract color from tags or options
      let color = '';
      
      // Check if there's a color option
      if (product.options) {
        const colorOption = product.options.find((option: any) => 
          option.name.toLowerCase() === 'color' || 
          option.name.toLowerCase() === 'colour'
        );
        
        if (colorOption && colorOption.values && colorOption.values.length > 0) {
          color = colorOption.values[0];
        }
      }
      
      // If no color found in options, try to extract from product handle
      if (!color && product.handle) {
        const handleParts = product.handle.split('-');
        if (handleParts.length > 1) {
          // The last part is often the color
          color = handleParts[handleParts.length - 1];
        }
      }
      
      return {
        url: `https://www.stussy.com/products/${product.handle}`,
        name: product.title,
        price,
        imageUrl,
        color
      };
    });
    
    // Extract categories from product tags
    const categories = new Set<string>();
    
    data.products.forEach((product: any) => {
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach((tag: string) => {
          // Filter out non-category tags (usually categories are single words or short phrases)
          if (tag && tag.length > 0 && tag.length < 30 && !tag.includes(':')) {
            categories.add(tag.toLowerCase());
          }
        });
      }
      
      // Also check product type
      if (product.product_type) {
        categories.add(product.product_type.toLowerCase());
      }
    });
    
    const uniqueCategories = Array.from(categories);
    
    console.log(`Found ${productCards.length} products for Stussy store`);
    console.log(`Found categories: ${uniqueCategories.join(', ') || 'None'}`);
    
    if (productCards.length === 0) {
      throw new Error('No products found for the Stussy store');
    }
    
    return { productCards, categories: uniqueCategories };
  } catch (error) {
    console.error(`Error scraping Stussy store page: ${error}`);
    throw error;
  }
}

// Function to scrape Carhartt-WIP store specifically
async function scrapeCarharttWipStore(storeUrl: string, maxProducts: number = 50): Promise<{ 
  productCards: any[]; 
  categories?: string[];
}> {
  console.log(`Using specialized Carhartt-WIP scraper with Firecrawl extract for: ${storeUrl}`);
  
  try {
    // Normalize the Carhartt-WIP URL to ensure we're using the correct domain and path
    const normalizedUrl = storeUrl.includes('carhartt-wip.com') 
      ? storeUrl 
      : 'https://www.carhartt-wip.com/en/men';
    
    console.log(`Using normalized Carhartt-WIP URL: ${normalizedUrl}`);
    
    // Initialize Firecrawl app with API key from environment variable
    const app = new FirecrawlApp({ 
      apiKey: process.env.FIRECRAWL_API_KEY || 'fc-b4be050554f34ee394b0e7258861e331'
    });
    
    // Define extraction schema and response type
    type CarharttProductData = {
      name: string;
      url: string;
      price: string;
      imageUrl: string;
      color: string;
      categories: string[];
    };
    
    type CarharttCategoryLink = {
      name: string;
      url: string;
    };
    
    type CarharttExtractResponse = {
      products: CarharttProductData[];
      categoryLinks: CarharttCategoryLink[];
    };
    
    // Use Firecrawl extract to get product data
    console.log(`Using Firecrawl extract to scrape Carhartt-WIP store: ${normalizedUrl}`);
    
    const extractResponse = await app.extract(
      [normalizedUrl],
      {
        prompt: `Extract all men's product information from the Carhartt-WIP website. For each product, extract:
          1. Product name
          2. Product URL
          3. Price
          4. Image URL
          5. Color (if available)
          6. Categories
          
          Also extract all category links from the men's section.`,
        schema: {
          type: "object", 
          properties: {
            products: {
              type: "array", 
              items: {
                type: "object", 
                properties: {
                  name: {type: "string"}, 
                  url: {type: "string"}, 
                  price: {type: "string"}, 
                  imageUrl: {type: "string"}, 
                  color: {type: "string"}, 
                  categories: {
                    type: "array", 
                    items: {type: "string"}
                  }
                }
              }
            }, 
            categoryLinks: {
              type: "array", 
              items: {
                type: "object", 
                properties: {
                  name: {type: "string"}, 
                  url: {type: "string"}
                }
              }
            }
          }
        },
        allowExternalLinks: true
      }
    );
    
    // Type guard to check if we have a successful response with data
    const isExtractResponse = (response: any): response is CarharttExtractResponse => {
      return response && 
        typeof response === 'object' && 
        Array.isArray(response.products);
    };
    
    if (!isExtractResponse(extractResponse)) {
      console.error('Failed to extract data from Carhartt-WIP store');
      throw new Error('Failed to extract data from Carhartt-WIP store');
    }
    
    const extractedData = extractResponse as CarharttExtractResponse;
    
    console.log(`Successfully extracted data from Carhartt-WIP store`);
    console.log(`Found ${extractedData.products.length} products and ${extractedData.categoryLinks?.length || 0} categories`);
    
    // Transform extracted products to our product card format
    const productCards = extractedData.products.slice(0, maxProducts).map((product) => {
      return {
        url: product.url,
        name: product.name,
        price: product.price || '',
        imageUrl: product.imageUrl || '',
        color: product.color || ''
      };
    });
    
    // Extract categories from category links
    const categories: string[] = extractedData.categoryLinks 
      ? extractedData.categoryLinks.map((cat) => cat.name.toLowerCase())
      : [];
    
    // Remove duplicates from categories
    const uniqueCategories = [...new Set(categories)];
    
    console.log(`Processed ${productCards.length} products for Carhartt-WIP store`);
    console.log(`Found categories: ${uniqueCategories.join(', ') || 'None'}`);
    
    if (productCards.length === 0) {
      throw new Error('No products found for the Carhartt-WIP store');
    }
    
    return { productCards, categories: uniqueCategories };
  } catch (error) {
    console.error(`Error scraping Carhartt-WIP store page: ${error}`);
    throw error;
  }
}

// Function to detect e-commerce platform from URL
function detectPlatform(url: string): 'shopify' | 'carhartt-wip' | 'generic' {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('carhartt-wip.com')) {
    return 'carhartt-wip';
  } else if (
    urlLower.includes('myshopify.com') || 
    urlLower.includes('shopify.com') ||
    urlLower.includes('stussy.com')
  ) {
    return 'shopify';
  }
  
  return 'generic';
}

export async function POST(request: NextRequest) {
  try {
    const { storeUrl, maxProducts = 50, scrapeAutoJobId } = await request.json();
    
    if (!storeUrl) {
      return NextResponse.json({ success: false, message: 'Store URL is required' }, { status: 400 });
    }
    
    console.log(`Received request to scrape store: ${storeUrl}`);
    console.log(`Max products to scrape: ${maxProducts}`);
    
    // Check if the URL exists and is accessible
    const urlExists = await checkUrlExists(storeUrl);
    if (!urlExists) {
      return NextResponse.json({ success: false, message: 'Store URL is not accessible' }, { status: 400 });
    }
    
    // Check if we have any existing products from this domain
    const domain = new URL(storeUrl).hostname;
    console.log(`Checking for existing products from domain: ${domain}`);
    
    // Comment out the call to checkExistingProductsFromDomain as it's no longer needed
    // await checkExistingProductsFromDomain(domain);
    
    // Scrape the store page
    console.log(`Scraping store page: ${storeUrl}`);
    try {
      const { productCards, categories: storeCategories = [] } = await scrapeStorePage(storeUrl, maxProducts);
      
      if (productCards.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'No products found on the store page',
          storeUrl,
          productsScraped: 0
        }, { status: 404 });
      }
      
      console.log(`Found ${productCards.length} products on the store page`);
      
      // Process each product
      const products: any[] = [];
      const skippedProducts: any[] = [];

      let savedCount = 0;
      let totalProcessed = 0;

      // Process each product card
      for (const card of productCards) {
        if (savedCount >= maxProducts) break;
        
        totalProcessed++;

        try {
          // Check if product already exists
          const exists = await checkUrlExists(card.url);
          if (exists) {
            skippedProducts.push({ url: card.url, reason: 'Already exists in database' });
            continue;
          }

          // Scrape additional details from product page
          console.log(`[DEBUG] Processing product: ${card.url}`);
          const additionalDetails = await scrapeProductDetails(card.url);

          // Map card data to database schema
          const product = mapCardToDbSchema(card, storeUrl, additionalDetails, storeCategories || []);

          // Save product to database
          const result = await saveProductToDatabase(product, storeUrl, storeCategories || []);
          if (!result.success) {
            skippedProducts.push({ url: card.url, reason: result.message });
            continue;
          }

          // Add to saved products list
          products.push({ 
            id: result.productId,
            name: product.name, 
            url: product.url,
            price: product.price,
            color: product.color,
            imageUrl: product.imageUrl || product.image_url
          });
          savedCount++;

          // Update job progress
          const progress = Math.min(100, Math.round((savedCount / maxProducts) * 100));
          try {
            await updateJobStatus(scrapeAutoJobId, {
              status: 'processing',
              progress,
              message: `Saved ${savedCount} of ${maxProducts} products...`,
              savedCount,
              skippedCount: skippedProducts.length,
              totalProcessed,
            });
          } catch (error) {
            console.error(`Error updating job progress: ${error}`);
          }

        } catch (error: any) {
          console.error(`Error processing product ${card.url}:`, error);
          skippedProducts.push({ url: card.url, reason: error.message || 'Error processing product' });
        }
      }

      // Return the result
      return NextResponse.json({ 
        success: true, 
        message: 'Products scraped and saved successfully',
        storeUrl,
        productsScraped: products.length,
        products,
        skippedProducts
      });
    } catch (error: any) {
      console.error('Error in scrapeStorePage:', error);
      
      // Format the error message
      let errorMessage = 'Failed to scrape store page';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Check if it's a specific error we want to handle
      if (errorMessage.includes('No products found')) {
        return NextResponse.json({ 
          success: false, 
          message: 'No products found on the store page',
          storeUrl,
          productsScraped: 0
        }, { status: 404 });
      } else if (errorMessage.includes('404')) {
        return NextResponse.json({ 
          success: false, 
          message: 'Store page returned 404 Not Found',
          storeUrl,
          productsScraped: 0
        }, { status: 404 });
      }
      
      // Return a generic error response
      return NextResponse.json({ 
        success: false, 
        message: errorMessage,
        storeUrl,
        productsScraped: 0,
        error: error instanceof Error ? error.stack : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in scrape-store API:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const storeUrl = url.searchParams.get('storeUrl');
    
    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    // First check if the job exists in the new job status system
    const jobStatus = getJobStatus(jobId);
    
    if (jobStatus) {
      // Return the job status from the new system
      return NextResponse.json({
        status: jobStatus.status,
        progress: jobStatus.progress,
        message: jobStatus.message,
        savedCount: jobStatus.savedCount || 0,
        skippedCount: jobStatus.skippedCount || 0,
        totalProcessed: jobStatus.totalProcessed || 0
      });
    }
    
    // Fallback to the old system if not found in the new one
    if (!global.productScrapeJobs || !global.productScrapeJobs[jobId]) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }
    
    const job = global.productScrapeJobs[jobId];
    
    // Return the job status and progress
    return NextResponse.json({
      status: job.status,
      progress: job.progress,
      savedProducts: job.savedProducts,
      skippedProducts: job.skippedProducts,
      error: job.error,
      totalProcessed: job.savedProducts.length + job.skippedProducts.length,
      savedCount: job.savedProducts.length,
      skippedCount: job.skippedProducts.length,
      targetProducts: job.savedProducts.length >= 1 ? job.savedProducts.length : 0,
      storeUrl: job.storeUrl
    });
  } catch (error) {
    console.error('Error in scrape-store status API:', error);
    return NextResponse.json(
      { message: 'Internal server error', error },
      { status: 500 }
    );
  }
}

// Function to scrape a product page for details
async function scrapeProductPage(productUrl: string): Promise<any> {
  console.log(`Scraping product page: ${productUrl}`);
  
  try {
    // Normalize the URL to ensure it works without 'www.'
    const normalizedUrl = normalizeUrl(productUrl);
    
    // Fetch the product page
    const response = await fetch(normalizedUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch product page: ${response.statusText}`);
      return {};
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract product details
    const details: any = {};
    
    // Extract product name
    const productName = $('h1, .product-title, .product-name').first().text().trim();
    console.log(`Extracted product name: ${productName}`);
    details.name = productName;
    
    // Extract product price
    const priceElement = $('.product-price, .price, .product__price').first();
    const priceText = priceElement.text().trim();
    console.log(`Extracted price text: ${priceText}`);
    
    // Clean up price text
    if (priceText) {
      // Remove currency symbols, commas, spaces, and other non-numeric characters
      // Keep only digits and decimal point
      const cleanedPrice = priceText.replace(/[^\d.,]/g, '');
      
      // Replace comma with dot for decimal separator if needed
      const priceString = cleanedPrice.replace(/,/g, '.');
      
      // If there are multiple dots, keep only the last one (assuming it's the decimal separator)
      const dotCount = (priceString.match(/\./g) || []).length;
      if (dotCount > 1) {
        const parts = priceString.split('.');
        const lastPart = parts.pop() || '';
        details.price = parts.join('') + '.' + lastPart;
      } else {
        details.price = priceString;
      }
    }
    
    // Extract product description
    const descriptionElement = $('.product-description, .description, .product__description');
    const description = descriptionElement.text().trim();
    console.log(`Extracted description: ${description ? description.substring(0, 100) + '...' : 'Not found'}`);
    details.description = description;
    
    // Extract product images
    const mainImageElement = $('.product-image img, .product__image img, .product-gallery__image img').first();
    const mainImageUrl = mainImageElement.attr('src') || mainImageElement.attr('data-src') || '';
    console.log(`Extracted main image URL: ${mainImageUrl}`);
    details.product_img = mainImageUrl;
    
    // Extract secondary image
    const secondaryImageElement = $('.product-image img, .product__image img, .product-gallery__image img').eq(1);
    const secondaryImageUrl = secondaryImageElement.attr('src') || secondaryImageElement.attr('data-src') || '';
    console.log(`Extracted secondary image URL: ${secondaryImageUrl}`);
    details.secondary_img = secondaryImageUrl;
    
    // Extract product categories
    const categories: string[] = [];
    
    // Method 1: Look for breadcrumbs
    console.log(`Looking for breadcrumbs...`);
    $('.breadcrumb, .breadcrumbs, .breadcrumb-item a').each((_, element) => {
      const text = $(element).text().trim();
      // Skip home, index, or brand name links
      if (text && !['home', 'index', 'stussy'].includes(text.toLowerCase())) {
        categories.push(text);
      }
    });
    
    // Method 2: Look for category meta tags
    console.log(`Looking for category meta tags...`);
    $('meta[property="product:category"]').each((_, element) => {
      const category = $(element).attr('content')?.trim();
      if (category) {
        console.log(`Found category in meta tag: ${category}`);
        categories.push(category);
      }
    });
    
    // Method 3: Extract from hero:hover:collection element (Stussy specific)
    console.log(`Looking for hero:hover:collection attribute...`);
    const heroCollectionElement = $('[hero\\:hover\\:collection]');
    if (heroCollectionElement.length) {
      const collectionData = heroCollectionElement.attr('hero:hover:collection');
      if (collectionData) {
        console.log(`Found hero:hover:collection: ${collectionData}`);
        const collectionCategories = collectionData.split(',').map(cat => cat.trim());
        categories.push(...collectionCategories.filter(cat => cat !== 'new-arrivals' && cat !== 'all'));
      }
    }
    
    // Method 4: For About Blank, extract categories from specific elements
    if (productUrl.includes('about---blank.com')) {
      console.log(`Looking for About Blank specific category elements...`);
      
      // Try to find categories in the product details section
      $('.product-details, .product-info').find('a').each((_, element) => {
        const href = $(element).attr('href') || '';
        const text = $(element).text().trim().toLowerCase();
        
        if (href.includes('/collections/') && text && !text.includes('all')) {
          console.log(`Found About Blank category link: ${text} (${href})`);
          categories.push(text);
        }
      });
      
      // Try to find categories in specific About Blank elements
      $('.product-type, .product-vendor').each((_, element) => {
        const text = $(element).text().trim().toLowerCase();
        if (text && !text.includes('all')) {
          console.log(`Found About Blank product type/vendor: ${text}`);
          categories.push(text);
        }
      });
    }
    
    // If no categories found, try to infer from product name
    if (categories.length === 0) {
      console.log(`No categories found, trying to infer from product name...`);
      const productName = $('h1').text().trim().toLowerCase();
      
      if (productName.includes('t-shirt') || productName.includes('tee')) {
        console.log(`Inferred category 't-shirts' from product name`);
        categories.push('t-shirts');
      } else if (productName.includes('hoodie')) {
        console.log(`Inferred category 'hoodies' from product name`);
        categories.push('hoodies');
      } else if (productName.includes('shirt') && !productName.includes('t-shirt')) {
        console.log(`Inferred category 'shirts' from product name`);
        categories.push('shirts');
      } else if (productName.includes('pant') || productName.includes('trouser')) {
        console.log(`Inferred category 'trousers' from product name`);
        categories.push('trousers');
      } else if (productName.includes('jacket') || productName.includes('coat')) {
        console.log(`Inferred category 'outerwear' from product name`);
        categories.push('outerwear');
      } else if (productName.includes('sweater') || productName.includes('knit')) {
        console.log(`Inferred category 'knitwear' from product name`);
        categories.push('knitwear');
      }
    }
    
    // Extract product color
    console.log(`Looking for product color...`);
    let color = '';
    
    // Method 1: Look for color option
    $('.color-option.selected, .color-swatch.selected, .color-selector.selected').each((_, element) => {
      const colorText = $(element).attr('title') || $(element).attr('data-color') || $(element).text().trim();
      if (colorText) {
        console.log(`Found color in color option: ${colorText}`);
        color = colorText.toLowerCase();
      }
    });
    
    // Method 2: Look for color in product name
    if (!color) {
      console.log(`No color found in color options, trying to extract from product name...`);
      const colorKeywords = [
        'black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 
        'orange', 'brown', 'grey', 'gray', 'navy', 'olive', 'tan', 'cream'
      ];
      
      for (const keyword of colorKeywords) {
        if (productName.toLowerCase().includes(keyword)) {
          console.log(`Found color in product name: ${keyword}`);
          color = keyword;
          break;
        }
      }
    }
    
    // Method 3: Extract from URL
    if (!color && productUrl) {
      console.log(`No color found in product name, trying to extract from URL...`);
      const urlParts = productUrl.split('/');
      const productSlug = urlParts[urlParts.length - 1];
      
      if (productSlug.includes('-')) {
        const slugParts = productSlug.split('-');
        // Usually the color is in the last parts
        const potentialColors = slugParts.slice(-2);
        color = potentialColors.join(' ');
      }
    }
    
    details.color = color;
    details.category = categories.join(', ');
    
    // Extract brand
    console.log(`Extracting brand...`);
    let brand = '';
    
    // Method 1: Look for brand meta tag
    const brandMeta = $('meta[property="product:brand"]').attr('content');
    if (brandMeta) {
      console.log(`Found brand in meta tag: ${brandMeta}`);
      brand = brandMeta;
    }
    
    // Method 2: Extract from URL
    if (!brand) {
      const urlObj = new URL(productUrl);
      const hostname = urlObj.hostname;
      
      // Extract domain name without TLD
      const domainParts = hostname.split('.');
      if (domainParts.length >= 2) {
        const potentialBrand = domainParts[domainParts.length - 2];
        if (potentialBrand !== 'www' && potentialBrand !== 'shop') {
          console.log(`Extracted brand from URL: ${potentialBrand}`);
          brand = potentialBrand;
        }
      }
    }
    
    // Method 3: For About Blank, the brand is "About Blank"
    if (productUrl.includes('about---blank.com')) {
      console.log(`Setting brand to 'About Blank' based on URL`);
      brand = 'About Blank';
    }
    
    details.brand = brand;
    
    console.log(`Final extracted product details:`, JSON.stringify(details));
    return details;
  } catch (error) {
    console.error(`Error scraping product page: ${error}`);
    return {};
  }
}

// Function to process product cards in the background
async function processProductCards(jobId: string, storeUrl: string, maxProducts: number = 10, storeCategories?: string[]) {
  try {
    // Get the job from memory
    const job = global.productScrapeJobs[jobId];
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    // Update job status
    try {
      await updateJobStatus(jobId, {
        status: 'processing',
        progress: 0,
        message: 'Processing product cards...',
        savedCount: 0,
        skippedCount: 0,
        totalProcessed: 0,
      });
    } catch (error) {
      console.error(`Error updating job status: ${error}`);
    }

    const savedProducts: Array<{ url: string; name: string }> = [];
    const skippedProducts: Array<{ url: string; reason: string }> = [];

    let savedCount = 0;
    let totalProcessed = 0;

    // Process each product card
    for (const card of job.productCards) {
      if (savedCount >= maxProducts) break;
      
      totalProcessed++;

      try {
        // Check if product already exists
        const exists = await checkUrlExists(card.url);
        if (exists) {
          skippedProducts.push({ url: card.url, reason: 'Already exists in database' });
          continue;
        }

        // Scrape additional details from product page
        console.log(`[DEBUG] Processing product: ${card.url}`);
        const additionalDetails = await scrapeProductDetails(card.url);

        // Map card data to database schema
        const product = mapCardToDbSchema(card, storeUrl, additionalDetails, storeCategories);

        // Save product to database
        const result = await saveProductToDatabase(product, storeUrl, storeCategories);
        if (!result.success) {
          skippedProducts.push({ url: card.url, reason: result.message });
          continue;
        }

        // Add to saved products list
        savedProducts.push({ url: card.url, name: card.name });
        savedCount++;

        // Update job progress
        const progress = Math.min(100, Math.round((savedCount / maxProducts) * 100));
        try {
          await updateJobStatus(jobId, {
            status: 'processing',
            progress,
            message: `Saved ${savedCount} of ${maxProducts} products...`,
            savedCount,
            skippedCount: skippedProducts.length,
            totalProcessed,
          });
        } catch (error) {
          console.error(`Error updating job progress: ${error}`);
        }

        // Update job in memory
        job.savedProducts = savedProducts;
        job.skippedProducts = skippedProducts;
        job.progress = progress;

      } catch (error: any) {
        console.error(`Error processing product ${card.url}:`, error);
        skippedProducts.push({ url: card.url, reason: error.message || 'Error processing product' });
      }
    }

    // Update job status to completed
    try {
      await updateJobStatus(jobId, {
        status: 'completed',
        progress: 100,
        message: `Completed. Saved ${savedCount} products, skipped ${skippedProducts.length}.`,
        savedCount,
        skippedCount: skippedProducts.length,
        totalProcessed,
      });
    } catch (error) {
      console.error(`Error updating job completion status: ${error}`);
    }

    // Update job in memory
    job.status = 'completed';
    job.savedProducts = savedProducts;
    job.skippedProducts = skippedProducts;
    job.progress = 100;

    // Update scrape_stores table with the latest scrape information
    try {
      // Extract brand from URL
      const brand = extractBrandFromUrl(storeUrl);
      
      // Check if the store exists in scrape_stores
      const { data: existingStore, error: checkError } = await supabase
        .from('scrape_stores')
        .select('id')
        .eq('store_url', storeUrl)
        .maybeSingle();
      
      if (checkError && !checkError.message.includes('does not exist')) {
        console.error('Error checking scrape_stores table:', checkError);
      } else {
        if (existingStore) {
          // Update existing store
          const { error: updateError } = await supabase
            .from('scrape_stores')
            .update({
              last_scraped_at: new Date().toISOString(),
              items_count: savedCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingStore.id);
          
          if (updateError) {
            console.error('Error updating scrape_stores:', updateError);
          }
        } else {
          // Insert new store
          const { error: insertError } = await supabase
            .from('scrape_stores')
            .insert([
              {
                brand,
                store_url: storeUrl,
                last_scraped_at: new Date().toISOString(),
                items_count: savedCount
              }
            ]);
          
          if (insertError && !insertError.message.includes('does not exist')) {
            console.error('Error inserting into scrape_stores:', insertError);
          }
        }
      }
    } catch (error) {
      console.error('Error updating scrape history:', error);
    }

  } catch (error) {
    console.error(`Error in processProductCards for job ${jobId}:`, error);
    
    // Update job status to error
    try {
      await updateJobStatus(jobId, {
        status: 'error',
        progress: 0,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } catch (updateError) {
      console.error(`Error updating job error status: ${updateError}`);
    }
    
    // Update job in memory
    const job = global.productScrapeJobs[jobId];
    if (job) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }
}
