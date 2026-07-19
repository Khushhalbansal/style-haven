import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatMoney } from "@/lib/format";
import { getSiteSnapshot } from "@/lib/site.functions";
import { confirmPayment } from "@/lib/order.functions";
import { useCart } from "@/lib/cart";
import { Check } from "lucide-react";
import { z } from "zod";

interface OrderItem {
  productId: string;
  name: string;
  priceCents: number;
  currency: string;
  size?: string | null;
  quantity: number;
  lineTotalCents?: number;
}

const searchSchema = z.object({
  session_id: z.string().optional(),
});

export const Route = createFileRoute("/order/$id/confirmation")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Order Confirmed — khushhal's boutique" }] }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { id } = Route.useParams();
  const { session_id } = Route.useSearch();
  const { clear } = useCart();
  const [verifying, setVerifying] = useState(!!session_id);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const { data: site } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });
  const brandName = site?.settings?.brand_name ?? "khushhal's boutique";

  const {
    data: order,
    isLoading: orderLoading,
    refetch,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (session_id) {
      setVerifying(true);
      confirmPayment({ data: { orderId: id, sessionId: session_id } })
        .then(() => {
          setVerifying(false);
          clear(); // Clear local shopping bag on success
          refetch(); // Reload order details to show updated paid status
        })
        .catch((err) => {
          setVerifying(false);
          setVerifyError(err instanceof Error ? err.message : "Payment confirmation failed");
        });
    } else {
      // If no session_id is provided, just clear the cart anyway (assuming simple flow)
      clear();
    }
  }, [id, session_id, clear, refetch]);

  const estimatedDelivery = order?.created_at
    ? new Date(new Date(order.created_at).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      )
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <SiteNav brandName={brandName} />

      <main className="max-w-xl mx-auto w-full px-6 py-16 flex-1 flex flex-col justify-center">
        {verifying ? (
          <div className="text-center space-y-4 py-12">
            <div className="w-12 h-12 border-2 border-foreground/10 border-t-foreground rounded-full animate-spin mx-auto" />
            <p className="eyebrow animate-pulse">Verifying Payment Session...</p>
          </div>
        ) : verifyError ? (
          <div className="text-center space-y-6 py-12">
            <p className="eyebrow text-destructive">Payment Failed</p>
            <h1 className="font-display text-4xl italic">Payment Verification Failed</h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {verifyError}. If your account was debited, please contact support.
            </p>
            <Link
              to="/checkout"
              className="inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest font-medium hover:text-primary hover:border-primary transition-all"
            >
              Return to Checkout
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Header Success block */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto border border-foreground/10 animate-reveal">
                <Check className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-2">
                <p className="eyebrow text-primary">Thank you</p>
                <h1 className="font-display text-4xl sm:text-5xl italic tracking-tight">
                  Order Confirmed
                </h1>
                {order && (
                  <p className="text-xs text-muted-foreground font-mono">
                    ORDER #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                )}
              </div>
            </div>

            {/* Estimated Delivery and Details */}
            {orderLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-stone-100 w-1/3" />
                <div className="h-20 bg-stone-50" />
              </div>
            ) : order ? (
              <div className="space-y-8 animate-reveal">
                {/* Delivery Date Notification */}
                <div className="bg-stone-50 border border-foreground/5 p-5 text-center space-y-1">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    Estimated Delivery
                  </p>
                  <p className="font-medium text-sm text-primary">{estimatedDelivery}</p>
                </div>

                {/* Details Summary card */}
                <div className="border border-foreground/10 p-6 space-y-6">
                  <div className="flex justify-between items-center text-xs font-mono border-b border-foreground/5 pb-3">
                    <span className="text-muted-foreground">STATUS</span>
                    <span className="uppercase font-semibold tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded">
                      {order.status}
                    </span>
                  </div>

                  {/* Shipping information */}
                  <div className="space-y-2">
                    <h3 className="eyebrow text-[9px]">Shipping to</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {order.customer_name}
                      <br />
                      {order.shipping_address}
                      <br />
                      {order.shipping_city}
                      {order.shipping_postal ? `, ${order.shipping_postal}` : ""}
                      <br />
                      {order.shipping_country}
                    </p>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-3 border-t border-foreground/10 pt-4">
                    <h3 className="eyebrow text-[9px]">Items</h3>
                    <div className="space-y-2.5">
                      {Array.isArray(order.items) &&
                        (order.items as unknown as OrderItem[]).map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs leading-relaxed">
                            <span className="text-muted-foreground">
                              {it.name}
                              {it.size ? ` · Size ${it.size}` : ""}
                              <span className="font-mono text-[10px] ml-1.5 text-foreground">
                                ×{it.quantity}
                              </span>
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
                  </div>

                  {/* Total */}
                  <div className="border-t border-foreground/10 pt-4 flex justify-between items-center text-sm font-semibold">
                    <span>Total Paid</span>
                    <span className="font-mono">
                      {formatMoney(order.total_cents, order.currency)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-destructive">
                Order details could not be retrieved.
              </div>
            )}

            <div className="text-center">
              <Link
                to="/"
                className="inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest font-medium hover:text-primary hover:border-primary transition-all"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </main>

      <SiteFooter brandName={brandName} />
    </div>
  );
}
