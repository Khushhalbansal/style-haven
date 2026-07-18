import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — khushhal's boutique" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created. You are signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Redirect: admin -> /admin, otherwise home
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: adminCheck } = await supabase.rpc("is_admin", { _user_id: u.user.id });
        navigate({ to: adminCheck ? "/admin" : "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
  }

  if (session) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="eyebrow">Account</p>
          <h1 className="font-display text-4xl italic mt-4">You're signed in</h1>
          <p className="mt-4 text-sm text-muted-foreground">{session.user?.email}</p>
          <div className="mt-10 flex justify-center gap-6">
            <Link to="/" className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest">Continue shopping</Link>
            <button onClick={signOut} className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest">Sign out</button>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="max-w-md mx-auto px-6 py-24">
        <p className="eyebrow text-center">The Archive</p>
        <h1 className="font-display text-4xl md:text-5xl italic text-center mt-4">
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h1>

        <form onSubmit={onSubmit} className="mt-12 space-y-5">
          <label className="block">
            <span className="eyebrow mb-2 block">Email</span>
            <input name="email" type="email" required autoComplete="email"
              className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none focus:border-foreground" />
          </label>
          <label className="block">
            <span className="eyebrow mb-2 block">Password</span>
            <input name="password" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none focus:border-foreground" />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-colors disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="border-b border-foreground text-foreground uppercase tracking-widest text-[10px] pb-0.5 ml-1"
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
