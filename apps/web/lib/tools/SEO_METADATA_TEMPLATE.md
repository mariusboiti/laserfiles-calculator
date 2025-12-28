# SEO Metadata Template for Tool Pages

## Implementation Instructions

Add this metadata to each tool's page.tsx file:

```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '{Tool Name} – Free Online Laser Cutting Tool',
  description: 'Create laser-ready SVGs for {use case}. Free online tool by LaserFilesPro.',
};
```

---

## Tool-Specific Metadata

### 1. BoxMaker
```typescript
export const metadata: Metadata = {
  title: 'BoxMaker – Free Online Laser Cutting Tool',
  description: 'Create laser-ready box SVGs with finger joints. Simple, hinged, and sliding drawer boxes. Free online tool by LaserFilesPro.',
};
```

### 2. EngravePrep
```typescript
export const metadata: Metadata = {
  title: 'EngravePrep – Free Online Laser Engraving Tool',
  description: 'Prepare images for laser engraving with dithering and optimization. Free online tool by LaserFilesPro.',
};
```

### 3. Panel Splitter
```typescript
export const metadata: Metadata = {
  title: 'Panel Splitter – Free Online Laser Cutting Tool',
  description: 'Split large SVG designs into laser cutter tiles with overlap and alignment. Free online tool by LaserFilesPro.',
};
```

### 4. Bulk Name Tags
```typescript
export const metadata: Metadata = {
  title: 'Bulk Name Tags – Free Online Laser Cutting Tool',
  description: 'Generate batch name tags from CSV for laser engraving. Free online tool by LaserFilesPro.',
};
```

### 5. Personalised Sign Generator
```typescript
export const metadata: Metadata = {
  title: 'Personalised Sign Generator – Free Online Laser Cutting Tool',
  description: 'Create custom laser-cut signs with engraved text and holes. Free online tool by LaserFilesPro.',
};
```

### 6. Keychain Generator
```typescript
export const metadata: Metadata = {
  title: 'Keychain Generator – Free Online Laser Cutting Tool',
  description: 'Design custom laser-cut keychains with shapes, holes, and engraved names. Free online tool by LaserFilesPro.',
};
```

### 7. Round Coaster & Badge Generator
```typescript
export const metadata: Metadata = {
  title: 'Round Coaster & Badge Generator – Free Online Laser Cutting Tool',
  description: 'Create laser-cut coasters and badges with engraved text and borders. Free online tool by LaserFilesPro.',
};
```

### 8. Product Label & SKU Generator
```typescript
export const metadata: Metadata = {
  title: 'Product Label Generator – Free Online Laser Cutting Tool',
  description: 'Design product labels with QR codes, SKU, and pricing for laser engraving. Free online tool by LaserFilesPro.',
};
```

### 9. Ornament Layout Planner
```typescript
export const metadata: Metadata = {
  title: 'Ornament Layout Planner – Free Online Laser Cutting Tool',
  description: 'Arrange multiple ornaments on laser cutter sheets with auto-fit and spacing. Free online tool by LaserFilesPro.',
};
```

### 10. Inlay Offset Calculator
```typescript
export const metadata: Metadata = {
  title: 'Inlay Offset Calculator – Free Online Laser Cutting Tool',
  description: 'Calculate precise offsets for laser-cut inlays and marquetry with kerf compensation. Free online tool by LaserFilesPro.',
};
```

### 11. Jig & Fixture Generator
```typescript
export const metadata: Metadata = {
  title: 'Jig & Fixture Generator – Free Online Laser Cutting Tool',
  description: 'Create production jigs and fixtures for batch laser engraving and assembly. Free online tool by LaserFilesPro.',
};
```

---

## Content Structure for Each Tool Page

Add these sections to each tool's help content or page:

### H1: Tool Name
```tsx
<h1>BoxMaker</h1>
```

### H2: How it works
```tsx
<h2>How it works</h2>
<p>Step-by-step explanation of the tool...</p>
```

### H2: Export & compatibility
```tsx
<h2>Export & compatibility</h2>
<p>Compatible with LightBurn, RDWorks, LaserGRBL, and more...</p>
```

---

## Implementation Checklist

For each tool page (11 total):
- [ ] Add Metadata export with title and description
- [ ] Verify H1 tag exists (tool name)
- [ ] Add H2: "How it works" section
- [ ] Add H2: "Export & compatibility" section
- [ ] Test meta tags in browser dev tools
- [ ] Verify Google Search Console (post-deployment)

---

## SEO Best Practices

### Title Format:
- Keep under 60 characters
- Include primary keyword ("Laser Cutting Tool")
- Include "Free Online" for better CTR
- Brand at the end (LaserFilesPro implied in URL)

### Description Format:
- Keep under 156 characters
- Include action verb ("Create", "Design", "Generate")
- Include primary use case
- Include "Free" and "LaserFilesPro"
- No special characters that break display

### Keywords to Target:
- "laser cutting tool"
- "laser engraving tool"
- "free laser design"
- "SVG generator"
- "laser cutter software"
- Tool-specific: "box maker", "name tag generator", etc.

---

## Testing SEO

### Local Testing:
```bash
# View page source
curl http://localhost:3000/studio/tools/boxmaker | grep -A 5 "<head>"

# Check meta tags
# Look for <title> and <meta name="description">
```

### Production Testing:
1. Deploy to production
2. Open tool page
3. View page source (Ctrl+U)
4. Verify <title> and <meta name="description">
5. Test with Google Rich Results Test
6. Submit sitemap to Google Search Console

---

**Status**: Template ready for implementation  
**Estimated Time**: 1-2 hours to add to all 11 tools  
**Priority**: High (required for v1.0.0 release)
