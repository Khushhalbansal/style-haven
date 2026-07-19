import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { getSiteSnapshot } from "@/lib/site.functions";
import { formatMoney } from "@/lib/format";
import { Search as SearchIcon } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: ({ deps: { q } }) => ({ q }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.q
          ? `Search results for "${loaderData.q}" — khushhal's boutique`
          : "Search — khushhal's boutique",
      },
      {
        name: "description",
        content: "Search our collections for structural, hand-woven boutique garments.",
      },
    ],
  }),
  component: SearchPage,
});

function ProductCardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="w-full aspect-[4/5] bg-stone-100" />
      <div className="flex justify-between items-start">
        <div className="space-y-2 w-2/3">
          <div className="h-3 bg-stone-200 w-full" />
          <div className="h-2 bg-stone-100 w-1/2" />
        </div>
        <div className="h-3 bg-stone-200 w-1/4" />
      </div>
    </div>
  );
}

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");

  // Filters and sorting state
  const [sizeFilter, setSizeFilter] = useState<string | undefined>();
  const [priceFilter, setPriceFilter] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<string>("newest");

  useEffect(() => {
    setTerm(q ?? "");
  }, [q]);

  const { data: site } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });
  const brandName = site?.settings?.brand_name ?? "khushhal's boutique";

  // Fetch search results from Supabase
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["search-products", q],
    queryFn: async () => {
      if (!q) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!q,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (term.trim()) {
      navigate({ to: "/search", search: { q: term.trim() } });
    }
  };

  // Extract unique sizes dynamically
  const allSizes = Array.from(new Set((products ?? []).flatMap((p) => p.sizes ?? [])));

  // Filter and sort products
  let filteredAndSorted = products ? [...products] : [];

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <SiteNav brandName={brandName} />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 flex-1">
        {/* Search header with Input */}
        <div className="max-w-2xl mx-auto mb-16 text-center space-y-6">
          <p className="eyebrow">Search Archive</p>
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center border-b border-foreground/20 focus-within:border-foreground py-2"
          >
            <input
              type="search"
              placeholder="Search garments, textures, drops..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full bg-transparent pr-10 text-xl font-display italic outline-none placeholder:text-muted-foreground/50 py-1"
              autoFocus
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-0 p-2 text-muted-foreground hover:text-foreground"
            >
              <SearchIcon className="w-5 h-5 stroke-[1.5]" />
            </button>
          </form>
        </div>

        {q ? (
          <div>
            {isLoading ? (
              <div className="space-y-8">
                <div className="h-6 bg-stone-100 w-32 animate-pulse rounded" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <ProductCardSkeleton key={idx} />
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12 space-y-4">
                <p className="eyebrow text-destructive font-mono">Error loading search results</p>
                <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
              </div>
            ) : filteredAndSorted.length === 0 ? (
              /* Empty state: search with no results */
              <div className="border border-dashed border-foreground/20 py-24 text-center space-y-6 max-w-xl mx-auto">
                <div className="space-y-2">
                  <p className="eyebrow">No Pieces Found</p>
                  <h2 className="font-display text-2xl italic">No matches for "{q}"</h2>
                  <p className="text-xs text-muted-foreground px-8 leading-relaxed">
                    We couldn't find any products matching your search term. Try checking your
                    spelling or search for broader keywords like "top", "linen", or "arrivals".
                  </p>
                </div>
                <Link
                  to="/"
                  className="inline-block border-b border-foreground pb-1 text-[11px] uppercase tracking-widest font-medium hover:text-primary hover:border-primary transition-all"
                >
                  Browse all collections
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Result header */}
                <div className="flex justify-between items-end flex-wrap gap-2 pb-2 border-b border-foreground/10 font-mono text-[10px] text-muted-foreground">
                  <span className="uppercase">
                    RESULTS FOR "{q}" ({filteredAndSorted.length} ITEMS)
                  </span>
                </div>

                {/* Filters and sorting */}
                <div className="flex flex-wrap gap-4 items-center justify-between bg-stone-50/50 p-4 border border-foreground/5 text-xs font-mono">
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

                {/* Search grid */}
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
              </div>
            )}
          </div>
        ) : (
          /* Landing search state */
          <div className="text-center py-20 text-muted-foreground text-sm max-w-md mx-auto space-y-4">
            <p className="font-display italic text-lg text-foreground">What are you looking for?</p>
            <p className="leading-relaxed">
              Explore our capsule drops, hand-woven tops, lightweight trousers, and structural
              accessories.
            </p>
          </div>
        )}
      </main>

      <SiteFooter brandName={brandName} tagline={site?.settings?.footer_tagline} />
    </div>
  );
}
