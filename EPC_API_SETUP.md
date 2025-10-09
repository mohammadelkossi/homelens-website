# EPC API Setup Guide

## Getting Your EPC API Key

To use the price per square meter analysis feature, you'll need to obtain an API key from the UK government's EPC register.

### Step 1: Register for EPC API Access

1. **Visit the EPC API registration page:**
   - Go to: https://epc.opendatacommunities.org/
   - Click "Register" or "Sign Up"

2. **Create your account:**
   - Provide your email address
   - Create a secure password
   - Accept the terms and conditions

3. **Verify your email:**
   - Check your email for a verification link
   - Click the link to activate your account

### Step 2: Get Your API Key

1. **Log into your account:**
   - Go to: https://epc.opendatacommunities.org/
   - Log in with your credentials

2. **Find your API key:**
   - Your API key will be included in your sign-up email
   - You can also find it at the bottom of each page when logged in
   - It will look something like: `your-api-key-here`

### Step 3: Configure Your Application

1. **Add to environment variables:**
   ```bash
   # Add to your .env.local file
   EPC_API_KEY=your-api-key-here
   ```

2. **Or pass directly in API calls:**
   ```javascript
   // When calling the price-per-sqm API
   const response = await fetch('/api/price-per-sqm', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       postcode: 'NW10',
       propertyType: 'S',
       year: 2025,
       epcApiKey: 'your-api-key-here'
     })
   });
   ```

### Step 4: Test the Integration

1. **Test without API key (uses mock data):**
   ```bash
   curl -X POST http://localhost:3000/api/price-per-sqm \
     -H "Content-Type: application/json" \
     -d '{"postcode":"NW10","propertyType":"S","year":2025}'
   ```

2. **Test with API key (uses real EPC data):**
   ```bash
   curl -X POST http://localhost:3000/api/price-per-sqm \
     -H "Content-Type: application/json" \
     -d '{"postcode":"NW10","propertyType":"S","year":2025,"epcApiKey":"your-api-key-here"}'
   ```

## API Usage Examples

### Basic Analysis
```javascript
const analysis = await fetch('/api/price-per-sqm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postcode: 'NW10',
    propertyType: 'S', // Semi-detached
    year: 2025
  })
});
```

### With EPC API Key
```javascript
const analysis = await fetch('/api/price-per-sqm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    postcode: 'NW10',
    propertyType: 'S',
    year: 2025,
    epcApiKey: process.env.EPC_API_KEY
  })
});
```

## Expected Response

```json
{
  "success": true,
  "data": {
    "insight": "In 2025, on average semi-detached houses in NW10 were sold for £4,250 per square metre",
    "analysis": {
      "postcode": "NW10",
      "propertyType": "Semi-Detached",
      "year": 2025,
      "averagePricePerSqm": 4250,
      "medianPricePerSqm": 4200,
      "priceRange": "3,500 - 5,200",
      "totalProperties": 15,
      "confidence": "high"
    }
  }
}
```

## Troubleshooting

### No API Key Provided
- The system will use mock data for demonstration
- You'll see a warning: "No EPC API key provided. Using mock data for demonstration."

### Invalid API Key
- Check that your API key is correct
- Ensure you're using the right authentication format
- The EPC API uses Basic authentication

### No Data Found
- Some postcodes may have limited EPC data
- Try different postcodes or property types
- Check that the year has sufficient sales data

## Cost and Limits

- **Free tier**: The EPC API is free to use
- **Rate limits**: Check the API documentation for current rate limits
- **Data coverage**: EPC data is available for most UK properties built after 2008

## Support

- **EPC API Documentation**: https://epc.opendatacommunities.org/docs/api/domestic
- **Open Data Communities**: https://guides.opendatacommunities.org/
- **API Support**: Contact through the Open Data Communities platform


