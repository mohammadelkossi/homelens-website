import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      listingText,
      url,
      toggles,
      userPreferences,
      anythingElse,
      rightmove,
      ppdPostcodeSeries,
      ppdPropertyTypeSeries,
      ukFallbackSeries
    } = body;

    if (!listingText) {
      return NextResponse.json({
        success: false,
        error: 'Listing text is required'
      });
    }

    // Step 1: Extract basic property information
    const basicInfoPrompt = `
You are a property analysis expert. Extract the following information from this property listing text:

${listingText}

Return a JSON object with this exact structure:
{
  "propertyAddress": "Full property address or null",
  "listingPrice": "Price as number (e.g., 250000) or null",
  "area": "Area/location name (e.g., Manchester) or null",
  "floorAreaSqm": "Floor area in square meters as number or null",
  "numberOfBedrooms": "Number as integer or null",
  "numberOfBathrooms": "Number as integer or null", 
  "propertyType": "Type of property (e.g., Semi-Detached, Terraced, etc.) or null",
  "propertySaleHistory": "Array of {date, priceGBP, note} objects, string description, or null"
}

Guidelines:
- Extract only information that is clearly visible in the listing text
- For price, extract the number only (no currency symbols)
- For bedrooms/bathrooms, extract as integers
- For floor area, extract in square meters
- For sale history, if structured return array, if text return string, if none return null
- If any information is not available, use null
- Do not invent facts
- Return only valid JSON
`;

    const basicInfoCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a property analysis expert. Extract property information from Rightmove URLs. Return only valid JSON."
        },
        {
          role: "user",
          content: basicInfoPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const basicInfo = JSON.parse(basicInfoCompletion.choices[0]?.message?.content || '{}');
    
    // Calculate time on market
    let firstListedAt = null;
    let timeOnMarketDays = null;
    
    if (rightmove?.firstSeen) {
      firstListedAt = rightmove.firstSeen;
      if (rightmove.nowUtc) {
        const firstSeenDate = new Date(rightmove.firstSeen);
        const nowDate = new Date(rightmove.nowUtc);
        timeOnMarketDays = Math.floor((nowDate - firstSeenDate) / (1000 * 60 * 60 * 24));
      }
    }
    
    // Add time on market to basic info
    basicInfo.firstListedAt = firstListedAt;
    basicInfo.timeOnMarketDays = timeOnMarketDays;

    // Step 2: Analyze binary features only if user toggled them on
    let binaryFeatures = {
      parking: null,
      garage: null,
      driveway: null,
      newBuild: null
    };
    
    if (toggles && Object.values(toggles).some(value => value === true)) {
      const binaryPrompt = `
You are a property analysis expert. Analyze this property listing text:

${listingText}

Check for the following features and return a JSON object with true/false/null for each:
{
  "parking": true/false/null,
  "garage": true/false/null, 
  "driveway": true/false/null,
  "newBuild": true/false/null
}

Guidelines:
- Return true only if the feature is clearly mentioned as present
- Return false if explicitly stated as absent
- Return null if not mentioned or unclear
- Be conservative - only return true with clear evidence
- Return only valid JSON
`;

      const binaryCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a property analysis expert. Check for specific property features. Return only valid JSON."
          },
          {
            role: "user",
            content: binaryPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: "json_object" },
      });

      const extractedFeatures = JSON.parse(binaryCompletion.choices[0]?.message?.content || '{}');
      
      // Only include features that user toggled on
      if (toggles.parking) {
        binaryFeatures.parking = extractedFeatures.parking;
      }
      if (toggles.garage) {
        binaryFeatures.garage = extractedFeatures.garage;
      }
      if (toggles.driveway) {
        binaryFeatures.driveway = extractedFeatures.driveway;
      }
      if (toggles.newBuild) {
        binaryFeatures.newBuild = extractedFeatures.newBuild;
      }
    }

    // Step 3: Analyze "Anything Else" for additional criteria
    let additionalCriteria = [];
    if (anythingElse && anythingElse.trim()) {
      const additionalPrompt = `
You are a property analysis expert. Analyze this user input to extract specific property criteria:

USER INPUT: "${anythingElse}"

Extract any specific property criteria, requirements, or preferences mentioned. Return a JSON array of criteria objects:

[
  {
    "label": "Specific criteria name",
    "description": "Brief description of what the user wants",
    "type": "binary" or "continuum"
  }
]

Examples:
- "I need a garden" → {"label": "Garden", "description": "Outdoor space requirement", "type": "binary"}
- "Close to good schools" → {"label": "School proximity", "description": "Near quality educational facilities", "type": "continuum"}
- "Modern kitchen" → {"label": "Kitchen quality", "description": "Contemporary kitchen features", "type": "binary"}

Guidelines:
1. Only extract clear, specific criteria
2. Use "binary" for yes/no features
3. Use "continuum" for measurable qualities
4. Be specific but concise
5. If no clear criteria mentioned, return empty array
6. Return only valid JSON array
`;

      const additionalCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a property analysis expert. Extract specific property criteria from user input. Return only valid JSON arrays."
          },
          {
            role: "user",
            content: additionalPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const additionalResponse = additionalCompletion.choices[0]?.message?.content;
      if (additionalResponse) {
        try {
          additionalCriteria = JSON.parse(additionalResponse);
        } catch (error) {
          console.error('Failed to parse additional criteria:', error);
          additionalCriteria = [];
        }
      }
    }

    // Step 4: Process market graphs
    let marketGraphs = {
      postcode: null,
      propertyTypeNormalized: null,
      series: {
        postcodeSeries: [],
        propertyTypeSeries: []
      },
      source: "ppd",
      fallbackUsed: false,
      fallbackReason: null,
      chartHint: {
        x: "month",
        y: "avgPriceGBP",
        yFormat: "£,.0f",
        title: "Average Sold Price (last 5 years)"
      }
    };

    // Normalize property type
    if (basicInfo.propertyType) {
      const normalizedType = basicInfo.propertyType.toLowerCase();
      if (normalizedType.includes('detached') && !normalizedType.includes('semi')) {
        marketGraphs.propertyTypeNormalized = 'detached';
      } else if (normalizedType.includes('semi-detached')) {
        marketGraphs.propertyTypeNormalized = 'semi-detached';
      } else if (normalizedType.includes('terraced')) {
        marketGraphs.propertyTypeNormalized = 'terraced';
      } else if (normalizedType.includes('flat') || normalizedType.includes('apartment')) {
        marketGraphs.propertyTypeNormalized = 'flat';
      } else if (normalizedType.includes('bungalow')) {
        marketGraphs.propertyTypeNormalized = 'bungalow';
      } else if (normalizedType.includes('maisonette')) {
        marketGraphs.propertyTypeNormalized = 'maisonette';
      } else {
        marketGraphs.propertyTypeNormalized = 'other';
      }
    }

    // Check if PPD data is available and valid
    const hasValidPPD = ppdPostcodeSeries && ppdPropertyTypeSeries && 
                       ppdPostcodeSeries.length > 6 && ppdPropertyTypeSeries.length > 6;

    if (hasValidPPD) {
      marketGraphs.series.postcodeSeries = ppdPostcodeSeries;
      marketGraphs.series.propertyTypeSeries = ppdPropertyTypeSeries;
    } else {
      // Use fallback data
      marketGraphs.series.postcodeSeries = ukFallbackSeries || [];
      marketGraphs.series.propertyTypeSeries = ukFallbackSeries || [];
      marketGraphs.fallbackUsed = true;
      marketGraphs.fallbackReason = !ppdPostcodeSeries || !ppdPropertyTypeSeries ? 
        'PPD data missing' : 
        (ppdPostcodeSeries.length <= 6 || ppdPropertyTypeSeries.length <= 6 ? 
          'PPD data insufficient' : 'PPD data errored');
    }

    // Step 5: Calculate diagnostics
    const missing = [];
    const notes = [];
    let confidence = 1.0;

    if (!basicInfo.propertyAddress) missing.push('propertyAddress');
    if (!basicInfo.listingPrice) missing.push('listingPrice');
    if (!basicInfo.area) missing.push('area');
    if (!basicInfo.floorAreaSqm) missing.push('floorAreaSqm');
    if (!basicInfo.numberOfBedrooms) missing.push('numberOfBedrooms');
    if (!basicInfo.numberOfBathrooms) missing.push('numberOfBathrooms');
    if (!basicInfo.propertyType) missing.push('propertyType');

    confidence = 1.0 - (missing.length / 7);
    if (marketGraphs.fallbackUsed) {
      notes.push('Using fallback market data');
    }

    // Step 6: Compile final analysis with exact JSON structure
    const analysisResult = {
      success: true,
      timestamp: new Date().toISOString(),
      propertyUrl: url,
      analysis: {
        basicInfo,
        binaryFeatures,
        additionalCriteria,
        userPreferences: userPreferences || null,
        marketGraphs,
        diagnostics: {
          confidence,
          missing,
          notes
        }
      }
    };

    console.log('✅ Comprehensive analysis completed:', analysisResult);

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('Comprehensive analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform comprehensive analysis',
      timestamp: new Date().toISOString()
    });
  }
}
