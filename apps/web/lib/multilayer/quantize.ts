/**
 * Image Quantization for MultiLayer Maker V3
 * 
 * Converts grayscale image into N discrete tones using:
 * - Simple posterization (threshold-based)
 * - K-means clustering (more sophisticated)
 */

export async function quantizeImage(
  imageData: ImageData,
  layerCount: number,
  method: 'kmeans' | 'posterize'
): Promise<ImageData[]> {
  if (method === 'posterize') {
    return posterizeImage(imageData, layerCount);
  } else {
    return kmeansQuantize(imageData, layerCount);
  }
}

/**
 * Simple posterization: divide grayscale range into equal bands
 */
function posterizeImage(imageData: ImageData, layerCount: number): ImageData[] {
  const { width, height, data } = imageData;
  const masks: ImageData[] = Array.from({ length: layerCount }, () => {
    const mask = new ImageData(width, height);
    // default to black with opaque alpha
    for (let i = 3; i < mask.data.length; i += 4) mask.data[i] = 255;
    return mask;
  });

  const step = 256 / layerCount;

  for (let i = 0; i < data.length; i += 4) {
    const value = data[i];
    const alpha = data[i + 3];
    if (alpha <= 128) continue;

    let layer = Math.floor(value / step);
    if (layer < 0) layer = 0;
    if (layer >= layerCount) layer = layerCount - 1;

    const out = masks[layer].data;
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = 255;
  }

  return masks;
}

/**
 * K-means quantization: cluster pixels by intensity
 */
function kmeansQuantize(imageData: ImageData, k: number): ImageData[] {
  const { width, height, data } = imageData;
  
  // Collect all pixel values
  const pixels: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 128) { // Only visible pixels
      pixels.push(data[i]);
    }
  }
  
  // Initialize centroids evenly across range
  const centroids: number[] = [];
  for (let i = 0; i < k; i++) {
    centroids.push((i / (k - 1)) * 255);
  }
  
  // Run k-means iterations
  const maxIterations = 10;
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign pixels to nearest centroid
    const clusters: number[][] = Array.from({ length: k }, () => []);
    
    pixels.forEach(pixel => {
      let minDist = Infinity;
      let bestCluster = 0;
      
      centroids.forEach((centroid, idx) => {
        const dist = Math.abs(pixel - centroid);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = idx;
        }
      });
      
      clusters[bestCluster].push(pixel);
    });
    
    // Update centroids
    let changed = false;
    clusters.forEach((cluster, idx) => {
      if (cluster.length > 0) {
        const newCentroid = cluster.reduce((sum, val) => sum + val, 0) / cluster.length;
        if (Math.abs(newCentroid - centroids[idx]) > 1) {
          changed = true;
        }
        centroids[idx] = newCentroid;
      }
    });
    
    if (!changed) break;
  }
  
  // Sort centroids (darkest to lightest)
  centroids.sort((a, b) => a - b);
  
  // Create masks for each cluster
  const masks: ImageData[] = [];
  
  for (let clusterIdx = 0; clusterIdx < k; clusterIdx++) {
    const mask = new ImageData(width, height);
    const centroid = centroids[clusterIdx];
    
    for (let i = 0; i < data.length; i += 4) {
      const value = data[i];
      const alpha = data[i + 3];
      
      if (alpha > 128) {
        // Find nearest centroid
        let minDist = Infinity;
        let nearestCluster = 0;
        
        centroids.forEach((c, idx) => {
          const dist = Math.abs(value - c);
          if (dist < minDist) {
            minDist = dist;
            nearestCluster = idx;
          }
        });
        
        // If this pixel belongs to current cluster
        if (nearestCluster === clusterIdx) {
          mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = 255;
          mask.data[i + 3] = 255;
        } else {
          mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = 0;
          mask.data[i + 3] = 255;
        }
      } else {
        mask.data[i] = mask.data[i + 1] = mask.data[i + 2] = 0;
        mask.data[i + 3] = 255;
      }
    }
    
    masks.push(mask);
  }
  
  return masks;
}
