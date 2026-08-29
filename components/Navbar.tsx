'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import MobileMenu from './MobileMenu';

export default function Navbar() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createClient();

    // Check current auth status
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Hide Navbar on authentication pages (/login & /register)
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-emerald-100/60 shadow-xs transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo / Home Link */}
            <div className="flex-shrink-0 flex items-center">
              <Link 
                href="/" 
                className="text-xl sm:text-2xl font-black tracking-tight text-emerald-900 flex items-center gap-2.5 group"
              >
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-2xl group-hover:scale-105 group-hover:rotate-6 transition-transform text-lg sm:text-xl">
                  🌱
                </span>
                <span>
                  Compost<span className="text-emerald-600 font-extrabold">Mind</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1 sm:space-x-2">
              <Link 
                href="/" 
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  pathname === '/' 
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' 
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                <span>📷</span>
                <span>Scan Baru</span>
              </Link>
              
              <Link 
                href="/composting" 
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  pathname?.startsWith('/composting') 
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' 
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                <span>📋</span>
                <span>Riwayat Sesi</span>
              </Link>

              {isAuthenticated && (
                <Link 
                  href="/tutorial" 
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    pathname === '/tutorial' 
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' 
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center border border-emerald-300">
                    ?
                  </span>
                  <span>Tutorial</span>
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="md:hidden w-12 h-12 flex items-center justify-center rounded-2xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 active:bg-emerald-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
