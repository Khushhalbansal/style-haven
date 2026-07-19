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

interface OrderItem {
  productId: string;
  name: string;
  priceCents: number;
  currency: string;
  size?: string | null;
  quantity: number;
  lineTotalCents?: number;
}

// WhatsApp number — update to real business number when ready
const WHATSAPP_NUMBER = "919004163657";

function OrderConfirmation() {
  const { id } = Route.useParams();

  const { data: site } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });
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

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi! I need help with my order #${id.slice(0, 8)} placed on ${brandName}.`,
  )}`;

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
            <div className="border-t border-foreground/10 pt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                Shipping to
              </p>
              <p className="text-sm">
                {order.customer_name}
                <br />
                {order.shipping_address}
                <br />
                {order.shipping_city}
                {order.shipping_postal ? ` ${order.shipping_postal}` : ""}
                <br />
                {order.shipping_country}
              </p>
            </div>
            <div className="border-t border-foreground/10 pt-4 space-y-2">
              {Array.isArray(order.items) &&
                (order.items as unknown as OrderItem[]).map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>
                      {it.name}
                      {it.size ? ` · ${it.size}` : ""} × {it.quantity}
                    </span>
                    <span className="font-mono">
                      {formatMoney(
                        it.lineTotalCents ?? it.priceCents * it.quantity,
                        order.currency,
                      )}
                    </span>
                  </div>
                ))}
            </div>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground text-center">
              Payment gateway isn't connected yet. We'll email instructions to complete payment.
            </p>
          </>
        ) : (
          <p className="mt-12 text-sm text-muted-foreground text-center">Order not found or not accessible.</p>
        )}

        {/* Action buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* WhatsApp help */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-12 px-6 border border-foreground/20 text-[11px] uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 shrink-0"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Get help on WhatsApp
          </a>

          {/* Payment — not yet connected */}
          <div className="relative">
            <button
              disabled
              aria-disabled="true"
              className="inline-flex items-center gap-2 h-12 px-6 bg-foreground/10 text-foreground/40 text-[11px] uppercase tracking-widest cursor-not-allowed select-none"
            >
              Continue with payments
            </button>
            <span className="absolute -top-2.5 -right-2.5 bg-primary text-background text-[9px] uppercase tracking-widest px-1.5 py-0.5 font-mono">
              Soon
            </span>
          </div>
        </div>

        <Link
          to="/"
          className="mt-10 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
        >
          Continue shopping
        </Link>
      </div>
      <SiteFooter brandName={brandName} tagline={site?.settings?.footer_tagline} />
    </div>
  );
}
