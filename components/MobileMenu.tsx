'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

export default function MobileMenu({ isOpen, onClose, isAuthenticated }: MobileMenuProps) {
  const pathname = usePathname();

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  // Close menu when route changes
  useEffect(() => {
    onClose();
  }, [pathname]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* HEADER */}
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 border-b border-emerald-100">
        <Link 
          href="/" 
          onClick={onClose}
          className="text-xl font-black tracking-tight text-emerald-900 flex items-center gap-2.5"
        >
          <span className="p-2 bg-emerald-100 text-emerald-700 rounded-2xl text-lg">
            🌱
          </span>
          <span>
            Compost<span className="text-emerald-600 font-extrabold">Mind</span>
          </span>
        </Link>

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          aria-label="Tutup menu"
          className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* LINKS */}
      <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
        <Link
          href="/"
          onClick={onClose}
          className={`flex items-center gap-3 py-4 px-6 rounded-2xl text-base font-bold transition-all ${
            pathname === '/'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <span className="text-xl">📷</span>
          <span>Scan Baru</span>
        </Link>

        <Link
          href="/composting"
          onClick={onClose}
          className={`flex items-center gap-3 py-4 px-6 rounded-2xl text-base font-bold transition-all ${
            pathname?.startsWith('/composting')
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
          }`}
        >
          <span className="text-xl">📋</span>
          <span>Riwayat Sesi</span>
        </Link>

        {isAuthenticated ? (
          <Link
            href="/tutorial"
            onClick={onClose}
            className={`flex items-center gap-3 py-4 px-6 rounded-2xl text-base font-bold transition-all ${
              pathname === '/tutorial'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center border border-emerald-300">
              ?
            </span>
            <span>Tutorial</span>
          </Link>
        ) : (
          <Link
            href="/login"
            onClick={onClose}
            className={`flex items-center gap-3 py-4 px-6 rounded-2xl text-base font-bold transition-all ${
              pathname === '/login'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <span className="text-xl">🔑</span>
            <span>Masuk / Daftar</span>
          </Link>
        )}
      </div>

      {/* BOTTOM CTA */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 safe-bottom">
        <Link
          href={isAuthenticated ? '/composting' : '/login'}
          onClick={onClose}
          className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-center transition-all"
        >
          <span>Mulai Composting</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
