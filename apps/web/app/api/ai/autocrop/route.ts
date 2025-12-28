/**
 * AI Auto-Crop API Route
 * Stub implementation with provider abstraction
 * TODO: Integrate real AI model (e.g., MediaPipe, TensorFlow.js, or cloud API)
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, aspectRatio } = body;

    if (!image) {
      return NextResponse.json({ error: 'Image data required' }, { status: 400 });
    }

    const result = await performAutoCrop(image, aspectRatio);

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI autocrop error:', error);
    return NextResponse.json(
      { error: 'Failed to process autocrop' },
      { status: 500 }
    );
  }
}

async function performAutoCrop(
  imageDataUrl: string,
  aspectRatio?: number
): Promise<{
  crop: { x: number; y: number; width: number; height: number };
  confidence: number;
  focalPoint: { x: number; y: number };
}> {
  const img = await loadImageFromDataUrl(imageDataUrl);
  const width = img.width;
  const height = img.height;

  let cropWidth = width;
  let cropHeight = height;

  if (aspectRatio) {
    const currentRatio = width / height;
    if (currentRatio > aspectRatio) {
      cropWidth = height * aspectRatio;
    } else {
      cropHeight = width / aspectRatio;
    }
  }

  const x = Math.max(0, (width - cropWidth) / 2);
  const y = Math.max(0, (height - cropHeight) / 2);

  return {
    crop: {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    },
    confidence: 0.7,
    focalPoint: {
      x: Math.round(width / 2),
      y: Math.round(height / 2),
    },
  };
}

function loadImageFromDataUrl(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) {
        reject(new Error('Invalid data URL'));
        return;
      }
      
      const buffer = Buffer.from(base64Data, 'base64');
      
      if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        const width = (buffer[buffer.indexOf(0xC0) + 7] << 8) | buffer[buffer.indexOf(0xC0) + 8];
        const height = (buffer[buffer.indexOf(0xC0) + 5] << 8) | buffer[buffer.indexOf(0xC0) + 6];
        resolve({ width: width || 800, height: height || 600 });
      } else if (buffer[0] === 0x89 && buffer[1] === 0x50) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        resolve({ width, height });
      } else {
        resolve({ width: 800, height: 600 });
      }
    } else {
      reject(new Error('Server-side only'));
    }
  });
}
