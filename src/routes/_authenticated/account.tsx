import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatMoney } from "@/lib/format";
import { getSiteSnapshot } from "@/lib/site.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "My account — khushhal's boutique" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { data: site } = useQuery({ queryKey: ["site-snapshot"], queryFn: () => getSiteSnapshot() });
  const brandName = site?.settings?.brand_name ?? "khushhal's boutique";

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <p className="eyebrow">Account</p>
            <h1 className="font-display text-4xl md:text-5xl italic mt-2">My orders</h1>
            {user ? <p className="mt-3 text-xs text-muted-foreground">{user.email}</p> : null}
          </div>
          <button onClick={signOut} className="text-[11px] uppercase tracking-widest border-b border-foreground pb-0.5">
            Sign out
          </button>
        </div>

        <div className="mt-12 space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !orders || orders.length === 0 ? (
            <div className="border border-foreground/10 p-10 text-center">
              <p className="text-sm text-muted-foreground">No orders yet.</p>
              <Link to="/" className="mt-6 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest">
                Start shopping
              </Link>
            </div>
          ) : (
            orders.map((o) => (
              <Link key={o.id} to="/order/$id" params={{ id: o.id }}
                className="block border border-foreground/10 p-5 hover:border-foreground/40 transition-colors">
                <div className="flex justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm">
                      {Array.isArray(o.items) ? (o.items as any[]).length : 0} item{(Array.isArray(o.items) && (o.items as any[]).length === 1) ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs uppercase tracking-widest">{o.status}</p>
                    <p className="mt-1 text-sm">{formatMoney(o.total_cents, o.currency)}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
      <SiteFooter brandName={brandName} tagline={site?.settings?.footer_tagline} />
    </div>
  );
}
