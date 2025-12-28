/**
 * Mask Cleanup for MultiLayer Maker V3
 * 
 * - Remove small islands (connected components)
 * - Smooth edges (morphological operations)
 * - Ensure minimum thickness
 */

export function removeIslands(
  imageData: ImageData,
  minAreaMm2: number,
  targetWidthMm: number
): ImageData {
  const { width, height, data } = imageData;
  
  // Convert mm² to pixels²
  const pixelsPerMm = width / targetWidthMm;
  const minAreaPx = minAreaMm2 * (pixelsPerMm * pixelsPerMm);
  
  const visited = new Uint8Array(width * height);
  const result = new ImageData(width, height);
  result.data.set(data);
  
  // Flood fill to find connected components
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] === 0 && data[idx * 4] > 128) {
        const component = floodFill(data, width, height, x, y, visited);
        
        // If component is too small, remove it
        if (component.length < minAreaPx) {
          component.forEach(pixelIdx => {
            result.data[pixelIdx * 4] = 0;
            result.data[pixelIdx * 4 + 1] = 0;
            result.data[pixelIdx * 4 + 2] = 0;
          });
        }
      }
    }
  }
  
  return result;
}

export async function smoothEdgesAsync(imageData: ImageData, strength: number): Promise<ImageData> {
  let result = imageData;
  const iterations = Math.ceil(strength / 2);

  for (let i = 0; i < iterations; i++) {
    result = await dilateAsync(result);
  }

  for (let i = 0; i < iterations; i++) {
    result = await erodeAsync(result);
  }

  return result;
}

export async function removeIslandsAsync(
  imageData: ImageData,
  minAreaMm2: number,
  targetWidthMm: number
): Promise<ImageData> {
  const { width, height, data } = imageData;

  // Convert mm² to pixels²
  const pixelsPerMm = width / targetWidthMm;
  const minAreaPx = minAreaMm2 * (pixelsPerMm * pixelsPerMm);

  const visited = new Uint8Array(width * height);
  const result = new ImageData(width, height);
  result.data.set(data);

  let iter = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((iter++ & 0x3fff) === 0) {
        await yieldToMain();
      }

      const idx = y * width + x;
      if (visited[idx] === 0 && data[idx * 4] > 128) {
        const component = await floodFillAsync(data, width, height, x, y, visited);

        if (component.length < minAreaPx) {
          component.forEach((pixelIdx) => {
            result.data[pixelIdx * 4] = 0;
            result.data[pixelIdx * 4 + 1] = 0;
            result.data[pixelIdx * 4 + 2] = 0;
          });
        }
      }
    }
  }

  return result;
}

function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Uint8Array
): number[] {
  const stack: [number, number][] = [[startX, startY]];
  const component: number[] = [];
  
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const idx = y * width + x;
    if (visited[idx] === 1) continue;
    if (data[idx * 4] < 128) continue;
    
    visited[idx] = 1;
    component.push(idx);
    
    // Add neighbors
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  return component;
}

async function floodFillAsync(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Uint8Array
): Promise<number[]> {
  const stack: [number, number][] = [[startX, startY]];
  const component: number[] = [];
  let steps = 0;

  while (stack.length > 0) {
    if ((steps++ & 0x3fff) === 0) {
      await yieldToMain();
    }

    const [x, y] = stack.pop()!;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = y * width + x;
    if (visited[idx] === 1) continue;
    if (data[idx * 4] < 128) continue;

    visited[idx] = 1;
    component.push(idx);

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return component;
}

export function smoothEdges(imageData: ImageData, strength: number): ImageData {
  const { width, height, data } = imageData;
  
  // Apply morphological closing (dilate then erode)
  let result = imageData;
  
  const iterations = Math.ceil(strength / 2);
  
  // Dilate
  for (let i = 0; i < iterations; i++) {
    result = dilate(result);
  }
  
  // Erode
  for (let i = 0; i < iterations; i++) {
    result = erode(result);
  }
  
  return result;
}

function dilate(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Check 3x3 neighborhood
      let maxValue = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = (ny * width + nx) * 4;
            maxValue = Math.max(maxValue, data[nidx]);
          }
        }
      }
      
      result.data[idx] = result.data[idx + 1] = result.data[idx + 2] = maxValue;
      result.data[idx + 3] = 255;
    }
  }
  
  return result;
}

function erode(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Check 3x3 neighborhood
      let minValue = 255;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = (ny * width + nx) * 4;
            minValue = Math.min(minValue, data[nidx]);
          }
        }
      }
      
      result.data[idx] = result.data[idx + 1] = result.data[idx + 2] = minValue;
      result.data[idx + 3] = 255;
    }
  }
  
  return result;
}

async function dilateAsync(imageData: ImageData): Promise<ImageData> {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);

  for (let y = 0; y < height; y++) {
    if ((y & 0xf) === 0) {
      await yieldToMain();
    }
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      let maxValue = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = (ny * width + nx) * 4;
            maxValue = Math.max(maxValue, data[nidx]);
          }
        }
      }

      result.data[idx] = result.data[idx + 1] = result.data[idx + 2] = maxValue;
      result.data[idx + 3] = 255;
    }
  }

  return result;
}

async function erodeAsync(imageData: ImageData): Promise<ImageData> {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);

  for (let y = 0; y < height; y++) {
    if ((y & 0xf) === 0) {
      await yieldToMain();
    }
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      let minValue = 255;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nidx = (ny * width + nx) * 4;
            minValue = Math.min(minValue, data[nidx]);
          }
        }
      }

      result.data[idx] = result.data[idx + 1] = result.data[idx + 2] = minValue;
      result.data[idx + 3] = 255;
    }
  }

  return result;
}

async function yieldToMain() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export function cleanupMask(imageData: ImageData): ImageData {
  // Additional cleanup operations can be added here
  return imageData;
}
