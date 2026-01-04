# BoxMaker Publish Readiness Checklist

## ✅ Core Utilities Implemented

### 1. Validation System (`core/validation.ts`)
- ✅ `validateSharedInputs()` - Common validation for all box types
- ✅ `validateHingedInputs()` - Hinged box specific validation
- ✅ `validateSlidingDrawerInputs()` - Sliding drawer specific validation
- ✅ `validateSimpleBoxInputs()` - Simple box validation
- ✅ `calculateMinDimension()` - Minimum dimension calculator
- ✅ `calculateRecommendedFingerWidth()` - Auto finger width recommendation

**Validation Rules**:
- Minimum dimensions: 10mm (all dimensions)
- Maximum dimensions: 1000mm (width/depth), 500mm (height) with warnings
- Material thickness: 1-50mm (warning > 10mm)
- Kerf: 0-2mm (warning > 2mm), cannot exceed thickness
- Finger width: 3-50mm with recommendations based on box size
- Dimension vs thickness ratio checks
- Clearance vs kerf checks for hinged/sliding modes

### 2. Export Naming (`core/exportNaming.ts`)
- ✅ `generateExportFilename()` - Standardized naming pattern
- ✅ `generateAllPanelsFilename()` - ZIP export naming
- ✅ `sanitizePanelName()` - Safe filename generation

**Naming Pattern**: `boxmaker_<mode>_<panel>_<timestamp>.svg`
- Examples:
  - `boxmaker_simple_front.svg`
  - `boxmaker_hinged_lid_1703012345.svg`
  - `boxmaker_sliding-drawer_outer-front.svg`

### 3. SVG Safety (`core/svgUtils.ts`)
- ✅ `enforceLaserSafeSvg()` - Ensure fill="none" on all elements
- ✅ `removeDuplicatePoints()` - Clean duplicate consecutive points
- ✅ `removeCollinearPoints()` - Remove unnecessary collinear points
- ✅ `optimizePath()` - Full path optimization
- ✅ `addNonScalingStroke()` - Add vector-effect for consistent stroke
- ✅ `validateLaserSafeSvg()` - Check for laser-unsafe elements

**SVG Rules Enforced**:
- All paths/circles/polygons have `fill="none"`
- Consistent stroke attributes (0.5mm cut, 0.3mm engrave)
- No gradients, filters, or raster images
- Optional: `vector-effect="non-scaling-stroke"`
- Duplicate and collinear points removed

### 4. Label Auto-Fit (`core/labelUtils.ts`)
- ✅ `autoFitText()` - Scale font size to fit panel bounds
- ✅ `generatePanelLabel()` - Generate SVG text element
- ✅ `calculateLabelPosition()` - Safe label positioning

**Label Features**:
- Auto-scale font size (12px → 6px minimum)
- Truncate with ellipsis if text too long
- Center positioning with padding
- XML-safe text escaping

---

## 🔧 Integration Status

### Simple Box Mode
- ⚠️ **Partial** - Uses legacy `src/App` component
- **Action Required**: Wrap validation around existing inputs
- **Action Required**: Apply export naming to download functions
- **Action Required**: Add SVG safety enforcement to generator

### Hinged Box Mode
- ✅ **Modern Architecture** - Uses `boxmaker/ui/panels/HingedBoxUI.tsx`
- **Action Required**: Import and use validation utilities
- **Action Required**: Display errors/warnings in UI
- **Action Required**: Apply export naming
- **Action Required**: Add panel labels to SVG output

### Sliding Drawer Mode
- ✅ **Modern Architecture** - Uses `boxmaker/ui/panels/SlidingDrawerUI.tsx`
- **Action Required**: Import and use validation utilities
- **Action Required**: Display errors/warnings in UI
- **Action Required**: Apply export naming
- **Action Required**: Add panel labels to SVG output

---

## 📋 Pre-Publish Integration Tasks

### For Each Mode (Simple/Hinged/Sliding):

#### 1. Add Validation Display
```tsx
import { validateHingedInputs } from '../../core/validation';

// In component:
const validation = useMemo(() => validateHingedInputs(inputs), [inputs]);

// In UI:
{validation.errors.length > 0 && (
  <div className="rounded-lg border border-red-800 bg-red-950/40 p-3">
    <div className="text-sm font-medium text-red-300">Errors</div>
    <ul className="mt-2 space-y-1 text-xs text-red-200">
      {validation.errors.map((e, i) => <li key={i}>• {e}</li>)}
    </ul>
  </div>
)}

{validation.warnings.length > 0 && (
  <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
    <div className="text-sm font-medium text-amber-300">Warnings</div>
    <ul className="mt-2 space-y-1 text-xs text-amber-200">
      {validation.warnings.map((w, i) => <li key={i}>• {w}</li>)}
    </ul>
  </div>
)}
```

