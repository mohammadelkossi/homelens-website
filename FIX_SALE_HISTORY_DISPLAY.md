# Fix: Property Sale History Display Issue

## Problem
The Property Sale History section was not displaying on the results page after running an analysis, even though the price history data was being successfully fetched from Apify.

## Root Cause
The issue was in the results page data flow:

1. **Data was being stored** in `raw.analysis.basicInfo.propertySaleHistory` ✅
2. **But it wasn't being passed** to the `propertyData` state variable ❌
3. **The UI component** was looking for `propertyData.saleHistory` ❌

### Before (Broken):
```javascript
const propertyDataFromAnalysis = {
  address: raw.analysis.basicInfo.propertyAddress,
  price: raw.analysis.basicInfo.listingPrice,
  bedrooms: raw.analysis.basicInfo.numberOfBedrooms,
  bathrooms: raw.analysis.basicInfo.numberOfBathrooms,
  propertyType: raw.analysis.basicInfo.propertyType,
  size: raw.analysis.basicInfo.floorAreaSqm,
  description: `...`
  // ❌ Missing: saleHistory
};
```

### After (Fixed):
```javascript
const propertyDataFromAnalysis = {
  address: raw.analysis.basicInfo.propertyAddress,
  price: raw.analysis.basicInfo.listingPrice,
  bedrooms: raw.analysis.basicInfo.numberOfBedrooms,
  bathrooms: raw.analysis.basicInfo.numberOfBathrooms,
  propertyType: raw.analysis.basicInfo.propertyType,
  size: raw.analysis.basicInfo.floorAreaSqm,
  description: `...`,
  saleHistory: raw.analysis.basicInfo.propertySaleHistory || [] // ✅ Added
};
```

## Solution Applied

**File:** `src/app/results/page.tsx` (Line ~1269)

Added the missing `saleHistory` property to the `propertyDataFromAnalysis` object:

```javascript
saleHistory: raw.analysis.basicInfo.propertySaleHistory || []
```

Also added a console log for debugging:
```javascript
console.log('📊 Sale history from analysis:', raw.analysis.basicInfo.propertySaleHistory);
```

## Data Flow (Now Complete)

```
Apify Scraper
    ↓
priceHistory: [{year: "2024", soldPrice: "£635,000", ...}]
    ↓
Sent to Comprehensive Analysis API
    ↓
Stored in basicInfo.propertySaleHistory
    ↓
Saved to localStorage (comprehensiveAnalysis)
    ↓
Results page loads from localStorage
    ↓
propertyDataFromAnalysis.saleHistory = basicInfo.propertySaleHistory ✅
    ↓
setPropertyData(propertyDataFromAnalysis) ✅
    ↓
UI renders: {propertyData?.saleHistory && ...} ✅
```

## Testing

After this fix, the Property Sale History section should now display when:

1. **Run a new analysis** on any property with sale history
2. **Check console logs** for:
   - `📊 Sale history from analysis:` [array of sales]
   - `🏠 Property data set from analysis:` {... saleHistory: [...]}
3. **View results page** - Property Sale History section should render
4. **Verify data** - Should show years, prices, and percentage changes from Apify

## Verification Checklist

- [x] `saleHistory` added to `propertyData` object
- [x] Console logging added for debugging
- [x] UI component receives correct data structure
- [x] Supports both Apify format and legacy format
- [x] Empty array fallback if no history available

## Related Files

- `src/app/results/page.tsx` - Fixed propertyData assignment
- `src/app/api/comprehensive-analysis/route.ts` - Stores priceHistory in basicInfo.propertySaleHistory
- `src/app/preferences-redesign/page.tsx` - Passes priceHistory from Apify

