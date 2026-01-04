/**
 * Export system for MultiLayer Maker V3
 * Generates ZIP with SVG layers, preview PNG, and settings
 */

import JSZip from 'jszip';
import type { VectorLayer, ProjectSettings, HealthCheck } from './types';

export async function exportProject(
  layers: VectorLayer[],
  settings: ProjectSettings,
  sourceImage: { width: number; height: number } | null
): Promise<Blob> {
  const zip = new JSZip();
  
  // Add individual layer SVGs
  layers.forEach((layer, index) => {
    const filename = `layer-${String(index + 1).padStart(2, '0')}-${sanitize(layer.name)}.svg`;
    zip.file(filename, layer.svgContent);
  });
  
  // Add combined SVG
  const combinedSVG = buildCombinedSVG(layers, settings, sourceImage);
  zip.file('combined-all-layers.svg', combinedSVG);
  
  // Add settings JSON
  const settingsJson = {
    version: '3.0',
    timestamp: new Date().toISOString(),
    settings,
    layers: layers.map(l => ({
      name: l.name,
      order: l.order,
      threshold: l.threshold,
      stats: l.stats,
    })),
  };
  zip.file('settings.json', JSON.stringify(settingsJson, null, 2));
  
  // Add preview PNG if available
  if (settings.includePreview && sourceImage) {
    const previewPng = await generatePreviewPNG(layers, sourceImage);
    zip.file('preview.png', previewPng);
  }
  
  // Add README
  const readme = generateReadme(layers, settings);
  zip.file('README.txt', readme);
  
  return zip.generateAsync({ type: 'blob' });
}

export function downloadZip(blob: Blob, filename: string = 'multilayer-project.zip') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildCombinedSVG(
  layers: VectorLayer[],
  settings: ProjectSettings,
  sourceImage: { width: number; height: number } | null
): string {
  const width = sourceImage?.width || 1000;
  const height = sourceImage?.height || 1000;
  const aspectRatio = width / height;
  const heightMm = settings.targetWidthMm / aspectRatio;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${settings.targetWidthMm}mm" height="${heightMm}mm" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <title>Combined Layers</title>
`;
  
  layers
    .filter(l => l.visible)
    .sort((a, b) => a.order - b.order)
    .forEach(layer => {
      svg += `  <g id="${sanitize(layer.name)}" opacity="0.8">
    <path d="${layer.svgPath}" ${settings.outputFormat === 'filled' 
      ? `fill="${layer.color}" fill-rule="evenodd"` 
      : `fill="none" stroke="${layer.color}" stroke-width="0.1"`} />
  </g>
`;
    });
  
  svg += '</svg>';
  return svg;
}

async function generatePreviewPNG(
  layers: VectorLayer[],
  sourceImage: { width: number; height: number }
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  const ctx = canvas.getContext('2d')!;
  
  // Draw white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw each layer
  layers
    .filter(l => l.visible)
    .sort((a, b) => a.order - b.order)
    .forEach(layer => {
      ctx.fillStyle = layer.color;
      ctx.globalAlpha = 0.8;
      
      // Simple rendering (actual SVG rendering would be more complex)
      const path = new Path2D(layer.svgPath);
      ctx.fill(path);
    });
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate preview PNG'));
    }, 'image/png');
  });
}

function generateReadme(layers: VectorLayer[], settings: ProjectSettings): string {
  return `MultiLayer Maker V3 - Project Export
========================================

Generated: ${new Date().toLocaleString()}

Project Settings:
- Layers: ${layers.length}
- Output Size: ${settings.targetWidthMm}mm width
- Min Island Area: ${settings.minIslandArea}mm²
- Simplify Tolerance: ${settings.simplifyTolerance}
- Output Format: ${settings.outputFormat}

Files Included:
${layers.map((l, i) => `- layer-${String(i + 1).padStart(2, '0')}-${sanitize(l.name)}.svg`).join('\n')}
- combined-all-layers.svg (all layers in one file)
- settings.json (project configuration)
${settings.includePreview ? '- preview.png (visual preview)\n' : ''}- README.txt (this file)

Layer Order (bottom to top):
${layers.map((l, i) => `${i + 1}. ${l.name} (${l.stats.pathCount} paths, ${l.stats.islandCount} islands)`).join('\n')}

Laser Cutting Instructions:
1. Import each layer SVG into your laser software (LightBurn, etc.)
2. Cut layers in order from layer-01 (bottom) to layer-${String(layers.length).padStart(2, '0')} (top)
3. Use ${settings.targetWidthMm}mm as reference width
4. Stack layers after cutting for 3D effect

Material Recommendations:
- 3mm plywood or acrylic per layer
- Consistent material thickness across all layers
- Light-colored materials show depth better

Assembly Tips:
- Use wood glue between layers
- Align carefully before gluing
- Clamp and let dry completely
- Sand edges smooth after assembly

For support: LaserFilesPro Studio
`;
}

export function performHealthChecks(layers: VectorLayer[]): HealthCheck[] {
  const checks: HealthCheck[] = [];
  
  // Check for open paths
  layers.forEach(layer => {
    if (layer.stats.openPaths > 0) {
      checks.push({
        type: 'warning',
        message: `${layer.name} has ${layer.stats.openPaths} open paths`,
        details: 'Open paths may not cut correctly. Consider increasing simplify tolerance.',
      });
    }
  });
  
  // Check for too many islands
  layers.forEach(layer => {
    if (layer.stats.islandCount > 100) {
      checks.push({
        type: 'warning',
        message: `${layer.name} has ${layer.stats.islandCount} separate regions`,
        details: 'Consider increasing min island area to merge small regions.',
      });
    }
  });
  
  // Check bounding box size
  layers.forEach(layer => {
    const { width, height } = layer.stats.boundingBox;
    if (width < 10 || height < 10) {
      checks.push({
        type: 'warning',
        message: `${layer.name} is very small (${width.toFixed(0)}x${height.toFixed(0)}px)`,
        details: 'Layer may be too small to cut accurately.',
      });
    }
  });
  
  // Check if all layers are empty
  const totalPaths = layers.reduce((sum, l) => sum + l.stats.pathCount, 0);
  if (totalPaths === 0) {
    checks.push({
      type: 'error',
      message: 'No paths generated',
      details: 'All layers are empty. Try adjusting quantization settings.',
    });
  }
  
  // Success message if no issues
  if (checks.length === 0) {
    checks.push({
      type: 'info',
      message: 'All health checks passed',
      details: 'Project is ready for export.',
    });
  }
  
  return checks;
}

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
