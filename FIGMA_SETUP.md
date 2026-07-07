# Figma Integration Setup for Netlify

## Setting Up the Figma Token

The AI Website Builder can fetch Figma designs directly without users needing authentication. To enable this, you need to add your Figma token to Netlify's environment variables.

### Step 1: Add Token to Netlify Dashboard

1. Go to your Netlify dashboard: https://app.netlify.com
2. Select your site
3. Go to **Site Configuration** → **Environment variables**
4. Click **Add a variable**
5. Add the following:
   - **Key**: `FIGMA_TOKEN`
   - **Value**: Your Figma Personal Access Token (get it from https://www.figma.com/settings)
   - **Scopes**: Select all (Production, Preview, Deploy Previews, Local development)
6. Click **Save variable**

### Step 2: Redeploy Your Site

After adding the environment variable, trigger a new deployment:

```bash
git commit --allow-empty -m "Trigger rebuild with Figma token"
git push
```

Or use the Netlify dashboard to trigger a redeploy.

## Using the Figma Integration

Once deployed, users can:

1. **Paste a Figma URL**: The AI Website Builder will automatically fetch the design
2. **No authentication needed**: The server-side proxy handles the API calls
3. **Upload local JSON**: Users can still upload exported Figma JSON files

### API Endpoint

The Figma proxy is available at:
```
/api/figma-proxy?url=<figma-url>
```

or

```
/api/figma-proxy?fileId=<file-id>
```

### Example Figma URLs That Work:
- `https://www.figma.com/design/qyAOmi17rZVOZsZCxDFrtE/Positivus-Landing-Page-Design--Community-`
- `https://www.figma.com/file/abc123/My-Design`

## Testing Locally

The token is already in your `.env` file for local development:
```bash
npm run dev
```

## Security Notes

- The token is stored server-side only
- Users never see or need the token
- The proxy endpoint validates requests
- Rate limiting is handled by Netlify Functions

## Troubleshooting

If the Figma integration isn't working:

1. **Check the token is set**: In Netlify dashboard → Environment variables
2. **Check function logs**: Netlify dashboard → Functions → figma-proxy
3. **Verify the Figma URL is valid**: Must be a public or accessible file
4. **Check the browser console** for any error messages

## API Limits

- Figma API: 5,000 requests per month (free tier)
- Netlify Functions: 125,000 requests per month (free tier)
- Response size: Limited to ~6MB by Netlify Functions