#### 2. Update Export Functions
```tsx
import { generateExportFilename } from '../../core/exportNaming';

function handleExport(panelName: string) {
  const filename = generateExportFilename('hinged', panelName, false);
  downloadTextFile(filename, svgContent, 'image/svg+xml');
}
```

#### 3. Apply SVG Safety
```tsx
import { enforceLaserSafeSvg, optimizePath } from '../../core/svgUtils';

// In SVG generator:
const cleanedOutline = optimizePath(rawOutline);
const safeSvg = enforceLaserSafeSvg(generatedSvg);
```

#### 4. Add Panel Labels
```tsx
import { generatePanelLabel, calculateLabelPosition } from '../../core/labelUtils';

// In SVG generator:
const labelPos = calculateLabelPosition(panelWidth, panelHeight);
const label = generatePanelLabel(
  'Front Panel',
  labelPos.x,
  labelPos.y,
  labelPos.maxWidth,
  labelPos.maxHeight
);

// Add to SVG:
const svg = `...
  ${label}
</svg>`;
```

---

## 🎯 Golden Presets (Quick Testing)

Three pre-configured presets for rapid testing across all modes:

### Small Box
- **Dimensions**: 60×60×40mm
- **Material**: 3mm thickness
- **Kerf**: 0.1mm
- **Finger Width**: 10mm
- **Use Case**: Small storage, jewelry boxes, quick prototypes

### Medium Box
- **Dimensions**: 120×120×80mm
- **Material**: 3mm thickness
- **Kerf**: 0.12mm
- **Finger Width**: 12mm
- **Use Case**: Standard boxes, gift boxes, organizers

### Thick Material
- **Dimensions**: 100×80×60mm
- **Material**: 6mm thickness
- **Kerf**: 0.15mm
- **Finger Width**: 14mm
- **Use Case**: Heavy-duty boxes, thick plywood/MDF

**Preset Adjustments by Mode**:
- **Hinged**: Auto-calculates hinge finger width (80% of joint finger), hinge clearance (1.5× kerf), hole inset (2× thickness)
- **Sliding Drawer**: Auto-calculates drawer clearance (3× kerf), bottom offset (0mm default)

**Access**: Click preset buttons in UI (Small/Medium/Thick) to instantly apply configuration.

---

## 🔍 Automated Regression Checks

BoxMaker now includes automatic regression testing that runs on every SVG generation:

### Checks Performed:

#### 1. **No NaN Values**
- Scans all SVG content for `NaN` strings
- Ensures all calculations produce valid numbers
- **Status**: Real-time validation

#### 2. **Panel Count Verification**
- **Hinged Box**: Expects 6 panels (front, back, left, right, bottom, lid)
- **Sliding Drawer**: Expects 10+ panels (5 outer + 5 drawer + optional front face)
- **Status**: Automatic count check

#### 3. **Valid SVG Structure**
- Checks for XML declaration
- Verifies SVG namespace
- Ensures proper opening/closing tags
- **Status**: Structure validation

#### 4. **Laser-Safe SVG**
- All paths have `fill="none"`
- No gradients or filters
- No raster images
- **Status**: Laser safety enforcement

#### 5. **Hinge Complementary** (Hinged mode only)
- Left and right panels have matching hole counts
- Ensures hinge alignment
- **Status**: Geometric validation

#### 6. **Drawer Opening Present** (Sliding Drawer mode only)
- Outer front panel has cutout
- Opening dimensions are positive
- **Status**: Cutout validation

### Regression Check Display

**When checks pass**: No display (silent success)

**When checks fail**: Orange warning box appears with:
```
⚠️ Regression Checks
• Panel count: Expected 6 panels, got 5
• Laser-safe: front: Panel front is not laser-safe
```

**Location**: Appears in left sidebar below validation errors/warnings

---

## 🧪 Testing Checklist

### Golden Preset Tests:
- [ ] Apply "Small" preset in Hinged mode - verify all values
- [ ] Apply "Medium" preset in Sliding Drawer mode - verify all values
- [ ] Apply "Thick" preset in both modes - verify thick material handling
- [ ] Switch between presets rapidly - no crashes or NaN values
- [ ] Export SVGs from each preset - verify naming and content

### Edge Cases to Test:

