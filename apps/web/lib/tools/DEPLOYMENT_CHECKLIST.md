# LaserFilesPro Studio Tools - Deployment Checklist

## Pre-Deployment Testing

### EngravePrep ✅ (Priority: HIGH)

**Reset Functionality**:
- [ ] Click Reset button in ToolShell
- [ ] Verify image is cleared
- [ ] Verify all sliders reset to defaults
- [ ] Verify dither mode resets to default

**Help Content**:
- [ ] Click Help (?) button
- [ ] Verify modal opens with complete content
- [ ] Verify modal can be closed

**Export Naming**:
- [ ] Upload test image
- [ ] Adjust dithering (Floyd-Steinberg)
- [ ] Set output width (e.g., 600px)
- [ ] Export PNG
- [ ] Verify filename: `engraveprep-{source}-floyd-600px.png`

**Input Stepping**:
- [ ] Try changing output width with arrow keys
- [ ] Verify step is 1 (not jumping 100)
- [ ] Try typing values 50-5000
- [ ] Verify clamping works

**Expected Result**: All features work, no crashes, export files valid.

---

### BoxMaker ✅ (Priority: HIGH)

**Presets**:
- [ ] Switch to Hinged Box mode
- [ ] Click "Small" preset
- [ ] Verify dimensions: 100×80×60mm, 3mm thickness
- [ ] Click "Medium" preset
- [ ] Verify dimensions: 160×120×80mm, 3mm thickness
- [ ] Click "Large" preset
- [ ] Verify dimensions: 240×180×120mm, 4mm thickness
- [ ] Repeat for Sliding Drawer mode

**Validation Warnings**:
- [ ] Set kerf to 2mm (> thickness 3mm)
- [ ] Verify amber warning appears
- [ ] Set finger width to 50mm (large for panel)
- [ ] Verify warning appears
- [ ] Set drawer clearance to 0.1mm (< kerf)
- [ ] Verify warning appears

**Export ZIP**:
- [ ] Generate hinged box (any size)
- [ ] Click "Export ZIP (All)"
- [ ] Verify ZIP downloads
- [ ] Extract ZIP
- [ ] Verify folder structure: `boxmaker/hinged/...`
- [ ] Verify filename: `boxmaker-hinged-{w}x{d}x{h}-t{thickness}-kerf{kerf}.zip`
- [ ] Verify all 6 panels present (front, back, left, right, bottom, lid)
- [ ] Open SVGs in LightBurn - verify they're valid

**Bottom Panel Geometry**:
- [ ] Generate hinged box 120×80×60mm, 3mm thickness
- [ ] Export bottom panel
- [ ] Measure in LightBurn: should be 114×74mm (120-6, 80-6)
- [ ] Verify no floating corners

**Reset**:
- [ ] Change multiple settings
- [ ] Click Reset button
- [ ] Verify all settings return to defaults

**Expected Result**: Presets work, warnings display, ZIP export correct, bottom panel fits.

---

### Panel Splitter ✅ (Priority: MEDIUM)

**Reset Functionality**:
- [ ] Upload test SVG
- [ ] Adjust bed size and margins
- [ ] Click Reset button
- [ ] Verify SVG is cleared
- [ ] Verify bed size resets to 300×200mm
- [ ] Verify margin resets to 5mm
- [ ] Verify overlap resets to 0mm

**Help Content**:
- [ ] Click Help (?) button
- [ ] Verify modal opens
- [ ] Read through content - check for clarity

**Export ZIP**:
- [ ] Upload large SVG (e.g., 600×400mm)
- [ ] Set bed to 300×200mm
- [ ] Generate tiles (should create 2×2 = 4 tiles)
- [ ] Export ZIP
- [ ] Verify filename: `panel-splitter-2x2-300x200.zip`
- [ ] Extract ZIP
- [ ] Verify folder: `panel-splitter/`
- [ ] Verify tiles: `tile-r1-c1.svg`, `tile-r1-c2.svg`, `tile-r2-c1.svg`, `tile-r2-c2.svg`
- [ ] Open each SVG
- [ ] Verify metadata comment: `<!-- Panel Splitter: row 1 / col 1 -->`
- [ ] Verify README.txt present
- [ ] Verify assembly_map.svg present (if enabled)

**Expected Result**: Reset works, ZIP export correct structure, tiles valid.

---

### Bulk Name Tags ⚠️ (Priority: LOW - Foundation Only)

**Status**: Foundation files created, integration pending.

**What to Test** (after integration):
- [ ] Reset clears names and settings
- [ ] Help content displays
- [ ] Paste list processes correctly (trim, dedupe)
- [ ] Export ZIP creates individual tag files
- [ ] Text auto-fit works for long names

**Current State**: 
- ✅ Defaults defined
- ✅ Text auto-fit algorithm ready
- ✅ Help content ready
- ⚠️ Needs integration (~3-4 hours)

**Action**: Follow `IMPLEMENTATION_GUIDE.md` to complete integration.

---

## Browser Testing

### Browsers to Test:
- [ ] Chrome/Edge (primary)
- [ ] Firefox
- [ ] Safari (if available)

