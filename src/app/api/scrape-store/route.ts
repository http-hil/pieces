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
type StoreItem = {
  name: string;
  product_img: string;
  tags: string;
  url: string;
  secondary_img?: string | null;
  description?: string;
  brand?: string;
  category?: string;
  color?: string;
  price?: string | null;
};

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
  autoScrapeJobId?: string; // Store the auto-scrape job ID if provided
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

// Function to extract product data directly from HTML
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
    
    // Find all product cards
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

// Function to normalize URLs (remove www. prefix)
function normalizeUrl(url: string): string {
  return url.replace(/^https?:\/\/www\./, 'https://');
}

// Function to scrape additional details from product page
async function scrapeProductDetails(productUrl: string): Promise<{ 
  color?: string; 
  description?: string;
  categories?: string[];
  price?: string;
}> {
  try {
    console.log(`Scraping details from ${productUrl}`);
    
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
    
    // Extract description
    let description = '';
    const descriptionElement = $('#productInformationDescription');
    if (descriptionElement.length) {
      description = descriptionElement.text().trim();
    } else {
      // Try alternative selectors for description
      const altDescriptionElement = $('.product__description, .product-description, .product-single__description');
      if (altDescriptionElement.length) {
        description = altDescriptionElement.text().trim();
      }
    }
    
    // Extract color
    let color = '';
    
    // Method 1: Look for color in product title or URL
    if (productUrl.includes('/products/')) {
      const urlParts = productUrl.split('/products/')[1].split('-');
      // Usually the color is the last part after the last dash
      const potentialColor = urlParts[urlParts.length - 1];
      if (potentialColor && !potentialColor.match(/^\d+$/) && potentialColor !== 'ecru') {
        color = potentialColor;
      } else if (urlParts.length > 2) {
        // Check if the second-to-last part is a color
        const secondLastPart = urlParts[urlParts.length - 2];
        if (secondLastPart && !secondLastPart.match(/^\d+$/)) {
          color = secondLastPart;
        }
      }
    }
    
    // Method 2: Look for color in product title
    if (!color) {
      const productTitle = $('.product-single__title, h1.product-title').text().trim();
      // Extract color from product title if it contains a slash (common format: "Product Name Color/Ecru")
      if (productTitle.includes('/')) {
        const titleParts = productTitle.split('/');
        // Get the part before the slash and extract the last word as color
        const beforeSlash = titleParts[0].trim();
        const beforeSlashWords = beforeSlash.split(' ');
        color = beforeSlashWords[beforeSlashWords.length - 1].toLowerCase();
      } else {
        // Try to extract color using regex
        const colorRegex = /\b(black|white|blue|red|green|yellow|orange|purple|pink|brown|grey|gray|navy|olive|tan|beige|sage|epsom)\b/i;
        const match = productTitle.match(colorRegex);
        if (match) {
          color = match[0].toLowerCase();
        }
      }
    }
    
    // Method 3: For About Blank, extract color from product title
    if (!color && productUrl.includes('about---blank.com')) {
      const productTitle = $('h1').text().trim();
      if (productTitle.includes('/')) {
        // Format is typically "product name color/ecru"
        const parts = productTitle.split('/');
        if (parts.length > 1) {
          // Get the part before the slash and extract the last word as color
          const beforeSlash = parts[0].trim();
          const beforeSlashWords = beforeSlash.split(' ');
          color = beforeSlashWords[beforeSlashWords.length - 1].toLowerCase();
        }
      }
    }
    
    // Method 4: Look for color in variant selectors
    if (!color) {
      const colorElement = $('.product-related-colors__current, [data-product-option-name="Color"], .color-swatch--active');
      if (colorElement.length) {
        color = colorElement.text().trim().toLowerCase();
      }
    }
    
    // Extract categories
    const categories: string[] = [];
    
    // Method 1: Look for category links in the product meta
    const categoryElements = $('.product-meta__collections a, .product-categories a');
    categoryElements.each((_, element) => {
      categories.push($(element).text().trim());
    });
    
    // Method 2: Extract from image attributes with hero:main:collection or hero:hover:collection
    $('img').each((_, element) => {
      const imgElement = $(element);
      
      // Check for hero:main:collection attribute
      const mainCollection = imgElement.attr('hero:main:collection');
      if (mainCollection) {
        const collectionCategories = mainCollection.split(',').map(cat => cat.trim());
        categories.push(...collectionCategories.filter(cat => cat !== 'new-arrivals' && cat !== 'all'));
      }
      
      // Check for hero:hover:collection attribute
      const hoverCollection = imgElement.attr('hero:hover:collection');
      if (hoverCollection) {
        const collectionCategories = hoverCollection.split(',').map(cat => cat.trim());
        categories.push(...collectionCategories.filter(cat => cat !== 'new-arrivals' && cat !== 'all'));
      }
    });
    
    // Method 3: For About Blank, extract category from breadcrumbs or URL path
    if (categories.length === 0 && productUrl.includes('about---blank.com')) {
      // Try to extract from URL - typically in /collections/category/products/...
      const urlMatch = productUrl.match(/\/collections\/([^\/]+)/);
      if (urlMatch && urlMatch[1] && urlMatch[1] !== 'shop-all') {
        categories.push(urlMatch[1].replace(/-/g, ' '));
      }
      
      // For About Blank, check the filter section on the page
      if (categories.length === 0) {
        // Look for category in the HTML by checking for the Category filter section
        const htmlString = $.html();
        if (htmlString.includes('Category')) {
          // About Blank has categories in a filter section
          const categoryMatch = htmlString.match(/Category<\/summary>[\s\S]*?<ul>([\s\S]*?)<\/ul>/);
          if (categoryMatch && categoryMatch[1]) {
            const categorySection = cheerio.load(categoryMatch[1]);
            categorySection('li').each((_, element) => {
              const categoryText = $(element).text().trim();
              if (categoryText && !categoryText.includes('all')) {
                categories.push(categoryText.toLowerCase());
              }
            });
          }
        }
      }
      
      // If still no categories, try to infer from product name
      if (categories.length === 0) {
        const productName = $('h1').text().trim().toLowerCase();
        if (productName.includes('t-shirt') || productName.includes('tee')) {
          categories.push('t-shirts');
        } else if (productName.includes('hoodie')) {
          categories.push('hoodies');
        } else if (productName.includes('shirt') && !productName.includes('t-shirt')) {
          categories.push('shirts');
        } else if (productName.includes('pant') || productName.includes('trouser')) {
          categories.push('trousers');
        } else if (productName.includes('jacket') || productName.includes('coat')) {
          categories.push('outerwear');
        } else if (productName.includes('sweater') || productName.includes('knit')) {
          categories.push('knitwear');
        }
      }
    }
    
    // Extract price
    let price = '';
    const priceElement = $('.product__price, .product-price, .price, .product-single__price');
    if (priceElement.length) {
      price = priceElement.text().trim();
    }
    
    // For About Blank, extract price from specific elements
    if (!price && productUrl.includes('about---blank.com')) {
      const priceElement = $('[data-price]');
      if (priceElement.length) {
        price = priceElement.attr('data-price') || priceElement.text().trim();
      }
    }
    
    // Remove duplicates from categories
    const uniqueCategories = [...new Set(categories)];
    
    console.log(`Extracted details - Color: ${color || 'Not found'}, Description: ${description ? 'Found' : 'Not found'}, Categories: ${uniqueCategories.join(', ') || 'None'}, Price: ${price || 'Not found'}`);
    
    return {
      color: color || undefined,
      description: description || undefined,
      categories: uniqueCategories.length > 0 ? uniqueCategories : undefined,
      price: price || undefined
    };
  } catch (error) {
    console.error(`Error scraping product details from ${productUrl}:`, error);
    return {};
  }
}

