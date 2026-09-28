'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        
        {/* Store Brand / Icon */}
        <Link 
          href="/#" 
          className="flex items-center gap-3 text-white hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold shadow-sm shadow-white/10 ring-1 ring-white/30">
            <svg 
              className="w-4 h-4" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-100">
            Balqis Store
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/#"
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              pathname === '/' 
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <svg 
              className="w-4 h-4" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            Top Up
          </Link>

          <Link
            href="/cek-transaksi"
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              pathname === '/cek-transaksi' 
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <svg 
              className="w-4 h-4" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Cek Transaksi
          </Link>
        </nav>

      </div>
    </header>
  );
}
