export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow inline-flex items-center gap-2 text-text-secondary">
      <span className="h-1 w-1 rounded-full bg-primary" aria-hidden />
      {children}
    </span>
  );
}