// Function to scrape a store page for products
async function scrapeStorePage(storeUrl: string, maxProducts: number = 50): Promise<{
  productCards: any[];
  categories?: string[];
}> {
  console.log(`Scraping store page: ${storeUrl}`);
  
  try {
    // Normalize the URL to ensure it works without 'www.'
    const normalizedUrl = normalizeUrl(storeUrl);
    
    // Fetch the store page
    console.log(`Fetching store page HTML...`);
    const response = await fetch(normalizedUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch store page: ${response.statusText}`);
      return { productCards: [] };
    }
    
    const html = await response.text();
    console.log(`Received HTML of length: ${html.length}`);
    
    // Parse the HTML
    const $ = cheerio.load(html);
    
    // Extract categories from the page
    const categories: string[] = [];
    
    // Method 1: Look for category filters
    console.log(`Looking for category filters...`);
    $('.filter-group').each((_, filterGroup) => {
      const $filterGroup = $(filterGroup);
      const filterTitle = $filterGroup.find('.filter-group__header').text().trim().toLowerCase();
      
      // Check if this is the category filter
      if (filterTitle.includes('category')) {
        console.log(`Found category filter: ${filterTitle}`);
        $filterGroup.find('input[type="checkbox"], .filter-group__option, li').each((_, option) => {
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
    $('nav a, .collection-filters a').each((_, link) => {
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
    
    // Method 4: For About Blank, extract categories from the filter section
    if (storeUrl.includes('about---blank.com')) {
      console.log(`Checking About Blank specific category filters...`);
      // About Blank has a specific structure for categories
      $('details').each((_, element) => {
        const details = $(element);
        const summary = details.find('summary').text().trim();
        
        if (summary.toLowerCase() === 'category') {
          console.log(`Found About Blank category filter section`);
          details.find('li').each((_, li) => {
            const categoryText = $(li).text().trim();
            if (categoryText && 
                !categoryText.toLowerCase().includes('all') && 
                !categoryText.toLowerCase().includes('hide')) {
              console.log(`Found About Blank category: ${categoryText}`);
              categories.push(categoryText.toLowerCase());
            }
          });
        }
      });
    }
    
    // Find all product cards
    const productCards: any[] = [];
    
    // Look for product cards - Stussy style
    console.log(`Looking for Stussy-style product cards...`);
    $('.product-card').each((index, element) => {
      if (productCards.length >= maxProducts) return false;
      
      const card = $(element);
      const linkElement = card.find('a').first();
      const url = linkElement.attr('href');
      const fullUrl = url ? (url.startsWith('http') ? url : `${new URL(storeUrl).origin}${url}`) : '';
      
      const nameElement = card.find('.product-card__title');
      const name = nameElement.text().trim();
      
      const priceElement = card.find('.product-card__price');
      const price = priceElement.text().trim();
      
      const imageElement = card.find('.product-card__image img');
      const imageUrl = imageElement.attr('src') || '';
      
      // Extract color from image alt text
      const imageAlt = imageElement.attr('alt') || '';
      const color = imageAlt.split(' ')[0] || ''; // First word in alt text is often the color
      
      if (url && name) {
        console.log(`Found Stussy product: ${name} (${fullUrl})`);
        productCards.push({
          url: fullUrl,
          name,
          price,
          imageUrl,
          color
        });
      }
    });
    
    // About Blank specific product card structure
    if (productCards.length === 0 && storeUrl.includes('about---blank.com')) {
      console.log(`Looking for About Blank product cards...`);
      
      // First, let's log the entire HTML to see what we're working with
      console.log(`First 1000 characters of HTML: ${html.substring(0, 1000)}`);
      
      // Try to find all product links for About Blank
      console.log(`Searching for all product links on About Blank...`);
      const productLinks = $('a[href*="/products/"]');
      console.log(`Found ${productLinks.length} potential product links`);
      
      // Log some sample links
      if (productLinks.length > 0) {
        productLinks.slice(0, 5).each((index, element) => {
          const href = $(element).attr('href');
          const text = $(element).text().trim();
          console.log(`Product link ${index}: href=${href}, text=${text}`);
        });
      }
      
      // Try to find product cards with different selectors
      const selectors = [
        '.product-grid-item', 
        '.product-item', 
        '.product-card',
        '.grid__item',
        '.grid-product',
        'li.grid__item',
        'div[data-product-id]',
        '.collection-products a',
        '.product-grid a'
      ];
      
      for (const selector of selectors) {
        const elements = $(selector);
        console.log(`Selector '${selector}' found ${elements.length} elements`);
        
        if (elements.length > 0) {
          console.log(`Found elements with selector '${selector}', processing...`);
          
          elements.each((index, element) => {
            if (productCards.length >= maxProducts) return false;
            
            const card = $(element);
            let linkElement = card.is('a') ? card : card.find('a').first();
            let url = linkElement.attr('href');
            
            // If no URL found, try to find it in parent elements
            if (!url) {
              const parentWithLink = card.parents('a').first();
              if (parentWithLink.length) {
                url = parentWithLink.attr('href');
                linkElement = parentWithLink;
              }
            }
            
            // Skip if not a product URL
            if (!url || !url.includes('/products/')) {
              return;
            }
            
            const fullUrl = url.startsWith('http') ? url : `${new URL(storeUrl).origin}${url}`;
            
            // Try different selectors for product name
            let name = '';
            const nameSelectors = ['.product-title', '.product-item-title', '.product-name', '.title', 'h3', 'h2'];
            for (const nameSelector of nameSelectors) {
              const nameElement = card.find(nameSelector).first();
              if (nameElement.length && nameElement.text().trim()) {
                name = nameElement.text().trim();
                break;
              }
            }
            
            // If no name found, try to get it from the URL
            if (!name) {
              const urlParts = url.split('/');
              const productSlug = urlParts[urlParts.length - 1].split('?')[0];
              name = productSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
            
            // Try different selectors for price
            let price = '';
            const priceSelectors = ['.price', '.product-price', '.product-item-price', '.money'];
            for (const priceSelector of priceSelectors) {
              const priceElement = card.find(priceSelector).first();
              if (priceElement.length && priceElement.text().trim()) {
                price = priceElement.text().trim();
                break;
              }
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
            
            // Extract color from URL or name
            let color = '';
            if (url) {
              const urlParts = url.split('/');
              const productSlug = urlParts[urlParts.length - 1].split('?')[0];
              if (productSlug.includes('-')) {
                const slugParts = productSlug.split('-');
                // Usually the color is the last part
                const potentialColor = slugParts[slugParts.length - 1];
                if (potentialColor && !potentialColor.match(/^\d+$/)) {
                  color = potentialColor;
                }
              }
            }
            
            console.log(`About Blank product details: url=${fullUrl}, name=${name}, price=${price}, imageUrl=${imageUrl}`);
            
            if (url) {
              console.log(`Found About Blank product: ${name || 'Unnamed'} (${fullUrl})`);
              productCards.push({
                url: fullUrl,
                name: name || 'Unknown Product',
                price,
                imageUrl,
                color
              });
            } else {
              console.log(`Skipped About Blank product due to missing url`);
            }
          });
        }
      }
      
      // If still no products found, try a more generic approach with all links
      if (productCards.length === 0) {
        console.log(`No About Blank products found with specific selectors, trying all links...`);
        
        $('a').each((index, element) => {
          if (productCards.length >= maxProducts) return false;
          
          const $link = $(element);
          const href = $link.attr('href') || '';
          
          // Check if this looks like a product link
          if (href.includes('/products/')) {
            const fullUrl = href.startsWith('http') ? href : `${new URL(storeUrl).origin}${href}`;
            const name = $link.text().trim() || $link.find('img').attr('alt') || href.split('/').pop() || '';
            const imageUrl = $link.find('img').attr('src') || '';
            
            console.log(`Found generic product link: ${name || 'Unnamed'} (${fullUrl})`);
            
            // Only add if we don't already have this URL
            if (!productCards.some(card => card.url === fullUrl)) {
              productCards.push({
                url: fullUrl,
                name: name || 'Unknown Product',
                price: '',
                imageUrl,
                color: ''
              });
            }
          }
        });
      }
    }
    
    // Remove duplicates from categories and clean them
    const uniqueCategories = [...new Set(categories)]
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);
    
    console.log(`Found ${productCards.length} products on the page`);
    console.log(`Found categories: ${uniqueCategories.join(', ') || 'None'}`);
    
    return { productCards, categories: uniqueCategories };
  } catch (error) {
    console.error(`Error scraping store page: ${error}`);
    return { productCards: [] };
  }
}

// Function to map product card data to database schema
function mapCardToDbSchema(card: {
  url: string;
  name: string;
  price: string;
  imageUrl: string;
  color: string;
}, storeUrl: string, additionalDetails?: { 
  color?: string; 
  description?: string;
  categories?: string[];
  price?: string;
}, storeCategories?: string[]): StoreItem {
  // Extract brand from URL
  const brand = extractBrandFromUrl(storeUrl);
  
  // Collect all possible categories
  const allCategories: string[] = [];
  
  // 1. Add categories from URL (lowest priority)
  const urlCategory = extractCategoryFromUrl(storeUrl);
  if (urlCategory && urlCategory !== 'unknown') {
    allCategories.push(urlCategory);
  }
  
  // 2. Add categories from store page (medium priority)
  if (storeCategories && storeCategories.length > 0) {
    allCategories.push(...storeCategories);
  }
  
  // 3. Add categories from product details (highest priority)
  if (additionalDetails?.categories && additionalDetails.categories.length > 0) {
    allCategories.push(...additionalDetails.categories);
  }
  
  // 4. For About Blank, try to extract category from product name if no categories found
  if (allCategories.length === 0 && storeUrl.includes('about---blank.com')) {
    const productName = card.name.toLowerCase();
    if (productName.includes('t-shirt') || productName.includes('tee')) {
      allCategories.push('t-shirts');
    } else if (productName.includes('hoodie')) {
      allCategories.push('hoodies');
    } else if (productName.includes('shirt') && !productName.includes('t-shirt')) {
      allCategories.push('shirts');
    } else if (productName.includes('pant') || productName.includes('trouser')) {
      allCategories.push('trousers');
    } else if (productName.includes('jacket') || productName.includes('coat')) {
      allCategories.push('outerwear');
    } else if (productName.includes('sweater') || productName.includes('knit')) {
      allCategories.push('knitwear');
    }
  }
  
  // Filter out 'new', 'new-arrivals', and 'all' if we have other categories
  let finalCategories = allCategories
    .map(cat => cat.trim().toLowerCase())
    .filter(cat => cat.length > 0);
  
  // If we have categories other than 'new', 'new-arrivals', or 'all', filter those out
  const hasOtherCategories = finalCategories.some(cat => 
    cat !== 'new' && 
    cat !== 'new-arrivals' && 
    cat !== 'all' && 
    cat !== 'general' &&
    cat !== 'shop-all'
  );
  
  if (hasOtherCategories) {
    finalCategories = finalCategories.filter(cat => 
      cat !== 'new' && 
      cat !== 'new-arrivals' && 
      cat !== 'all' && 
      cat !== 'general' &&
      cat !== 'shop-all'
    );
  }
  
  // Remove duplicates and join with comma
  const uniqueCategories = [...new Set(finalCategories)];
  const category = uniqueCategories.join(', ');
  
  // Use the color from additional details if available, otherwise use the one from the card
  let finalColor = additionalDetails?.color || card.color;
  
  // For About Blank, extract color from product name if not already found
  if ((!finalColor || finalColor === '') && storeUrl.includes('about---blank.com')) {
    const productName = card.name;
    if (productName.includes('/')) {
      // Format is typically "product name color/ecru"
      const parts = productName.split('/');
      if (parts.length > 1) {
        // Get the part before the slash and extract the last word as color
        const beforeSlash = parts[0].trim();
        const beforeSlashWords = beforeSlash.split(' ');
        finalColor = beforeSlashWords[beforeSlashWords.length - 1].toLowerCase();
      }
    } else {
      // Try to extract using regex
      const colorRegex = /\b(black|white|blue|red|green|yellow|orange|purple|pink|brown|grey|gray|navy|olive|tan|beige|sage|epsom)\b/i;
      const match = productName.match(colorRegex);
      if (match) {
        finalColor = match[0].toLowerCase();
      }
    }
  }
  
  // Use the price from additional details if available, otherwise use the one from the card
  let finalPriceString = additionalDetails?.price || card.price;
  
  // Clean and convert the price string to a numeric value
  // Remove currency symbols, commas, spaces, and other non-numeric characters
  // Keep only digits and decimal point
  let finalPrice: string | null = null;
  
  if (finalPriceString) {
    // First, store the original price string for the tags
    const originalPrice = finalPriceString;
    
    // Remove currency symbols, commas, spaces, and other non-numeric characters
    // Keep only digits and decimal point/comma
    finalPriceString = finalPriceString.replace(/[^\d.,]/g, '');
    
    // Replace comma with dot for decimal separator if needed
    finalPriceString = finalPriceString.replace(/,/g, '.');
    
    // If there are multiple dots, keep only the last one (assuming it's the decimal separator)
    const dotCount = (finalPriceString.match(/\./g) || []).length;
    if (dotCount > 1) {
      const parts = finalPriceString.split('.');
      const lastPart = parts.pop() || '';
      finalPriceString = parts.join('') + '.' + lastPart;
    }
    
    // Check if we have a valid number
    if (!isNaN(parseFloat(finalPriceString))) {
      finalPrice = finalPriceString;
      console.log(`Converted price from "${originalPrice}" to "${finalPrice}"`);
    } else {
      console.warn(`Could not convert price "${originalPrice}" to a number, using null instead`);
    }
  }
  
  return {
    name: card.name,
    product_img: card.imageUrl,
    tags: `${finalColor || 'unknown color'}, price:${finalPriceString || 'unknown'}, ${category || 'unknown category'}, ${brand}`,
    url: card.url,
    secondary_img: null,
    description: additionalDetails?.description || `${card.name} - ${finalColor || 'unknown color'} - ${finalPriceString || 'unknown'}`,
    brand,
    category,
    color: finalColor || 'unknown',
    price: finalPrice
  };
}

// Function to save product to database
async function saveProductToDatabase(product: StoreItem) {
  try {
    console.log(`Checking if product exists: ${product.url}`);
    // Check if the product URL already exists
    const exists = await checkUrlExists(product.url);
    console.log(`Product URL exists check result: ${exists}`);
    
    if (exists) {
      console.log(`Product with URL ${product.url} already exists, skipping...`);
      return { success: false, message: 'Product already exists' };
    }
    
    console.log('Saving product to database:', product.name);
    console.log('Product data:', JSON.stringify(product));
    
    // Log the table schema to debug
    console.log('Attempting to get table info...');
    let actualColumns: string[] = [];
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('items')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('Error getting table info:', tableError);
      } else {
        console.log('Table first row:', tableInfo);
        if (tableInfo && tableInfo.length > 0) {
          actualColumns = Object.keys(tableInfo[0]);
          console.log('Table columns:', actualColumns);
        }
      }
    } catch (tableErr) {
      console.error('Exception getting table info:', tableErr);
    }
    
    // Adapt the product data to match the actual database schema
    const adaptedProduct: Record<string, any> = {};
    
    // Map our fields to the database fields, handling different naming conventions
    const fieldMappings: Record<string, string[]> = {
      'name': ['name', 'Name'],
      'product_img': ['product_img', 'Main image URL', 'image_url', 'imageUrl'],
      'tags': ['tags', 'Tags'],
      'url': ['url', 'URL', 'product_url'],
      'secondary_img': ['secondary_img', 'Secundary image', 'secondaryImg'],
      'description': ['description', 'Description'],
      'brand': ['brand', 'Brand'],
      'category': ['category', 'Category'],
      'color': ['color', 'Color'],
      'price': ['price', 'Price']
    };
    
    // For each of our fields, try to find a matching column in the database
    for (const [ourField, possibleDbFields] of Object.entries(fieldMappings)) {
      // Skip if the product doesn't have this field
      if (!(ourField in product)) {
        console.log(`Product doesn't have field: ${ourField}`);
        continue;
      }
      
      // Find the first matching column in the database
      const matchingColumn = possibleDbFields.find(dbField => actualColumns.includes(dbField));
      
      if (matchingColumn) {
        // Special handling for price field - ensure it's a number or null
        if (ourField === 'price') {
          const priceValue = (product as any)[ourField];
          console.log(`Processing price field: ${priceValue}, type: ${typeof priceValue}`);
          
          if (priceValue === null || priceValue === undefined) {
            adaptedProduct[matchingColumn] = null;
            console.log(`Price is null or undefined, setting to null`);
          } else {
            // Try to convert to a number if it's a string
            try {
              // Clean the price string - remove currency symbols, commas, etc.
              const cleanedPrice = typeof priceValue === 'string' 
                ? priceValue.replace(/[^\d.,]/g, '').replace(/,/g, '.') 
                : priceValue;
              
              console.log(`Cleaned price: ${cleanedPrice}`);
              
              const numericPrice = typeof cleanedPrice === 'string' 
                ? parseFloat(cleanedPrice) 
                : cleanedPrice;
              
              console.log(`Numeric price: ${numericPrice}, isNaN: ${isNaN(numericPrice)}`);
              
              adaptedProduct[matchingColumn] = isNaN(numericPrice) ? null : numericPrice;
              console.log(`Final price value for database: ${adaptedProduct[matchingColumn]}`);
            } catch (error) {
              console.error(`Error converting price "${priceValue}" to number:`, error);
              adaptedProduct[matchingColumn] = null;
            }
          }
        } else {
          // Use the matching column name from the database
          adaptedProduct[matchingColumn] = (product as any)[ourField];
          console.log(`Mapped field ${ourField} to column ${matchingColumn}: ${adaptedProduct[matchingColumn]}`);
        }
      } else {
        console.warn(`Could not find matching column for field ${ourField}`);
      }
    }
    
    console.log('Adapted product data:', JSON.stringify(adaptedProduct));
    
    // Insert the adapted product into the database
    console.log('Inserting product...');
    const { data, error } = await supabase
      .from('items')
      .insert([adaptedProduct]);
    
    if (error) {
      console.error('Error saving product to database:', error);
      console.error('Error details:', JSON.stringify(error));
      return { success: false, message: error.message || 'Database error', error };
    }
    
    console.log('Product saved successfully:', product.name);
    console.log('Database response:', data);
    return { success: true, data };
  } catch (err: any) {
    console.error('Exception saving product to database:', err);
    console.error('Exception details:', err?.message || 'No error message');
    return { success: false, message: err?.message || 'Exception during database operation', error: err };
  }
}

