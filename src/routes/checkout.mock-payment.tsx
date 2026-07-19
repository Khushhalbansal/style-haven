import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { formatMoney } from "@/lib/format";
import { getSiteSnapshot } from "@/lib/site.functions";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  orderId: z.string().uuid(),
});

export const Route = createFileRoute("/checkout/mock-payment")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Mock Payment Gateway — khushhal's boutique" }] }),
  component: MockPaymentPage,
});

function MockPaymentPage() {
  const { orderId } = Route.useSearch();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const { data: site } = useQuery({
    queryKey: ["site-snapshot"],
    queryFn: () => getSiteSnapshot(),
  });
  const brandName = site?.settings?.brand_name ?? "khushhal's boutique";

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSuccess = async () => {
    setProcessing(true);
    // Simulate brief latency
    setTimeout(() => {
      setProcessing(false);
      const mockSessionId = `mock_session_${crypto.randomUUID().slice(0, 8)}`;
      toast.success("Mock payment successful!");
      navigate({
        to: "/order/$id/confirmation",
        params: { id: orderId },
        search: { session_id: mockSessionId },
      });
    }, 1500);
  };

  const handleFailure = () => {
    toast.error("Mock payment cancelled / failed.");
    navigate({ to: "/checkout" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <SiteNav brandName={brandName} />

      <main className="max-w-md mx-auto w-full px-6 py-16 flex-1 flex flex-col justify-center">
        <div className="border border-foreground/10 p-8 space-y-6 bg-stone-50/50">
          <div className="text-center space-y-2">
            <p className="eyebrow text-primary">Simulated Gateway</p>
            <h1 className="font-display text-3xl italic">Select payment status</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Stripe keys are not configured. Use this screen to simulate checkout outcomes.
            </p>
          </div>

          {isLoading ? (
            <div className="py-6 text-center animate-pulse text-xs uppercase tracking-widest font-mono">
              Fetching order details...
            </div>
          ) : order ? (
            <div className="border-y border-foreground/10 py-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ORDER ID</span>
                <span className="font-semibold">{order.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AMOUNT DUE</span>
                <span className="font-semibold">
                  {formatMoney(order.total_cents, order.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">EMAIL</span>
                <span>{order.customer_email}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-destructive">Order not found.</div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleSuccess}
              disabled={processing || !order}
              className="w-full h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.25em] font-medium hover:bg-primary transition-colors disabled:opacity-50"
            >
              {processing ? "Authorizing..." : "Simulate Success"}
            </button>
            <button
              onClick={handleFailure}
              disabled={processing}
              className="w-full h-12 bg-transparent text-foreground border border-foreground/20 text-[11px] uppercase tracking-[0.25em] font-medium hover:border-foreground transition-colors disabled:opacity-50"
            >
              Cancel Payment
            </button>
          </div>
        </div>
      </main>

      <SiteFooter brandName={brandName} />
    </div>
  );
}
