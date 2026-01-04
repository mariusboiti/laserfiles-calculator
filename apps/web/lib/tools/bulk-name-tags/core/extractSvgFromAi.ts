export function extractSvgFromAiResponse(
  raw: string
): { svg: string | null; source: 'json' | 'regex' | 'none'; debug: string[] } {
  const debug: string[] = [];
  const text = (raw ?? '').trim();
  if (!text) return { svg: null, source: 'none', debug: ['empty response'] };

  // 1) JSON path
  try {
    const obj: any = JSON.parse(text);
    debug.push('json:parse ok');
    if (obj && typeof obj.svg === 'string') {
      debug.push('json:found svg field');
      const svg = finalizeSvgCandidate(obj.svg, debug);
      return { svg, source: 'json', debug };
    }
    debug.push('json:parsed but no svg field');
  } catch {
    debug.push('json:parse failed');
  }

  // 2) Regex fallback
  const m = text.match(/<svg[\s\S]*?<\/svg>/i);
  if (m?.[0]) {
    debug.push('regex:found <svg> block');
    const svg = finalizeSvgCandidate(m[0], debug);
    return { svg, source: 'regex', debug };
  }

  // 3) If we see <svg but no closing tag, salvage by appending
  const idx = text.toLowerCase().indexOf('<svg');
  if (idx >= 0) {
    debug.push('regex:found <svg start only');
    const svg = finalizeSvgCandidate(text.slice(idx), debug);
    return { svg, source: 'regex', debug };
  }

  debug.push('no svg found');
  return { svg: null, source: 'none', debug };
}

function finalizeSvgCandidate(input: string, debug: string[]): string {
  let svg = (input ?? '').trim();

  // Unescape common JSON-escaped sequences if present (e.g. \" and \n)
  if (svg.includes('\\"') || svg.includes('\\n') || svg.includes('\\t') || svg.includes('\\/')) {
    svg = svg
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\"/g, '"')
      .replace(/\\\'/g, "'")
      .replace(/\\\//g, '/');
    debug.push('unescape:json-style');
  }

  svg = svg.trim();

  if (!/<\/svg>/i.test(svg)) {
    svg += '\n</svg>';
    debug.push('repair:append </svg>');
  }

  return svg.trim();
}
