import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    return { isAdmin: !!data, userId: context.userId };
  });

export const adminGetOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [products, categories, orders, admins, settings] = await Promise.all([
      context.supabase.from("products").select("*").order("created_at", { ascending: false }),
      context.supabase.from("categories").select("*").order("sort_order"),
      context.supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase.from("admins").select("*").order("created_at"),
      context.supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    return {
      products: products.data ?? [],
      categories: categories.data ?? [],
      orders: orders.data ?? [],
      admins: admins.data ?? [],
      settings: settings.data ?? null,
    };
  });

// ---------- Categories ----------
const categoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
  is_visible: z.boolean().default(true),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => categoryInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("categories").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Products ----------
const productInput = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  price_cents: z.number().int().min(0),
  currency: z.string().default("INR"),
  quantity: z.number().int().min(0),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  return_policy: z.string().optional().nullable(),
});


export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => productInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Orders ----------
export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Settings ----------
const settingsInput = z.object({
  brand_name: z.string().min(1),
  logo_url: z.string().nullable().optional(),
  hero_eyebrow: z.string().nullable().optional(),
  hero_headline: z.string().nullable().optional(),
  hero_subhead: z.string().nullable().optional(),
  hero_image_url: z.string().nullable().optional(),
  marquee_items: z.array(z.string()).default([]),
  upcoming_title: z.string().nullable().optional(),
  upcoming_body: z.string().nullable().optional(),
  upcoming_image_url: z.string().nullable().optional(),
  homepage_category_ids: z.array(z.string().uuid()).default([]),
  admin_notification_email: z.string().email(),
  footer_tagline: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  support_email: z.string().nullable().optional(),
});


export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => settingsInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { whatsapp_number: _, support_email: __, ...dbData } = data;
    const { error } = await context.supabase
      .from("site_settings")
      .update({ ...dbData, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admins ----------
export const addAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("admins")
      .insert({ email: data.email.toLowerCase() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("admins").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
