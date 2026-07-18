import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SignedImage } from "@/components/signed-image";
import { useQuery } from "@tanstack/react-query";
import { getSiteSnapshot } from "@/lib/site.functions";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — khushhal's boutique" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, updateQty, remove, subtotal } = useCart();
  const { data } = useQuery({ queryKey: ["site-snapshot"], queryFn: () => getSiteSnapshot() });
  const brandName = data?.settings?.brand_name ?? "khushhal's boutique";
  const currency = items[0]?.currency ?? "INR";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />
      <div className="max-w-5xl mx-auto px-6 py-16">
        <p className="eyebrow">Your bag</p>
        <h1 className="font-display text-5xl md:text-6xl italic mt-2 mb-12">Cart</h1>

        {items.length === 0 ? (
          <div className="border border-dashed border-foreground/20 p-16 text-center">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Link to="/" className="mt-6 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_320px] gap-12">
            <div className="divide-y divide-foreground/10">
              {items.map((it) => (
                <div key={`${it.productId}-${it.size ?? ""}`} className="py-6 flex gap-4 sm:gap-6">
                  <div className="w-20 sm:w-24 shrink-0 aspect-[4/5] bg-stone-100 overflow-hidden">
                    <SignedImage src={it.image} alt={it.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider">{it.name}</h3>
                      {it.size ? <p className="font-mono text-[10px] text-muted-foreground mt-1">Size {it.size}</p> : null}
                      <p className="mt-2 text-xs">{formatMoney(it.priceCents, it.currency)}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center border border-foreground/20">
                        <button onClick={() => updateQty(it.productId, it.size, Math.max(1, it.quantity - 1))} className="w-8 h-8">−</button>
                        <span className="w-8 text-center font-mono text-xs">{it.quantity}</span>
                        <button onClick={() => updateQty(it.productId, it.size, it.quantity + 1)} className="w-8 h-8">+</button>
                      </div>
                      <button onClick={() => remove(it.productId, it.size)} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive">
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-mono self-start whitespace-nowrap">
                    {formatMoney(it.priceCents * it.quantity, it.currency)}
                  </div>
                </div>
              ))}
            </div>

            <aside className="bg-foreground/5 p-6 md:p-8 h-fit space-y-4">
              <p className="eyebrow">Summary</p>
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span className="text-muted-foreground">Calculated at next step</span>
              </div>
              <div className="border-t border-foreground/10 pt-4 flex justify-between text-base font-medium">
                <span>Total</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              <Link
                to="/checkout"
                className="mt-4 w-full inline-flex items-center justify-center h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-colors"
              >
                Checkout
              </Link>
              <Link to="/" className="block text-center text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
      <SiteFooter brandName={brandName} />
    </div>
  );
}
