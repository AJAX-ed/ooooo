"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

interface LoginProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="border border-white/10 bg-panel p-8 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">RegDesk Access</p>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-paper">Sign in to continue</h1>
        <p className="mt-4 leading-7 text-muted">Use your authorized Google account to access RegDesk.</p>

        {error && (
          <div className="mt-6 rounded border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-8 flex w-full min-h-12 items-center justify-center gap-3 bg-coral px-6 text-sm font-bold text-ink transition-colors hover:bg-paper disabled:opacity-50"
        >
          {loading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S14.86 2 12.2 2C6.73 2 2 6.73 2 12s4.73 10 10.2 10c5.34 0 9.25-3.78 9.25-9.05 0-1.4-.16-1.85-.1-1.85z"
                />
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <p className="mt-6 text-xs leading-6 text-muted">
          Note: You must be an authorized volunteer or administrator to access RegDesk after signing in.
        </p>
      </div>
    </div>
  );
}
