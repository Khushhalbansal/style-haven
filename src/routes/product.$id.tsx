import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSiteSnapshot } from "@/lib/site.functions";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { SignedImage } from "@/components/signed-image";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["site-snapshot"],
      queryFn: () => getSiteSnapshot(),
    }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });
  const { add } = useCart();

  const product = data?.products.find((p) => p.id === id);
  const brandName = data?.settings?.brand_name ?? "khushhal's boutique";

  const [size, setSize] = useState<string | undefined>();
  const [color, setColor] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav brandName={brandName} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-32 text-center">
          <p className="eyebrow">Not found</p>
          <h1 className="mt-4 font-display text-4xl italic">Product not available</h1>
          <Link
            to="/"
            className="mt-6 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
          >
            Return to shop
          </Link>
        </div>
      </div>
    );
  }

  const colorsParsed = (product.colors ?? []).map((c: string) => {
    const parts = c.split(":");
    const name = parts[0]?.trim() || "Unknown";
    const hex = parts[1]?.trim() || "#cccccc";
    return { raw: c, name, hex };
  });

  const category = data?.categories.find((c) => c.id === product.category_id);
  const outOfStock = product.quantity <= 0;

  const handleAdd = () => {
    if (product.sizes.length > 0 && !size) {
      toast.error("Please select a size");
      return;
    }
    if (colorsParsed.length > 0 && !color) {
      toast.error("Please select a color");
      return;
    }
    add({
      productId: product.id,
      name: product.name,
      priceCents: product.price_cents,
      currency: product.currency,
      size,
      color,
      image: product.images?.[0],
      quantity: qty,
    });
    toast.success("Added to cart");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />

      {/* Main product layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12 grid md:grid-cols-2 gap-6 sm:gap-12 lg:gap-20">
        {/* Image gallery */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="w-full aspect-[4/5] bg-stone-100 overflow-hidden">
            <SignedImage
              src={product.images?.[activeImg]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Thumbnails */}
          {product.images.length > 1 ? (
            <div className="grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square bg-stone-100 overflow-hidden min-h-[44px] ${
                    activeImg === i ? "outline outline-2 outline-primary" : ""
                  }`}
                >
                  <SignedImage
                    src={img}
                    alt={`View ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Product info — desktop */}
        <div className="md:pt-8 pb-28 md:pb-0">
          {category ? (
            <Link
              to="/category/$slug"
              params={{ slug: category.slug }}
              className="eyebrow mb-4 hover:text-primary transition-colors inline-block"
            >
              {category.name}
            </Link>
          ) : null}
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl italic tracking-tight text-balance">
            {product.name}
          </h1>
          <p className="mt-3 sm:mt-4 font-mono text-base sm:text-sm">
            {formatMoney(product.price_cents, product.currency)}
          </p>

          {product.description ? (
            <p className="mt-6 sm:mt-8 text-sm leading-relaxed text-muted-foreground whitespace-pre-line max-w-md">
              {product.description}
            </p>
          ) : null}

          {/* Color selector */}
          {colorsParsed.length > 0 ? (
            <div className="mt-8 sm:mt-10">
              <p className="eyebrow mb-3">
                Color
                {color ? <span className="normal-case text-muted-foreground font-mono text-[10px] ml-2">({color})</span> : null}
              </p>
              <div className="flex flex-wrap gap-3">
                {colorsParsed.map((c) => (
                  <button
                    key={c.raw}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={`w-10 h-10 rounded-full border border-foreground/10 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                      color === c.name ? "ring-2 ring-offset-2 ring-foreground" : ""
                    }`}
                    style={{ backgroundColor: c.hex }}
                    aria-label={`Select color ${c.name}`}
                    aria-pressed={color === c.name}
                  >
                    {color === c.name && (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-white shadow-sm"
                        style={{
                          filter: c.hex.toLowerCase() === "#ffffff" ? "invert(1)" : "none",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Size selector */}
          {product.sizes.length > 0 ? (
            <div className="mt-8 sm:mt-10">
              <p className="eyebrow mb-3">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`min-w-[52px] px-4 h-12 text-xs uppercase tracking-widest border transition-colors ${
                      size === s
                        ? "bg-foreground text-background border-foreground"
                        : "border-foreground/20 hover:border-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Qty + Add to cart — desktop (hidden on mobile, replaced by sticky bar) */}
          <div className="mt-8 sm:mt-10 hidden md:flex items-center gap-4">
            <div className="flex items-center border border-foreground/20 h-12">
              <button
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-12 h-full text-lg flex items-center justify-center disabled:opacity-30"
              >
                −
              </button>
              <span className="w-10 text-center font-mono text-sm">{qty}</span>
              <button
                disabled={qty >= (product.quantity ?? 99) || outOfStock}
                onClick={() => setQty((q) => Math.min(product.quantity ?? 99, q + 1))}
                className="w-12 h-full text-lg flex items-center justify-center disabled:opacity-30"
              >
                +
              </button>
            </div>
            <button
              disabled={outOfStock}
              onClick={handleAdd}
              className="flex-1 h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] font-medium hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {outOfStock ? "Sold out" : "Add to cart"}
            </button>
          </div>

          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hidden md:block">
            {outOfStock ? "Not available" : `${product.quantity} in stock`}
          </p>

          <div className="mt-12 sm:mt-16 border-t border-foreground/10 pt-6 space-y-2 hidden md:block">
            <p className="eyebrow">Shipped from studio</p>
            <p className="text-xs text-muted-foreground">Free shipping on all orders.</p>
            {product.return_policy ? (
              <p className="text-xs text-muted-foreground">{product.return_policy}.</p>
            ) : null}
          </div>

          {product.return_policy ? (
            <div className="mt-6 border-t border-foreground/10 pt-6 space-y-2">
              <p className="eyebrow">Return policy</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{product.return_policy}</p>
            </div>
          ) : null}

        </div>
      </div>

      {/* Sticky mobile add-to-cart bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-foreground/10 px-4 py-3 safe-area-bottom">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          {/* Qty stepper */}
          <div className="flex items-center border border-foreground/20 h-12 shrink-0">
            <button
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-12 h-full text-xl flex items-center justify-center disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-sm">{qty}</span>
            <button
              disabled={qty >= (product.quantity ?? 99) || outOfStock}
              onClick={() => setQty((q) => Math.min(product.quantity ?? 99, q + 1))}
              className="w-12 h-full text-xl flex items-center justify-center disabled:opacity-30"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          {/* Add to cart */}
          <button
            disabled={outOfStock}
            onClick={handleAdd}
            className="flex-1 h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.25em] font-medium hover:bg-primary active:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {outOfStock
              ? "Sold out"
              : `Add to cart · ${formatMoney(product.price_cents * qty, product.currency)}`}
          </button>
        </div>
      </div>

      <SiteFooter brandName={brandName} tagline={data?.settings?.footer_tagline} />
    </div>
  );
}
