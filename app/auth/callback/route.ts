import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { resolveRole } from '../../../lib/database.types';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/main';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // สร้างโปรไฟล์ครั้งแรก (Google ไม่มีขั้นตอนสมัคร) + แบ่งสิทธิ์ตามโดเมน
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const role = resolveRole(user.email);
        // สร้างเฉพาะครั้งแรก (ignoreDuplicates) ไม่ทับชื่อที่ผู้ใช้แก้ไว้
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            email: user.email.toLowerCase(),
            name: user.user_metadata?.full_name || user.email.split('@')[0] || 'ผู้ใช้ Google',
            avatar_url: user.user_metadata?.avatar_url ?? null,
            role,
          },
          { onConflict: 'id', ignoreDuplicates: true },
        );
        const { data: profile } = await supabase
          .from('profiles')
          .select('role,created_at,major')
          .eq('id', user.id)
          .single();
        const dbRole = (profile as { role?: string } | null)?.role ?? role;
        if (dbRole === 'admin') {
          return NextResponse.redirect(`${origin}/admin`);
        }
        // ผู้ใช้ครั้งแรก (สมัครผ่าน Google เมื่อกี้นี้) ส่งไปหน้าสมัครพร้อมผูกอีเมล
        const createdAt = (profile as { created_at?: string } | null)?.created_at;
        const major = (profile as { major?: string } | null)?.major;
        const isFresh =
          !!createdAt && Date.now() - new Date(createdAt).getTime() < 120_000 && (!major || major === '-');
        if (isFresh) {
          return NextResponse.redirect(
            `${origin}/setup?email=${encodeURIComponent(user.email)}&oauth=1`,
          );
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=oauth`);
}
