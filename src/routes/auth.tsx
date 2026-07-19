import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — khushhal's boutique" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();

    // ── Forgot password ──
    if (mode === "forgot") {
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw error;
        setResetSent(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not send reset email");
      } finally {
        setBusy(false);
      }
      return;
    }

    // ── Sign in / Sign up ──
    const password = String(fd.get("password") ?? "");
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Redirect: admin -> /admin, respect redirect param, otherwise home
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: adminCheck } = await supabase.rpc("is_admin", { _user_id: u.user.id });
        if (adminCheck) {
          navigate({ to: "/admin" });
        } else if (redirect && redirect.startsWith("/")) {
          navigate({ to: redirect as "/" });
        } else {
          navigate({ to: "/" });
        }
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
          <div className="mt-10 flex flex-col items-center gap-4">
            {redirect && redirect.startsWith("/") ? (
              <Link
                to={redirect as "/"}
                className="w-full h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] inline-flex items-center justify-center hover:bg-primary transition-colors"
              >
                Continue to {redirect === "/checkout" ? "Checkout" : redirect.replace("/", "")}
              </Link>
            ) : null}
            <div className="flex justify-center gap-6">
              <Link
                to="/account/orders"
                className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
              >
                My Orders
              </Link>
              <Link
                to="/"
                className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
              >
                Shop
              </Link>
              <button
                onClick={signOut}
                className="border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  // ── Forgot password success screen ──
  if (mode === "forgot" && resetSent) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="eyebrow">Password reset</p>
          <h1 className="font-display text-4xl italic mt-4">Check your inbox</h1>
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
            We've sent a password reset link to your email address. Click the link in the email to
            set a new password.
          </p>
          <button
            onClick={() => {
              setMode("signin");
              setResetSent(false);
            }}
            className="mt-10 border-b border-foreground pb-1 text-[11px] uppercase tracking-widest"
          >
            Back to sign in
          </button>
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
          {mode === "signin"
            ? "Welcome back"
            : mode === "signup"
              ? "Create account"
              : "Reset password"}
        </h1>

        {redirect === "/checkout" && mode !== "forgot" ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Sign in to continue to checkout. Your cart will be preserved.
          </p>
        ) : null}

        {mode === "forgot" ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-12 space-y-5">
          <label className="block">
            <span className="eyebrow mb-2 block">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none focus:border-foreground"
            />
          </label>
          {mode !== "forgot" ? (
            <label className="block">
              <span className="eyebrow mb-2 block">Password</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full bg-transparent border-b border-foreground/20 py-2 text-sm focus:outline-none focus:border-foreground"
              />
            </label>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 bg-foreground text-background text-[11px] uppercase tracking-[0.3em] hover:bg-primary transition-colors disabled:opacity-50"
          >
            {busy
              ? "…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>

        {mode === "signin" ? (
          <p className="mt-4 text-center">
            <button
              onClick={() => setMode("forgot")}
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground border-b border-muted-foreground pb-0.5 transition-colors"
            >
              Forgot password?
            </button>
          </p>
        ) : null}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "forgot" ? (
            <>
              Remembered it?{" "}
              <button
                onClick={() => setMode("signin")}
                className="border-b border-foreground text-foreground uppercase tracking-widest text-[10px] pb-0.5 ml-1"
              >
                Sign in
              </button>
            </>
          ) : mode === "signin" ? (
            <>
              New here?{" "}
              <button
                onClick={() => setMode("signup")}
                className="border-b border-foreground text-foreground uppercase tracking-widest text-[10px] pb-0.5 ml-1"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("signin")}
                className="border-b border-foreground text-foreground uppercase tracking-widest text-[10px] pb-0.5 ml-1"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
