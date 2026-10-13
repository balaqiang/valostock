import { SiteShell } from "@/components/layout/site-shell";
import { Container } from "@/components/ui/container";

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <Container className="max-w-xl py-12 sm:py-16">{children}</Container>
    </SiteShell>
  );
}
