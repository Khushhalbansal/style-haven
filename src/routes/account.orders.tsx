import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatMoney } from "@/lib/format";
import { getSiteSnapshot } from "@/lib/site.functions";

interface OrderItem {
  productId: string;
  name: string;
  priceCents: number;
  currency: string;
  size?: string | null;
  quantity: number;
  lineTotalCents?: number;
}

export const Route = createFileRoute("/account/orders")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: "/account/orders" } });
    }
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "My Orders — khushhal's boutique" }] }),
  component: MyOrdersPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-foreground/10 text-foreground";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest ${cls}`}
    >
      {status}
    </span>
  );
}

function MyOrdersPage() {
  const { data: site } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });
  const brandName = site?.settings?.brand_name ?? "khushhal's boutique";

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <p className="eyebrow">Account</p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl italic mt-2 mb-10 sm:mb-12">
          My Orders
        </h1>

        {isLoading ? (
          <div className="py-24 text-center">
            <p className="eyebrow animate-pulse">Loading…</p>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="border border-dashed border-foreground/20 py-20 sm:py-32 text-center">
            <p className="eyebrow mb-4">No orders yet</p>
            <h2 className="font-display text-3xl italic">Your archive is empty</h2>
            <p className="mt-4 text-sm text-muted-foreground">Orders you place will appear here.</p>
            <Link
              to="/"
              className="mt-8 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest hover:text-primary hover:border-primary transition-colors"
            >
              Browse the shop
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const itemsArr = Array.isArray(order.items)
                ? (order.items as unknown as OrderItem[])
                : [];
              const date = new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
              return (
                <Link
                  key={order.id}
                  to="/order/$id"
                  params={{ id: order.id }}
                  className="block border border-foreground/10 p-4 sm:p-6 hover:border-foreground/30 transition-colors group"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      <span className="font-mono text-sm font-medium">
                        {formatMoney(order.total_cents, order.currency)}
                      </span>
                    </div>
                  </div>

                  {itemsArr.length > 0 ? (
                    <div className="border-t border-foreground/5 pt-3 space-y-1">
                      {itemsArr.slice(0, 3).map((it, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          {it.name}
                          {it.size ? ` · ${it.size}` : ""} × {it.quantity}
                        </p>
                      ))}
                      {itemsArr.length > 3 ? (
                        <p className="text-[10px] text-muted-foreground/60">
                          +{itemsArr.length - 3} more items
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <p className="mt-3 text-[10px] uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View details →
                  </p>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-foreground/10 flex flex-wrap gap-6">
          <Link
            to="/"
            className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest hover:text-primary hover:border-primary transition-colors"
          >
            Continue shopping
          </Link>
          <Link
            to="/auth"
            className="border-b border-foreground/40 pb-1 text-[11px] uppercase tracking-widest hover:text-primary hover:border-primary transition-colors text-muted-foreground"
          >
            Account settings
          </Link>
        </div>
      </div>

      <SiteFooter brandName={brandName} tagline={site?.settings?.footer_tagline} />
    </div>
  );
}
