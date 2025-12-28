'use client';

export function CurvedPhotoFrameGeneratorHelp() {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">How it works</div>
      <div className="text-sm text-slate-200">
        This generator creates a front frame (window cutout), a back panel with kerf-bend score lines to help curvature,
        and a stand.
      </div>
      <div className="text-sm font-semibold">Layers</div>
      <div className="text-sm text-slate-200">
        CUT is red, SCORE is blue, and ENGRAVE is black. Some laser software uses colors, others use layer/group names.
      </div>
      <div className="text-sm font-semibold">PDF export</div>
      <div className="text-sm text-slate-200">PDF uses browser Print. Choose “Save as PDF” in the print dialog.</div>
    </div>
  );
}
