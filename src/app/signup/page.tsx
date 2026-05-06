"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth";

export default function SignupPage() {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!nickname.trim()) { setError("Preencha o nickname"); setLoading(false); return; }
      if (password.length < 6) { setError("Senha: minimo 6 caracteres"); setLoading(false); return; }
      await signUp(nickname.trim(), password, fullName.trim() || nickname.trim());
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
        <div className="w-full max-w-[380px] bg-zinc-900/50 rounded-2xl border border-zinc-800/60 p-8 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Conta criada</h2>
          <p className="text-zinc-500 text-sm mb-6">Aguarde aprovacao do administrador.</p>
          <a href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors">← Voltar para login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-10">
          <h1 className="text-xl font-semibold text-white">Sports Ranking</h1>
          <p className="text-sm text-zinc-500 mt-1">Criar conta de arbitro</p>
        </div>

        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/60 p-7">
          {error && (
            <div className="bg-red-500/8 border border-red-500/15 text-red-400 px-4 py-2.5 rounded-xl mb-5 text-sm">{error}</div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-widest">Nome</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 focus:border-zinc-600 outline-none transition-colors placeholder:text-zinc-600"
                placeholder="Seu nome (opcional)" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-widest">Nickname</label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 focus:border-zinc-600 outline-none transition-colors placeholder:text-zinc-600"
                placeholder="Ex: juiz1, carlos" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-widest">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 focus:border-zinc-600 outline-none transition-colors placeholder:text-zinc-600"
                placeholder="Minimo 6 caracteres" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-white hover:bg-zinc-100 disabled:bg-zinc-800 text-zinc-900 font-medium py-3 rounded-xl text-sm transition-all">
              {loading ? "Criando..." : "Criar Conta"}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-zinc-600">
            Ja tem conta? <a href="/login" className="text-zinc-400 hover:text-white transition-colors">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  );
}
