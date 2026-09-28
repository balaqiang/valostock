import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800/80 text-zinc-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12">
          
          {/* Brand & About (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold shadow-sm shadow-white/10 ring-1 ring-white/30 shrink-0">
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
              <span className="font-bold text-xl tracking-tight text-white">
                Balqis Store
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                Tentang Balqis Store
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
                Balqis Store adalah platform penyedia layanan top-up game online yang cepat, aman, dan terpercaya. Kami berkomitmen memberikan pengalaman transaksi otomatis dengan integrasi langsung ke payment gateway resmi dan sistem pencatatan data yang transparan.
              </p>
            </div>
          </div>

          {/* Supported & Upcoming Games (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              Daftar Game
            </h3>

            <div className="space-y-3">
              {/* Currently Available: MLBB */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs">
                    ML
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Mobile Legends: Bang Bang</div>
                    <div className="text-xs text-zinc-400 font-mono">MLBB Diamond Top Up</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  Tersedia
                </span>
              </div>

              {/* Upcoming: Roblox (RBLX) */}
              <div className="p-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800/60 flex items-center justify-between opacity-80">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/80 text-zinc-400 flex items-center justify-center font-bold text-xs">
                    RB
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-300">Roblox</div>
                    <div className="text-xs text-zinc-500 font-mono">RBLX Robux Top Up</div>
                  </div>
                </div>
                <span className="text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-1 rounded-full">
                  Mendatang
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Minimal Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div>
            &copy; {new Date().getFullYear()} <span className="text-zinc-300 font-medium">Balqis Store</span>. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <Link href="/#" className="hover:text-white transition-colors">
              Top Up
            </Link>
            <span>•</span>
            <Link href="/cek-transaksi" className="hover:text-white transition-colors">
              Cek Transaksi
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
