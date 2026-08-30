"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";

export default function VolunteerLoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const getMessage = () => {
    const authStatus = searchParams?.get("status");
    const authError = searchParams?.get("auth");

    if (authError === "failed") {
      return { type: "error" as const, text: "Authentication failed. Please try again." };
    } else if (authStatus === "unauthorized") {
      return { type: "error" as const, text: "Your Google account is not authorized for RegDesk. Please contact an administrator." };
    } else if (authStatus === "inactive") {
      return { type: "error" as const, text: "Your RegDesk access has been disabled. Please contact an administrator." };
    } else if (authStatus === "success") {
      return { type: "success" as const, text: "Successfully signed in!" };
    }
    return null;
  };

  const message = getMessage();

  const handleLogin = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 text-paper">
      <section className="w-full max-w-lg border border-white/10 bg-panel p-8 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">RegDesk / Volunteer</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Volunteer Access</h1>
        
        {message && (
          <div className={`mt-4 rounded-md p-4 ${message.type === "error" ? "bg-red-900/30 border border-red-700/50 text-red-200" : "bg-green-900/30 border border-green-700/50 text-green-200"}`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <button onClick={handleLogin} disabled={loading} className="w-full min-h-12 items-center justify-center bg-coral px-5 text-sm font-bold text-ink transition-colors hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed flex gap-2">
            {loading ? (<span>Signing in...</span>) : (<><svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>Continue with Google</>)}
          </button>
          <p className="text-xs leading-relaxed text-muted">Sign in with your authorized Google account. Only volunteers approved by event administrators can access the event desk.</p>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <a className="inline-flex min-h-10 items-center border border-white/20 px-5 text-sm font-bold transition-colors hover:border-coral hover:text-coral" href="/">Back to overview</a>
        </div>
      </section>
    </main>
  );
}
