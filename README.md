# Exchange Rate Tracker for Notion

This is a static HTML/JS version of the Exchange Rate Tracker that can be embedded in Notion or linked from Notion. It allows you to track daily rates for ZAR to USDC, USDT, USD, Bitcoin, ETH and other currencies, with the ability to select date ranges and view the data as graphs or tables.

## Features

- Track daily exchange rates for multiple currency pairs
- Swap currency pairs with a single click (e.g., ZAR to USD ↔ USD to ZAR)
- Select custom date ranges with presets (last 7 days, last month, etc.)
- View data as interactive graphs or tables
- Calculate monthly averages automatically
- Export data to CSV for further analysis
- Fully static implementation using only HTML, CSS, and JavaScript
- Compatible with Notion embedding

## How to Use

### Option 1: Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload the three files (`index.html`, `styles.css`, and `script.js`) to the repository
3. Enable GitHub Pages in the repository settings
4. Your Exchange Rate Tracker will be available at `https://[your-username].github.io/[repo-name]/`

### Option 2: Deploy to Netlify

1. Sign up for a free Netlify account at [netlify.com](https://www.netlify.com/)
2. Drag and drop the folder containing the three files to the Netlify dashboard
3. Netlify will automatically deploy your site and provide a URL

### Option 3: Deploy to any static web hosting

1. Upload the three files to any web hosting service that supports static HTML files
2. Access the tracker via the URL provided by your hosting service

## Embedding in Notion

Once you have deployed the Exchange Rate Tracker to a public URL, you can embed it in Notion:

1. In Notion, create a new page or open an existing one
2. Type `/embed` and select the "Embed" block
3. Paste the URL of your deployed Exchange Rate Tracker
4. Click "Embed link"

Alternatively, you can use an iframe code:

1. In Notion, create a new page or open an existing one
2. Type `/embed` and select the "Embed" block
3. Click "Create embed"
4. Paste the following code, replacing `YOUR_URL` with your deployed URL:

```html
<iframe
  src="YOUR_URL"
  width="100%"
  height="600"
  style="border: 1px solid #eee; border-radius: 8px;"
  frameborder="0"
  allowfullscreen
></iframe>
```

5. Click "Embed link"

## Customization

You can customize the Exchange Rate Tracker by editing the files:

- `index.html`: Structure of the tracker
- `styles.css`: Visual appearance
- `script.js`: Functionality and API integration

## Technical Details

- Uses the [ExchangeRate.host](https://exchangerate.host) API for currency data
- Implements client-side data fetching with CORS support
- Uses Chart.js for data visualization
- Includes a date range picker for flexible time period selection
- All processing happens in the browser with no backend requirements

## Limitations

- Free public APIs may have rate limits or data availability constraints
- Some cryptocurrency rates are simulated for demonstration purposes
- Historical data may be limited depending on the API used
