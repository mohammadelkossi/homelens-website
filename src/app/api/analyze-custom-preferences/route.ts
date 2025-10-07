import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { anythingElse, propertyData } = await request.json();

    if (!anythingElse || !anythingElse.trim()) {
      return NextResponse.json({
        success: true,
        customPreferences: [],
        timestamp: new Date().toISOString()
      });
    }

    console.log('🔍 Analyzing custom preferences:', anythingElse);
    console.log('🏠 Property data for analysis:', propertyData);

    // Create a comprehensive prompt for analyzing custom preferences
    const prompt = `
You are a property analysis expert. Analyze the user's custom preferences and determine how well the property matches their specific requirements.

USER'S CUSTOM PREFERENCES:
"${anythingElse}"

PROPERTY DATA:
- Address: ${propertyData.propertyAddress || 'Not available'}
- Price: £${propertyData.listingPrice || 'Not available'}
- Bedrooms: ${propertyData.numberOfBedrooms || 'Not available'}
- Bathrooms: ${propertyData.numberOfBathrooms || 'Not available'}
- Property Type: ${propertyData.propertyType || 'Not available'}
- Size: ${propertyData.floorAreaSqm ? `${propertyData.floorAreaSqm} sqm` : 'Not available'}
- Description: ${propertyData.description || 'Not available'}

CRITICAL: You MUST analyze the property description thoroughly for tenure information. Look for keywords like "Freehold", "Leasehold", "Tenure", "Council Tax Band", etc. in the description text.

ANALYSIS TASKS:
1. Identify the specific preferences the user mentioned
2. Classify each preference as BINARY (yes/no), CONTINUOUS (measurable), LOCATION (proximity), or OTHER
3. Extract the importance level they stated (if any) - use 50% if not specified
4. For BINARY and CONTINUOUS preferences: Analyze against the property data and determine a specific match score
5. For LOCATION preferences: Mark as failed analysis (Google Maps integration needed)
6. For OTHER preferences: Mark as failed analysis (does not fit categories)
7. If BINARY/CONTINUOUS preferences cannot be determined from property data, mark as failed analysis

CLASSIFICATION RULES:
ONLY analyze preferences that fall into these THREE categories:

1. BINARY preferences (yes/no answers):
- "I want Freehold" → Binary (Freehold vs Leasehold)
- "I need a garage" → Binary (Has garage vs No garage)
- "I want a south-facing garden" → Binary (South-facing vs Not south-facing)
- "I need parking" → Binary (Has parking vs No parking)
- "I want a new build" → Binary (New build vs Not new build)

2. CONTINUOUS preferences (measurable quantities like EPC, service charge, council tax):
- "I want a good EPC rating" → Continuous (EPC rating)
- "I need low service charges" → Continuous (Service charge amount)
- "I want low council tax" → Continuous (Council tax band)
- "I need good transport links" → Continuous (Transport accessibility)

3. LOCATION preferences (proximity to specific places):
- "I need to be close to a gym" → Location (Distance to gym)
- "I want to be within 1km of a mosque" → Location (Distance to mosque)
- "I want to be near good schools" → Location (School proximity)
- "I need to be local to a hospital" → Location (Distance to hospital)

FILTERING RULE:
- If a preference does NOT fit into one of these three categories, DO NOT include it in customPreferences but DO include it in failedAnalysis
- Only return preferences that are clearly binary, continuous, or location-based in customPreferences
- Track ALL preferences that cannot be analyzed in failedAnalysis

FAILED ANALYSIS TRACKING:
- If a preference does NOT fit into binary/continuous/location categories, include it in "failedAnalysis" with reason "Preference does not fit analysis categories (binary/continuous/location)"
- If a preference fits the categories but cannot be analyzed due to insufficient property data, include it in "failedAnalysis" with reason "Could not determine from property data"
- If a preference is too vague or unclear, include it in "failedAnalysis" with reason "Preference too vague"
- Include ALL preferences that cannot be successfully analyzed, regardless of category fit

SCORING RULES:
BINARY preferences:
- If property clearly has the feature: 100%
- If property clearly lacks the feature: 0%
- If cannot determine from property data: MARK AS FAILED ANALYSIS

SPECIAL RULES FOR TENURE:
- Look for "Freehold" in the property description → 100% match for "I want freehold"
- Look for "Leasehold" in the property description → 0% match for "I want freehold"
- Look for "Tenure: Freehold" or similar explicit statements → 100% match
- If no tenure information found in description → MARK AS FAILED ANALYSIS

CONTINUOUS preferences:
- If can determine exact measurement: Use proportional scoring (0-100%)
- If cannot determine exact measurement: MARK AS FAILED ANALYSIS
- If clearly very far/close: Use reasonable estimate (20-80%)

LOCATION preferences:
- Use Google Maps API to analyze proximity to requested locations
- Calculate match score based on distance (closer = higher score)
- If Google Maps API fails, mark as failed analysis

OTHER preferences:
- ALWAYS MARK AS FAILED ANALYSIS (does not fit analysis categories)

IMPORTANT RULES:
- Be conservative with scores - only give high scores when you're confident
- For binary preferences, only give 100% if you're certain the property has the feature
- If you cannot determine a preference from the property data, mark it as failed analysis
- Do NOT use neutral/default scores - either determine the score or mark as failed

Return ONLY a JSON object with this structure:
{
  "success": true,
  "customPreferences": [
    {
      "label": "Specific preference name",
      "description": "What the user is looking for",
      "importance": 0.8,
      "matchScore": 75,
      "reasoning": "Why this score was given",
      "type": "binary|continuous|location",
      "category": "feature|legal|location|other"
    }
  ],
  "failedAnalysis": [
    {
      "preference": "Original user input that couldn't be analyzed",
      "reason": "Why the analysis failed (e.g., 'Could not determine from property data', 'Preference too vague', 'Google Maps integration needed', 'Does not fit analysis categories')"
    }
  ],
  "timestamp": "ISO string"
}

Return ONLY the JSON, no other text.`;

    // First, check if this is a location-based preference
    const locationKeywords = ['gym', 'mosque', 'church', 'synagogue', 'temple', 'chapel', 'cathedral', 'religious', 'prayer', 'worship', 'school', 'hospital', 'shopping', 'station', 'restaurant', 'close to', 'near', 'local to'];
    const hasLocationPreference = locationKeywords.some(keyword => 
      anythingElse.toLowerCase().includes(keyword)
    );

    let customPreferences = [];
    let failedAnalysis = [];

    if (hasLocationPreference) {
      console.log('🗺️ Location preference detected, analyzing with Google Maps...');
      
      try {
        // Call Google Maps API for location analysis
        const locationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze-location-preferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationPreference: anythingElse,
            propertyAddress: propertyData.propertyAddress
          })
        });

        if (locationResponse.ok) {
          const locationData = await locationResponse.json();
          console.log('🗺️ Google Maps analysis result:', locationData);
          
          if (locationData.success) {
            customPreferences.push({
              label: locationData.nearestLocation?.name || 'Nearby Location',
              description: anythingElse,
              importance: 0.5, // Default importance for location preferences
              matchScore: locationData.matchScore,
              reasoning: locationData.reasoning,
              type: 'location',
              category: 'location',
              nearestDistance: locationData.nearestDistance,
              nearestLocation: locationData.nearestLocation
            });
          } else {
            failedAnalysis.push({
              preference: anythingElse,
              reason: locationData.error || 'Could not analyze location preference'
            });
          }
        } else {
          failedAnalysis.push({
            preference: anythingElse,
            reason: 'Google Maps API failed to analyze location'
          });
        }
      } catch (error) {
        console.log('⚠️ Error in location analysis:', error);
        failedAnalysis.push({
          preference: anythingElse,
          reason: 'Location analysis failed due to technical error'
        });
      }

      // Return early for location preferences
      return NextResponse.json({
        success: true,
        customPreferences,
        failedAnalysis,
        timestamp: new Date().toISOString()
      });
    }

    // For non-location preferences, use OpenAI analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a property analysis expert. Always return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('🤖 OpenAI custom preferences analysis:', content);

    // Parse the JSON response
    const analysisResult = JSON.parse(content);

    return NextResponse.json({
      success: true,
      customPreferences: analysisResult.customPreferences || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Custom preferences analysis failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze custom preferences',
        customPreferences: [],
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
