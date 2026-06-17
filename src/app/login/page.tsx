"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMessage("Check your email for a login link.");
    } else {
      if (email.toLowerCase() === "demo@shopops.com" && password === "password123") {
        const response = await fetch("/api/demo-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          router.push("/");
          router.refresh();
          return;
        }

        if (response.status !== 404) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error ?? "Demo login failed.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/");
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f9ff] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-[#d8dbe5] bg-white text-2xl font-black tracking-tight shadow-sm">
            <span className="text-[#004787]">T</span>
            <span className="text-[#f2862e]">F</span>
          </div>
          <h1 className="text-[32px] font-bold leading-10 text-[#004787]">TruckFixr ShopOps</h1>
          <p className="mt-1 text-base leading-6 text-[#5f6673]">Secure shop terminal access</p>
        </div>

        <form onSubmit={handleSubmit} className="industrial-card space-y-5 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#424955]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-12 w-full rounded-lg border border-[#c2c6d3] bg-white px-3.5 py-3 text-base text-[#191c20] placeholder:text-[#858b98] focus:outline-none focus:ring-2 focus:ring-[#004787]"
              placeholder="demo@shopops.com"
            />
          </div>

          {mode === "password" && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#424955]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="min-h-12 w-full rounded-lg border border-[#c2c6d3] bg-white px-3.5 py-3 text-base text-[#191c20] focus:outline-none focus:ring-2 focus:ring-[#004787]"
                placeholder="password123"
              />
            </div>
          )}

          {error && <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-sm font-medium text-[#d32f2f]">{error}</p>}
          {message && <p className="rounded-lg bg-[#e8f5e9] px-3 py-2 text-sm font-medium text-[#2e7d32]">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-lg bg-[#004787] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[#1e5fa8] disabled:opacity-50"
          >
            {loading ? "Signing in..." : mode === "magic" ? "Send Login Link" : "Sign In"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "password" ? "magic" : "password")}
            className="w-full text-center text-sm font-semibold text-[#004787]"
          >
            {mode === "password" ? "Sign in with email link instead" : "Sign in with password instead"}
          </button>
        </form>

        <div className="mt-5 rounded-lg border border-dashed border-[#c2c6d3] bg-white px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#5f6673]">
          Secure Terminal - ISO 27001
        </div>
      </div>
    </div>
  );
}
