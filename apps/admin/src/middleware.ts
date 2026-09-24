import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard and all its subpaths
  if (pathname.startsWith('/dashboard')) {
    const accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;

    // No access token and no refresh token -> redirect to login
    if (!accessToken && !refreshToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // If access_token is missing but we have a refresh_token,
    // let's try to refresh it right here in the middleware!
    if (!accessToken && refreshToken) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        
        const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Forward the refresh_token cookie manually since this is a server-to-server call
            Cookie: `refresh_token=${refreshToken}`,
          },
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newAccessToken = data.data.accessToken;

          const response = NextResponse.next();
          // Set the new access token cookie
          response.cookies.set('access_token', newAccessToken, {
            path: '/',
            maxAge: 900, // 15 minutes
            sameSite: 'strict',
          });
          
          // Also forward the new refresh_token if the API rotated it (read from Set-Cookie header)
          const setCookieHeader = refreshResponse.headers.get('set-cookie');
          if (setCookieHeader) {
            // Very simplified: assuming one Set-Cookie for refresh_token.
            // A robust solution would parse it properly.
            const match = setCookieHeader.match(/refresh_token=([^;]+)/);
            if (match) {
               response.cookies.set('refresh_token', match[1], {
                  httpOnly: true,
                  path: '/api/v1/auth/refresh',
                  maxAge: 7 * 24 * 60 * 60,
                  sameSite: 'strict',
               });
            }
          }

          return response;
        } else {
          // Refresh failed (expired or invalid), redirect to login
          const response = NextResponse.redirect(new URL('/login', request.url));
          response.cookies.delete('access_token');
          response.cookies.delete('refresh_token');
          return response;
        }
      } catch (error) {
        // Fetch failed (network error, etc)
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  // If going to /login but already logged in, redirect to dashboard
  if (pathname === '/login' || pathname === '/') {
    const accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (accessToken || refreshToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to /dashboard/*, /login, and /
  matcher: ['/', '/login', '/dashboard/:path*'],
};
