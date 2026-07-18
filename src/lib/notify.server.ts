// Server-only: sends the admin notification email for a new order.
// Uses the Resend connector via the Lovable connector gateway when configured.

export async function notifyAdminNewOrder(orderId: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const { data: settings } = await supabaseAdmin
    .from("site_settings")
    .select("brand_name, admin_notification_email")
    .eq("id", 1)
    .maybeSingle();

  const adminEmail = settings?.admin_notification_email ?? "khushhal12196@gmail.com";
  const brand = settings?.brand_name ?? "khushhal's boutique";

  const items = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];
  const rows = items
    .map((i) => {
      const name = String(i.name ?? "");
      const size = i.size ? ` (${i.size})` : "";
      const qty = Number(i.quantity ?? 1);
      const total = Number(i.lineTotalCents ?? 0) / 100;
      return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${name}${size} × ${qty}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${order.currency} ${total.toFixed(2)}</td></tr>`;
    })
    .join("");

  const total = order.total_cents / 100;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#18181b">
      <p style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a97a3f">New order — ${brand}</p>
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:28px;margin:8px 0 20px">Order #${order.id.slice(0, 8)}</h1>
      <p><strong>${order.customer_name}</strong><br>${order.customer_email}${order.customer_phone ? `<br>${order.customer_phone}` : ""}</p>
      <p>${order.shipping_address}<br>${order.shipping_city}${order.shipping_postal ? ` ${order.shipping_postal}` : ""}<br>${order.shipping_country}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">${rows}
        <tr><td style="padding:12px;font-weight:600">Total</td><td style="padding:12px;text-align:right;font-weight:600">${order.currency} ${total.toFixed(2)}</td></tr>
      </table>
      ${order.notes ? `<p style="margin-top:16px;font-style:italic">${order.notes}</p>` : ""}
    </div>
  `;

  if (!lovableKey || !resendKey) {
    console.warn("[notify] Resend connector not configured — skipping email. Order:", order.id);
    return;
  }

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: `${brand} <onboarding@resend.dev>`,
      to: [adminEmail],
      subject: `New order — ${order.customer_name} (${order.currency} ${total.toFixed(2)})`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[notify] resend failed ${res.status}: ${body}`);
  }
}
