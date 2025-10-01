import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anythingElse } = body;

    if (!anythingElse || anythingElse.trim() === '') {
      return NextResponse.json({
        success: true,
        additionalCriteria: []
      });
    }

    console.log('🔍 Analyzing additional criteria from "Anything Else":', anythingElse);

    const prompt = `
You are a property analysis expert. Analyze the following user input to extract specific property criteria and requirements.

USER INPUT:
"${anythingElse}"

Extract any specific property criteria, requirements, or preferences mentioned. Return a JSON array of criteria objects with this structure:

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
- "Quiet street" → {"label": "Street noise level", "description": "Low noise environment", "type": "continuum"}

Guidelines:
1. Only extract clear, specific criteria
2. Use "binary" for yes/no features (garden, parking, etc.)
3. Use "continuum" for measurable qualities (distance, size, noise level, etc.)
4. Be specific but concise in labels and descriptions
5. If no clear criteria are mentioned, return an empty array
6. Return only valid JSON, no additional text

Return only the JSON array:
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a property analysis expert. Extract specific property criteria from user input. Return only valid JSON arrays."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
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

    const additionalCriteria = JSON.parse(cleanResponse);

    console.log('✅ Additional criteria extracted:', additionalCriteria);

    return NextResponse.json({
      success: true,
      additionalCriteria: additionalCriteria || []
    });

  } catch (error) {
    console.error('Additional criteria analysis error:', error);
    
    if (error instanceof SyntaxError) {
      console.error('🚨 JSON parsing error in OpenAI response');
    }
    
    if (error.message?.includes('API key')) {
      console.error('🚨 API KEY ISSUE: Please update your OpenAI API key in .env.local');
    }

    // Return empty array if analysis fails
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze additional criteria',
      additionalCriteria: []
    });
  }
}
