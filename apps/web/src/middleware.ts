import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/orders') || pathname.startsWith('/proposals') || pathname.startsWith('/restaurants') || pathname.startsWith('/agents') || pathname.startsWith('/statistics') || pathname.startsWith('/settings');
  const isRestoPath = pathname.startsWith('/resto');
  const isAgentPath = pathname.startsWith('/agent-portal');

  if (isAdminPath || isRestoPath || isAgentPath) {
    // Vérification pragmatique de la présence d'un cookie de session Supabase
    const cookies = request.cookies.getAll();
    const hasSession = cookies.some(c => c.name.includes('sb-') && c.name.includes('-auth-token'));
    
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
