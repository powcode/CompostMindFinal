'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
}

export default function MobileMenu({ isOpen, onClose, isAuthenticated }: MobileMenuProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent background scrolling on both html and body when mobile menu is open
  useEffect(() => {
    if (!isMounted) return;

    if (isOpen) {
      document.documentElement.classList.add('overflow-hidden');
      document.body.classList.add('overflow-hidden');
    } else {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen, isMounted]);

  // Close menu when route changes
  useEffect(() => {
    onClose();
  }, [pathname]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* BACKDROP OVERLAY */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      {/* PANEL SLIDE-IN */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-y-0 right-0 w-full max-w-[85%] sm:max-w-xs bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center h-16 px-5 border-b border-slate-100">
          <Link 
            href="/" 
            onClick={onClose}
            className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2"
          >
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-base">
              🌱
            </span>
            <span>
              Compost<span className="text-emerald-600 font-extrabold">Mind</span>
            </span>
          </Link>

          {/* CLOSE BUTTON */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 cursor-pointer transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* LIST ITEMS */}
        <div className="flex-1 overflow-y-auto py-3 px-4 space-y-1">
          <Link
            href="/"
            onClick={onClose}
            className={`flex items-center gap-3.5 py-3.5 px-4 rounded-xl text-sm font-semibold min-h-[52px] transition-colors border-b border-slate-100/70 ${
              pathname === '/'
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-lg w-6 h-6 flex items-center justify-center shrink-0">📷</span>
            <span>Scan Baru</span>
          </Link>

          <Link
            href="/composting"
            onClick={onClose}
            className={`flex items-center gap-3.5 py-3.5 px-4 rounded-xl text-sm font-semibold min-h-[52px] transition-colors border-b border-slate-100/70 ${
              pathname?.startsWith('/composting')
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-lg w-6 h-6 flex items-center justify-center shrink-0">📋</span>
            <span>Riwayat Sesi</span>
          </Link>

          {isAuthenticated ? (
            <Link
              href="/tutorial"
              onClick={onClose}
              className={`flex items-center gap-3.5 py-3.5 px-4 rounded-xl text-sm font-semibold min-h-[52px] transition-colors ${
                pathname === '/tutorial'
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0 border border-emerald-300">
                ?
              </span>
              <span>Tutorial</span>
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className={`flex items-center gap-3.5 py-3.5 px-4 rounded-xl text-sm font-semibold min-h-[52px] transition-colors ${
                pathname === '/login'
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-lg w-6 h-6 flex items-center justify-center shrink-0">🔑</span>
              <span>Masuk / Daftar</span>
            </Link>
          )}
        </div>

        {/* BOTTOM CONTAINER */}
        <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/60 safe-bottom mt-auto">
          <Link
            href={isAuthenticated ? '/composting' : '/login'}
            onClick={onClose}
            className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-center transition-all"
          >
            <span>Mulai Composting</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
