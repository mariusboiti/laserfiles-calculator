
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

function usage() {
  console.log('Usage: pnpm -C apps/web map:stack <chunkUrl> <line> <column>');
  console.log(
    'Example: pnpm -C apps/web map:stack https://studio.laserfilespro.com/_next/static/chunks/3693-1a262b94858f5ec2.js 2 31809'
  );
  console.log(
    'Multiple: pnpm -C apps/web map:stack <url1> <line1> <col1> <url2> <line2> <col2> ...'
  );
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

function toInt(value, label) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return n;
}

function mapUrlToMapUrl(chunkUrl) {
  return `${chunkUrl}.map`;
}

async function mapOne(chunkUrl, line, column) {
  const mapUrl = mapUrlToMapUrl(chunkUrl);
  const map = await fetchJson(mapUrl);
  const tracer = new TraceMap(map);

  const pos = originalPositionFor(tracer, { line, column });

  return {
    chunkUrl,
    mapUrl,
    input: { line, column },
    output: pos,
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3 || args.length % 3 !== 0) {
    usage();
    process.exit(1);
  }

  const triples = [];
  for (let i = 0; i < args.length; i += 3) {
    const chunkUrl = args[i];
    const line = toInt(args[i + 1], 'line');
    const column = toInt(args[i + 2], 'column');
    triples.push({ chunkUrl, line, column });
  }

  try {
    const results = [];
    for (const t of triples) {
      results.push(await mapOne(t.chunkUrl, t.line, t.column));
    }

    for (const r of results) {
      const { source, line, column, name } = r.output || {};
      console.log('---');
      console.log(`Chunk: ${r.chunkUrl}`);
      console.log(`Map:   ${r.mapUrl}`);
      console.log(`At:    ${r.input.line}:${r.input.column}`);
      console.log(`Src:   ${source ?? '(null)'}`);
      console.log(`Line:  ${line ?? '(null)'}`);
      console.log(`Col:   ${column ?? '(null)'}`);
      console.log(`Name:  ${name ?? '(null)'}`);
    }
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
}

await main();
