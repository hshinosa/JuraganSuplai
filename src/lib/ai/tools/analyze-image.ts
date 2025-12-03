/**
 * Agent Tool: Analyze Image with Google Gemini Vision
 * Used for KTP verification, damage detection, etc.
 */

import { registerTool } from '../executor';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface AnalyzeImageInput {
  imageUrl: string;
  prompt: string;
}

interface VisionAnalysis {
  success: boolean;
  result?: Record<string, unknown>;
  text?: string;
  error?: string;
}

/**
 * Analyze image using Google Gemini 2.0 Flash
 */
export async function analyzeImage(input: AnalyzeImageInput): Promise<string> {
  const { imageUrl, prompt } = input;
  
  if (!imageUrl || !prompt) {
    return JSON.stringify({
      success: false,
      error: 'Image URL and prompt are required',
    });
  }
  
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('[analyzeImage] GOOGLE_GENERATIVE_AI_API_KEY not configured');
    return JSON.stringify({
      success: false,
      error: 'Vision service not configured',
    });
  }
  
  try {
    // Fetch image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResult) {
      throw new Error('No response from Gemini');
    }
    
    // Try to parse as JSON if the prompt asked for JSON
    let parsedResult: Record<string, unknown> | undefined;
    try {
      // Handle JSON wrapped in markdown
      const jsonMatch = textResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/) 
        || textResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch {
      // Not JSON, keep as text
    }
    
    const analysis: VisionAnalysis = {
      success: true,
      text: textResult,
      result: parsedResult,
    };
    
    console.log(`[analyzeImage] Analysis complete for: ${imageUrl.substring(0, 50)}...`);
    
    return JSON.stringify(analysis);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[analyzeImage] Error:', errorMessage);
    
    return JSON.stringify({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Specialized function to analyze damaged goods for disputes
 */
export async function analyzeDisputeImage(imageUrl: string): Promise<{
  is_damaged: boolean;
  confidence: number;
  reason: string;
}> {
  const prompt = `Analyze this image of food/goods for damage or spoilage.
Return ONLY a JSON object with:
{
  "is_damaged": boolean (true if product is damaged, spoiled, or defective),
  "confidence": number (0-100, how confident you are),
  "reason": string (brief explanation of your assessment)
}

Focus on:
- Signs of rot, mold, or spoilage for food items
- Physical damage, broken packaging
- Color/texture abnormalities
- Any visible contamination`;

  const result = JSON.parse(await analyzeImage({ imageUrl, prompt }));
  
  if (!result.success || !result.result) {
    return {
      is_damaged: false,
      confidence: 0,
      reason: 'Could not analyze image: ' + (result.error || 'Unknown error'),
    };
  }
  
  return {
    is_damaged: result.result.is_damaged || false,
    confidence: result.result.confidence || 0,
    reason: result.result.reason || 'Analysis complete',
  };
}

/**
 * Specialized function to verify KTP
 */
export async function verifyKTP(imageUrl: string): Promise<{
  is_valid: boolean;
  nik_visible: boolean;
  confidence: number;
  reason: string;
}> {
  const prompt = `Analyze this image of an Indonesian KTP (ID card).
Return ONLY a JSON object with:
{
  "is_valid": boolean (true if this appears to be a valid KTP),
  "nik_visible": boolean (true if NIK number is visible and readable),
  "confidence": number (0-100),
  "reason": string (brief explanation)
}

Check for:
- Standard KTP format and elements
- Visible NIK (16-digit number)
- Photo on the card
- Text readability`;

  const result = JSON.parse(await analyzeImage({ imageUrl, prompt }));
  
  if (!result.success || !result.result) {
    return {
      is_valid: false,
      nik_visible: false,
      confidence: 0,
      reason: 'Could not analyze image: ' + (result.error || 'Unknown error'),
    };
  }
  
  return {
    is_valid: result.result.is_valid || false,
    nik_visible: result.result.nik_visible || false,
    confidence: result.result.confidence || 0,
    reason: result.result.reason || 'Analysis complete',
  };
}

// Register the tool
registerTool('analyzeImage', async (input) => {
  return analyzeImage(input as unknown as AnalyzeImageInput);
});

export default analyzeImage;
