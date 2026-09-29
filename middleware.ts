import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// หน้าแรก (/) คือประตูล็อกอิน — ทุกหน้าด้านในต้องมี session ก่อน
const PROTECTED_PREFIXES = ['/main', '/gallery', '/profile', '/setup', '/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (!needsAuth) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = new URL(request.url);
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/main/:path*', '/gallery/:path*', '/profile/:path*', '/setup/:path*', '/admin/:path*'],
};
