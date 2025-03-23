# Firecrawl API Key Setup

To set up your Firecrawl API key for your Next.js project, please create a `.env.local` file in the root directory of your project with the following content:

```
FIRECRAWL_API_KEY=fc-b4be050554f34ee394b0e7258861e331
```

This file is automatically ignored by Git (via .gitignore) to keep your API key secure.

## Using the API Key in Your Code

You can access this environment variable in your Next.js application using:

```typescript
// In your component or page
import FirecrawlApp from '@mendable/firecrawl-js';

// Method 1: Using environment variable
const app = new FirecrawlApp(); // Will automatically use FIRECRAWL_API_KEY from environment

// Method 2: Passing API key directly (not recommended for production)
// const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
```

After creating the `.env.local` file, restart your development server for the changes to take effect.