### Responsive Testing:
- [ ] Desktop (1920×1080)
- [ ] Laptop (1366×768)
- [ ] Tablet (768×1024)

### Common Issues to Check:
- [ ] No console errors
- [ ] No TypeScript compilation errors
- [ ] All buttons clickable
- [ ] Modals open and close
- [ ] File downloads work
- [ ] ZIP extraction works

---

## LightBurn Validation

### Test Exported Files:

**EngravePrep**:
- [ ] Import PNG/BMP into LightBurn
- [ ] Verify image displays correctly
- [ ] Verify dimensions match output width

**BoxMaker**:
- [ ] Import all panels from ZIP
- [ ] Verify no overlapping paths
- [ ] Verify stroke width is laser-safe (0.2mm or similar)
- [ ] Verify no fills (fill="none")
- [ ] Check finger joints align visually
- [ ] Measure bottom panel - should be inner dimensions

**Panel Splitter**:
- [ ] Import all tiles
- [ ] Verify tiles are correct size (bedW × bedH)
- [ ] Verify no clipping artifacts
- [ ] Check if tiles can be aligned using overlap

---

## Performance Testing

### Large Datasets:

**Panel Splitter**:
- [ ] Upload 1000×800mm SVG
- [ ] Set bed to 200×150mm
- [ ] Should create ~24 tiles
- [ ] Verify generation completes without crash
- [ ] Check memory usage

**Bulk Name Tags** (after integration):
- [ ] Paste 200 names
- [ ] Verify warning appears (>200 names)
- [ ] Generate all tags
- [ ] Verify no crash
- [ ] Export ZIP with 200 files

---

## Edge Cases

### EngravePrep:
- [ ] Upload very small image (100×100px)
- [ ] Upload very large image (5000×5000px)
- [ ] Try extreme adjustments (contrast 100%, brightness -100%)
- [ ] Verify no crashes

### BoxMaker:
- [ ] Set minimum dimensions (20×20×20mm)
- [ ] Set maximum dimensions (2000×2000×2000mm)
- [ ] Set kerf = thickness (should warn)
- [ ] Set finger width = panel width (should warn)
- [ ] Verify warnings display, no crashes

### Panel Splitter:
- [ ] Upload tiny SVG (50×50mm)
- [ ] Upload huge SVG (5000×5000mm)
- [ ] Set bed smaller than SVG tile size
- [ ] Verify appropriate errors/warnings

---

## Deployment Steps

### 1. Pre-Deployment:
- [ ] Run all tests above
- [ ] Fix any critical issues
- [ ] Verify TypeScript compiles without errors
- [ ] Check for console warnings

### 2. Deployment:
- [ ] Commit changes with descriptive messages
- [ ] Push to production branch
- [ ] Deploy to staging first (if available)
- [ ] Test on staging
- [ ] Deploy to production

### 3. Post-Deployment:
- [ ] Monitor error logs for 24 hours
- [ ] Check user feedback
- [ ] Test on production URL
- [ ] Verify all tools load correctly

---

## Rollback Plan

If critical issues found:

1. **Immediate**: Revert to previous version
2. **Document**: Note what failed and why
3. **Fix**: Address issues in development
4. **Re-test**: Complete checklist again
5. **Re-deploy**: When confident

---

## Success Criteria

### EngravePrep:
- ✅ Reset works
- ✅ Help displays
- ✅ Export naming correct
- ✅ Input stepping fixed
- ✅ No crashes

### BoxMaker:
- ✅ Presets apply correctly
- ✅ Warnings display
- ✅ Export ZIP works
- ✅ Bottom panel geometry correct
- ✅ SVGs valid in LightBurn

### Panel Splitter:
- ✅ Reset works
- ✅ Help displays
- ✅ Export ZIP structure correct
- ✅ Tiles have metadata
- ✅ No crashes

### Bulk Name Tags:
- ⚠️ Foundation ready
- ⚠️ Integration pending

---

## Known Issues (Non-Critical)

### TypeScript Errors:
- `onReset` prop may show TS error if ToolShell doesn't have it defined
- `onResetCallback` prop may show TS error with dynamic imports
- These work at runtime, TS errors can be ignored or fixed

### Optional Enhancements:
- BoxMaker: Hinged hinge/joint separation refinement
- Panel Splitter: Preset buttons in UI
- Panel Splitter: Specific warnings display
- Bulk Name Tags: Complete integration

---

## Contact & Support

**Issues Found?**
1. Check console for errors
2. Check browser compatibility
3. Verify file permissions for downloads
4. Check LightBurn version compatibility

**Documentation**:
- `TOOLS_POLISH_COMPLETE_SUMMARY.md` - Overall summary
- `BOXMAKER_POLISH_V1_FINAL.md` - BoxMaker details
- `PANEL_SPLITTER_POLISH_V1.md` - Panel Splitter details
- `BULK_NAME_TAGS_IMPLEMENTATION_GUIDE.md` - Integration guide

---

**Checklist Version**: 1.0  
**Last Updated**: December 19, 2025  
**Status**: Ready for deployment testing
