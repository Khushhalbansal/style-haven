import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminGetOverview,
  checkIsAdmin,
  upsertCategory,
  deleteCategory,
  upsertProduct,
  deleteProduct,
  updateOrderStatus,
  updateSettings,
  addAdmin,
  removeAdmin,
} from "@/lib/admin.functions";
import { SignedImage } from "@/components/signed-image";
import { formatMoney, slugify } from "@/lib/format";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface OrderItem {
  productId: string;
  name: string;
  priceCents: number;
  currency: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  lineTotalCents?: number;
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin — khushhal's boutique" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    checkIsAdmin()
      .then((r) => {
        setOk(r.isAdmin);
        setChecked(true);
        if (!r.isAdmin) {
          toast.error("You do not have admin access");
        }
      })
      .catch(() => {
        setChecked(true);
      });
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminGetOverview(),
    enabled: ok,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!checked) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="eyebrow">Loading…</p>
      </div>
    );
  }
  if (!ok) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground px-6">
        <div className="text-center max-w-md">
          <p className="eyebrow">Restricted</p>
          <h1 className="font-display text-4xl italic mt-4">Admins only</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            This dashboard is only available to accounts on the admin list.
          </p>
          <button
            onClick={signOut}
            className="mt-8 border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-foreground/10 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <span className="font-display text-xl italic lowercase truncate">
            khushhal's boutique
          </span>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Studio
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-[11px] uppercase tracking-widest hover:text-primary">
            View site
          </a>
          <button
            onClick={signOut}
            className="text-[11px] uppercase tracking-widest hover:text-primary"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="eyebrow">Studio</p>
        <h1 className="font-display text-4xl md:text-5xl italic mt-2">Dashboard</h1>

        {isLoading || !data ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Tabs defaultValue="products" className="mt-10">
            <TabsList className="flex flex-wrap gap-2 bg-transparent border-b border-foreground/10 rounded-none p-0 h-auto">
              {["products", "categories", "orders", "settings", "admins"].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-foreground border-b-2 border-transparent px-4 py-3 text-[11px] uppercase tracking-widest data-[state=active]:shadow-none"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="products" className="mt-8">
              <ProductsPanel data={data} refetch={refetch} />
            </TabsContent>
            <TabsContent value="categories" className="mt-8">
              <CategoriesPanel data={data} refetch={refetch} />
            </TabsContent>
            <TabsContent value="orders" className="mt-8">
              <OrdersPanel data={data} refetch={refetch} />
            </TabsContent>
            <TabsContent value="settings" className="mt-8">
              <SettingsPanel data={data} refetch={refetch} />
            </TabsContent>
            <TabsContent value="admins" className="mt-8">
              <AdminsPanel data={data} refetch={refetch} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

type Overview = Awaited<ReturnType<typeof adminGetOverview>>;
interface PanelProps {
  data: Overview;
  refetch: () => void;
}

// ============ PRODUCTS ============
function ProductsPanel({ data, refetch }: PanelProps) {
  const [editing, setEditing] = useState<Partial<Overview["products"][number]> | null>(null);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data.products.length} products</p>
        <button
          onClick={() => setEditing({})}
          className="h-10 px-5 bg-foreground text-background text-[11px] uppercase tracking-widest hover:bg-primary"
        >
          New product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.products.map((p) => (
          <div key={p.id} className="border border-foreground/10 p-4 space-y-3">
            <div className="aspect-[4/5] bg-stone-100 overflow-hidden">
              <SignedImage
                src={p.images?.[0]}
                alt={p.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <h3 className="text-xs font-medium uppercase tracking-wider truncate">{p.name}</h3>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">
                  {formatMoney(p.price_cents, p.currency)} · qty {p.quantity} ·{" "}
                  {p.is_active ? "active" : "hidden"}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditing(p)}
                className="text-[10px] uppercase tracking-widest border-b border-foreground pb-0.5"
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete ${p.name}?`)) return;
                  try {
                    await deleteProduct({ data: { id: p.id } });
                    toast.success("Deleted");
                    refetch();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                className="text-[10px] uppercase tracking-widest text-destructive border-b border-destructive pb-0.5"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing !== null ? (
        <ProductForm
          initial={editing}
          categories={data.categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      ) : null}
    </div>
  );
}

function ProductForm({
  initial,
  categories,
  onClose,
  onSaved,
}: {
  initial: Partial<Overview["products"][number]>;
  categories: Overview["categories"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [priceRupees, setPriceRupees] = useState((initial.price_cents ?? 0) / 100);
  const [currency, setCurrency] = useState(initial.currency ?? "INR");
  const [quantity, setQuantity] = useState(initial.quantity ?? 1);
  const [categoryId, setCategoryId] = useState(initial.category_id ?? categories[0]?.id ?? "");
  const [sizesText, setSizesText] = useState((initial.sizes ?? []).join(", "));
  const [colorsText, setColorsText] = useState((initial.colors ?? []).join(", "));
  const [images, setImages] = useState<string[]>(initial.images ?? []);
  const [isActive, setIsActive] = useState(initial.is_active ?? true);
  const [returnPolicy, setReturnPolicy] = useState(initial.return_policy ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);


  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      setImages((imgs) => [...imgs, `product-images:${path}`]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const finalSlug = slug.trim() || slugify(name);
      await upsertProduct({
        data: {
          id: initial.id,
          name,
          slug: finalSlug,
          description,
          price_cents: Math.round(Number(priceRupees) * 100),
          currency,
          quantity: Number(quantity),
          category_id: categoryId || null,
          sizes: sizesText
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
          colors: colorsText
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
          images,
          is_active: isActive,
          return_policy: returnPolicy.trim() || null,
        },
      });

      toast.success("Product saved");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 md:p-10 overflow-auto">
      <div className="bg-background w-full max-w-3xl border border-foreground/10 p-6 md:p-8 space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="eyebrow">{initial.id ? "Edit" : "New"} product</p>
            <h2 className="font-display text-2xl italic mt-1">{name || "Untitled"}</h2>
          </div>
          <button onClick={onClose} className="text-[11px] uppercase tracking-widest">
            Close
          </button>
        </div>

        <FormField label="Name">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!initial.id && !slug) setSlug(slugify(e.target.value));
            }}
            className={inputCls}
          />
        </FormField>
        <FormField label="Slug">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-generated"
            className={inputCls}
          />
        </FormField>
        <FormField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputCls}
          />
        </FormField>

        <div className="grid sm:grid-cols-3 gap-4">
          <FormField label="Price (in Rupees/INR)">
            <input
              type="number"
              step="any"
              value={priceRupees}
              onChange={(e) => setPriceRupees(Number(e.target.value))}
              className={inputCls}
            />
          </FormField>
          <FormField label="Currency">
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className={inputCls}
            />
          </FormField>
          <FormField label="Quantity">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={inputCls}
            />
          </FormField>
        </div>

        <FormField label="Category">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputCls}
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Sizes (comma-separated)">
          <input
            value={sizesText}
            onChange={(e) => setSizesText(e.target.value)}
            placeholder="S, M, L, XL"
            className={inputCls}
          />
        </FormField>

        <FormField label="Colors (comma-separated, e.g. 'Ink Black:#0a0a0a, Sand:#e8d8c8')">
          <input
            value={colorsText}
            onChange={(e) => setColorsText(e.target.value)}
            placeholder="Black:#000000, Sand:#e8d8c8"
            className={inputCls}
          />
        </FormField>

        <FormField label="Return Policy">
          <select
            value={returnPolicy}
            onChange={(e) => setReturnPolicy(e.target.value)}
            className={inputCls}
          >
            <option value="">— no return policy —</option>
            <option value="7-day return & replacement">7-day return &amp; replacement</option>
            <option value="7-day replacement only">7-day replacement only</option>
            <option value="14-day return & replacement">14-day return &amp; replacement</option>
            <option value="14-day replacement only">14-day replacement only</option>
            <option value="30-day return & replacement">30-day return &amp; replacement</option>
            <option value="No returns — final sale">No returns — final sale</option>
          </select>
          <input
            value={returnPolicy}
            onChange={(e) => setReturnPolicy(e.target.value)}
            placeholder="Or type a custom policy…"
            className={`${inputCls} mt-2`}
          />
        </FormField>

        <FormField label="Images">
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative group aspect-[4/5] bg-stone-100">
                <SignedImage src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 bg-background/90 text-destructive text-[10px] px-2 py-0.5 opacity-0 group-hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            ))}
            <label className="aspect-[4/5] border border-dashed border-foreground/30 grid place-items-center cursor-pointer hover:bg-foreground/5">
              <span className="eyebrow">{uploading ? "Uploading…" : "+ Upload"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </FormField>

        <FormField label='Return policy (e.g. "7-day return, replacement only")'>
          <textarea value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} rows={3} placeholder="Shown on the product page. Leave blank to hide." className={inputCls} />
        </FormField>

        <label className="flex items-center gap-3 text-xs uppercase tracking-widest">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active (visible in store)
        </label>

        <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
          <button onClick={onClose} className="text-[11px] uppercase tracking-widest">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-11 px-8 bg-foreground text-background text-[11px] uppercase tracking-widest hover:bg-primary disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save product"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ CATEGORIES ============
function CategoriesPanel({ data, refetch }: PanelProps) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await upsertCategory({
        data: { name, slug: slugify(name), sort_order: data.categories.length, is_visible: true },
      });
      setName("");
      toast.success("Category added");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className={inputCls}
        />
        <button
          onClick={create}
          disabled={creating}
          className="h-11 px-5 bg-foreground text-background text-[11px] uppercase tracking-widest hover:bg-primary disabled:opacity-50 whitespace-nowrap"
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {data.categories.map((c) => (
          <CategoryRow key={c.id} category={c} onChanged={refetch} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  onChanged,
}: {
  category: Overview["categories"][number];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [visible, setVisible] = useState(category.is_visible);
  const [order, setOrder] = useState(category.sort_order);
  const [desc, setDesc] = useState(category.description ?? "");

  async function save() {
    try {
      await upsertCategory({
        data: {
          id: category.id,
          name,
          slug: category.slug,
          description: desc,
          sort_order: Number(order),
          is_visible: visible,
        },
      });
      toast.success("Saved");
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function del() {
    if (!confirm(`Delete category ${category.name}?`)) return;
    try {
      await deleteCategory({ data: { id: category.id } });
      toast.success("Deleted");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="border border-foreground/10 p-4">
      {editing ? (
        <div className="space-y-3">
          <FormField label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Description">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sort order">
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className={inputCls}
              />
            </FormField>
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest pt-6">
              <input
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
              />{" "}
              Visible
            </label>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setEditing(false)}
              className="text-[11px] uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="h-10 px-5 bg-foreground text-background text-[11px] uppercase tracking-widest hover:bg-primary"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{category.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              /{category.slug} · order {category.sort_order} ·{" "}
              {category.is_visible ? "visible" : "hidden"}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setEditing(true)}
              className="text-[10px] uppercase tracking-widest border-b border-foreground pb-0.5"
            >
              Edit
            </button>
            <button
              onClick={del}
              className="text-[10px] uppercase tracking-widest text-destructive border-b border-destructive pb-0.5"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ORDERS ============
function OrdersPanel({ data, refetch }: PanelProps) {
  return (
    <div className="space-y-4">
      {data.orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        data.orders.map((o) => (
          <details key={o.id} className="border border-foreground/10">
            <summary className="cursor-pointer flex items-center justify-between p-4 gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  #{o.id.slice(0, 8)} · {o.customer_name}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()} · {o.customer_email}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs">{formatMoney(o.total_cents, o.currency)}</span>
                <StatusSelect id={o.id} status={o.status} onChanged={refetch} />
              </div>
            </summary>
            <div className="p-6 border-t border-foreground/10 grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="eyebrow mb-2">Shipping</p>
                <p>
                  {o.customer_name}
                  {o.customer_phone ? ` · ${o.customer_phone}` : ""}
                  <br />
                  {o.shipping_address}
                  <br />
                  {o.shipping_city}
                  {o.shipping_postal ? ` ${o.shipping_postal}` : ""}
                  <br />
                  {o.shipping_country}
                </p>
                {o.notes ? <p className="mt-3 italic text-muted-foreground">"{o.notes}"</p> : null}
              </div>
              <div>
                <p className="eyebrow mb-2">Items</p>
                <div className="space-y-1">
                  {Array.isArray(o.items) &&
                    (o.items as unknown as OrderItem[]).map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span>
                          {it.name}
                          {it.size || it.color ? ` · ${[it.size, it.color].filter(Boolean).join(" / ")}` : ""} × {it.quantity}
                        </span>
                        <span className="font-mono">
                          {formatMoney(
                            it.lineTotalCents ?? it.priceCents * it.quantity,
                            o.currency,
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </details>
        ))
      )}
    </div>
  );
}

function StatusSelect({
  id,
  status,
  onChanged,
}: {
  id: string;
  status: string;
  onChanged: () => void;
}) {
  const [s, setS] = useState(status);
  async function change(v: string) {
    setS(v);
    try {
      await updateOrderStatus({
        data: {
          id,
          status: v as "pending" | "processing" | "shipped" | "delivered" | "cancelled",
        },
      });
      toast.success("Status updated");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
      setS(status);
    }
  }
  return (
    <select
      value={s}
      onChange={(e) => change(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="border border-foreground/20 bg-transparent text-[10px] uppercase tracking-widest px-2 py-1"
    >
      <option value="pending">Pending</option>
      <option value="processing">Processing</option>
      <option value="shipped">Shipped</option>
      <option value="delivered">Delivered</option>
      <option value="cancelled">Cancelled</option>
    </select>
  );
}

// ============ SETTINGS ============
function SettingsPanel({ data, refetch }: PanelProps) {
  const s = data.settings!;
  const [f, setF] = useState({
    brand_name: s.brand_name ?? "",
    logo_url: s.logo_url ?? "",
    hero_eyebrow: s.hero_eyebrow ?? "",
    hero_headline: s.hero_headline ?? "",
    hero_subhead: s.hero_subhead ?? "",
    hero_image_url: s.hero_image_url ?? "",
    marquee: (s.marquee_items ?? []).join(", "),
    upcoming_title: s.upcoming_title ?? "",
    upcoming_body: s.upcoming_body ?? "",
    upcoming_image_url: s.upcoming_image_url ?? "",
    homepage_category_ids: s.homepage_category_ids ?? [],
    admin_notification_email: s.admin_notification_email ?? "",
    footer_tagline: s.footer_tagline ?? "",
    whatsapp_number: (s as any).whatsapp_number ?? "",
    support_email: (s as any).support_email ?? "",
  });

  const [saving, setSaving] = useState(false);

  async function uploadTo(file: File, field: "logo_url" | "hero_image_url" | "upcoming_image_url") {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${field}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("site-assets")
      .upload(path, file, { contentType: file.type });
    if (error) {
      toast.error(error.message);
      return;
    }
    setF((prev) => ({ ...prev, [field]: `site-assets:${path}` }));
  }

  async function save() {
    setSaving(true);
    try {
      await updateSettings({
        data: {
          brand_name: f.brand_name,
          logo_url: f.logo_url || null,
          hero_eyebrow: f.hero_eyebrow || null,
          hero_headline: f.hero_headline || null,
          hero_subhead: f.hero_subhead || null,
          hero_image_url: f.hero_image_url || null,
          marquee_items: f.marquee
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          upcoming_title: f.upcoming_title || null,
          upcoming_body: f.upcoming_body || null,
          upcoming_image_url: f.upcoming_image_url || null,
          homepage_category_ids: f.homepage_category_ids,
          admin_notification_email: f.admin_notification_email,
          footer_tagline: f.footer_tagline || null,
        },
      });
      toast.success("Settings saved");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggleCat(id: string) {
    setF((prev) => ({
      ...prev,
      homepage_category_ids: prev.homepage_category_ids.includes(id)
        ? prev.homepage_category_ids.filter((x) => x !== id)
        : [...prev.homepage_category_ids, id],
    }));
  }
  function moveCat(id: string, dir: -1 | 1) {
    setF((prev) => {
      const arr = [...prev.homepage_category_ids];
      const i = arr.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...prev, homepage_category_ids: arr };
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-4">
        <p className="eyebrow">Brand</p>
        <FormField label="Brand name">
          <input
            value={f.brand_name}
            onChange={(e) => setF({ ...f, brand_name: e.target.value })}
            className={inputCls}
          />
        </FormField>
        <FormField label="Logo (optional)">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-stone-100">
              <SignedImage
                src={f.logo_url}
                bucket="site-assets"
                alt="logo"
                className="w-full h-full object-contain"
              />
            </div>
            <label className="text-[11px] uppercase tracking-widest border-b border-foreground pb-0.5 cursor-pointer">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadTo(e.target.files[0], "logo_url")}
              />
            </label>
            {f.logo_url ? (
              <button
                onClick={() => setF({ ...f, logo_url: "" })}
                className="text-[10px] text-destructive uppercase tracking-widest"
              >
                Remove
              </button>
            ) : null}
          </div>
        </FormField>
        <FormField label="Footer tagline">
          <input
            value={f.footer_tagline}
            onChange={(e) => setF({ ...f, footer_tagline: e.target.value })}
            className={inputCls}
          />
        </FormField>
      </div>

      <div className="space-y-4 border-t border-foreground/10 pt-6">
        <p className="eyebrow">Hero</p>
        <FormField label="Eyebrow">
          <input
            value={f.hero_eyebrow}
            onChange={(e) => setF({ ...f, hero_eyebrow: e.target.value })}
            className={inputCls}
          />
        </FormField>
        <FormField label="Headline">
          <input
            value={f.hero_headline}
            onChange={(e) => setF({ ...f, hero_headline: e.target.value })}
            className={inputCls}
          />
        </FormField>
        <FormField label="Subhead">
          <textarea
            value={f.hero_subhead}
            onChange={(e) => setF({ ...f, hero_subhead: e.target.value })}
            rows={2}
            className={inputCls}
          />
        </FormField>
        <FormField label="Hero image">
          <div className="flex items-center gap-4">
            <div className="w-28 aspect-[3/4] bg-stone-100">
              <SignedImage
                src={f.hero_image_url}
                bucket="site-assets"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <label className="text-[11px] uppercase tracking-widest border-b border-foreground pb-0.5 cursor-pointer">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && uploadTo(e.target.files[0], "hero_image_url")
                }
              />
            </label>
            {f.hero_image_url ? (
              <button
                onClick={() => setF({ ...f, hero_image_url: "" })}
                className="text-[10px] text-destructive uppercase tracking-widest"
              >
                Remove
              </button>
            ) : null}
          </div>
        </FormField>
        <FormField label="Marquee items (comma-separated)">
          <input
            value={f.marquee}
            onChange={(e) => setF({ ...f, marquee: e.target.value })}
            className={inputCls}
          />
        </FormField>
      </div>

      <div className="space-y-4 border-t border-foreground/10 pt-6">
        <p className="eyebrow">Homepage sections</p>
        <p className="text-xs text-muted-foreground">
          Choose which categories appear on the homepage, in order. Unselected categories still
          exist in the shop but are hidden from home.
        </p>
        <div className="space-y-2">
          {data.categories.map((c) => {
            const selected = f.homepage_category_ids.includes(c.id);
            const pos = f.homepage_category_ids.indexOf(c.id);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between border border-foreground/10 p-3"
              >
                <label className="flex items-center gap-3 text-sm">
                  <input type="checkbox" checked={selected} onChange={() => toggleCat(c.id)} />
                  {c.name}
                </label>
                {selected ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">#{pos + 1}</span>
                    <button
                      onClick={() => moveCat(c.id, -1)}
                      className="w-6 h-6 border border-foreground/20"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveCat(c.id, 1)}
                      className="w-6 h-6 border border-foreground/20"
                    >
                      ↓
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 border-t border-foreground/10 pt-6">
        <p className="eyebrow">Upcoming section</p>
        <FormField label="Title">
          <input
            value={f.upcoming_title}
            onChange={(e) => setF({ ...f, upcoming_title: e.target.value })}
            className={inputCls}
          />
        </FormField>
        <FormField label="Body">
          <textarea
            value={f.upcoming_body}
            onChange={(e) => setF({ ...f, upcoming_body: e.target.value })}
            rows={3}
            className={inputCls}
          />
        </FormField>
        <FormField label="Image">
          <div className="flex items-center gap-4">
            <div className="w-24 aspect-square bg-stone-100">
              <SignedImage
                src={f.upcoming_image_url}
                bucket="site-assets"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <label className="text-[11px] uppercase tracking-widest border-b border-foreground pb-0.5 cursor-pointer">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && uploadTo(e.target.files[0], "upcoming_image_url")
                }
              />
            </label>
            {f.upcoming_image_url ? (
              <button
                onClick={() => setF({ ...f, upcoming_image_url: "" })}
                className="text-[10px] text-destructive uppercase tracking-widest"
              >
                Remove
              </button>
            ) : null}
          </div>
        </FormField>
      </div>

      <div className="space-y-4 border-t border-foreground/10 pt-6">
        <p className="eyebrow">Notifications</p>
        <FormField label="Admin notification email">
          <input
            value={f.admin_notification_email}
            onChange={(e) => setF({ ...f, admin_notification_email: e.target.value })}
            className={inputCls}
          />
        </FormField>
        <p className="text-xs text-muted-foreground">
          New orders send a notification here. Once the Resend connector is linked in the workspace,
          delivery is automatic.
        </p>
      </div>


      <div className="flex justify-end border-t border-foreground/10 pt-6">
        <button
          onClick={save}
          disabled={saving}
          className="h-11 px-8 bg-foreground text-background text-[11px] uppercase tracking-widest hover:bg-primary disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

// ============ ADMINS ============
function AdminsPanel({ data, refetch }: PanelProps) {
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  async function add() {
    if (!email.trim()) return;
    setAdding(true);
    try {
      await addAdmin({ data: { email } });
      toast.success("Admin added");
      setEmail("");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAdding(false);
    }
  }
  async function del(id: string) {
    if (!confirm("Remove this admin?")) return;
    try {
      await removeAdmin({ data: { id } });
      toast.success("Removed");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-xs text-muted-foreground">
        Any account that signs up with one of these email addresses gets admin access. Emails are
        matched case-insensitively.
      </p>
      <div className="flex gap-2">
        <input
          value={email}
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className={inputCls}
        />
        <button
          onClick={add}
          disabled={adding}
          className="h-11 px-5 bg-foreground text-background text-[11px] uppercase tracking-widest hover:bg-primary disabled:opacity-50 whitespace-nowrap"
        >
          Add
        </button>
      </div>
      <div className="space-y-2">
        {data.admins.map((a) => (
          <div
            key={a.id}
            className="border border-foreground/10 p-4 flex justify-between items-center"
          >
            <span className="text-sm">{a.email}</span>
            <button
              onClick={() => del(a.id)}
              className="text-[10px] uppercase tracking-widest text-destructive border-b border-destructive pb-0.5"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ SHARED ============
const inputCls =
  "w-full bg-transparent border border-foreground/20 px-3 py-2 text-sm focus:outline-none focus:border-foreground";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      {children}
    </label>
  );
}