// Debug function to check existing products from a domain
async function checkExistingProductsFromDomain(domain: string) {
  try {
    console.log(`Checking existing products from domain: ${domain}`);
    
    const { data, error } = await supabase
      .from('items')
      .select('id, url, name')
      .ilike('url', `%${domain}%`)
      .limit(10);
    
    if (error) {
      console.error(`Error checking existing products from ${domain}:`, error);
      return;
    }
    
    console.log(`Found ${data?.length || 0} existing products from ${domain}:`);
    if (data && data.length > 0) {
      data.forEach(item => {
        console.log(`- ${item.name} (${item.url})`);
      });
    }
  } catch (err) {
    console.error(`Exception checking existing products from ${domain}:`, err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { storeUrl, maxProducts = 50, autoScrapeJobId } = await request.json();

    if (!storeUrl) {
      return NextResponse.json(
        { message: 'Store URL is required' },
        { status: 400 }
      );
    }

    console.log(`Starting scrape of store: ${storeUrl} with target of ${maxProducts} new products${autoScrapeJobId ? ` (part of auto-scrape job ${autoScrapeJobId})` : ''}`);
    
    // Debug check for existing products if this is about---blank.com
    if (storeUrl.includes('about---blank.com')) {
      await checkExistingProductsFromDomain('about---blank.com');
    }
    
    // Create a unique job ID for this scrape
    const jobId = crypto.randomUUID();
    
    // Try to scrape the store page directly first
    const { productCards, categories } = await scrapeStorePage(storeUrl, Math.max(maxProducts, 50)); // Fetch at least 50 products initially
    
    if (productCards.length > 0) {
      console.log(`Successfully scraped ${productCards.length} products from the store page`);
      
      // Store the product cards in memory
      global.productScrapeJobs = global.productScrapeJobs || {};
      global.productScrapeJobs[jobId] = {
        status: 'processing',
        storeUrl,
        productCards,
        progress: 0,
        savedProducts: [],
        skippedProducts: [] as { url: string; name?: string; reason: string }[],
        autoScrapeJobId // Store the auto-scrape job ID if provided
      };
      
      // Initialize job status in the new system
      await updateJobStatus(jobId, {
        status: 'processing',
        progress: 0,
        message: `Starting to process products. Target: ${maxProducts} new products to save`,
        savedCount: 0,
        skippedCount: 0,
        totalProcessed: 0
      });
      
      // Start processing the products in the background
      processProductCards(jobId, storeUrl, maxProducts, categories).catch(err => {
        console.error('Error processing product cards:', err);
        if (global.productScrapeJobs && global.productScrapeJobs[jobId]) {
          global.productScrapeJobs[jobId].status = 'error';
          global.productScrapeJobs[jobId].error = err.message;
        }
        
        // Update job status to failed in the new system
        updateJobStatus(jobId, {
          status: 'error',
          progress: 0,
          message: `Error processing products: ${err.message}`,
          savedCount: 0,
          skippedCount: 0,
          totalProcessed: 0
        }).catch(console.error);
      });
      
      // Return the job ID so the client can check the status later
      return NextResponse.json({ 
        message: `Store scrape started. Target: ${maxProducts} new products to save`,
        jobId,
        status: 'processing',
        storeUrl,
        totalProducts: productCards.length,
        targetNewProducts: maxProducts
      });
    }
    
    // If direct scraping failed, try the Shopify JSON approach
    console.log('Direct scraping failed, trying Shopify JSON approach...');
    
    // For Shopify stores, we can use the products.json endpoint
    // Extract the collection path from the URL
    const url = new URL(storeUrl);
    const pathParts = url.pathname.split('/');
    const collectionIndex = pathParts.findIndex(part => part === 'collections');
    
    if (collectionIndex === -1 || collectionIndex + 1 >= pathParts.length) {
      return NextResponse.json(
        { message: 'Invalid collection URL format and direct scraping failed' },
        { status: 400 }
      );
    }
    
    const collectionHandle = pathParts[collectionIndex + 1];
    const shopifyJsonUrl = `${url.origin}/collections/${collectionHandle}/products.json?limit=${maxProducts}`;
    
    console.log(`Fetching Shopify products JSON from: ${shopifyJsonUrl}`);
    
    // Fetch the products JSON
    const response = await fetch(shopifyJsonUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { message: `Failed to fetch products JSON and direct scraping failed: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const productsData = await response.json();
    const products = productsData.products || [];
    
    console.log(`Found ${products.length} products in JSON response`);
    
    if (products.length === 0) {
      return NextResponse.json(
        { message: 'No products found in the collection and direct scraping failed' },
        { status: 404 }
      );
    }
    
    // Map Shopify products to our format
    const shopifyProductCards = products.map((product: any) => {
      const variant = product.variants[0] || {};
      const image = product.images[0] || {};
      
      return {
        url: `${url.origin}/products/${product.handle}`,
        name: product.title,
        price: variant.price ? `$${variant.price}` : 'N/A',
        imageUrl: image.src || '',
        color: product.tags.length > 0 ? product.tags[0] : 'Unknown'
      };
    });
    
    // Store the product cards in memory
    global.productScrapeJobs = global.productScrapeJobs || {};
    global.productScrapeJobs[jobId] = {
      status: 'processing',
      storeUrl,
      productCards: shopifyProductCards,
      progress: 0,
      savedProducts: [],
      skippedProducts: [] as { url: string; name?: string; reason: string }[],
      autoScrapeJobId // Store the auto-scrape job ID if provided
    };
    
    // Initialize job status in the new system
    await updateJobStatus(jobId, {
      status: 'processing',
      progress: 0,
      message: `Starting to process products. Target: ${maxProducts} new products to save`,
      savedCount: 0,
      skippedCount: 0,
      totalProcessed: 0
    });
    
    // Start processing the products in the background
    processProductCards(jobId, storeUrl, maxProducts, categories).catch(err => {
      console.error('Error processing product cards:', err);
      if (global.productScrapeJobs && global.productScrapeJobs[jobId]) {
        global.productScrapeJobs[jobId].status = 'error';
        global.productScrapeJobs[jobId].error = err.message;
      }
      
      // Update job status to failed in the new system
      updateJobStatus(jobId, {
        status: 'error',
        progress: 0,
        message: `Error processing products: ${err.message}`,
        savedCount: 0,
        skippedCount: 0,
        totalProcessed: 0
      }).catch(console.error);
    });
    
    // Return the job ID so the client can check the status later
    return NextResponse.json({ 
      message: `Store scrape started using Shopify JSON. Target: ${maxProducts} new products to save`,
      jobId,
      status: 'processing',
      storeUrl,
      totalProducts: shopifyProductCards.length,
      targetNewProducts: maxProducts
    });
    
  } catch (error) {
    console.error('Error in scrape-store API:', error);
    return NextResponse.json(
      { message: 'Internal server error', error },
      { status: 500 }
    );
  }
}

// Function to process product cards in the background
async function processProductCards(jobId: string, storeUrl: string, maxProducts: number = 10, storeCategories?: string[]) {
  try {
    // Get the job from memory
    const job = global.productScrapeJobs[jobId];
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    const { productCards } = job;
    const savedProducts: Array<{ url: string; name: string }> = [];
    const skippedProducts: Array<{ url: string; name?: string; reason: string }> = [];
    
    // Track the auto-scrape job ID if it exists
    const autoScrapeJobId = job.autoScrapeJobId;
    
    console.log(`Processing ${productCards.length} product cards for job ${jobId}`);
    console.log(`Target: ${maxProducts} new products to save`);
    
    // Process each product card
    let index = 0;
    let savedCount = 0;
    let needMoreProducts = false;
    
    while (index < productCards.length) {
      // If we've saved enough products, stop processing
      if (savedCount >= maxProducts) {
        break;
      }
      
      const card = productCards[index];
      index++;
      
      try {
        // Calculate progress as a percentage of products processed
        const progress = Math.min(100, Math.round((savedCount / maxProducts) * 100));
        
        // Update job status
        job.progress = progress;
        
        // Update job status in the new system
        await updateJobStatus(jobId, {
          status: 'processing',
          progress,
          message: `Processing product ${index} of ${productCards.length}. Saved ${savedCount} of ${maxProducts} target products.`,
          savedCount,
          skippedCount: skippedProducts.length,
          totalProcessed: savedCount + skippedProducts.length
        });
        
        // Check if the product already exists in the database
        const exists = await checkUrlExists(card.url);
        
        if (exists) {
          console.log(`Product ${card.url} already exists in database, skipping`);
          skippedProducts.push({
            url: card.url,
            name: card.name,
            reason: 'Product already exists in database'
          });
          job.skippedProducts = skippedProducts;
          continue;
        }
        
        // Scrape additional details from the product page
        console.log(`Scraping additional details for ${card.url}`);
        const additionalDetails = await scrapeProductDetails(card.url);
        
        // Map the product card to the database schema
        const product = mapCardToDbSchema(card, storeUrl, additionalDetails, storeCategories);
        
        // Save the product to the database
        console.log(`Saving product ${product.name} to database`);
        await saveProductToDatabase(product);
        
        // Add to saved products list
        savedProducts.push({
          url: card.url,
          name: product.name
        });
        
        // Update saved count
        savedCount++;
        
        // Update job status
        job.savedProducts = savedProducts;
        
        console.log(`Saved ${savedCount} of ${maxProducts} target products`);
      } catch (err: any) {
        console.error(`Error processing product card ${card.url}:`, err);
        
        // Add to skipped products list
        skippedProducts.push({
          url: card.url,
          name: card.name,
          reason: err.message || 'Unknown error'
        });
        
        // Update job status
        job.skippedProducts = skippedProducts;
      }
      
      // If we're at the end of the product cards but haven't saved enough products,
      // we need to fetch more products from the next page
      if (index >= productCards.length && savedCount < maxProducts) {
        needMoreProducts = true;
      }
    }
    
    // If we need more products, try to fetch them from the next page
    if (needMoreProducts) {
      try {
        console.log(`Need more products. Saved ${savedCount} of ${maxProducts} target products.`);
        
        // Update job status
        await updateJobStatus(jobId, {
          status: 'processing',
          progress: Math.min(100, Math.round((savedCount / maxProducts) * 100)),
          message: `Fetching more products. Saved ${savedCount} of ${maxProducts} target products so far.`,
          savedCount,
          skippedCount: skippedProducts.length,
          totalProcessed: savedCount + skippedProducts.length
        });
        
        // TODO: Implement pagination to fetch more products
        // This would involve detecting the next page URL and scraping it
      } catch (err) {
        console.error('Error fetching more products:', err);
      }
    }
    
    // Update job status to completed
    job.status = 'completed';
    job.progress = 100;
    
    // Update job status in the new system
    await updateJobStatus(jobId, {
      status: 'completed',
      progress: 100,
      message: `Completed processing. Saved ${savedCount} products, skipped ${skippedProducts.length} products.`,
      savedCount,
      skippedCount: skippedProducts.length,
      totalProcessed: savedCount + skippedProducts.length
    });
    
    console.log(`Completed processing job ${jobId}. Saved ${savedCount} products, skipped ${skippedProducts.length} products.`);
    
    // If this is part of an auto-scrape job, report back to the auto-scrape job
    if (autoScrapeJobId) {
      // TODO: Implement reporting back to the auto-scrape job
    }
  } catch (err: any) {
    console.error(`Error processing product cards for job ${jobId}:`, err);
    
    // Get the job from memory
    const job = global.productScrapeJobs[jobId];
    if (job) {
      // Update job status to error
      job.status = 'error';
      job.error = err.message || 'Unknown error';
      
      // Update job status in the new system
      await updateJobStatus(jobId, {
        status: 'error',
        progress: 0,
        message: `Error processing products: ${err.message || 'Unknown error'}`,
        savedCount: job.savedProducts?.length || 0,
        skippedCount: job.skippedProducts?.length || 0,
        totalProcessed: (job.savedProducts?.length || 0) + (job.skippedProducts?.length || 0)
      });
    }
    
    throw err;
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
    $('.breadcrumb, .breadcrumbs, .product-breadcrumb').find('a').each((_, element) => {
      const category = $(element).text().trim().toLowerCase();
      if (category && !category.includes('home') && !category.includes('products')) {
        console.log(`Found category in breadcrumb: ${category}`);
        categories.push(category);
      }
    });
    
    // Method 2: Look for category meta tags
    console.log(`Looking for category meta tags...`);
    $('meta[property="product:category"]').each((_, element) => {
      const category = $(element).attr('content')?.trim().toLowerCase();
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
        // Usually the color is the last part
        const potentialColor = slugParts[slugParts.length - 1];
        
        if (potentialColor && !potentialColor.match(/^\d+$/)) {
          console.log(`Found potential color in URL: ${potentialColor}`);
          color = potentialColor.toLowerCase();
        }
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
