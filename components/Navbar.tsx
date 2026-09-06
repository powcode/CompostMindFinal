// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const initAuth = async () => {
      const { data } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(data.user));
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  if (pathname === '/login' || pathname === '/register') return null;

  const isCompostingStep = /^\/composting\/[^/]+\/step\/[^/]+$/.test(pathname ?? '');
  const handleBack = () => {
    if (isCompostingStep) {
      router.push('/composting');
      return;
    }

    router.back();
  };

  const navLinks = [
    { href: '/', icon: '📷', label: 'Scan Baru', isActive: pathname === '/' },
    {
      href: '/composting',
      icon: '📋',
      label: 'Riwayat Sesi',
      isActive: pathname?.startsWith('/composting') ?? false,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            {pathname !== '/' && (
              <button
                type="button"
                aria-label="Kembali ke halaman sebelumnya"
                onClick={handleBack}
                className="interactive-button inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-semibold leading-none text-slate-700 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
            )}

            <Link href="/" className="interactive-button flex items-center gap-2 active:opacity-70">
              <span className="rounded-xl bg-emerald-100 p-1.5 text-lg text-emerald-700">🌱</span>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Compost<span className="text-emerald-600">Mind</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  isActive={link.isActive}
                />
              ))}

              {isAuthenticated && (
                <NavLink
                  href="/tutorial"
                  icon={
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 text-[10px] font-bold text-emerald-800">
                      ?
                    </span>
                  }
                  label="Tutorial"
                  isActive={pathname === '/tutorial'}
                />
              )}
            </nav>

            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              className="interactive-button inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm hover:border-emerald-200 hover:text-emerald-700 md:hidden"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              <span className="sr-only"></span>
              <img
                src="/assets/hamburger.png"
                alt="Menu"
                className={`h-full w-full object-contain ${isMobileMenuOpen ? 'scale-110' : ''}`}
                style={{ transition: 'transform 0.2s ease' }}
              />
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="border-t border-slate-200 bg-white py-3 md:hidden">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  isActive={link.isActive}
                  mobile
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              ))}

              {isAuthenticated && (
                <NavLink
                  href="/tutorial"
                  icon={
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 text-[10px] font-bold text-emerald-800">
                      ?
                    </span>
                  }
                  label="Tutorial"
                  isActive={pathname === '/tutorial'}
                  mobile
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon,
  label,
  isActive,
  mobile = false,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  isActive: boolean;
  mobile?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`interactive-button flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
        isActive
          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
      } ${mobile ? 'w-full justify-start' : ''}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
