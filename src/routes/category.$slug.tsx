import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSiteSnapshot } from "@/lib/site.functions";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["site-snapshot"],
      queryFn: () => getSiteSnapshot(),
    });
    const cat = data.categories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { categoryName: cat.name };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.categoryName ?? "Collection"} — khushhal's boutique` }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-6 py-32 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 font-display text-4xl italic">Collection not found</h1>
        <Link
          to="/"
          className="mt-8 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
        >
          Return to shop
        </Link>
      </div>
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });

  const [sizeFilter, setSizeFilter] = useState<string | undefined>();
  const [priceFilter, setPriceFilter] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<string>("newest");

  const brandName = data?.settings?.brand_name ?? "khushhal's boutique";
  const category = data?.categories.find((c) => c.slug === slug);
  const products = (data?.products ?? []).filter((p) => p.category_id === category?.id);

  // Extract unique sizes dynamically
  const allSizes = Array.from(new Set(products.flatMap((p) => p.sizes ?? [])));

  // Filter and sort products
  let filteredAndSorted = [...products];

  if (sizeFilter) {
    filteredAndSorted = filteredAndSorted.filter((p) => p.sizes?.includes(sizeFilter));
  }

  if (priceFilter) {
    if (priceFilter === "under-2000") {
      filteredAndSorted = filteredAndSorted.filter((p) => p.price_cents < 200000);
    } else if (priceFilter === "2000-5000") {
      filteredAndSorted = filteredAndSorted.filter(
        (p) => p.price_cents >= 200000 && p.price_cents <= 500000,
      );
    } else if (priceFilter === "over-5000") {
      filteredAndSorted = filteredAndSorted.filter((p) => p.price_cents > 500000);
    }
  }

  if (sortBy === "price-asc") {
    filteredAndSorted.sort((a, b) => a.price_cents - b.price_cents);
  } else if (sortBy === "price-desc") {
    filteredAndSorted.sort((a, b) => b.price_cents - a.price_cents);
  } else if (sortBy === "newest") {
    filteredAndSorted.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  if (!category && !isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav brandName={brandName} />
        <div className="max-w-3xl mx-auto px-6 py-32 text-center">
          <p className="eyebrow">Not found</p>
          <h1 className="mt-4 font-display text-4xl italic">Collection not found</h1>
          <Link
            to="/"
            className="mt-8 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
          >
            Return to shop
          </Link>
        </div>
        <SiteFooter brandName={brandName} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav brandName={brandName} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mb-8 sm:mb-12">
          <Link to="/" className="hover:text-foreground transition-colors">
            Shop
          </Link>
          <span>/</span>
          <span className="text-foreground">{category?.name ?? "Collection"}</span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-end mb-10 sm:mb-16 flex-wrap gap-3">
          <div>
            <p className="eyebrow mb-2 sm:mb-3">Collection</p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl italic tracking-tight text-balance leading-[0.95]">
              {category?.name}
            </h1>
            {category?.description ? (
              <p className="mt-3 sm:mt-4 text-sm text-muted-foreground max-w-md leading-relaxed">
                {category.description}
              </p>
            ) : null}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground self-end">
            ({String(products.length).padStart(2, "0")} ITEMS)
          </span>
        </div>

        {/* Filters and sorting */}
        {products.length > 0 && (
          <div className="flex flex-wrap gap-4 items-center justify-between bg-stone-50/50 p-4 border border-foreground/5 text-xs font-mono mb-10">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Size Filter */}
              {allSizes.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">SIZE:</span>
                  <select
                    value={sizeFilter ?? ""}
                    onChange={(e) => setSizeFilter(e.target.value || undefined)}
                    className="bg-transparent border border-foreground/10 px-2 py-1 outline-none cursor-pointer focus:border-foreground"
                  >
                    <option value="">All Sizes</option>
                    {allSizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price Filter */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">PRICE:</span>
                <select
                  value={priceFilter ?? ""}
                  onChange={(e) => setPriceFilter(e.target.value || undefined)}
                  className="bg-transparent border border-foreground/10 px-2 py-1 outline-none cursor-pointer focus:border-foreground"
                >
                  <option value="">All Prices</option>
                  <option value="under-2000">Under ₹2,000</option>
                  <option value="2000-5000">₹2,000 - ₹5,000</option>
                  <option value="over-5000">Over ₹5,000</option>
                </select>
              </div>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">SORT:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border border-foreground/10 px-2 py-1 outline-none cursor-pointer focus:border-foreground"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        )}

        {/* Product grid - 1 col mobile, 2 tablet, 3-4 desktop */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-4 animate-pulse">
                <div className="w-full aspect-[4/5] bg-stone-100" />
                <div className="flex justify-between items-start">
                  <div className="space-y-2 w-2/3">
                    <div className="h-3 bg-stone-200 w-full" />
                    <div className="h-2 bg-stone-100 w-1/2" />
                  </div>
                  <div className="h-3 bg-stone-200 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="border border-dashed border-foreground/20 py-24 sm:py-32 text-center">
            <p className="eyebrow mb-4">The Studio</p>
            <h2 className="font-display text-3xl italic">
              {products.length > 0 ? "No pieces match filters" : "Pieces arriving soon"}
            </h2>
            <p className="mt-4 text-sm text-muted-foreground px-4">
              {products.length > 0
                ? "Try resetting your size or price range filters."
                : "This collection is being curated. Check back soon."}
            </p>
            {products.length > 0 ? (
              <button
                onClick={() => {
                  setSizeFilter(undefined);
                  setPriceFilter(undefined);
                }}
                className="mt-8 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
              >
                Reset Filters
              </button>
            ) : (
              <Link
                to="/"
                className="mt-8 inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
              >
                Browse all collections
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {filteredAndSorted.map((p, i) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                priceCents={p.price_cents}
                currency={p.currency}
                image={p.images?.[0]}
                offset={i % 2 === 1}
                quantity={p.quantity}
              />
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="mt-16 sm:mt-24 border-t border-foreground/10 pt-10 sm:pt-12 text-center">
          <Link
            to="/"
            hash="collections"
            className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest hover:text-primary hover:border-primary transition-colors"
          >
            All collections
          </Link>
        </div>
      </div>

      <SiteFooter brandName={brandName} tagline={data?.settings?.footer_tagline} />
    </div>
  );
}
