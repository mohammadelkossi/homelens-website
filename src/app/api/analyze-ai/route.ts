import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyData, preferences, anythingElse, marketMetrics } = body;

    console.log('OpenAI API called with:', { propertyData, preferences, anythingElse });

    // Create a comprehensive prompt for the AI analysis
    const prompt = `
You are a professional property analyst for HomeLens. Analyse the following property and user preferences to generate personalised insights.

PROPERTY DATA:
- Address: ${propertyData?.address || 'Not specified'}
- Price: £${propertyData?.price?.toLocaleString() || 'Not specified'}
- Bedrooms: ${propertyData?.bedrooms || 'Not specified'}
- Bathrooms: ${propertyData?.bathrooms || 'Not specified'}
- Property Type: ${propertyData?.propertyType || 'Not specified'}
- Size: ${propertyData?.size || 'Not specified'} sqm
- Description: ${propertyData?.description || 'No description available'}

MARKET METRICS:
- Price per sqm: £${marketMetrics?.pricePerSqm || 'Not available'}
- Postcode average (sold): £${marketMetrics?.avgPricePerSqmPostcodeSold || 'Not available'}
- YoY Growth: ${marketMetrics?.avgPctPriceGrowthPerYear || 0}%
- Time on Market: ${marketMetrics?.timeOnMarketDays || 'Not available'} days
- Supply/Demand: ${marketMetrics?.roadSalesLastYear || 'Not available'} sales in 12 months
- Properties on Market: ${marketMetrics?.onMarketCountForConfig || 'Not available'}

USER PREFERENCES:
- Garden Importance: ${preferences?.featuresImportance?.Garden || 5}/10
- Garage Importance: ${preferences?.featuresImportance?.Garage || 5}/10
- Parking Importance: ${preferences?.featuresImportance?.Parking || 5}/10
- Location Importance: ${preferences?.postcodeImportance || 5}/10
- Bathrooms Importance: ${preferences?.bathroomsImportance || 5}/10
- Preferred Space: ${preferences?.preferredSpace || 'Not specified'} sqm
- Time on Market Preference: ${preferences?.timeOnMarket || 'Not specified'}

ADDITIONAL REQUIREMENTS:
${anythingElse || 'No additional requirements specified'}

Please provide a JSON response with the following structure:
{
  "positives": [
    "List 2-3 positive aspects of this property based on the user's preferences and market conditions"
  ],
  "thingsToConsider": [
    "List 2-3 potential concerns or things to consider, being objective but not overly negative"
  ],
  "overall": [
    "List 2-3 overall recommendations or next steps for the user"
  ]
}

Guidelines:
1. Be specific and actionable in your recommendations
2. Consider both the property's features and the user's stated preferences
3. Factor in market conditions and pricing
4. Keep each point concise but informative
5. Make recommendations practical and realistic
6. Consider the "Anything Else" requirements when provided
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional property analyst with expertise in UK property markets. Provide objective, helpful analysis that helps users make informed decisions about property purchases."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response (handle markdown code blocks)
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      parsedResponse = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback to default response
      parsedResponse = {
        positives: [
          "Property appears to be priced competitively within the local market",
          "Good size and layout suitable for most buyers"
        ],
        thingsToConsider: [
          "Consider getting a professional survey before making an offer",
          "Research local amenities and transport links"
        ],
        overall: [
          "Book a viewing to see the property in person",
          "Request recent comparable sales from the estate agent"
        ]
      };
    }

    return NextResponse.json({
      success: true,
      analysis: parsedResponse
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Check if it's an API key error
    const isApiKeyError = error instanceof Error && 
      (error.message.includes('401') || error.message.includes('Incorrect API key'));
    
    if (isApiKeyError) {
      console.error('🚨 API KEY ISSUE: Please update your OpenAI API key in .env.local');
    }
    
    // Return fallback response if OpenAI fails
    return NextResponse.json({
      success: false,
      analysis: {
        positives: [
          "Property appears to be priced competitively within the local market",
          "Good size and layout suitable for most buyers"
        ],
        thingsToConsider: [
          "Consider getting a professional survey before making an offer",
          "Research local amenities and transport links"
        ],
        overall: [
          "Book a viewing to see the property in person",
          "Request recent comparable sales from the estate agent"
        ]
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      isApiKeyError
    });
  }
}
