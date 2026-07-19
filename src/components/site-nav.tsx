import { Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getSiteSnapshot } from "@/lib/site.functions";

export function SiteNav({ brandName = "khushhal's boutique" }: { brandName?: string }) {
  const { count } = useCart();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
    staleTime: 60_000,
  });
  const categories = (data?.categories ?? []).filter((c) => c.is_visible);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: s }) => {
      setAuthed(!!s.session);
      if (s.session?.user) {
        supabase.rpc("is_admin", { _user_id: s.session.user.id }).then(({ data: check }) => {
          setIsAdmin(!!check);
        });
      } else {
        setIsAdmin(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      if (s?.user) {
        supabase.rpc("is_admin", { _user_id: s.user.id }).then(({ data: check }) => {
          setIsAdmin(!!check);
        });
      } else {
        setIsAdmin(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMobileOpen(false);
    navigate({ to: "/" });
  }

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-foreground/5 bg-background/90 backdrop-blur-md">
        <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 sm:px-6 py-4 gap-3 sm:gap-4 max-w-screen-2xl mx-auto">
          {/* Left — hamburger on mobile, nav links on desktop */}
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="sm:hidden flex flex-col gap-[5px] w-11 h-11 items-center justify-center -ml-2 focus:outline-none"
            >
              <span className="block w-5 h-px bg-foreground transition-all" />
              <span className="block w-5 h-px bg-foreground transition-all" />
              <span className="block w-3 h-px bg-foreground transition-all" />
            </button>

            {/* Desktop nav links */}
            <div className="hidden sm:flex gap-6 md:gap-8 text-[11px] uppercase tracking-[0.2em] font-medium">
              <Link to="/" className="hover:text-primary transition-colors">
                Shop
              </Link>
              <Link
                to="/"
                hash="collections"
                className="hover:text-primary transition-colors hidden md:inline"
              >
                Collections
              </Link>
            </div>
          </div>

          {/* Center — brand name */}
          <Link
            to="/"
            className="font-display text-base sm:text-lg md:text-2xl lowercase tracking-tighter whitespace-nowrap italic justify-self-center"
          >
            {brandName}
          </Link>

          {/* Right — account + cart */}
          <div className="flex gap-3 sm:gap-6 md:gap-8 text-[11px] uppercase tracking-[0.2em] font-medium justify-end min-w-0 items-center">
            {isAdmin ? (
              <Link
                to="/admin"
                className="hover:text-primary transition-colors hidden sm:flex min-h-[44px] items-center border border-foreground/10 px-2 py-0.5 text-[9px] tracking-widest font-mono"
              >
                Admin Controls
              </Link>
            ) : null}
            <Link
              to="/auth"
              className="hover:text-primary transition-colors hidden sm:flex min-h-[44px] items-center"
            >
              {authed ? "Account" : "Sign in"}
            </Link>
            {authed ? (
              <Link
                to="/account/orders"
                className="hover:text-primary transition-colors hidden sm:flex min-h-[44px] items-center"
              >
                Orders
              </Link>
            ) : null}
            <Link
              to="/search"
              className="hover:text-primary transition-colors flex items-center min-h-[44px]"
            >
              Search
            </Link>
            <Link
              to="/cart"
              className="hover:text-primary transition-colors flex items-center min-h-[44px]"
            >
              Cart{count > 0 ? ` (${count})` : ""}
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-[85vw] max-w-xs bg-background flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-foreground/10">
              <span className="font-display text-lg italic lowercase">{brandName}</span>
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="w-11 h-11 flex items-center justify-center -mr-2 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto px-5 py-6 space-y-1">
              <MobileNavLink to="/" onClick={() => setMobileOpen(false)}>
                Shop
              </MobileNavLink>
              <MobileNavLink to="/search" onClick={() => setMobileOpen(false)}>
                Search
              </MobileNavLink>

              {categories.length > 0 ? (
                <>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground pt-6 pb-2">
                    Collections
                  </p>
                  {categories.map((cat) => (
                    <MobileNavLink
                      key={cat.id}
                      to="/category/$slug"
                      params={{ slug: cat.slug }}
                      onClick={() => setMobileOpen(false)}
                    >
                      {cat.name}
                    </MobileNavLink>
                  ))}
                </>
              ) : null}

              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground pt-6 pb-2">
                Account
              </p>
              {authed ? (
                <>
                  <MobileNavLink to="/account/orders" onClick={() => setMobileOpen(false)}>
                    My Orders
                  </MobileNavLink>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left text-sm font-medium uppercase tracking-wider py-3 min-h-[48px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <MobileNavLink to="/auth" onClick={() => setMobileOpen(false)}>
                  Sign in / Create account
                </MobileNavLink>
              )}
            </nav>

            {/* Cart CTA at bottom */}
            <div className="px-5 py-5 border-t border-foreground/10">
              <Link
                to="/cart"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between w-full h-12 px-5 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-colors"
              >
                <span>Cart</span>
                {count > 0 ? <span className="font-mono">({count})</span> : null}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MobileNavLink({
  to,
  params,
  children,
  onClick,
}: {
  to: string;
  params?: Record<string, string>;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      onClick={onClick}
      className="block text-sm font-medium uppercase tracking-wider py-3 min-h-[48px] hover:text-primary transition-colors border-b border-foreground/5"
    >
      {children}
    </Link>
  );
}
