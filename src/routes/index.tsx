import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSiteSnapshot } from "@/lib/site.functions";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Marquee } from "@/components/marquee";
import { ProductCard } from "@/components/product-card";
import { SignedImage } from "@/components/signed-image";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["site-snapshot"],
      queryFn: () => getSiteSnapshot(),
    }),
  component: Home,
});

function Home() {
  const { data } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });
  const settings = data?.settings;
  const categories = data?.categories ?? [];
  const products = data?.products ?? [];
  const brandName = settings?.brand_name ?? "khushhal's boutique";

  const productsByCategory = new Map<string, typeof products>();
  for (const p of products) {
    const key = p.category_id ?? "uncat";
    if (!productsByCategory.has(key)) productsByCategory.set(key, []);
    productsByCategory.get(key)!.push(p);
  }

  const orderedCatIds =
    (settings?.homepage_category_ids?.length ? settings.homepage_category_ids : categories.map((c) => c.id));
  const orderedCats = orderedCatIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is (typeof categories)[number] => !!c);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />

      {/* Hero */}
      <header className="relative w-full min-h-[85vh] px-6 py-12 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-[0.07] pointer-events-none flex items-center justify-center select-none">
          <span className="font-display text-[40vw] whitespace-nowrap leading-none tracking-tighter italic">
            {brandName.split(" ")[0]}
          </span>
        </div>
        <div className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-end gap-12 animate-reveal">
          <div className="flex-1 w-full">
            <div className="w-full aspect-[3/4] bg-stone-200 outline-1 -outline-offset-1 outline-black/5 overflow-hidden">
              <SignedImage
                src={settings?.hero_image_url}
                alt="Hero"
                bucket="site-assets"
                className="w-full h-full object-cover"
                fallback="Hero image"
              />
            </div>
          </div>
          <div className="w-full md:w-1/3 flex flex-col gap-6 pb-4 md:pb-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              {settings?.hero_eyebrow ?? "Volume 04 / Issue 01"}
            </p>
            <h1 className="font-display text-5xl lg:text-7xl leading-[0.9] text-balance tracking-tight italic">
              {settings?.hero_headline ?? "The Soft Resistance"}
            </h1>
            <p className="text-sm text-muted-foreground max-w-[32ch] leading-relaxed">
              {settings?.hero_subhead ?? "A study in structural fluidity and the tactile memory of hand-woven textiles."}
            </p>
            <a href="#collections" className="w-fit border-b border-foreground pb-1 text-[11px] uppercase tracking-widest font-medium hover:text-primary hover:border-primary transition-all">
              Explore Collection
            </a>
          </div>
        </div>
      </header>

      <Marquee items={settings?.marquee_items ?? []} />

      <div id="collections">
        {orderedCats.map((cat) => {
          const items = productsByCategory.get(cat.id) ?? [];
          if (!items.length) return null;
          return (
            <section key={cat.id} className="px-6 py-24 max-w-7xl mx-auto">
              <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
                <div>
                  <p className="eyebrow mb-2">Collection</p>
                  <h2 className="font-display text-4xl md:text-5xl italic tracking-tight">{cat.name}</h2>
                  {cat.description ? (
                    <p className="mt-3 text-sm text-muted-foreground max-w-md">{cat.description}</p>
                  ) : null}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  ({String(items.length).padStart(2, "0")} ITEMS)
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {items.slice(0, 8).map((p, i) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    priceCents={p.price_cents}
                    currency={p.currency}
                    image={p.images?.[0]}
                    offset={i % 2 === 1}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {orderedCats.every((c) => (productsByCategory.get(c.id) ?? []).length === 0) ? (
          <section className="px-6 py-32 max-w-3xl mx-auto text-center">
            <p className="eyebrow mb-4">The Studio</p>
            <h2 className="font-display text-4xl md:text-5xl italic">Curating the first drop</h2>
            <p className="mt-6 text-sm text-muted-foreground">
              Products will appear here as the archive is populated. Sign in as an admin to add pieces.
            </p>
          </section>
        ) : null}
      </div>

      {/* Upcoming feature */}
      {settings?.upcoming_title ? (
        <section className="px-6 py-32 bg-foreground/5">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 md:gap-20">
            <div className="w-full md:w-1/2 flex flex-col justify-center">
              <span className="eyebrow mb-4">Coming Soon</span>
              <h2 className="font-display text-4xl md:text-5xl italic leading-tight mb-6">
                {settings.upcoming_title}
              </h2>
              <p className="text-muted-foreground text-sm leading-loose max-w-md">
                {settings.upcoming_body}
              </p>
            </div>
            <div className="w-full md:w-1/2">
              <div className="w-full aspect-square bg-background shadow-2xl shadow-black/5 rotate-2 overflow-hidden">
                <SignedImage
                  src={settings.upcoming_image_url}
                  alt={settings.upcoming_title}
                  bucket="site-assets"
                  className="w-full h-full object-cover"
                  fallback="Moodboard"
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <SiteFooter brandName={brandName} tagline={settings?.footer_tagline} />
    </div>
  );
}
