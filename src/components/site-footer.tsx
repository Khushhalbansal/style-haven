interface Props {
  brandName?: string;
  tagline?: string | null;
}

export function SiteFooter({ brandName = "khushhal's boutique", tagline }: Props) {
  return (
    <footer className="border-t border-foreground/10 px-6 py-20">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start max-w-7xl mx-auto">
        <div className="flex flex-col gap-4">
          <span className="font-display text-xl italic lowercase">{brandName}</span>
          <p className="text-[11px] text-muted-foreground uppercase leading-relaxed tracking-wider">
            {tagline ?? "A study of enduring objects and intentional dressing."}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase opacity-40 mb-2">Connect</span>
          <a href="#" className="text-xs uppercase tracking-widest hover:text-primary transition-colors">Instagram</a>
          <a href="#" className="text-xs uppercase tracking-widest hover:text-primary transition-colors">Journal</a>
        </div>
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase opacity-40 mb-2">Customer</span>
          <a href="#" className="text-xs uppercase tracking-widest hover:text-primary transition-colors">Shipping</a>
          <a href="#" className="text-xs uppercase tracking-widest hover:text-primary transition-colors">Returns</a>
          <a href="#" className="text-xs uppercase tracking-widest hover:text-primary transition-colors">Contact</a>
        </div>
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase opacity-40 mb-2">Newsletter</span>
          <form onSubmit={(e) => e.preventDefault()} className="flex border-b border-foreground/20 pb-1">
            <input type="email" placeholder="EMAIL ADDRESS" className="bg-transparent text-[10px] tracking-widest focus:outline-none w-full placeholder:text-muted-foreground/60" />
            <button className="text-[10px] tracking-widest font-bold ml-2">JOIN</button>
          </form>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-foreground/5 flex flex-wrap justify-between gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>© {new Date().getFullYear()} {brandName}</span>
        <span>All Rights Reserved</span>
      </div>
    </footer>
  );
}
