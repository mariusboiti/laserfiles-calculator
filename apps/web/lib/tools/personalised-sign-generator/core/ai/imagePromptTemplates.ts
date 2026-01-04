export function buildSketchImagePrompt(subject: string, detail: 'low' | 'medium' | 'high') {
  const s = subject.trim();
  const detailLine =
    detail === 'high'
      ? 'high detail, clean lines, detailed cross-hatching'
      : detail === 'medium'
        ? 'medium detail, clean contour lines, some cross-hatching'
        : 'low detail, simple clean outline, minimal hatching';

  return [
    `Subject: ${s}.`,
    'Pen/pencil sketch for laser engraving.',
    'Monochrome black lines only.',
    detailLine + '.',
    'High contrast line art suitable for vector tracing.',
    'Single subject, centered, no background.',
    'No text, no watermark, no signatures.',
    'Transparent or white background.',
  ].join(' ');
}

export function buildSilhouetteImagePrompt(subject: string, complexity: 'simple' | 'medium') {
  const s = subject.trim();
  const complexityLine =
    complexity === 'medium'
      ? 'medium complexity, a few large interior cutouts only'
      : 'simple silhouette, no interior details';

  return [
    `Subject: ${s}.`,
    'Create a laser-cut-friendly silhouette.',
    complexityLine + '.',
    'Bold outline or solid shape.',
    'High contrast, clean edges, suitable for vector tracing.',
    'Single subject, centered, no background.',
    'No text, no watermark, no signatures.',
    'Transparent or white background.',
  ].join(' ');
}
