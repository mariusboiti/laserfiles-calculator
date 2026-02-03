import {
  computeBBox,
  type BBox,
  type MatrixLike,
  type Point,
  type Polygon,
  polygonArea,
  simplifyPolygon,
  transformPolygon,
} from "./geometry";

export type PolygonPart = {
  id: string;
  polygon: Polygon;
  bbox: BBox;
  fill?: string | null;
  stroke?: string | null;
};

export type ParseSvgPolygonsResult = {
  parts: PolygonPart[];
  warning?: string;
};

const SVG_NS = "http://www.w3.org/2000/svg";

export function parseSvgPolygons(
  svgText: string,
  options?: { toleranceMm?: number }
): ParseSvgPolygonsResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("SVG parsing is only available in the browser.");
  }

  const tolerance = options?.toleranceMm ?? 0.5;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Invalid SVG file.");
  }

  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") {
    throw new Error("No <svg> root element found.");
  }

  // Offscreen SVG so we can use geometry APIs with transforms applied
  const tempSvg = document.createElementNS(SVG_NS, "svg");
  tempSvg.setAttribute("xmlns", SVG_NS);
  tempSvg.setAttribute("width", root.getAttribute("width") || "1000");
  tempSvg.setAttribute("height", root.getAttribute("height") || "1000");
  tempSvg.style.position = "absolute";
  tempSvg.style.left = "-9999px";
  tempSvg.style.top = "-9999px";
  tempSvg.style.visibility = "hidden";

  tempSvg.innerHTML = root.innerHTML;
  document.body.appendChild(tempSvg);

  const candidates = Array.from(
    tempSvg.querySelectorAll<SVGGraphicsElement>(
      "path, polygon, rect, circle, ellipse"
    )
  );

  const parts: PolygonPart[] = [];

  const ensureClosed = (points: Point[]): Polygon => {
    if (!points.length) return [];
    const first = points[0];
    const last = points[points.length - 1];
    const dx = first.x - last.x;
    const dy = first.y - last.y;
    if (Math.hypot(dx, dy) > tolerance) {
      return [...points, { ...first }];
    }
    return points.slice();
  };

  const rectToPoints = (x: number, y: number, w: number, h: number): Polygon => {
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
      { x, y },
    ];
  };

  const circleToPoints = (
    cx: number,
    cy: number,
    r: number,
    segments = 32
  ): Polygon => {
    const pts: Point[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (2 * Math.PI * i) / segments;
      pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
    }
    return ensureClosed(pts);
  };

  const ellipseToPoints = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    segments = 32
  ): Polygon => {
    const pts: Point[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (2 * Math.PI * i) / segments;
      pts.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
    }
    return ensureClosed(pts);
  };

  const matrixFromDom = (m: DOMMatrix | null): MatrixLike | null => {
    if (!m) return null;
    return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
  };

  for (let i = 0; i < candidates.length; i++) {
    const el = candidates[i];

    try {
      const tag = el.tagName.toLowerCase();
      const ctm = matrixFromDom((el as any).getCTM?.() ?? null);

      let poly: Polygon | null = null;

      if (tag === "path" || tag === "polygon") {
        const geom = el as unknown as SVGGeometryElement;
        const length = geom.getTotalLength();
        if (!isFinite(length) || length <= 0) continue;

        const segments = Math.min(200, Math.max(16, Math.round(length / Math.max(0.1, tolerance))));
        const pts: Point[] = [];
        for (let j = 0; j <= segments; j++) {
          const p = geom.getPointAtLength((length * j) / segments);
          pts.push({ x: p.x, y: p.y });
        }
        poly = ensureClosed(pts);
      } else if (tag === "rect") {
        const rect = el as SVGRectElement;
        const x = Number(rect.getAttribute("x") || 0);
        const y = Number(rect.getAttribute("y") || 0);
        const w = Number(rect.getAttribute("width") || 0);
        const h = Number(rect.getAttribute("height") || 0);
        if (w <= 0 || h <= 0) continue;
        poly = rectToPoints(x, y, w, h);
      } else if (tag === "circle") {
        const c = el as SVGCircleElement;
        const cx = Number(c.getAttribute("cx") || 0);
        const cy = Number(c.getAttribute("cy") || 0);
        const r = Number(c.getAttribute("r") || 0);
        if (r <= 0) continue;
        poly = circleToPoints(cx, cy, r);
      } else if (tag === "ellipse") {
        const e = el as SVGEllipseElement;
        const cx = Number(e.getAttribute("cx") || 0);
        const cy = Number(e.getAttribute("cy") || 0);
        const rx = Number(e.getAttribute("rx") || 0);
        const ry = Number(e.getAttribute("ry") || 0);
        if (rx <= 0 || ry <= 0) continue;
        poly = ellipseToPoints(cx, cy, rx, ry);
      }

      if (!poly || poly.length < 3) continue;

      // apply transforms
      const polyTx = transformPolygon(poly, ctm);

      // normalize orientation (optional, ensure consistent winding)
      if (polygonArea(polyTx) < 0) {
        polyTx.reverse();
      }

      const simplified = simplifyPolygon(polyTx, tolerance);
      const bboxAbs = computeBBox(simplified);
      if (bboxAbs.width <= 0 || bboxAbs.height <= 0) continue;

      // normalize to local coordinates with (0,0) at bbox top-left
      const normalized: Polygon = simplified.map((p) => ({
        x: p.x - bboxAbs.x,
        y: p.y - bboxAbs.y,
      }));

      const bbox: BBox = {
        x: 0,
        y: 0,
        width: bboxAbs.width,
        height: bboxAbs.height,
      };

      const part: PolygonPart = {
        id: `poly-${i}`,
        polygon: normalized,
        bbox,
        fill: (el as any).getAttribute?.("fill"),
        stroke: (el as any).getAttribute?.("stroke"),
      };

      parts.push(part);
    } catch {
      // ignore elements that fail geometry ops
    }
  }

  document.body.removeChild(tempSvg);

  if (!parts.length) {
    return {
      parts: [],
      warning: "No closed shapes with measurable polygon outlines were found in the SVG.",
    };
  }

  return { parts };
}
