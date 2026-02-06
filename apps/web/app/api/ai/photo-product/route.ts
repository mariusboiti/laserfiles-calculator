import { NextRequest, NextResponse } from 'next/server';
import { consumeAiCreditViaBackend, isEntitlementError, type EntitlementError } from '@/lib/ai/credit-consumption';

export const runtime = 'nodejs';
export const maxDuration = 60;


function getProvider(): string {
  return (process.env.AI_PROVIDER || 'gemini').toLowerCase();
}

function getGeminiConfig() {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_AI_API_KEY || '';
  const endpoint = process.env.AI_STYLIZE_ENDPOINT || process.env.GEMINI_ENDPOINT || process.env.VITE_AI_STYLIZE_ENDPOINT || '';
  const model = process.env.GOOGLE_AI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || process.env.VITE_GOOGLE_AI_IMAGE_MODEL || '';
  return { apiKey, endpoint, model };
}

async function generateWithGemini(args: { apiKey: string; endpoint: string; model: string; prompt: string }): Promise<string> {
  const { apiKey, endpoint, model, prompt } = args;
  const base = endpoint || (model ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent` : '');
  if (!base) throw new Error('Gemini endpoint/model not configured');

  const url = base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini API error (${res.status}): ${text}`);
  }

  const json: any = await res.json();
  const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((p: any) => p?.inlineData?.data);
  if (inline?.inlineData?.data) return inline.inlineData.data as string;
  throw new Error('Gemini response did not include image data');
}

function buildEngravePrompt(productType: string): string {
  const base = 'Convert this photo into a laser engraving ready grayscale image.';
  const rules = [
    'Output a high-contrast grayscale image optimized for laser engraving.',
    'Pure white background, smooth tonal gradients from black to white.',
    'No color, no text, no watermarks.',
    'Clean edges, good detail preservation.',
    'Suitable for wood/acrylic laser engraving.',
  ];

  const typeSpecific: Record<string, string> = {
    'engraved-frame': 'Format as a rectangular portrait/photo suitable for a picture frame. Add a subtle decorative border.',
    'multilayer-wall-art': 'Separate into distinct depth layers with clear tonal separation for multilayer cutting.',
    'led-lightbox': 'Optimize for edge-lit acrylic. High contrast lines and areas, minimal mid-tones.',
    'keychain': 'Simplify to a bold silhouette suitable for a small 50x30mm keychain. Strong outlines.',
    'ornament': 'Create a circular or oval composition suitable for a hanging ornament. Clean edges.',
    'stencil': 'Convert to a high-contrast black and white stencil with connected islands. No floating pieces.',
  };

  return `${base} ${rules.join(' ')} ${typeSpecific[productType] || typeSpecific['engraved-frame']}`;
}

function buildSuggestionsPrompt(): string {
  return `Analyze this image and suggest which laser-cut products would work best. Return ONLY a JSON array of objects with fields: type (one of: engraved-frame, multilayer-wall-art, led-lightbox, keychain, ornament, stencil), confidence (0-1 float). Order by confidence descending. Return 3-4 suggestions. Example: [{"type":"engraved-frame","confidence":0.95}]`;
}

