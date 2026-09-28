import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";

// Legal pages (docs/ARCHITECTURE.md `(legal)` group): terms, privacy, refund.
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />
      <main className="flex-1">
        <Container className="max-w-3xl py-8 sm:py-10">{children}</Container>
      </main>
      <Footer />
    </div>
  );
}
