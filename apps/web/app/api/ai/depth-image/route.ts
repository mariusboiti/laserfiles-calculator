import { NextRequest, NextResponse } from 'next/server';
import type { DepthImageRequest, DepthImageResponse, AspectRatio } from '@/lib/tools/ai-depth-photo/types';
import { MATERIAL_PROFILES, ASPECT_RATIOS } from '@/lib/tools/ai-depth-photo/types';
import { applyEngravingNormalization } from './imageProcessing';

export async function POST(request: NextRequest) {
  try {
    const body: DepthImageRequest = await request.json();
    const { prompt, style, ratio, engravingOptions } = body;

    if (!prompt || !style || !ratio || !engravingOptions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // V3: Build technical engraving prompt
    const technicalPrompt = `true bas-relief engraving height map, full grayscale depth range from pure black to pure white, laser engraving ready grayscale image, smooth continuous depth transitions, uniform depth-based shading only, no artistic lighting, no shadows painted for effect, background pushed to pure black for maximum depth contrast, white reserved only for highest relief areas, technical height map for CNC and laser engraving`;

    // Material-specific modifiers based on V3 material profiles
    const materialKey = engravingOptions.materialProfile;
    const materialProfile = MATERIAL_PROFILES[materialKey];
    const materialModifier = materialProfile.detailSuppression > 0.3
      ? ', extra smooth gradients, minimal micro-details, large volumes, engraving-safe depth range'
      : ', controlled detail level, smooth surfaces, readable depth zones';

    // Depth boost affects prompt intensity
    const depthBoostModifier = engravingOptions.engravingDepthBoost > 70
      ? ', maximum depth contrast, extreme black background, strong relief separation'
      : engravingOptions.engravingDepthBoost > 40
      ? ', strong depth contrast, deep black background, clear relief definition'
      : ', moderate depth contrast, dark background, visible relief structure';

    const enhancedPrompt = `${prompt}, ${technicalPrompt}${materialModifier}${depthBoostModifier}`;

    // V3: Strict technical negative prompt
    const negativePrompt = `color, colorful, RGB, gray background, light background, washed out blacks, low contrast depth, flat depth, poster, illustration, digital art, dramatic lighting, cinematic lighting, rim light, ambient occlusion, painted shadows, artistic highlights, line art, outlines, cartoon, noise, texture grain, photorealism, photography, text, typography, watermark, logo, fine texture, micro-details below engraving resolution`;

    // Call Google Gemini API for image generation
    const apiKey = process.env.VITE_AI_API_KEY;
    const endpoint = process.env.VITE_AI_STYLIZE_ENDPOINT;

    if (!apiKey || !endpoint) {
      console.error('Missing Gemini API credentials');
      const placeholderImage = generatePlaceholderImage(ratio);
      return NextResponse.json({
        imagePngBase64: placeholderImage,
        seed: 'placeholder',
      });
    }

    // Get dimensions from aspect ratio
    const dimensions = ASPECT_RATIOS[ratio];
    const aspectRatioPrompt = `${dimensions.width}x${dimensions.height} resolution, ${ratio} aspect ratio`;

    try {
      const geminiResponse = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${enhancedPrompt}, ${aspectRatioPrompt}` + (negativePrompt ? `\n\nNegative prompt: ${negativePrompt}` : ''),
            }],
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      });

      if (!geminiResponse.ok) {
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }

      const geminiData = await geminiResponse.json();
      
      // Extract image from Gemini response
      // Note: Gemini's image generation response format may vary
      // Adjust this based on actual response structure
      let imagePngBase64 = '';
      
      if (geminiData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        imagePngBase64 = geminiData.candidates[0].content.parts[0].inlineData.data;
      } else {
        // Fallback to placeholder if no image in response
        imagePngBase64 = generatePlaceholderImage(ratio);
      }

      // Apply mandatory V3 post-processing for engraving
      const processedImage = await applyEngravingNormalization(imagePngBase64, body.engravingOptions);

      const response: DepthImageResponse = {
        imagePngBase64: processedImage,
        depthMapPngBase64: processedImage, // Same as processed image for now
        seed: geminiData.candidates?.[0]?.finishReason || Math.random().toString(36).substring(7),
        histogramData: [], // TODO: Calculate histogram from processed image
        validationWarnings: [], // TODO: Add validation warnings
      };

      return NextResponse.json(response);
    } catch (geminiError) {
      console.error('Gemini API call failed:', geminiError);
      // Fallback to placeholder
      const placeholderImage = generatePlaceholderImage(ratio);
      return NextResponse.json({
        imagePngBase64: placeholderImage,
        depthMapPngBase64: placeholderImage,
        seed: 'fallback',
        histogramData: [],
        validationWarnings: ['Using placeholder image - Gemini API unavailable'],
      });
    }
  } catch (error) {
    console.error('Depth image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}

function generatePlaceholderImage(ratio: string): string {
  // Generate a simple gradient placeholder using correct dimensions from ASPECT_RATIOS
  const dimensions = ASPECT_RATIOS[ratio as AspectRatio] || ASPECT_RATIOS['1:1'];
  const { width, height } = dimensions;

  // Create a simple base64 encoded PNG placeholder
  // This is a minimal PNG with gradient
  const canvas = createCanvasPlaceholder(width, height);
  return canvas;
}

function createCanvasPlaceholder(width: number, height: number): string {
  // Return a base64 encoded placeholder image
  // In a real implementation, you would use canvas or sharp library
  // For now, return a minimal valid PNG base64
  
  // This is a 1x1 transparent PNG as placeholder
  const minimalPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  return minimalPng;
}
