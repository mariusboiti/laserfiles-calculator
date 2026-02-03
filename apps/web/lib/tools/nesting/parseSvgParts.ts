export type ParsedPart = {
  id: string;
  bbox: { x: number; y: number; width: number; height: number };
};

export type ParseSvgResult = {
  parts: ParsedPart[];
  warning?: string;
};

const SVG_NS = "http://www.w3.org/2000/svg";

export function parseSvgParts(svgText: string): ParseSvgResult {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("SVG parsing is only available in the browser.");
  }

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

  // Create an offscreen SVG so we can use getBBox with transforms applied
  const tempSvg = document.createElementNS(SVG_NS, "svg");
  tempSvg.setAttribute("xmlns", SVG_NS);
  tempSvg.setAttribute("width", root.getAttribute("width") || "1000");
  tempSvg.setAttribute("height", root.getAttribute("height") || "1000");
  tempSvg.style.position = "absolute";
  tempSvg.style.left = "-9999px";
  tempSvg.style.top = "-9999px";
  tempSvg.style.visibility = "hidden";

  // Copy inner content
  tempSvg.innerHTML = root.innerHTML;
  document.body.appendChild(tempSvg);

  const candidates = Array.from(
    tempSvg.querySelectorAll<SVGGraphicsElement>("path, rect, circle, ellipse, polygon")
  );

  const parts: ParsedPart[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const el = candidates[i];
    try {
      const bbox = el.getBBox();
      if (!isFinite(bbox.width) || !isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) {
        continue;
      }
      parts.push({
        id: `part-${i}`,
        bbox: {
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
        },
      });
    } catch {
      // ignore elements that can't produce a bbox
    }
  }

  document.body.removeChild(tempSvg);

  if (!parts.length) {
    return {
      parts: [],
      warning: "No closed shapes with measurable bounds were found in the SVG.",
    };
  }

  return { parts };
}
