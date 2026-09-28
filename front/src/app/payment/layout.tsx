import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/ui/container";

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background pt-16">
      <Navbar variant="solid" />
      <main className="flex-1">
        <Container className="max-w-xl py-12 sm:py-16">{children}</Container>
      </main>
      <Footer />
    </div>
  );
}
