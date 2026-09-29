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
        // ยังไม่สร้างแถวโปรไฟล์ตรงนี้ — ให้ไปสร้างตอนกดบันทึกใน setup เท่านั้น
        const role = resolveRole(user.email);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role,created_at,major')
          .eq('id', user.id)
          .single();
        const dbRole = (profile as { role?: string } | null)?.role ?? role;
        if (dbRole === 'admin') {
          return NextResponse.redirect(`${origin}/admin`);
        }
        // ผู้ใช้ที่ยังกรอกข้อมูลไม่ครบ (ไม่มีสาขา) ส่งไปหน้าสมัครผูกเมล ไม่ว่าจะสมัครเมื่อไหร่
        const major = (profile as { major?: string } | null)?.major;
        const isFresh = !major || major === '-';
        if (isFresh) {
          return NextResponse.redirect(
            `${origin}/setup?email=${encodeURIComponent(user.email)}&oauth=1`,
          );
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // หมายเหตุ: ห้ามใช้ query key ชื่อ error/error_description/error_code
  // เพราะ supabase-js จะเข้าใจว่าเป็น OAuth ล้มเหลวแล้วทิ้ง access_token ใน URL
  return NextResponse.redirect(`${origin}/?oauth=failed`);
}
