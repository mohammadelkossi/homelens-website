import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { listingText, features, images = [] } = await request.json();

    if (!listingText) {
      return NextResponse.json({
        success: false,
        error: 'Listing text is required'
      });
    }

    if (!features || Object.keys(features).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one feature must be specified'
      });
    }

    console.log('🔍 Analyzing binary features:', features);
    console.log('📝 Listing text length:', listingText.length);
    console.log('📸 Property images available:', images.length);

    // Create the analysis prompt
    const featureList = Object.keys(features).join(', ');
    const analysisPrompt = `
You are a property feature analysis expert. Analyze this property listing to determine if specific features are present.

PROPERTY LISTING:
${listingText}

FEATURES TO ANALYZE: ${featureList}

INSTRUCTIONS:
1. Carefully read through the entire property listing
2. Look for explicit mentions of each feature
3. Consider synonyms and related terms
4. Be conservative - only return true if the feature is clearly mentioned
5. Return ONLY a JSON object with this exact structure:

{
  "garage": <boolean>,
  "garden": <boolean>, 
  "parking": <boolean>,
  "newBuild": <boolean>
}

ANALYSIS GUIDELINES:
- **Garage**: Look for "garage", "integral garage", "detached garage", "single garage", "double garage"
- **Garden**: Look for "garden", "rear garden", "front garden", "patio", "lawn", "outdoor space"
- **Parking**: Look for "parking", "off-road parking", "driveway", "parking space", "garage parking"
- **New Build**: Look for "new build", "newly built", "recently constructed", "new development", "brand new"

IMPORTANT:
- Only return true if the feature is explicitly mentioned or clearly indicated
- If a feature is not mentioned, return false
- Be precise and conservative in your analysis
- Return only valid JSON
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a property feature analysis expert. Analyze property listings to determine if specific features are present. Return only valid JSON."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const textAnalysisResult = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log('📝 Text analysis result:', textAnalysisResult);

    // If we have images, analyze them with computer vision
    let imageAnalysisResult = {};
    if (images && images.length > 0) {
      console.log('🖼️ Analyzing property images with computer vision...');
      
      try {
        // Download and analyze the first few images
        const imageAnalysisPromises = images.slice(0, 3).map(async (imageUrl, index) => {
          try {
            console.log(`📥 Downloading image ${index + 1}:`, imageUrl);
            const imageResponse = await fetch(imageUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
              }
            });
            
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer();
              const imageBase64 = Buffer.from(imageBuffer).toString('base64');
              
              const imageAnalysisPrompt = `
You are a property image analysis expert. Analyze this property photo to detect specific features.

FEATURES TO DETECT: ${featureList}

INSTRUCTIONS:
1. Look carefully at the image for visual evidence of each feature
2. Be conservative - only return true if you can clearly see the feature
3. Consider different angles and perspectives
4. Look for garages, gardens, parking spaces, new build characteristics
5. Return ONLY a JSON object with this exact structure:

{
  "garage": <boolean>,
  "garden": <boolean>, 
  "parking": <boolean>,
  "newBuild": <boolean>
}

ANALYSIS GUIDELINES:
- **Garage**: Look for garage doors, garage structures, cars in garages
- **Garden**: Look for outdoor spaces, lawns, patios, plants, garden furniture
- **Parking**: Look for driveways, parking spaces, cars parked, parking areas
- **New Build**: Look for modern construction, new materials, contemporary design

IMPORTANT:
- Only return true if you can clearly see the feature in the image
- If uncertain, return false
- Be precise and conservative in your analysis
- Return only valid JSON
`;

              const imageCompletion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                  {
                    role: "system",
                    content: "You are a property image analysis expert. Analyze property photos to detect specific features. Return only valid JSON."
                  },
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: imageAnalysisPrompt
                      },
                      {
                        type: "image_url",
                        image_url: {
                          url: `data:image/jpeg;base64,${imageBase64}`
                        }
                      }
                    ]
                  }
                ],
                temperature: 0.1,
                max_tokens: 200,
                response_format: { type: "json_object" },
              });

              return JSON.parse(imageCompletion.choices[0]?.message?.content || '{}');
            }
          } catch (error) {
            console.log(`❌ Failed to analyze image ${index + 1}:`, error);
            return {};
          }
        });

        const imageResults = await Promise.all(imageAnalysisPromises);
        console.log('🖼️ Image analysis results:', imageResults);
        
        // Combine results from all images (if any image shows a feature, it exists)
        imageAnalysisResult = {
          garage: imageResults.some(result => result.garage === true),
          garden: imageResults.some(result => result.garden === true),
          parking: imageResults.some(result => result.parking === true),
          newBuild: imageResults.some(result => result.newBuild === true)
        };
        
        console.log('🖼️ Combined image analysis:', imageAnalysisResult);
      } catch (error) {
        console.log('❌ Image analysis failed:', error);
      }
    }

    // Combine text and image analysis (if either shows a feature, it exists)
    const combinedResult = {
      garage: textAnalysisResult.garage || imageAnalysisResult.garage || false,
      garden: textAnalysisResult.garden || imageAnalysisResult.garden || false,
      parking: textAnalysisResult.parking || imageAnalysisResult.parking || false,
      newBuild: textAnalysisResult.newBuild || imageAnalysisResult.newBuild || false
    };

    console.log('🔍 Combined analysis result:', combinedResult);

    return NextResponse.json({
      success: true,
      features: combinedResult,
      textAnalysis: textAnalysisResult,
      imageAnalysis: imageAnalysisResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Binary features analysis failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze binary features'
    });
  }
}
