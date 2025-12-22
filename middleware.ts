import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '@/app/login/actions';
 
// 1. Specify protected and public routes
const protectedRoutes = ['/'];
const publicRoutes = ['/login'];
 
export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
 
  // 2. Check if the current route is protected or public
  const isProtectedRoute = protectedRoutes.some((prefix) => path.startsWith(prefix)) && path !== '/login';
 
  // 3. Decrypt the session from the cookie
  const session = await getSession();
 
  // 4. Redirect to /login if the user is not authenticated and trying to access a protected route
  if (isProtectedRoute && !session?.user) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }
 
  // 5. Redirect to / if the user is authenticated and trying to access a public route
  if (
    publicRoutes.includes(path) &&
    session?.user
  ) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  // 6. Update session expiry on valid access
  if (session?.user) {
    return await updateSession(request);
  }
 
  return NextResponse.next();
}
 
// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
