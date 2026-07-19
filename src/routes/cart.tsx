import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SignedImage } from "@/components/signed-image";
import { useQuery } from "@tanstack/react-query";
import { getSiteSnapshot } from "@/lib/site.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — khushhal's boutique" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, updateQty, remove, subtotal } = useCart();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["site-snapshot"], queryFn: () => getSiteSnapshot() });
  const brandName = data?.settings?.brand_name ?? "khushhal's boutique";
  const currency = items[0]?.currency ?? "INR";

  async function handleCheckout() {
    navigate({ to: "/checkout" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <p className="eyebrow">Your bag</p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl italic mt-2 mb-8 sm:mb-12">
          Cart
        </h1>{" "}
        {items.length === 0 ? (
          /* Empty state: empty cart */
          <div className="max-w-md mx-auto text-center py-20 space-y-6">
            <div className="space-y-2">
              <p className="eyebrow">Your Bag</p>
              <h2 className="font-display text-4xl italic">Your bag is empty</h2>
              <p className="text-xs text-muted-foreground leading-relaxed px-6">
                Explore our collections to find intentional garments designed for durability,
                tactility, and structural fluidity.
              </p>
            </div>
            <Link
              to="/"
              className="inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest font-medium hover:text-primary hover:border-primary transition-colors"
            >
              Shop New Arrivals
            </Link>
          </div>
        ) : (
          (() => {
            const hasStockIssue = items.some((it) => {
              const prod = data?.products.find((p) => p.id === it.productId);
              return prod ? prod.quantity < it.quantity : false;
            });

            return (
              /* Stack on mobile (items above summary), side-by-side on md+ */
              <div className="grid md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_320px] gap-8 sm:gap-12">
                {/* Items list */}
                <div className="divide-y divide-foreground/10">
                  {items.map((it) => {
                    const prod = data?.products.find((p) => p.id === it.productId);
                    const maxQty = prod?.quantity ?? 99;
                    const stockWarning = prod && prod.quantity < it.quantity;

                    return (
                      <div
                        key={`${it.productId}-${it.size ?? ""}`}
                        className="py-5 sm:py-6 flex gap-3 sm:gap-6"
                      >
                        {/* Thumbnail */}
                        <div className="w-20 sm:w-24 shrink-0 aspect-[4/5] bg-stone-100 overflow-hidden">
                          <SignedImage
                            src={it.image}
                            alt={it.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider leading-snug">
                              {it.name}
                            </h3>
                            {it.size || it.color ? (
                              <p className="font-mono text-[10px] text-muted-foreground mt-1">
                                {[
                                  it.size ? `Size ${it.size}` : null,
                                  it.color ? `Color ${it.color}` : null,
                                ].filter(Boolean).join(" · ")}
                              </p>
                            ) : null}
                            {stockWarning ? (
                              <p className="text-[10px] text-destructive uppercase tracking-widest font-mono mt-1">
                                Only {prod.quantity} remaining in stock
                              </p>
                            ) : null}
                            <p className="mt-1.5 text-xs font-mono">
                              {formatMoney(it.priceCents, it.currency)}
                            </p>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-3 mt-3">
                            {/* Qty stepper — touch-friendly 44px targets */}
                            <div className="flex items-center border border-foreground/20">
                              <button
                                disabled={it.quantity <= 1}
                                onClick={() =>
                                  updateQty(it.productId, it.size, it.color, Math.max(1, it.quantity - 1))
                                }
                                className="w-11 h-11 flex items-center justify-center text-lg disabled:opacity-30"
                                aria-label="Decrease"
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-mono text-xs">
                                {it.quantity}
                              </span>
                              <button
                                disabled={it.quantity >= maxQty}
                                onClick={() => updateQty(it.productId, it.size, it.color, it.quantity + 1)}
                                className="w-11 h-11 flex items-center justify-center text-lg disabled:opacity-30"
                                aria-label="Increase"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => remove(it.productId, it.size, it.color)}
                              className="min-h-[44px] px-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Line total */}
                        <div className="text-xs font-mono self-start whitespace-nowrap pt-1">
                          {formatMoney(it.priceCents * it.quantity, it.currency)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order summary */}
                <aside className="bg-foreground/5 p-5 sm:p-6 md:p-8 h-fit space-y-4 md:sticky md:top-24">
                  <p className="eyebrow">Summary</p>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className="text-muted-foreground text-xs">Free</span>
                  </div>
                  <div className="border-t border-foreground/10 pt-4 flex justify-between text-base font-medium">
                    <span>Total</span>
                    <span>{formatMoney(subtotal, currency)}</span>
                  </div>

                  {/* Checkout CTA — large tap target */}
                  <button
                    disabled={hasStockIssue}
                    onClick={handleCheckout}
                    className="mt-4 w-full h-14 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] hover:bg-primary active:bg-primary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {hasStockIssue ? "Stock issue in cart" : "Checkout"}
                  </button>
                  <Link
                    to="/"
                    className="block text-center text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground min-h-[44px] flex items-center justify-center"
                  >
                    Continue shopping
                  </Link>
                </aside>
              </div>
            );
          })()
        )}
      </div>

      <SiteFooter brandName={brandName} />
    </div>
  );
}
