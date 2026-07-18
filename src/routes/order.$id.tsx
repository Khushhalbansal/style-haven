import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatMoney } from "@/lib/format";
import { getSiteSnapshot } from "@/lib/site.functions";

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Order confirmed — khushhal's boutique" }] }),
  component: OrderConfirmation,
});

function OrderConfirmation() {
  const { id } = Route.useParams();

  const { data: site } = useQuery({ queryKey: ["site-snapshot"], queryFn: () => getSiteSnapshot() });
  const brandName = site?.settings?.brand_name ?? "khushhal's boutique";

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="eyebrow">Thank you</p>
        <h1 className="font-display text-5xl md:text-6xl italic mt-4">Order placed</h1>
        <p className="mt-6 text-sm text-muted-foreground">
          Order #<span className="font-mono">{id.slice(0, 8)}</span>. We'll be in touch soon.
        </p>

        {isLoading ? (
          <p className="mt-12 text-sm text-muted-foreground">Loading details…</p>
        ) : order ? (
          <div className="mt-16 text-left border border-foreground/10 p-6 md:p-8 space-y-4">
            <div className="flex justify-between text-xs uppercase tracking-widest">
              <span>Status</span>
              <span className="font-mono">{order.status}</span>
            </div>
            <div className="border-t border-foreground/10 pt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Shipping to</p>
              <p className="text-sm">{order.customer_name}<br />
                {order.shipping_address}<br />
                {order.shipping_city}{order.shipping_postal ? ` ${order.shipping_postal}` : ""}<br />
                {order.shipping_country}
              </p>
            </div>
            <div className="border-t border-foreground/10 pt-4 space-y-2">
              {Array.isArray(order.items) && (order.items as any[]).map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{it.name}{it.size ? ` · ${it.size}` : ""} × {it.quantity}</span>
                  <span className="font-mono">{formatMoney(it.lineTotalCents ?? it.priceCents * it.quantity, order.currency)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-foreground/10 pt-4 flex justify-between text-base font-medium">
              <span>Total</span>
              <span>{formatMoney(order.total_cents, order.currency)}</span>
            </div>
          </div>
        ) : (
          <p className="mt-12 text-sm text-muted-foreground">Order not found or not accessible.</p>
        )}

        <Link to="/" className="mt-12 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest">
          Continue shopping
        </Link>
      </div>
      <SiteFooter brandName={brandName} />
    </div>
  );
}
