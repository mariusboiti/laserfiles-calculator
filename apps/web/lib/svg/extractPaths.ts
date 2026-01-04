export type SvgViewBox = { x: number; y: number; w: number; h: number };

export function extractSvgPaths(svgString: string): {
  viewBox?: SvgViewBox;
  paths: Array<{ d: string; transform?: string }>;
} {
  if (typeof window === 'undefined') {
    throw new Error('extractSvgPaths can only run in the browser');
  }

  const paths: Array<{ d: string; transform?: string }> = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  const svg = doc.querySelector('svg');
  if (!svg) {
    return { paths: [] };
  }

  const viewBoxAttr = svg.getAttribute('viewBox');
  let viewBox: SvgViewBox | undefined;
  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/\s+|,/).map((p) => Number.parseFloat(p));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      viewBox = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    }
  }

  const walk = (node: Element, inheritedTransform?: string) => {
    const ownTransform = node.getAttribute('transform') || undefined;
    const combinedTransform = [inheritedTransform, ownTransform].filter(Boolean).join(' ') || undefined;

    if (node.tagName.toLowerCase() === 'path') {
      const d = node.getAttribute('d');
      if (d && d.trim()) {
        paths.push({ d: d.trim(), transform: combinedTransform });
      }
    }

    for (const child of Array.from(node.children)) {
      walk(child, combinedTransform);
    }
  };

  walk(svg);

  return { viewBox, paths };
}
