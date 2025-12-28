# Ornament Library

This directory contains the ornament asset library for LaserFilesPro Studio.

## Structure

```
ornaments/
├── source/          # Source SVG files organized by category
│   ├── Corner/
│   ├── Dividers/
│   ├── Flowers/
│   ├── Leaves/
│   ├── Round/
│   └── ...
├── generated/       # Auto-generated library files (do not edit manually)
│   ├── ornamentLibrary.ts
│   └── ornamentThumbs.ts
└── README.md
```

## Adding Ornaments

1. Place SVG files in `source/<Category>/` folders
2. Category name = folder name (e.g., "Flowers", "Corner")
3. SVG files should contain vector paths only (no raster images)
4. Run the generator: `pnpm generate:ornaments`
5. Commit both source SVGs and generated files

## Generator

The generator script scans all SVG files in `source/` and produces:
- `ornamentLibrary.ts` - Normalized geometry (0-100 viewBox) + metadata
- `ornamentThumbs.ts` - Inline SVG thumbnails for UI

Each ornament is:
- Normalized to fit 0-100 viewBox with 5-unit padding
- Assigned an ID: `{category-slug}-{filename-slug}`
- Tagged with category and recommended defaults

## Customization

Create `source/_meta.json` to override defaults:

```json
{
  "flowers-rose": {
    "tags": ["floral", "decorative"],
    "recommendedLayer": "ENGRAVE",
    "defaultInsertWidthPct": 25
  }
}
```

## Usage

Import in your component:
```typescript
import { ORNAMENT_LIBRARY, ORNAMENT_CATEGORIES } from '@/lib/assets/ornaments';
import { ORNAMENT_THUMBS } from '@/lib/assets/ornaments/generated/ornamentThumbs';
```