function generateSvgFromBase64(imageBase64: string, widthMm: number, heightMm: number, options: any): { engraveSvg: string; cutSvg: string; combinedSvg: string } {
  const kerfMm = options.kerfMm || 0.12;
  const padding = options.includeFrame ? (options.framePaddingMm || 5) : 0;
  const totalW = widthMm + padding * 2;
  const totalH = heightMm + padding * 2;

  const engraveSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${totalW}mm" height="${totalH}mm" viewBox="0 0 ${totalW} ${totalH}">
  <title>Engrave Layer</title>
  <image x="${padding}" y="${padding}" width="${widthMm}" height="${heightMm}"
         href="data:image/png;base64,${imageBase64}" />
</svg>`;

  const cutSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${totalW}mm" height="${totalH}mm" viewBox="0 0 ${totalW} ${totalH}">
  <title>Cut Layer</title>
  <rect x="${kerfMm / 2}" y="${kerfMm / 2}"
        width="${totalW - kerfMm}" height="${totalH - kerfMm}"
        fill="none" stroke="red" stroke-width="${kerfMm}"
        rx="2" ry="2" />
</svg>`;

  const combinedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${totalW}mm" height="${totalH}mm" viewBox="0 0 ${totalW} ${totalH}">
  <title>Combined - Engrave + Cut</title>
  <image x="${padding}" y="${padding}" width="${widthMm}" height="${heightMm}"
         href="data:image/png;base64,${imageBase64}" />
  <rect x="${kerfMm / 2}" y="${kerfMm / 2}"
        width="${totalW - kerfMm}" height="${totalH - kerfMm}"
        fill="none" stroke="red" stroke-width="${kerfMm}"
        rx="2" ry="2" />
</svg>`;

  return { engraveSvg, cutSvg, combinedSvg };
}

function estimateProductionInsights(widthMm: number, heightMm: number): any {
  const areaMm2 = widthMm * heightMm;
  const perimeterMm = 2 * (widthMm + heightMm);
  const areaM2 = areaMm2 / 1_000_000;
  const engravingDensity = 0.7;
  const engravingSpeedMm2PerMin = 5000;
  const cutSpeedMmPerMin = 600;
  const engraveTimeMin = (areaMm2 * engravingDensity) / engravingSpeedMm2PerMin;
  const cutTimeMin = perimeterMm / cutSpeedMmPerMin;
  const totalTimeMin = Math.ceil(engraveTimeMin + cutTimeMin + 1);
  const materialCost = Math.max(0.5, areaM2 * 25);
  const machineHourlyCost = 30;
  const machineCost = (totalTimeMin / 60) * machineHourlyCost;
  const totalCost = materialCost + machineCost;
  const margin = 0.45;
  const recommendedPrice = Math.ceil((totalCost / (1 - margin)) * 100) / 100;

  return {
    materialWidthMm: widthMm,
    materialHeightMm: heightMm,
    engravingDensity: Math.round(engravingDensity * 100),
    cutPathLengthMm: Math.round(perimeterMm),
    estimatedTimeMinutes: totalTimeMin,
    materialCostEstimate: Math.round(totalCost * 100) / 100,
    recommendedPrice,
    profitMargin: Math.round(margin * 100),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, productType, options } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    const selectedProductType = productType || 'engraved-frame';
    const opts = {
      kerfMm: options?.kerfMm ?? 0.12,
      smoothing: options?.smoothing ?? 50,
      contrast: options?.contrast ?? 50,
      brightness: options?.brightness ?? 50,
      edgeStrength: options?.edgeStrength ?? 50,
      invertEngraving: options?.invertEngraving ?? false,
      includeFrame: options?.includeFrame ?? true,
      framePaddingMm: options?.framePaddingMm ?? 5,
    };

    // Consume AI credit
    let credits: { used: number; remaining: number } | undefined;
    try {
      credits = await consumeAiCreditViaBackend({
        req,
        toolSlug: 'photo-product-ai',
        actionType: 'generate',
        provider: getProvider(),
        payload: { productType: selectedProductType },
      });
    } catch (error) {
      if (isEntitlementError(error)) {
        const entitlementError = error as EntitlementError;
        return NextResponse.json({
          error: entitlementError.message,
          code: entitlementError.code,
        }, { status: entitlementError.httpStatus });
      }
      console.error('Credit consumption failed for photo-product-ai:', error);
      return NextResponse.json({ error: 'Failed to verify AI credits' }, { status: 500 });
    }

    // Step 1: AI engraving generation
    let engraveImageBase64 = imageBase64;
    const provider = getProvider();

    if (provider === 'gemini' || provider === 'google') {
      const { apiKey, endpoint, model } = getGeminiConfig();
      if (apiKey && (endpoint || model)) {
        try {
          const engravePrompt = buildEngravePrompt(selectedProductType);
          // Send image + prompt to Gemini for engraving conversion
          const base = endpoint || (model ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent` : '');
          const url = base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;

          const geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { inlineData: { mimeType: 'image/png', data: imageBase64 } },
                  { text: engravePrompt },
                ],
              }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 8192,
                responseModalities: ['TEXT', 'IMAGE'],
              },
            }),
          });

          if (geminiRes.ok) {
            const geminiJson: any = await geminiRes.json();
            const parts: any[] = geminiJson?.candidates?.[0]?.content?.parts || [];
            const inlineImg = parts.find((p: any) => p?.inlineData?.data);
            if (inlineImg?.inlineData?.data) {
              engraveImageBase64 = inlineImg.inlineData.data;
            }
          }
        } catch (aiError) {
          console.warn('AI engraving generation failed, using original image:', aiError);
        }
      }
    }

    // Step 2: Get product suggestions via AI text
    let productSuggestions: any[] = [
      { type: 'engraved-frame', label: 'Engraved Frame', description: 'Photo engraved on wood or acrylic with cut frame outline', confidence: 0.95, icon: '🖼️' },
      { type: 'led-lightbox', label: 'LED Lightbox', description: 'Backlit acrylic panel with engraved photo design', confidence: 0.7, icon: '💡' },
      { type: 'ornament', label: 'Ornament', description: 'Decorative hanging ornament with engraved photo', confidence: 0.5, icon: '🎄' },
    ];

    try {
      const { apiKey, endpoint, model } = getGeminiConfig();
      if (apiKey && (endpoint || model)) {
        const base = endpoint || (model ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent` : '');
        const url = base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;

        const suggestRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/png', data: imageBase64 } },
                { text: buildSuggestionsPrompt() },
              ],
            }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
          }),
        });

        if (suggestRes.ok) {
          const suggestJson: any = await suggestRes.json();
          const textPart = suggestJson?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === 'string');
          if (textPart?.text) {
            const jsonMatch = textPart.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              const typeLabels: Record<string, { label: string; description: string; icon: string }> = {
                'engraved-frame': { label: 'Engraved Frame', description: 'Photo engraved on wood or acrylic with cut frame outline', icon: '🖼️' },
                'multilayer-wall-art': { label: 'Multilayer Wall Art', description: 'Layered depth art from photo with multiple cut layers', icon: '🎨' },
                'led-lightbox': { label: 'LED Lightbox', description: 'Backlit acrylic panel with engraved photo design', icon: '💡' },
                'keychain': { label: 'Keychain', description: 'Small engraved keychain with photo silhouette', icon: '🔑' },
                'ornament': { label: 'Ornament', description: 'Decorative hanging ornament with engraved photo', icon: '🎄' },
                'stencil': { label: 'Stencil', description: 'Cut-out stencil from photo edges for spray/paint use', icon: '✂️' },
              };
              productSuggestions = parsed.map((s: any) => ({
                type: s.type,
                confidence: s.confidence,
                ...(typeLabels[s.type] || { label: s.type, description: '', icon: '📦' }),
              }));
            }
          }
        }
      }
    } catch (suggestError) {
      console.warn('Product suggestion AI failed, using defaults:', suggestError);
    }

    // Step 3: Generate SVGs
    const widthMm = 150;
    const heightMm = 100;
    const { engraveSvg, cutSvg, combinedSvg } = generateSvgFromBase64(engraveImageBase64, widthMm, heightMm, opts);

    // Step 4: Production insights
    const productionInsights = estimateProductionInsights(widthMm, heightMm);

    // Step 5: Auto-generate description
    const description = `Custom laser engraved ${selectedProductType.replace(/-/g, ' ')} generated from user photo. Optimized for wood/acrylic engraving with balanced contrast and clean edge definition. Material size: ${widthMm + (opts.includeFrame ? opts.framePaddingMm * 2 : 0)}mm x ${heightMm + (opts.includeFrame ? opts.framePaddingMm * 2 : 0)}mm.`;

    return NextResponse.json({
      engraveSvg,
      cutSvg,
      combinedSvg,
      engravePreviewPng: engraveImageBase64,
      mockupPng: engraveImageBase64,
      productSuggestions,
      productionInsights,
      description,
      credits,
    });
  } catch (error) {
    console.error('Photo product generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
