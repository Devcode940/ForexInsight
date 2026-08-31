import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS configuration — restrict to known origins in production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];

const isProd = process.env.NODE_ENV === 'production';

function isAllowedOrigin(origin: string): boolean {
  if (!isProd) return true; // Allow all in dev for convenience
  if (ALLOWED_ORIGINS.length === 0) return false; // Default deny in prod if not configured
  return ALLOWED_ORIGINS.includes(origin);
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';

  // Handle CORS preflight for API routes
  if (request.method === 'OPTIONS' && request.nextUrl.pathname.startsWith('/api/')) {
    if (!isProd || isAllowedOrigin(origin)) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': isProd ? origin : '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
    return new NextResponse(null, { status: 403 });
  }

  // Add CORS headers to actual API responses
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    if (!isProd || isAllowedOrigin(origin)) {
      response.headers.set(
        'Access-Control-Allow-Origin',
        isProd ? origin : '*'
      );
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
  }

  return NextResponse.next();
}

// Only run middleware on API routes — skip everything else for performance
export const config = {
  matcher: ['/api/:path*'],
};
