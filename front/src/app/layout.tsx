import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SessionSync } from "@/components/auth/session-sync";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "valostock.id — Marketplace Akun Game dengan Toko & Produk Terverifikasi",
  description:
    "Jual & beli akun game Valorant, Mobile Legends, dan lainnya lewat toko terverifikasi. Dana ditahan di escrow sampai kamu mengonfirmasi akunnya aman.",
  // Static file in public/images like every other site image.
  icons: { icon: "/images/favicon.ico" },
};

// Set the theme before paint to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  return (
    <html
      lang="id"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <SessionSync serverUserId={user?.id ?? null} />
        </ThemeProvider>
      </body>
    </html>
  );
}
