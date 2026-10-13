import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SessionSync } from "@/components/auth/session-sync";
import { ApiStatusBanner } from "@/components/system/api-status-banner";
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
  title: "valostock.id | Top-Up Game Valorant, Mobile Legends, Genshin Impact, Free Fire",
  description:
    "Top-up VP, Diamond, dan Genesis Crystal. Bayar lewat QRIS, Virtual Account, e-wallet, retail, kartu kredit, atau Balance, lalu lacak status dengan nomor invoice.",
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
          <ApiStatusBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
