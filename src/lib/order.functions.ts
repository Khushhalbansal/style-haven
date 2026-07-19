import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
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
  user_id: z.string().uuid().optional(),
});

function anonClient() {
  const url = process.env.SUPABASE_URL ?? "https://ijnpmdjxyabudclzudnn.supabase.co";
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_FOD-4hJz5ewYFPkD9Olu9A_cxTIgelB";
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function extractUserId(): Promise<string | null> {
  try {
    const req = getRequest();
    const auth = req?.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    if (token.split(".").length !== 3) return null;
    const supabase = anonClient();
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export const placeOrder = createServerFn({ method: "POST" })
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = anonClient();
    const userId = await extractUserId();

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
      if (p.quantity < i.quantity) {
        throw new Error(`Insufficient stock for ${i.name}. Only ${p.quantity} available.`);
      }
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

    const total = subtotal;

    // Call place_order_atomic RPC to atomically validate/decrement stock and insert order
    const { data: orderId, error } = await supabase.rpc("place_order_atomic", {
      _customer_name: data.customer_name,
      _customer_email: data.customer_email,
      _customer_phone: data.customer_phone ?? null,
      _shipping_address: data.shipping_address,
      _shipping_city: data.shipping_city,
      _shipping_postal: data.shipping_postal ?? null,
      _shipping_country: data.shipping_country ?? "India",
      _items: priced as unknown as Json,
      _subtotal_cents: subtotal,
      _total_cents: total,
      _currency: currency,
      _notes: data.notes ?? null,
      _user_id: data.user_id ?? null,
    });

    if (error || !orderId) throw new Error(error?.message ?? "Failed to place order");
    const order = { id: orderId };

    // Stripe checkout session creation
    let checkoutUrl = `/checkout/mock-payment?orderId=${order.id}`;

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const StripeLib = await import("stripe");
        const stripe = new StripeLib.default(process.env.STRIPE_SECRET_KEY, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          apiVersion: "2025-01-27.acacia" as any,
        });

        const appUrl = process.env.APP_URL || "http://localhost:8080";
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: priced.map((item) => ({
            price_data: {
              currency: item.currency.toLowerCase(),
              product_data: {
                name: item.name + (item.size ? ` (${item.size})` : ""),
              },
              unit_amount: item.priceCents,
            },
            quantity: item.quantity,
          })),
          mode: "payment",
          success_url: `${appUrl}/order/${order.id}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/checkout`,
          metadata: {
            orderId: order.id,
          },
        });

        if (session.url) {
          checkoutUrl = session.url;
          // Store session id as payment_intent_id in DB
          await supabase
            .from("orders")
            .update({ payment_intent_id: session.id })
            .eq("id", order.id);
        }
      } catch (stripeErr) {
        console.error("[Stripe] Failed to create checkout session:", stripeErr);
        // Fall back to mock payment if Stripe fails during configuration issues
      }
    }

    try {
      const notify = await import("./notify.server");
      await notify.notifyAdminNewOrder(order.id);
      await notify.notifyCustomerOrderPlaced(order.id);
    } catch (e) {
      console.error("[notify] failed", e);
    }

    return { orderId: order.id, checkoutUrl };
  });

const confirmSchema = z.object({
  orderId: z.string().uuid(),
  sessionId: z.string(),
});

export const confirmPayment = createServerFn({ method: "POST" })
  .validator((data: unknown) => confirmSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = anonClient();

    // 1. Check if order is already paid
    const { data: order, error: getErr } = await supabase
      .from("orders")
      .select("status, payment_intent_id")
      .eq("id", data.orderId)
      .maybeSingle();

    if (getErr) throw new Error(getErr.message);
    if (!order) throw new Error("Order not found");
    if (order.status === "paid") {
      return { success: true, alreadyConfirmed: true };
    }

    // 2. If it's a mock session:
    if (data.sessionId.startsWith("mock_")) {
      const { error } = await supabase
        .from("orders")
        .update({ status: "paid", payment_intent_id: data.sessionId })
        .eq("id", data.orderId);
      if (error) throw new Error(error.message);
      return { success: true };
    }

    // 3. If it's a Stripe session:
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const StripeLib = await import("stripe");
        const stripe = new StripeLib.default(process.env.STRIPE_SECRET_KEY, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          apiVersion: "2025-01-27.acacia" as any,
        });
        const session = await stripe.checkout.sessions.retrieve(data.sessionId);
        if (session.payment_status === "paid") {
          const { error } = await supabase
            .from("orders")
            .update({ status: "paid", payment_intent_id: session.id })
            .eq("id", data.orderId);
          if (error) throw new Error(error.message);
          return { success: true };
        } else {
          throw new Error(`Stripe payment status is ${session.payment_status}`);
        }
      } catch (stripeErr) {
        console.error("[Stripe] Failed to retrieve session or update order:", stripeErr);
        throw new Error(
          stripeErr instanceof Error ? stripeErr.message : "Payment verification failed",
        );
      }
    }

    throw new Error("Stripe is not configured and a mock session was not provided.");
  });
