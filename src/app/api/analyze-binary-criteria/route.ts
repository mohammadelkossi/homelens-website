import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyDescription, userCriteria } = body;

    if (!propertyDescription) {
      return NextResponse.json(
        { error: 'Property description is required' },
        { status: 400 }
      );
    }

    if (!userCriteria || Object.keys(userCriteria).length === 0) {
      return NextResponse.json(
        { error: 'User criteria is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Analyzing binary criteria matches:', { userCriteria });

    // Create a prompt for OpenAI to analyze binary criteria matches
    const criteriaList = Object.entries(userCriteria)
      .filter(([_, importance]) => importance > 0)
      .map(([criteria, _]) => criteria)
      .join(', ');

    const prompt = `
You are a property analysis expert. Analyze the following property description and determine which binary criteria are present.

PROPERTY DESCRIPTION:
${propertyDescription}

USER CRITERIA TO CHECK:
${criteriaList}

For each criterion, determine if it's present in the property (100% match) or not present (0% match).

Return a JSON response with this exact structure:
{
  "garden": 100,
  "parking": 0,
  "garage": 100,
  "new build": 0
}

Guidelines:
1. Only return 100 (present) or 0 (not present) for each criterion
2. For "garden" - look for mentions of garden, yard, outdoor space, patio, deck, etc.
3. For "parking" - look for mentions of parking, driveway, off-street parking, etc.
4. For "garage" - look for mentions of garage, car port, etc.
5. For "new build" - look for mentions of new build, newly built, modern construction, etc.
6. If a criterion is not mentioned in the user criteria, set it to 0
7. Be conservative - only mark as 100 if clearly present in the description
8. Return only the JSON, no additional text
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a property analysis expert. Analyze property descriptions and determine which features are present. Return only valid JSON with 100 or 0 values."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Clean and parse the response
    let cleanResponse = aiResponse.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/```\n?$/, '');
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/```\n?$/, '');
    }

    const binaryMatches = JSON.parse(cleanResponse);

    // Ensure all user criteria are included in the response
    const result = {};
    Object.keys(userCriteria).forEach(criteria => {
      result[criteria] = binaryMatches[criteria] || 0;
    });

    console.log('✅ Binary criteria analysis complete:', result);

    return NextResponse.json({
      success: true,
      binaryMatches: result
    });

  } catch (error) {
    console.error('Binary criteria analysis error:', error);
    
    if (error instanceof SyntaxError) {
      console.error('🚨 JSON parsing error in OpenAI response');
    }
    
    if (error.message?.includes('API key')) {
      console.error('🚨 API KEY ISSUE: Please update your OpenAI API key in .env.local');
    }

    // Return fallback response if OpenAI fails
    const fallbackMatches = {};
    Object.keys(body.userCriteria || {}).forEach(criteria => {
      fallbackMatches[criteria] = 0; // Conservative fallback
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to analyze binary criteria',
      binaryMatches: fallbackMatches
    });
  }
}
