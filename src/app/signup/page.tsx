"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setMessage("Check your email to confirm your account, then sign in.");
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
          <h1 className="text-[32px] font-bold leading-10 text-[#004787]">Create account</h1>
          <p className="mt-1 text-base leading-6 text-[#5f6673]">Start a new ShopOps terminal</p>
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
              placeholder="you@shop.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#424955]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="min-h-12 w-full rounded-lg border border-[#c2c6d3] bg-white px-3.5 py-3 text-base text-[#191c20] focus:outline-none focus:ring-2 focus:ring-[#004787]"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#424955]">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="min-h-12 w-full rounded-lg border border-[#c2c6d3] bg-white px-3.5 py-3 text-base text-[#191c20] focus:outline-none focus:ring-2 focus:ring-[#004787]"
              placeholder="Repeat password"
            />
          </div>

          {error && <p className="rounded-lg bg-[#fdecec] px-3 py-2 text-sm font-medium text-[#d32f2f]">{error}</p>}
          {message && <p className="rounded-lg bg-[#e8f5e9] px-3 py-2 text-sm font-medium text-[#2e7d32]">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-lg bg-[#004787] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[#1e5fa8] disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <Link href="/login" className="block w-full text-center text-sm font-semibold text-[#004787]">
            Already have an account? Sign in
          </Link>
        </form>
      </div>
    </div>
  );
}