#### Minimum Dimensions
- [ ] Width = 10mm (should work)
- [ ] Width = 9mm (should show error)
- [ ] Height < 3× thickness (should warn)

#### Kerf Validation
- [ ] Kerf = 0 (should work)
- [ ] Kerf = -0.1 (should error)
- [ ] Kerf > thickness (should error)
- [ ] Kerf > 2mm (should warn)

#### Finger Width
- [ ] Auto mode calculates reasonable values
- [ ] Manual mode respects bounds (3-50mm)
- [ ] Warnings for too small/large relative to box size

#### Clearances (Hinged/Sliding)
- [ ] Clearance < kerf (should warn)
- [ ] Clearance = 0 (should work but warn)
- [ ] Hinge clearance > 5mm (should warn)

#### Export Naming
- [ ] All exports use consistent naming pattern
- [ ] Panel names are sanitized
- [ ] Timestamps are optional and consistent

#### SVG Safety
- [ ] All elements have `fill="none"`
- [ ] No gradients, filters, or images
- [ ] Stroke widths are consistent
- [ ] Paths are optimized (no duplicate/collinear points)

#### Panel Labels
- [ ] Labels fit within panel bounds
- [ ] Long text is truncated with ellipsis
- [ ] Labels don't interfere with cut lines
- [ ] XML special characters are escaped

---

## 🚀 Final Pre-Publish Steps

1. **Code Review**
   - [ ] All validation functions tested
   - [ ] Export naming consistent across all modes
   - [ ] SVG safety applied to all generators
   - [ ] Panel labels added and tested

2. **UI Polish**
   - [ ] Error messages are clear and actionable
   - [ ] Warning messages are helpful not alarming
   - [ ] Validation feedback is immediate (useMemo)
   - [ ] Export buttons disabled when errors present

3. **Documentation**
   - [ ] Update README with validation rules
   - [ ] Document export naming pattern
   - [ ] Add examples of valid/invalid inputs
   - [ ] Include troubleshooting guide

4. **Performance**
   - [ ] Validation doesn't cause lag
   - [ ] SVG optimization doesn't slow generation
   - [ ] Label generation is fast

5. **Compatibility**
   - [ ] Test with LightBurn
   - [ ] Test with various laser software
   - [ ] Verify SVG imports correctly
   - [ ] Check scaling behavior

---

## 📊 Validation Rules Summary

| Rule | Min | Max | Warning Threshold |
|------|-----|-----|-------------------|
| Width/Depth/Height | 10mm | 1000mm | >1000mm |
| Material Thickness | 1mm | 50mm | >10mm |
| Kerf | 0mm | thickness | >2mm |
| Finger Width | 3mm | 50mm | <50% or >200% of recommended |
| Hinge Clearance | 0mm | - | >5mm or <kerf |
| Drawer Clearance | 0mm | - | >10mm or <kerf |

**Recommended Finger Width Formula**:
```
recommended = (width + depth + height) / 3 / 12
clamped between 5mm and 20mm
```

---

## 🎯 Success Criteria

BoxMaker is publish-ready when:

1. ✅ All validation utilities are implemented
2. ⚠️ Validation is integrated into all 3 UI modes
3. ⚠️ Export naming is standardized
4. ⚠️ SVG safety is enforced
5. ⚠️ Panel labels are auto-fitted
6. ⚠️ All edge cases pass testing
7. ⚠️ Documentation is complete
8. ⚠️ Performance is acceptable
9. ⚠️ Laser software compatibility verified

**Current Status**: Core utilities complete, integration pending.

**Estimated Integration Time**: 2-4 hours for full integration across all modes.

---

## 📝 Notes

- Simple Box mode uses legacy architecture - may require more refactoring
- Hinged and Sliding Drawer modes have modern architecture - easier to integrate
- Consider adding "Auto" mode for finger width as default
- Panel labels are optional - can be toggled in UI
- SVG optimization is aggressive - test with complex boxes
- Export naming includes optional timestamp - useful for versioning

---

## 🔗 Related Files

- `core/validation.ts` - Validation logic
- `core/exportNaming.ts` - Export filename generation
- `core/svgUtils.ts` - SVG safety and optimization
- `core/labelUtils.ts` - Panel label auto-fitting
- `ui/panels/HingedBoxUI.tsx` - Hinged box UI (modern)
- `ui/panels/SlidingDrawerUI.tsx` - Sliding drawer UI (modern)
- `ui/panels/SimpleBoxUI.tsx` - Simple box UI (legacy wrapper)

---

**Last Updated**: December 18, 2025
**Version**: 1.0.0-pre-publish
**Status**: Core utilities complete, integration pending
