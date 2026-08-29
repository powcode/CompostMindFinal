// components/Navbar.tsx
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const supabase = createClient();
    
    const initAuth = async () => {
      const { data } = await supabase.auth.getUser();
      setIsAuthenticated(!!data.user);
      setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sembunyikan navbar total di halaman auth
  if (pathname === '/login' || pathname === '/register') return null;
  
  // Placeholder saat loading auth untuk mencegah layout shift
  if (isLoading) return <div className="h-16 w-full bg-white border-b border-slate-200" />;

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 relative">
            
            {/* LOGO - Selalu Tampil */}
            <Link href="/" className="flex items-center gap-2 group active:opacity-70 transition-opacity">
              <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-lg">🌱</span>
              <span className="text-xl font-black tracking-tight text-slate-900">
                Compost<span className="text-emerald-600">Mind</span>
              </span>
            </Link>

            {/* DESKTOP NAVIGATION - Hanya muncul di >= 768px (md) */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink href="/" icon="📷" label="Scan Baru" isActive={pathname === '/'} />
              <NavLink href="/composting" icon="📋" label="Riwayat Sesi" isActive={pathname?.startsWith('/composting')} />
              
              {isAuthenticated && (
                <NavLink 
                  href="/tutorial" 
                  icon={<span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center border border-emerald-300">?</span>} 
                  label="Tutorial" 
                  isActive={pathname === '/tutorial'} 
                />
              )}
            </nav>

            {/* MOBILE HAMBURGER BUTTON - Hanya muncul di < 768px */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Buka menu"
              className="md:hidden relative z-50 p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 active:scale-95 cursor-pointer transition-all"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

          </div>
        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        isAuthenticated={isAuthenticated} 
      />
    </>
  );
}

// Komponen Helper untuk Link Desktop agar kode lebih bersih
function NavLink({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link 
      href={href}
      className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
        isActive 
          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20' 
          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
