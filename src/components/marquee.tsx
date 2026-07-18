export function Marquee({ items }: { items: string[] }) {
  const seq = items.length ? items : ["New Arrivals", "Curated Selection", "Limited Drop"];
  const loop = [...seq, ...seq];
  return (
    <div className="w-full border-y border-foreground/5 py-4 overflow-hidden bg-foreground text-background">
      <div className="animate-marquee whitespace-nowrap flex gap-12 items-center">
        {loop.map((item, i) => (
          <span key={i} className="flex items-center gap-12">
            <span className="font-display italic text-2xl">{item}</span>
            <span className="font-mono text-xs opacity-50">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}
