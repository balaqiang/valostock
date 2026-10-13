import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";

/** Public page frame: fixed navbar, the page, footer. */
export function SiteShell({ children, className = "bg-background" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-full flex-1 flex-col pt-16 ${className}`}>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/** Grey title band at the top of a public page. */
export function PageBand({ title, description }: { title: string; description?: string }) {
  return (
    <section className="border-b border-border bg-surface">
      <Container className="py-10 sm:py-14">
        <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-text-secondary">{description}</p>}
      </Container>
    </section>
  );
}
