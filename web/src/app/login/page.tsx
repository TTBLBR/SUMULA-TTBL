"use client";

import { useState } from "react";
import { signIn, signInWithNickname } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Try nickname first, then email
      const isEmail = identifier.includes("@");
      if (isEmail) {
        await signIn(identifier, password);
      } else {
        await signInWithNickname(identifier, password);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Login failed");

      const { data: profile } = await supabase.from("profiles").select("role, approved").eq("id", session.user.id).single();
      if (!profile) throw new Error("Profile not found");
      if (profile.role === "judge" && !profile.approved) {
        setError("Conta aguardando aprovacao do administrador.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      window.location.href = profile.role === "admin" ? "/admin" : "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-10">
          <h1 className="text-xl font-semibold text-white">Sports Ranking</h1>
          <p className="text-sm text-zinc-500 mt-1">Sistema de pontuacao</p>
        </div>

        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/60 p-7">
          {error && (
            <div className="bg-red-500/8 border border-red-500/15 text-red-400 px-4 py-2.5 rounded-xl mb-5 text-sm">{error}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-widest">Nickname ou Email</label>
              <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 focus:border-zinc-600 outline-none transition-colors placeholder:text-zinc-600"
                placeholder="Seu nickname ou email" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-widest">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 focus:border-zinc-600 outline-none transition-colors placeholder:text-zinc-600"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 font-medium py-3 rounded-xl text-sm transition-all">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-zinc-600">
            Nao tem conta? <a href="/signup" className="text-zinc-400 hover:text-white transition-colors">Criar conta</a>
          </p>
        </div>
      </div>
    </div>
  );
}
