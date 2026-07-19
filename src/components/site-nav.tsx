import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteNav({ brandName = "khushhal's boutique" }: { brandName?: string }) {
  const { count } = useCart();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-foreground/5 bg-background/80 backdrop-blur-md">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-6 py-4 gap-4">
        <div className="flex gap-6 md:gap-8 text-[11px] uppercase tracking-[0.2em] font-medium min-w-0">
          <Link to="/" className="hover:text-primary transition-colors">Shop</Link>
          <a href="/#collections" className="hover:text-primary transition-colors hidden sm:inline">Collections</a>
        </div>
        <Link to="/" className="font-display text-lg md:text-2xl lowercase tracking-tighter whitespace-nowrap italic">
          {brandName}
        </Link>
        <div className="flex gap-6 md:gap-8 text-[11px] uppercase tracking-[0.2em] font-medium justify-end min-w-0">
          {authed ? (
            <Link to="/account" className="hover:text-primary transition-colors hidden sm:inline">Account</Link>
          ) : (
            <Link to="/auth" className="hover:text-primary transition-colors hidden sm:inline">Sign in</Link>
          )}
          <Link to="/cart" className="hover:text-primary transition-colors">
            Cart ({count})
          </Link>
        </div>

      </div>
    </nav>
  );
}
