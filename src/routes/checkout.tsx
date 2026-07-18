import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { placeOrder } from "@/lib/order.functions";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getSiteSnapshot } from "@/lib/site.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — khushhal's boutique" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["site-snapshot"], queryFn: () => getSiteSnapshot() });
  const brandName = data?.settings?.brand_name ?? "khushhal's boutique";
  const currency = items[0]?.currency ?? "INR";
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await placeOrder({
        data: {
          customer_name: String(fd.get("name") ?? ""),
          customer_email: String(fd.get("email") ?? ""),
          customer_phone: String(fd.get("phone") ?? "") || undefined,
          shipping_address: String(fd.get("address") ?? ""),
          shipping_city: String(fd.get("city") ?? ""),
          shipping_postal: String(fd.get("postal") ?? "") || undefined,
          shipping_country: String(fd.get("country") ?? "India"),
          notes: String(fd.get("notes") ?? "") || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            priceCents: i.priceCents,
            currency: i.currency,
            size: i.size,
            quantity: i.quantity,
          })),
        },
      });
      clear();
      navigate({ to: "/order/$id", params: { id: res.orderId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />
      <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-[1fr_360px] gap-12">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1 className="font-display text-4xl md:text-5xl italic mt-2 mb-8">Shipping details</h1>
          <form onSubmit={onSubmit} className="space-y-5">
            <Field name="name" label="Full name" required autoComplete="name" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field name="email" type="email" label="Email" required autoComplete="email" />
              <Field name="phone" label="Phone (optional)" autoComplete="tel" />
            </div>
            <Field name="address" label="Address" required autoComplete="street-address" />
            <div className="grid sm:grid-cols-3 gap-4">
              <Field name="city" label="City" required autoComplete="address-level2" />
              <Field name="postal" label="Postal code" autoComplete="postal-code" />
              <Field name="country" label="Country" defaultValue="India" autoComplete="country-name" />
            </div>
            <Field name="notes" label="Order notes (optional)" as="textarea" />

            <div className="pt-6 border-t border-foreground/10">
              <p className="eyebrow mb-3">Payment</p>
              <p className="text-xs text-muted-foreground">
                Payment gateway coming soon. Place your order and we'll email you payment instructions.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="w-full h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-colors disabled:opacity-50"
            >
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </form>
        </div>

        <aside className="bg-foreground/5 p-6 h-fit space-y-4 md:sticky md:top-24">
          <p className="eyebrow">Order</p>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your cart is empty. <Link to="/" className="underline">Browse products</Link>.</p>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((it) => (
                  <div key={`${it.productId}-${it.size ?? ""}`} className="flex justify-between text-xs">
                    <span className="pr-4">
                      {it.name}{it.size ? ` · ${it.size}` : ""} × {it.quantity}
                    </span>
                    <span className="font-mono">{formatMoney(it.priceCents * it.quantity, it.currency)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-foreground/10 pt-3 flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="border-t border-foreground/10 pt-3 flex justify-between font-medium">
                <span>Total</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
            </>
          )}
        </aside>
      </div>
      <SiteFooter brandName={brandName} />
    </div>
  );
}

function Field({
  name, label, type = "text", required, defaultValue, autoComplete, as,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
  as?: "textarea";
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      {as === "textarea" ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={3}
          className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none focus:border-foreground"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none focus:border-foreground"
        />
      )}
    </label>
  );
}
