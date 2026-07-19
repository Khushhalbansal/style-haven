import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import Stripe from "stripe";

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;
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

export async function handleStripeWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret || !process.env.STRIPE_SECRET_KEY) {
    return new Response("Missing Stripe configuration or signature", { status: 400 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: "2025-01-27.acacia" as any,
    });

    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId && session.payment_status === "paid") {
        const supabase = getSupabaseClient();

        // Update order status in Supabase
        const { error } = await supabase
          .from("orders")
          .update({ status: "paid", payment_intent_id: session.id })
          .eq("id", orderId)
          .eq("status", "pending");

        if (error) {
          console.error("[Stripe Webhook] Supabase update failed:", error.message);
          return new Response(`Database update error: ${error.message}`, { status: 500 });
        }

        console.log(`[Stripe Webhook] Order ${orderId} successfully completed and marked paid.`);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`, {
      status: 400,
    });
  }
}
