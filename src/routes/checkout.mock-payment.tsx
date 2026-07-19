import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatMoney } from "@/lib/format";
import { getSiteSnapshot } from "@/lib/site.functions";
import { confirmPayment } from "@/lib/order.functions";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  orderId: z.string().uuid(),
});

export const Route = createFileRoute("/checkout/mock-payment")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Payment — khushhal's boutique" }] }),
  component: PaymentPage,
});

interface OrderItem {
  name: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  priceCents: number;
  lineTotalCents?: number;
}

type PaymentMethod = "cod" | "upi" | "wallet" | "card";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: string;
  available: boolean;
}[] = [
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay when your order arrives",
    icon: "💵",
    available: true,
  },
  {
    id: "upi",
    label: "UPI / QR",
    description: "PhonePe, GPay, Paytm — via Razorpay",
    icon: "📱",
    available: false,
  },
  {
    id: "wallet",
    label: "Wallet",
    description: "Paytm, Amazon Pay & more",
    icon: "👜",
    available: false,
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    description: "All major cards — via Razorpay",
    icon: "💳",
    available: false,
  },
];

function PaymentPage() {
  const { orderId } = Route.useSearch();
  const { clear } = useCart();
  const [selected, setSelected] = useState<PaymentMethod>("cod");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { data: site } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });
  const brandName = site?.settings?.brand_name ?? "khushhal's boutique";

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function handleConfirm() {
    if (selected !== "cod") return;
    setConfirming(true);
    try {
      const mockSessionId = `mock_cod_${crypto.randomUUID().slice(0, 8)}`;
      await confirmPayment({ data: { orderId, sessionId: mockSessionId } });
      clear();
      setConfirmed(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not confirm order");
    } finally {
      setConfirming(false);
    }
  }

  const items = Array.isArray(order?.items) ? (order!.items as unknown as OrderItem[]) : [];

  /* ── Order confirmed screen ── */
  if (confirmed) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav brandName={brandName} />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center mx-auto text-2xl">
            ✓
          </div>
          <p className="eyebrow mt-6">Order confirmed</p>
          <h1 className="font-display text-4xl md:text-5xl italic mt-4">Thank you!</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Order <span className="font-mono">#{orderId.slice(0, 8)}</span> · Cash on Delivery.
            We'll be in touch soon.
          </p>

          {/* Order summary */}
          <div className="mt-12 text-left border border-foreground/10 p-6 space-y-3">
            <p className="eyebrow mb-3">Order summary</p>
            {items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {it.name}
                  {it.size || it.color ? ` · ${[it.size, it.color].filter(Boolean).join(" / ")}` : ""} × {it.quantity}
                </span>
                <span className="font-mono">
                  {formatMoney(
                    it.lineTotalCents ?? it.priceCents * it.quantity,
                    order?.currency ?? "INR",
                  )}
                </span>
              </div>
            ))}
            <div className="border-t border-foreground/10 pt-3 flex justify-between font-medium">
              <span>Total</span>
              <span>{formatMoney(order?.total_cents ?? 0, order?.currency ?? "INR")}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-foreground/10">
              <span>Payment</span>
              <span>Cash on Delivery</span>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/account/orders"
              className="h-12 px-8 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] inline-flex items-center justify-center hover:bg-primary transition-colors"
            >
              See your orders
            </Link>
            <Link
              to="/"
              className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
            >
              Continue shopping
            </Link>
          </div>
        </div>
        <SiteFooter brandName={brandName} />
      </div>
    );
  }

  /* ── Payment selection screen ── */
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 grid md:grid-cols-[1fr_340px] gap-8 sm:gap-12">
        {/* Sidebar — order summary */}
        <aside className="bg-foreground/5 p-5 sm:p-6 md:p-8 h-fit space-y-4 order-first md:order-last md:sticky md:top-24">
          <p className="eyebrow">Order summary</p>
          {isLoading ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
          ) : order ? (
            <>
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="pr-4 text-muted-foreground">
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
              <div className="border-t border-foreground/10 pt-3 flex justify-between text-sm text-muted-foreground">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t border-foreground/10 pt-3 flex justify-between font-medium">
                <span>Total</span>
                <span>{formatMoney(order.total_cents, order.currency)}</span>
              </div>
              <div className="pt-2 text-xs text-muted-foreground border-t border-foreground/10">
                <span className="eyebrow block mb-1">Shipping to</span>
                {order.customer_name} · {order.shipping_city}
              </div>
            </>
          ) : null}
        </aside>

        {/* Payment methods */}
        <div>
          <p className="eyebrow">Payment</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl italic mt-2 mb-8">
            How would you like to pay?
          </h1>

          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => method.available && setSelected(method.id)}
                disabled={!method.available}
                aria-pressed={selected === method.id}
                className={`w-full flex items-center gap-4 p-4 border text-left transition-colors ${
                  !method.available
                    ? "border-foreground/10 opacity-50 cursor-not-allowed"
                    : selected === method.id
                      ? "border-foreground bg-foreground/5"
                      : "border-foreground/20 hover:border-foreground/50"
                }`}
              >
                {/* Radio indicator */}
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selected === method.id && method.available
                      ? "border-foreground"
                      : "border-foreground/30"
                  }`}
                >
                  {selected === method.id && method.available && (
                    <div className="w-2 h-2 rounded-full bg-foreground" />
                  )}
                </div>
                <span className="text-xl shrink-0">{method.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                </div>
                {!method.available && (
                  <span className="text-[9px] uppercase tracking-widest font-mono bg-foreground/10 px-2 py-0.5 shrink-0">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || selected !== "cod" || !order}
            className="mt-8 w-full h-14 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] hover:bg-primary active:bg-primary transition-colors disabled:opacity-50 font-medium"
          >
            {confirming ? "Confirming…" : "Confirm order"}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            UPI, Card &amp; Wallet payments via Razorpay — coming soon
          </p>
        </div>
      </div>

      <SiteFooter brandName={brandName} />
    </div>
  );
}
