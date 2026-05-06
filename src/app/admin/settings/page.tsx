"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminSettingsPage() {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/login"; return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!profile || profile.role !== "admin") { window.location.href = "/login"; return; }
      setUserId(profile.id);
      setFullName(profile.full_name || "");
      setNickname(profile.nickname || "");
      setEmail(profile.email || "");
    })();
  }, []);

  const saveProfile = async () => {
    setError(""); setSaving(true);
    try {
      // Check if nickname is taken by another user
      if (nickname.trim()) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("nickname", nickname.trim())
          .neq("id", userId)
          .maybeSingle();
        if (existing) { setError("Nickname ja em uso"); setSaving(false); return; }
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), nickname: nickname.trim() || null })
        .eq("id", userId);
      if (profErr) throw profErr;

      // Update email if changed
      if (email && email !== (await supabase.auth.getUser()).data.user?.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email });
        if (emailErr) throw emailErr;
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword.length < 6) { setError("Senha: minimo 6 caracteres"); setSaving(false); return; }
        const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
        if (pwErr) throw pwErr;
        setNewPassword("");
      }

      showMsg("Configuracoes salvas!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      <header className="bg-[#0c0c0e] border-b border-white/[0.06] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-zinc-500 hover:text-zinc-300 text-[12px] transition-colors">← Voltar</a>
            <div className="h-4 w-px bg-white/10" />
            <h1 className="text-sm font-semibold text-white">Configuracoes do Admin</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 px-4 py-2.5 rounded-xl mb-4 text-[13px]">{message}</div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl mb-4 text-[13px]">{error}</div>
        )}

        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-5">
          <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-2">Perfil</h2>

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-widest">Nome</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors" />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-widest">Nickname</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors"
              placeholder="opcional" />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1.5 uppercase tracking-widest">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors" />
          </div>

          <div className="border-t border-white/[0.06] pt-5">
            <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-3">Trocar Senha</h2>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha (deixe em branco para nao alterar)"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors placeholder:text-zinc-600" />
          </div>

          <button onClick={saveProfile} disabled={saving}
            className="w-full bg-white hover:bg-zinc-100 disabled:bg-zinc-800 text-zinc-900 font-medium py-3 rounded-xl text-sm transition-all">
            {saving ? "Salvando..." : "Salvar Alteracoes"}
          </button>
        </div>
      </div>
    </div>
  );
}
