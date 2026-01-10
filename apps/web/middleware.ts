import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  if (url.pathname === '/auth/wp/callback/callback') {
    url.pathname = '/auth/wp/callback';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/wp/:path*'],
};
