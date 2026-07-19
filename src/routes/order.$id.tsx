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

function normalizeWhatsapp(num: string) {
  return num.replace(/[^\d]/g, "");
}

function OrderConfirmation() {
  const { id } = Route.useParams();

  const { data: site } = useQuery({ queryKey: ["site-snapshot"], queryFn: () => getSiteSnapshot() });
  const brandName = site?.settings?.brand_name ?? "khushhal's boutique";
  const whatsapp = site?.settings?.whatsapp_number ?? "";

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const waHref = whatsapp
    ? `https://wa.me/${normalizeWhatsapp(whatsapp)}?text=${encodeURIComponent(`Hi, I need help with my order #${id.slice(0, 8)}`)}`
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />
      <div className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center">
          <p className="eyebrow">Thank you</p>
          <h1 className="font-display text-5xl md:text-6xl italic mt-4">Order placed</h1>
          <p className="mt-6 text-sm text-muted-foreground">
            Order #<span className="font-mono">{id.slice(0, 8)}</span>. A confirmation has been sent to your email.
          </p>
        </div>

        {isLoading ? (
          <p className="mt-12 text-sm text-muted-foreground text-center">Loading details…</p>
        ) : order ? (
          <>
            <div className="mt-16 border border-foreground/10 p-6 md:p-8 space-y-4">
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

            {/* Actions */}
            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              <button
                disabled
                title="Payment gateway coming soon"
                className="h-12 bg-foreground/80 text-background text-[11px] uppercase tracking-[0.3em] cursor-not-allowed opacity-60"
              >
                Continue with payment (soon)
              </button>
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 grid place-items-center border border-foreground text-[11px] uppercase tracking-[0.3em] hover:bg-foreground hover:text-background transition-colors"
                >
                  Get help on WhatsApp
                </a>
              ) : (
                <div
                  title="Admin has not set a WhatsApp number yet"
                  className="h-12 grid place-items-center border border-foreground/20 text-muted-foreground text-[11px] uppercase tracking-[0.3em] cursor-not-allowed"
                >
                  Get help on WhatsApp
                </div>
              )}
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground text-center">
              Payment gateway isn't connected yet. We'll email instructions to complete payment.
            </p>
          </>
        ) : (
          <p className="mt-12 text-sm text-muted-foreground text-center">Order not found or not accessible.</p>
        )}

        <div className="mt-16 flex justify-center gap-6 flex-wrap">
          <Link to="/" className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest">
            Continue shopping
          </Link>
          <Link to="/account" className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest">
            View my orders
          </Link>
        </div>
      </div>
      <SiteFooter brandName={brandName} tagline={site?.settings?.footer_tagline} />
    </div>
  );
}
