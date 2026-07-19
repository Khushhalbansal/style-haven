import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset password — khushhal's boutique" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase auto-processes the recovery hash and emits PASSWORD_RECOVERY / SIGNED_IN
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="max-w-md mx-auto px-6 py-24">
        <p className="eyebrow text-center">Account</p>
        <h1 className="font-display text-4xl md:text-5xl italic text-center mt-4">Set a new password</h1>
        {!ready ? (
          <p className="mt-10 text-sm text-muted-foreground text-center">
            Verifying reset link… If nothing happens, request a new link from the sign-in page.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-12 space-y-5">
            <label className="block">
              <span className="eyebrow mb-2 block">New password</span>
              <input name="password" type="password" required minLength={6} autoComplete="new-password"
                className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none focus:border-foreground" />
            </label>
            <label className="block">
              <span className="eyebrow mb-2 block">Confirm password</span>
              <input name="confirm" type="password" required minLength={6} autoComplete="new-password"
                className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none focus:border-foreground" />
            </label>
            <button type="submit" disabled={busy}
              className="w-full h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-colors disabled:opacity-50">
              {busy ? "…" : "Update password"}
            </button>
          </form>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
