import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });
  const { add } = useCart();

  const product = data?.products.find((p) => p.id === id);
  const brandName = data?.settings?.brand_name ?? "khushhal's boutique";

  const [size, setSize] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav brandName={brandName} />
        <div className="max-w-3xl mx-auto px-6 py-32 text-center">
          <p className="eyebrow">Not found</p>
          <h1 className="mt-4 font-display text-4xl italic">Product not available</h1>
          <Link to="/" className="mt-6 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest">
            Return to shop
          </Link>
        </div>
      </div>
    );
  }

  const category = data?.categories.find((c) => c.id === product.category_id);
  const outOfStock = product.quantity <= 0;

  const handleAdd = () => {
    if (product.sizes.length > 0 && !size) {
      toast.error("Please select a size");
      return;
    }
    add({
      productId: product.id,
      name: product.name,
      priceCents: product.price_cents,
      currency: product.currency,
      size,
      image: product.images?.[0],
      quantity: qty,
    });
    toast.success("Added to cart");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12 lg:gap-20">
        <div className="space-y-4">
          <div className="w-full aspect-[4/5] bg-stone-100 overflow-hidden">
            <SignedImage
              src={product.images?.[activeImg]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 ? (
            <div className="grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square bg-stone-100 overflow-hidden ${activeImg === i ? "outline outline-2 outline-primary" : ""}`}
                >
                  <SignedImage src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="md:pt-8">
          {category ? <p className="eyebrow mb-4">{category.name}</p> : null}
          <h1 className="font-display text-4xl md:text-5xl italic tracking-tight text-balance">{product.name}</h1>
          <p className="mt-4 font-mono text-sm">{formatMoney(product.price_cents, product.currency)}</p>

          {product.description ? (
            <p className="mt-8 text-sm leading-relaxed text-muted-foreground whitespace-pre-line max-w-md">
              {product.description}
            </p>
          ) : null}

          {product.sizes.length > 0 ? (
            <div className="mt-10">
              <p className="eyebrow mb-3">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`min-w-14 px-4 h-11 text-xs uppercase tracking-widest border ${
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

          <div className="mt-10 flex items-center gap-4">
            <div className="flex items-center border border-foreground/20 h-12">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-full text-lg">−</button>
              <span className="w-8 text-center font-mono text-sm">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.quantity || 99, q + 1))} className="w-10 h-full text-lg">+</button>
            </div>
            <button
              disabled={outOfStock}
              onClick={handleAdd}
              className="flex-1 h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] font-medium hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {outOfStock ? "Sold out" : "Add to cart"}
            </button>
          </div>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {outOfStock ? "Not available" : `${product.quantity} in stock`}
          </p>

          <div className="mt-16 border-t border-foreground/10 pt-6 space-y-2">
            <p className="eyebrow">Shipped from studio</p>
            <p className="text-xs text-muted-foreground">Free shipping on all orders. Returns within 14 days.</p>
          </div>
        </div>
      </div>
      <SiteFooter brandName={brandName} tagline={data?.settings?.footer_tagline} />
    </div>
  );
}
