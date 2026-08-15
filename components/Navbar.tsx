'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
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

          {/* Navigation Links */}
          <div className="flex items-center space-x-1 sm:space-x-2">
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
          </div>

        </div>
      </div>
    </header>
  );
}
