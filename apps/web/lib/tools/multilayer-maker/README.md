# MultiLayer Maker V3

Complete laser-first tool for converting images into multi-layer vector cut files.

## Architecture

### Data Flow
1. **Source** → Upload image OR AI Generate
2. **Simplify** → Denoise, contrast, edge enhance, background removal
3. **Quantize** → K-means into N tones
4. **Cleanup** → Remove islands, merge regions, smooth
5. **Vectorize** → Contour extraction, path simplification
6. **Export** → SVG per layer, DXF/EPS stubs, ZIP with assembly guide

### Key Features
- **Wizard UI**: 5-step guided workflow
- **AI Generation**: Style presets for multilayer-friendly images
- **Worker Pipeline**: Non-blocking processing
- **Canvas Preview**: Pan/zoom with overlay toggles
- **Layer Stack**: Drag-reorder, per-layer controls
- **Export Pack**: SVG + DXF/EPS + assembly guide + ZIP

### File Structure
```
lib/tools/multilayer-maker/
├── types.ts              # Complete type definitions
├── worker/
│   ├── worker.ts         # Main worker orchestration
│   ├── quantize.ts       # K-means color quantization
│   ├── cleanup.ts        # Region cleanup, island removal
│   └── vectorize.ts      # Contour extraction, path simplification
├── core/
│   ├── image.ts          # Image loading, preprocessing
│   ├── svg.ts            # SVG generation with kerf/offset
│   ├── export.ts         # ZIP export with assembly guide
│   └── ai.ts             # AI generation client wrapper
├── ui/
│   ├── MultiLayerMakerTool.tsx
│   ├── components/
│   │   ├── Wizard.tsx           # Step navigation
│   │   ├── StepSource.tsx       # Upload + AI Generate
│   │   ├── StepSimplify.tsx     # Image preprocessing
│   │   ├── StepLayers.tsx       # Layer configuration
│   │   ├── StepLaserSettings.tsx # Kerf, offset, tabs
│   │   ├── StepExport.tsx       # Export formats
│   │   ├── Canvas.tsx           # Pan/zoom preview
│   │   └── LayerStack.tsx       # Right panel layer list
│   └── hooks/
│       ├── useProject.ts        # Project state management
│       └── useWorker.ts         # Worker communication
└── samples/                     # Test images
```

## API Endpoints

### POST /api/ai/generate
Generate multilayer-friendly image from prompt.

**Request:**
```json
{
  "prompt": "cute robot mascot",
  "style": "cute-mascot",
  "negativePrompt": "busy background, gradients, tiny details",
  "variations": 4
}
```

**Response:**
```json
{
  "images": ["data:image/png;base64,..."],
  "seed": 12345
}
```

### POST /api/ai/simplify
AI-powered image simplification (optional enhancement).

**Request:**
```json
{
  "imageBase64": "data:image/png;base64,...",
  "targetTones": 5
}
```

**Response:**
```json
{
  "simplifiedImageBase64": "data:image/png;base64,...",
  "suggestedTones": [...]
}
```

## Usage

```typescript
// Initialize project
const project = useProject();

// Step 1: Upload or AI Generate
await project.loadImage(file);
// OR
await project.generateAI({ prompt: "...", style: "cute-mascot" });

// Step 2: Simplify
project.updateSettings({ detail: 80, contrast: 1.2, denoise: 3 });
await project.simplify();

// Step 3: Configure layers
project.updateSettings({ layerCount: 5, minIslandArea: 10 });
await project.generateLayers();

// Step 4: Laser settings
project.updateSettings({ kerf: 0.1, thicknessPerLayer: 3 });
project.updateLayerOffset(layerId, 0.05);

// Step 5: Export
const zip = await project.exportZip();
downloadZip(zip, 'multilayer-project.zip');
```

## Testing

Sample images provided in `/public/samples/`:
- `mascot-simple.png` - Clean 4-tone mascot
- `christmas-pet.png` - Holiday themed
- `geometric-logo.png` - High contrast logo
- `portrait-test.png` - Photo for testing simplification

## Implementation Status

✅ Core types and data model
✅ AI endpoint stubs
✅ Worker architecture
✅ Export system with assembly guide
🔄 Wizard UI components (in progress)
🔄 Canvas preview with pan/zoom
🔄 Complete worker pipeline
