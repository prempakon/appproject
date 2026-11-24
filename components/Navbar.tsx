'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type NavRole = 'student' | 'admin' | null;

const CORE_LINKS = [
  { href: '/', label: 'หน้าแรก' },
  { href: '/main', label: 'วิเคราะห์พอร์ต' },
  { href: '/jobs', label: 'จับคู่งาน' },
  { href: '/resume', label: 'เรซูเม่' },
  { href: '/analytics', label: 'วิเคราะห์อาชีพ' },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function readLocalDisplayName() {
  try {
    const saved = window.localStorage.getItem('userProfile');
    if (!saved) return '';
    const parsed = JSON.parse(saved) as { name?: unknown };
    return typeof parsed.name === 'string' ? parsed.name.trim() : '';
  } catch {
    return '';
  }
}

function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.333 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z"
      />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<NavRole>(null);
  const [displayName, setDisplayName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    const timer = window.setTimeout(() => setMenuOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { getSessionUser } = await import('../lib/auth');
        const user = await getSessionUser();
        if (cancelled) return;

        if (!user) {
          setAuthenticated(false);
          setRole(null);
          setDisplayName('');
          return;
        }

        setAuthenticated(true);
        let name = readLocalDisplayName();

        try {
          const { getMyProfile } = await import('../lib/profiles');
          const profile = await getMyProfile(user.id);
          if (profile) {
            if (profile.name?.trim()) name = profile.name.trim();
            if (!cancelled) {
              setRole(profile.role === 'admin' ? 'admin' : 'student');
            }
          } else if (!cancelled) {
            setRole('student');
          }
        } catch {
          if (!cancelled) {
            const fallback = window.localStorage.getItem('userRole');
            setRole(fallback === 'admin' ? 'admin' : 'student');
          }
        }

        if (!cancelled) {
          setDisplayName(name || user.email?.split('@')[0] || '');
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
          setRole(null);
          setDisplayName('');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const isAdmin = role === 'admin';
  const profileActive = isActivePath(pathname, '/profile');
  const adminActive = isActivePath(pathname, '/admin');
  const profileLabel = displayName || 'โปรไฟล์';

  const handleSignOut = async () => {
    try {
      const { signOutReal } = await import('../lib/auth');
      await signOutReal();
    } catch {
      // Fall back to clearing the local session markers below.
    }
    window.localStorage.removeItem('userRole');
    window.localStorage.removeItem('userEmail');
    window.localStorage.removeItem('userProfile');
    setAuthenticated(false);
    setRole(null);
    setDisplayName('');
    setMenuOpen(false);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
            </svg>
          </span>
          <span className="text-lg font-black tracking-tight text-slate-900">
            LRU <span className="text-blue-600">Portfolio</span>
          </span>
        </Link>

        {/* Center: five clean top-level links (desktop only; mobile uses the drawer) */}
        <nav className="hidden items-center gap-1.5 md:flex" aria-label="เมนูหลัก">
          {CORE_LINKS.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center rounded-full px-3.5 py-2 text-xs font-extrabold transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: auth actions */}
        <div className="flex items-center gap-2">
          {!authenticated ? (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/setup"
                className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95"
              >
                สมัครฟรี
              </Link>
            </>
          ) : (
            <>
              {/* Profile pill — desktop */}
              <Link
                href="/profile"
                aria-current={profileActive ? 'page' : undefined}
                title={profileLabel}
                className={`hidden max-w-[12rem] items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-extrabold transition-colors sm:flex ${
                  profileActive
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                <UserIcon />
                <span className="truncate">{profileLabel}</span>
              </Link>

              {/* Admin link — only for admins, and only on the right side */}
              {isAdmin && (
                <Link
                  href="/admin"
                  aria-current={adminActive ? 'page' : undefined}
                  className={`hidden items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-extrabold transition-colors sm:flex ${
                    adminActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ShieldIcon />
                  แอดมิน
                </Link>
              )}

              {/* Sign out — desktop */}
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden rounded-full border border-red-200 bg-white px-3.5 py-2 text-xs font-extrabold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 sm:inline-flex"
              >
                ออกจากระบบ
              </button>
            </>
          )}

          {/* Mobile drawer trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'ปิดเมนูนำทาง' : 'เปิดเมนูนำทาง'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            className="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-600 md:hidden"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <div id="mobile-nav-drawer" className="border-t border-slate-200/80 bg-white md:hidden">
          <nav className="mx-auto max-w-7xl px-4 py-3" aria-label="เมนูมือถือ">
            <ul className="flex flex-col gap-1">
              {CORE_LINKS.map((link) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`block rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-blue-700'
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}

              {authenticated ? (
                <>
                  <li className="mt-1 border-t border-slate-200/80 pt-2">
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      aria-current={profileActive ? 'page' : undefined}
                      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                        profileActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-blue-700'
                      }`}
                    >
                      <UserIcon />
                      <span className="truncate">{profileLabel}</span>
                    </Link>
                  </li>

                  {isAdmin && (
                    <li>
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        aria-current={adminActive ? 'page' : undefined}
                        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                          adminActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <ShieldIcon />
                        แอดมิน
                      </Link>
                    </li>
                  )}

                  <li className="pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-left text-sm font-extrabold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                    >
                      ออกจากระบบ
                    </button>
                  </li>
                </>
              ) : (
                <li className="mt-1 flex flex-col gap-2 border-t border-slate-200/80 pt-3">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-extrabold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/setup"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-2xl bg-blue-600 px-4 py-2.5 text-center text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
                  >
                    สมัครฟรี
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
