import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyDescription, userFeatures } = body;

    if (!propertyDescription) {
      return NextResponse.json({
        success: false,
        error: 'Property description is required'
      });
    }

    console.log('🏠 Extracting property features from description');
    console.log('📋 User selected features:', userFeatures);

    // Build the prompt based on what features the user selected
    const selectedFeatures = [];
    if (userFeatures?.Garden) selectedFeatures.push('garden');
    if (userFeatures?.Garage) selectedFeatures.push('garage');
    if (userFeatures?.Parking) selectedFeatures.push('parking');
    if (userFeatures?.['New build']) selectedFeatures.push('new build');

    if (selectedFeatures.length === 0) {
      return NextResponse.json({
        success: true,
        features: {},
        postcode: null
      });
    }

    const prompt = `
You are a property analysis expert. Analyze the following property description and extract specific information.

PROPERTY DESCRIPTION:
${propertyDescription}

Please analyze and return a JSON object with the following structure:

{
  "features": {
    ${selectedFeatures.map(feature => `"${feature}": true/false`).join(',\n    ')}
  },
  "postcode": "extracted postcode or null"
}

Guidelines:
1. For each feature, determine if it's present in the property description
2. Return true if the feature is clearly mentioned as present
3. Return false if the feature is not mentioned or explicitly stated as absent
4. Extract the postcode from the description (look for UK postcode format like "M1 1AA", "SW1A 1AA", etc.)
5. Return null for postcode if none found
6. Be conservative - only return true if there's clear evidence

Return only valid JSON:
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a property analysis expert. Extract property features and postcode from descriptions. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse the response
    const extractedData = JSON.parse(aiResponse);
    
    console.log('✅ Extracted features:', extractedData.features);
    console.log('✅ Extracted postcode:', extractedData.postcode);

    return NextResponse.json({
      success: true,
      features: extractedData.features || {},
      postcode: extractedData.postcode || null
    });

  } catch (error) {
    console.error('Property features extraction error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to extract property features',
      features: {},
      postcode: null
    });
  }
}
