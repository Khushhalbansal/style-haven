import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const itemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1),
  priceCents: z.number().int().min(0),
  currency: z.string().min(1),
  size: z.string().optional(),
  quantity: z.number().int().min(1),
});

const inputSchema = z.object({
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().optional(),
  shipping_address: z.string().min(1),
  shipping_city: z.string().min(1),
  shipping_postal: z.string().optional(),
  shipping_country: z.string().default("India"),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

function anonClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = anonClient();

    // Re-price server-side against DB (never trust client prices)
    const ids = Array.from(new Set(data.items.map((i) => i.productId)));
    const { data: prods, error: prodErr } = await supabase
      .from("products")
      .select("id,name,price_cents,currency,quantity,is_active")
      .in("id", ids);
    if (prodErr) throw new Error(prodErr.message);
    const map = new Map((prods ?? []).map((p) => [p.id, p]));

    let subtotal = 0;
    const currency = data.items[0]?.currency ?? "INR";
    const priced = data.items.map((i) => {
      const p = map.get(i.productId);
      if (!p || !p.is_active) throw new Error(`Product unavailable: ${i.name}`);
      const price = p.price_cents;
      subtotal += price * i.quantity;
      return {
        productId: p.id,
        name: p.name,
        size: i.size ?? null,
        quantity: i.quantity,
        priceCents: price,
        currency: p.currency,
        lineTotalCents: price * i.quantity,
      };
    });

    const total = subtotal; // shipping / tax = placeholder 0

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone ?? null,
        shipping_address: data.shipping_address,
        shipping_city: data.shipping_city,
        shipping_postal: data.shipping_postal ?? null,
        shipping_country: data.shipping_country ?? "India",
        items: priced,
        subtotal_cents: subtotal,
        total_cents: total,
        currency,
        notes: data.notes ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Failed to place order");

    // Fire-and-forget admin notification (never block the order confirmation)
    try {
      await import("./notify.server").then((m) => m.notifyAdminNewOrder(order.id));
    } catch (e) {
      console.error("[notify] failed", e);
    }

    return { orderId: order.id };
  });
