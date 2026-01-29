import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return raw.replace(/\/$/, '');
}

function shouldHaveBody(method: string): boolean {
  const m = method.toUpperCase();
  return m !== 'GET' && m !== 'HEAD';
}

function copyUpstreamHeaders(upstream: Headers, res: NextResponse) {
  upstream.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'transfer-encoding' || k === 'content-encoding' || k === 'connection') return;
    res.headers.set(key, value);
  });
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const apiBase = getApiBase();
  const path = Array.isArray(params.path) ? params.path.join('/') : '';
  const upstreamUrl = `${apiBase}/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'host' || k === 'connection' || k === 'content-length') return;
    headers.set(key, value);
  });

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  };

  if (shouldHaveBody(req.method)) {
    const body = await req.arrayBuffer();
    init.body = body.byteLength ? body : undefined;
  }

  const upstreamRes = await fetch(upstreamUrl, init);

  const res = new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
  });

  copyUpstreamHeaders(upstreamRes.headers, res);

  return res;
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}

export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}

export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}

export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}

export async function OPTIONS(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
