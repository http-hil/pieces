# Daily Scrape Setup Guide

This guide explains how to set up the automated daily scraping of Stüssy collection pages.

## Overview

The automated scraping system includes:

1. An API endpoint (`/api/scrape-auto`) that handles the scraping process
2. A cron endpoint (`/api/cron/daily-scrape`) that triggers the scraping
3. A UI page (`/scrape-auto`) to monitor and manually trigger the scraping

## Setting Up the Cron Job

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

If your application is deployed on Vercel, you can use Vercel Cron Jobs:

1. In your Vercel dashboard, go to your project settings
2. Navigate to the "Cron Jobs" section
3. Add a new cron job with the following settings:
   - Name: `Daily Stüssy Scrape`
   - Interval: `0 0 * * *` (runs at midnight UTC / 00:00 UTC every day)
   - HTTP Method: `GET`
   - URL Path: `/api/cron/daily-scrape`
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 2: External Cron Service

You can use an external service like [Cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. Sign up for an account
2. Create a new cron job with the following settings:
   - URL: `https://your-domain.com/api/cron/daily-scrape`
   - Method: `GET`
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: Daily at 00:00 UTC (midnight UTC)

### Option 3: Traditional Server Cron

If you're hosting on a traditional server:

```bash
# Add this to your crontab (crontab -e)
# This runs at midnight UTC (00:00 UTC) every day
0 0 * * * curl -X GET -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/daily-scrape
```

## Environment Variables

You need to set the following environment variables:

1. `CRON_SECRET`: A secure random string used to authenticate cron job requests. Generate a strong, random string and keep it secret.

2. `NEXT_PUBLIC_APP_URL`: The base URL of your application (e.g., `https://your-domain.com`). This is used for making API calls within the application.

You can set these variables in your deployment platform's environment variables section or in a `.env.local` file for local development.

## Security Considerations

1. Always use a strong, random string for `CRON_SECRET`
2. Consider using IP restrictions if your cron service supports it
3. Monitor your logs for unauthorized access attempts

## Testing the Setup

1. Navigate to `/scrape-auto` in your browser
2. Click "Start Auto Scrape" to manually trigger the process
3. Monitor the progress and results

## Troubleshooting

If the automated scraping isn't working:

1. Check your server logs for errors
2. Verify the cron job is being triggered (check the logs of your cron service)
3. Ensure the `CRON_SECRET` matches in both your environment and cron job configuration
4. Test the endpoint manually with a tool like Postman or curl:

```bash
curl -X GET -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/daily-scrape
```

## Monitoring

The scrape-auto page (`/scrape-auto`) provides a UI to monitor the status of scraping jobs. You can:

1. View the progress of the current job
2. See which collections have been processed
3. Check how many products were saved or skipped
4. Manually trigger a new scraping job
