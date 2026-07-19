// Server-only: sends admin + customer email notifications via Resend connector.

async function loadOrderAndSettings(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;
  const { data: settings } = await supabaseAdmin
    .from("site_settings").select("*").eq("id", 1).maybeSingle();
  return { order, settings };
}

function renderRows(items: Array<Record<string, unknown>>, currency: string) {
  return items.map((i) => {
    const name = String(i.name ?? "");
    const size = i.size ? ` (${i.size})` : "";
    const qty = Number(i.quantity ?? 1);
    const total = Number(i.lineTotalCents ?? 0) / 100;
    return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${name}${size} × ${qty}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${currency} ${total.toFixed(2)}</td></tr>`;
  }).join("");
}

async function sendEmail(to: string, subject: string, html: string, brand: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[notify] RESEND_API_KEY is not configured — skipping email sending.");
    return;
  }
  
  // Clean brand name to be safe for display name (alphanumeric and spaces only)
  const safeBrand = brand.replace(/[^a-zA-Z0-9 ]/g, "");

  if (!resendKey.startsWith("re_")) {
    console.warn(
      `[notify] WARNING: The Resend API Key "${resendKey.slice(0, 8)}..." does not start with "re_". ` +
      `You may have copied the "API Key ID" (a UUID) from the Resend dashboard instead of the actual "API Key" token. ` +
      `Please generate a new API key in the Resend dashboard, copy the token starting with "re_", and set it as RESEND_API_KEY.`
    );
  }

  // Try sending directly via Resend API
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `${safeBrand} <onboarding@resend.dev>`,
        to: [to],
        subject,
        html,
      }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log(`[notify] Email sent successfully via Resend API directly to ${to}`);
      return;
    }
    console.warn(`[notify] Direct Resend API failed ${res.status}: ${text}. Trying Lovable gateway fallback.`);
  } catch (err) {
    console.error("[notify] Direct Resend API error:", err);
  }

  // Fallback to Lovable connector gateway if available
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) {
    console.warn("[notify] Lovable gateway not configured (missing LOVABLE_API_KEY) — email send complete/failed.");
    return;
  }
  
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: `${safeBrand} <onboarding@resend.dev>`,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error(`[notify] Lovable gateway failed ${res.status}: ${await res.text()}`);
    } else {
      console.log(`[notify] Email sent via Lovable gateway fallback to ${to}`);
    }
  } catch (err) {
    console.error("[notify] Lovable gateway error:", err);
  }
}


export async function notifyAdminNewOrder(orderId: string) {
  const ctx = await loadOrderAndSettings(orderId);
  if (!ctx) return;
  const { order, settings } = ctx;
  const adminEmail = settings?.admin_notification_email ?? "khushhal12196@gmail.com";
  const brand = settings?.brand_name ?? "khushhal's boutique";
  const items = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];
  const total = order.total_cents / 100;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#18181b">
      <p style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a97a3f">New order — ${brand}</p>
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:28px;margin:8px 0 20px">Order #${order.id.slice(0, 8)}</h1>
      <p><strong>${order.customer_name}</strong><br>${order.customer_email}${order.customer_phone ? `<br>${order.customer_phone}` : ""}</p>
      <p>${order.shipping_address}<br>${order.shipping_city}${order.shipping_postal ? ` ${order.shipping_postal}` : ""}<br>${order.shipping_country}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">${renderRows(items, order.currency)}
        <tr><td style="padding:12px;font-weight:600">Total</td><td style="padding:12px;text-align:right;font-weight:600">${order.currency} ${total.toFixed(2)}</td></tr>
      </table>
      ${order.notes ? `<p style="margin-top:16px;font-style:italic">${order.notes}</p>` : ""}
    </div>
  `;
  await sendEmail(adminEmail, `New order — ${order.customer_name} (${order.currency} ${total.toFixed(2)})`, html, brand);
}

export async function notifyCustomerOrderPlaced(orderId: string) {
  const ctx = await loadOrderAndSettings(orderId);
  if (!ctx) return;
  const { order, settings } = ctx;
  const brand = settings?.brand_name ?? "khushhal's boutique";
  const support = settings?.admin_notification_email ?? "";
  const items = Array.isArray(order.items) ? (order.items as Array<Record<string, unknown>>) : [];
  const total = order.total_cents / 100;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#18181b">
      <p style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a97a3f">${brand}</p>
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:28px;margin:8px 0 12px">Thank you, ${order.customer_name.split(" ")[0]}</h1>
      <p style="font-size:14px;line-height:1.6">We've received your order <strong>#${order.id.slice(0, 8)}</strong>. Payment instructions will follow shortly by email. Below is a copy of what you ordered.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">${renderRows(items, order.currency)}
        <tr><td style="padding:12px;font-weight:600">Total</td><td style="padding:12px;text-align:right;font-weight:600">${order.currency} ${total.toFixed(2)}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:13px;line-height:1.6">Shipping to:<br>${order.shipping_address}, ${order.shipping_city}${order.shipping_postal ? ` ${order.shipping_postal}` : ""}, ${order.shipping_country}</p>
      ${support ? `<p style="margin-top:20px;font-size:12px;color:#666">Questions? Reply to this email or write to ${support}.</p>` : ""}
    </div>
  `;
  await sendEmail(order.customer_email, `Order confirmed — ${brand} #${order.id.slice(0, 8)}`, html, brand);
}
