import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      rightmoveUrl, 
      userPreferences, 
      anythingElse 
    } = body;

    if (!rightmoveUrl) {
      return NextResponse.json({
        success: false,
        error: 'Rightmove URL is required'
      });
    }

    console.log('🔍 Starting comprehensive property analysis...');

    // Step 1: Extract basic property information
    const basicInfoPrompt = `
You are a property analysis expert. Extract the following information from this Rightmove property URL: ${rightmoveUrl}

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
- Extract only information that is clearly visible on the property listing
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

    // Step 2: Analyze binary features only if user selected them
    let binaryFeatures = {
      parking: null,
      garage: null,
      driveway: null,
      newBuild: null
    };
    
    if (userPreferences?.featuresImportance) {
      const selectedFeatures = Object.entries(userPreferences.featuresImportance)
        .filter(([key, value]) => value > 0)
        .map(([key]) => key);

      if (selectedFeatures.length > 0) {
        const binaryPrompt = `
You are a property analysis expert. Analyze this Rightmove property URL: ${rightmoveUrl}

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
        
        // Only include features that user selected
        if (selectedFeatures.includes('Parking')) {
          binaryFeatures.parking = extractedFeatures.parking;
        }
        if (selectedFeatures.includes('Garage')) {
          binaryFeatures.garage = extractedFeatures.garage;
        }
        if (selectedFeatures.includes('Driveway')) {
          binaryFeatures.driveway = extractedFeatures.driveway;
        }
        if (selectedFeatures.includes('New build')) {
          binaryFeatures.newBuild = extractedFeatures.newBuild;
        }
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

    // Step 4: Compile final analysis with exact JSON structure
    const userPrefs = {};
    
    // Only include preferences that user actually filled out
    if (userPreferences?.importance?.postcode > 0) {
      userPrefs.postcode = userPreferences.importance.postcode;
    }
    if (userPreferences?.importance?.space > 0) {
      userPrefs.space = userPreferences.importance.space;
    }
    if (userPreferences?.importance?.bedrooms > 0) {
      userPrefs.bedrooms = userPreferences.importance.bedrooms;
    }
    if (userPreferences?.importance?.bathrooms > 0) {
      userPrefs.bathrooms = userPreferences.importance.bathrooms;
    }
    if (userPreferences?.importance?.propertyType > 0) {
      userPrefs.propertyType = userPreferences.importance.propertyType;
    }
    if (userPreferences?.featuresImportance && Object.keys(userPreferences.featuresImportance).length > 0) {
      userPrefs.features = userPreferences.featuresImportance;
    }

    const analysisResult = {
      success: true,
      timestamp: new Date().toISOString(),
      propertyUrl: rightmoveUrl,
      analysis: {
        basicInfo,
        binaryFeatures,
        additionalCriteria,
        userPreferences: Object.keys(userPrefs).length > 0 ? userPrefs : null
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
