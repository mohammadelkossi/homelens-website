# Debug Steps to Find the Issue

## Option 1: Check in Browser Console (Easiest)

1. **Open your results page** with an analysis
2. **Press F12** (or right-click → Inspect)
3. **Go to Console tab**
4. **Paste this code**:

```javascript
// Check what data is in localStorage
const analysis = JSON.parse(localStorage.getItem('analysisResult') || '{}');
console.log('📊 Full Analysis Data:', analysis);
console.log('📊 Enhanced Analytics:', analysis?.analysis?.enhancedAnalytics);
console.log('📊 avgSoldPrice12Months:', analysis?.analysis?.enhancedAnalytics?.avgSoldPrice12Months);
console.log('📊 Type:', typeof analysis?.analysis?.enhancedAnalytics?.avgSoldPrice12Months);
```

This will show you exactly what value is stored!

---

## Option 2: Check Server Logs (Most Detailed)

1. **Stop your dev server** (Ctrl+C in terminal)
2. **Restart it**: `npm run dev`
3. **Run an analysis** on any property
4. **Look for these log lines** in your terminal:

```
🔍 fetch12MonthAverageSoldPrice called with postcode="...", propertyType="..."
🔍 Enhanced Land Registry: Getting 12-month average sold price
   Input: postcode="...", propertyType="..."
   Normalized: postcode="...", propertyType="..."
📋 Sample records from 2024: [...]
📊 12-month avg - Year 2024: X matching records out of Y total
📊 12-month avg - Total matching properties: X
✅ 12-month avg sold price: £X (from X properties)
🔍 fetch12MonthAverageSoldPrice returned: X
🔍 avgSoldPrice12Months type: number
🔍 avgSoldPrice12Months value: X
🔍 enhancedAnalytics.avgSoldPrice12Months SET TO: X
```

---

## Option 3: Test Endpoint (Quickest)

Just visit this URL in your browser:
```
http://localhost:3000/api/test-avg-price
```

You should see JSON like:
```json
{
  "success": true,
  "postcode": "S10",
  "propertyType": "Semi-Detached",
  "averagePrice": 425802,
  "formatted": "£425,802"
}
```

If you see `"averagePrice": 0`, then the function itself is broken.
If you see the correct value, then the issue is in how it's being passed to the results page.

---

## What to Share

After trying any of the above, share:
1. **What you see in browser console** (Option 1)
2. **Server terminal logs** (Option 2) - especially the lines I highlighted
3. **Test endpoint JSON** (Option 3)

This will tell us EXACTLY where the £0 is coming from!


