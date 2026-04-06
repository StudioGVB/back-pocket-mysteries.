import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Placeholder for auth check
  // In a real app, you would check for a session cookie or JWT here
  const isAuthenticated = true; // Simulating authenticated state for Phase 1

  // Protected routes for the builder
  if (pathname.startsWith('/builder')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Protected routes for the service (customer account)
  if (pathname.startsWith('/account')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // If authenticated and trying to access auth pages, redirect to dashboard or portal
  if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
    // For now, let's just stay on the login/signup pages or optionally redirect
    // return NextResponse.redirect(new URL('/mysteries', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/builder/:path*',
    '/account/:path*',
    '/login',
    '/signup',
  ],
};
