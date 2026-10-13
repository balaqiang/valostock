import { SiteShell } from "@/components/layout/site-shell";
import { Container } from "@/components/ui/container";

// Legal pages: Syarat & Ketentuan, Kebijakan Privasi.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <Container className="max-w-3xl py-8 sm:py-10">{children}</Container>
    </SiteShell>
  );
}
