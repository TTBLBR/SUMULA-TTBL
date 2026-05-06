"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";

interface Category { id: string; name: string; phase: string; }
interface Profile { id: string; email: string; full_name: string; nickname: string | null; role: string; approved: boolean; category_id: string | null; division_id: string | null; }
interface Division { id: string; category_id: string; name: string; }

const PRESET_CATEGORIES = [
  "Open Bodybuilding", "Classic Physique", "Men's Physique", "Culturismo Classico",
  "Wellness", "Bikini", "Figure", "Fitguy", "Fitgirl",
];

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [divisions, setDivisions] = useState<Record<string, Division[]>>({});
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatPhase, setNewCatPhase] = useState("");
  const [adminName, setAdminName] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"categories" | "users" | "display">("categories");
  const [displayCatId, setDisplayCatId] = useState<string | null>(null);
  const [displayDivId, setDisplayDivId] = useState<string | null>(null);

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/login"; return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (!profile || profile.role !== "admin") { window.location.href = "/login"; return; }
    setAdminName(profile.full_name || profile.email);

    const { data: cats } = await supabase.from("categories").select("*").order("created_at", { ascending: true });
    setCategories(cats || []);

    const divMap: Record<string, Division[]> = {};
    for (const cat of (cats || [])) {
      const { data: divs } = await supabase.from("divisions").select("*").eq("category_id", cat.id).order("sort_order");
      divMap[cat.id] = divs || [];
    }
    setDivisions(divMap);

    const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
    setAllUsers(users || []);
    setPendingUsers((users || []).filter((u) => !u.approved && u.role === "judge"));

    const { data: config } = await supabase.from("display_config").select("category_id, division_id").eq("id", 1).single();
    if (config) { setDisplayCatId(config.category_id); setDisplayDivId(config.division_id); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createCat = async (name: string, phase: string = "") => {
    if (!name.trim()) return;
    await supabase.from("categories").insert({ name: name.trim(), phase: phase.trim() });
    showMsg("Categoria criada"); fetchData();
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    await supabase.from("categories").delete().eq("id", id); fetchData();
  };

  const approveUser = async (id: string) => {
    await supabase.from("profiles").update({ approved: true }).eq("id", id);
    showMsg("Aprovado"); fetchData();
  };

  const rejectUser = async (id: string) => {
    await supabase.from("profiles").update({ approved: false }).eq("id", id); fetchData();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Excluir este usuario permanentemente?")) return;
    await supabase.from("profiles").delete().eq("id", id);
    showMsg("Usuario excluido"); fetchData();
  };

  const assignCategory = async (userId: string, categoryId: string) => {
    await supabase.from("profiles").update({ category_id: categoryId || null, division_id: null }).eq("id", userId); fetchData();
  };

  const assignDivision = async (userId: string, divisionId: string) => {
    await supabase.from("profiles").update({ division_id: divisionId || null }).eq("id", userId); fetchData();
  };

  const setDisplay = async (catId: string | null, divId: string | null) => {
    await fetch("/api/display", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: catId, divisionId: divId }) });
    setDisplayCatId(catId); setDisplayDivId(divId);
    showMsg("Display atualizado");
  };

  const handleSignOut = async () => { await signOut(); window.location.href = "/login"; };
  const existingNames = categories.map((c) => c.name);
  const availablePresets = PRESET_CATEGORIES.filter((p) => !existingNames.includes(p));

  const initials = (name: string) => name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Sidebar-style header */}
      <header className="bg-[#0c0c0e] border-b border-white/[0.06] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">Sports Ranking</span>
            <span className="text-[11px] text-zinc-600 ml-1">/ Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/display" target="_blank" className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">
              Display ↗
            </a>
            <a href="/admin/settings" className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">
              Configuracoes
            </a>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-zinc-400 font-medium">
                {initials(adminName)}
              </div>
              <button onClick={handleSignOut} className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors">Sair</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {message && (
          <div className="bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 px-4 py-2.5 rounded-xl mb-6 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {message}
          </div>
        )}

        {pendingUsers.length > 0 && tab !== "users" && (
          <div className="bg-amber-500/5 border border-amber-500/10 text-amber-300/80 px-4 py-3 rounded-xl mb-6 flex items-center justify-between text-sm">
            <span>{pendingUsers.length} usuario(s) pendente(s)</span>
            <button onClick={() => setTab("users")} className="text-amber-400 hover:text-amber-300 font-medium">Revisar →</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-white/[0.06]">
          {[
            { key: "categories" as const, label: "Categorias", badge: 0 },
            { key: "users" as const, label: "Usuarios", badge: pendingUsers.length },
            { key: "display" as const, label: "Display", badge: 0 },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                tab === t.key ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {t.label}
              {t.badge > 0 && <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{t.badge}</span>}
              {tab === t.key && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
            </button>
          ))}
        </div>

        {/* CATEGORIES TAB */}
        {tab === "categories" && (
          <div className="space-y-8">
            {availablePresets.length > 0 && (
              <div>
                <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-3">Adicao Rapida</h2>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.map((name) => (
                    <button key={name} onClick={() => createCat(name)}
                      className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-xl text-sm transition-all">
                      <span className="text-zinc-600 group-hover:text-zinc-400 mr-1">+</span>{name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-3">Personalizada</h2>
              <div className="flex gap-3">
                <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria"
                  className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors placeholder:text-zinc-600"
                  onKeyDown={(e) => e.key === "Enter" && (createCat(newCatName, newCatPhase), setNewCatName(""), setNewCatPhase(""))} />
                <input type="text" value={newCatPhase} onChange={(e) => setNewCatPhase(e.target.value)}
                  placeholder="Fase"
                  className="w-36 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors placeholder:text-zinc-600" />
                <button onClick={() => { createCat(newCatName, newCatPhase); setNewCatName(""); setNewCatPhase(""); }}
                  className="bg-white hover:bg-zinc-100 text-zinc-900 font-medium px-5 py-2.5 rounded-xl text-sm transition-colors shrink-0">Criar</button>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-20 text-zinc-700 text-sm">Nenhuma categoria criada</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl p-5 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-white text-[15px]">{cat.name}</h3>
                        {cat.phase && <p className="text-[12px] text-zinc-500 mt-0.5">{cat.phase}</p>}
                      </div>
                      <button onClick={() => deleteCat(cat.id)} className="text-zinc-700 hover:text-red-400 text-[11px] opacity-0 group-hover:opacity-100 transition-all">
                        Excluir
                      </button>
                    </div>
                    {(divisions[cat.id] || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(divisions[cat.id] || []).map((d) => (
                          <span key={d.id} className="text-[11px] bg-white/[0.04] text-zinc-500 px-2 py-0.5 rounded-md">{d.name}</span>
                        ))}
                      </div>
                    )}
                    <a href={`/admin/categories/${cat.id}`}
                      className="block text-center bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white font-medium py-2.5 rounded-xl text-[13px] transition-all">
                      Gerenciar →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-6 py-3.5 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Usuario</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Categoria</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Divisao</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Acao</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => {
                  const userCatId = (user as unknown as { category_id: string | null }).category_id;
                  const userDivId = (user as unknown as { division_id: string | null }).division_id;
                  const catDivs = userCatId ? (divisions[userCatId] || []) : [];
                  return (
                    <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium ${
                            user.role === "admin" ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400"
                          }`}>
                            {initials(user.full_name || user.email)}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{user.full_name || user.nickname || "—"}</p>
                            <p className="text-[12px] text-zinc-600">{user.nickname || user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === "judge" ? (
                          <select value={userCatId || ""} onChange={(e) => assignCategory(user.id, e.target.value)}
                            className="text-[12px] bg-white/[0.03] border border-white/[0.06] text-zinc-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-white/[0.15]">
                            <option value="">—</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        ) : <span className="text-[12px] text-zinc-700">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {user.role === "judge" && catDivs.length > 0 && (
                          <select value={userDivId || ""} onChange={(e) => assignDivision(user.id, e.target.value)}
                            className="text-[12px] bg-white/[0.03] border border-white/[0.06] text-zinc-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-white/[0.15]">
                            <option value="">Todas</option>
                            {catDivs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[12px] ${user.approved ? "text-emerald-400" : "text-amber-400"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.approved ? "bg-emerald-400" : "bg-amber-400"}`} />
                          {user.approved ? "Ativo" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.role === "judge" && (
                          <div className="flex gap-3 justify-end">
                            {!user.approved
                              ? <button onClick={() => approveUser(user.id)} className="text-[12px] text-emerald-400 hover:text-emerald-300 font-medium">Aprovar</button>
                              : <button onClick={() => rejectUser(user.id)} className="text-[12px] text-zinc-600 hover:text-red-400 transition-colors">Revogar</button>
                            }
                            <button onClick={() => deleteUser(user.id)} className="text-[12px] text-zinc-700 hover:text-red-400 transition-colors">Excluir</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* DISPLAY TAB */}
        {tab === "display" && (
          <div className="max-w-xl">
            <p className="text-[13px] text-zinc-500 mb-6">Selecione o ranking para exibir em <code className="text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded">/display</code></p>

            <div className="space-y-2">
              <button onClick={() => setDisplay(null, null)}
                className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all text-sm ${
                  !displayCatId ? "border-white/[0.15] bg-white/[0.04] text-white" : "border-white/[0.04] text-zinc-500 hover:border-white/[0.1] hover:text-zinc-300"
                }`}>
                <div className="flex items-center justify-between">
                  <span>Nenhum — Tela de espera</span>
                  {!displayCatId && <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE</span>}
                </div>
              </button>

              {categories.map((cat) => {
                const catDivs = divisions[cat.id] || [];
                const isCatSelected = displayCatId === cat.id && !displayDivId;
                return (
                  <div key={cat.id}>
                    <button onClick={() => setDisplay(cat.id, null)}
                      className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all text-sm ${
                        isCatSelected ? "border-white/[0.15] bg-white/[0.04] text-white" : "border-white/[0.04] text-zinc-400 hover:border-white/[0.1] hover:text-zinc-300"
                      }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{cat.name}</span>
                          {cat.phase && <span className="text-zinc-600 ml-2 text-[12px]">{cat.phase}</span>}
                        </div>
                        {isCatSelected && <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE</span>}
                      </div>
                    </button>
                    {catDivs.length > 0 && (
                      <div className="ml-5 mt-1 space-y-1 border-l border-white/[0.04] pl-4">
                        {catDivs.map((d) => {
                          const isDivSelected = displayCatId === cat.id && displayDivId === d.id;
                          return (
                            <button key={d.id} onClick={() => setDisplay(cat.id, d.id)}
                              className={`w-full text-left px-4 py-2.5 rounded-lg border transition-all text-[13px] ${
                                isDivSelected ? "border-white/[0.15] bg-white/[0.04] text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                              }`}>
                              <div className="flex items-center justify-between">
                                {d.name}
                                {isDivSelected && <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <a href="/display" target="_blank"
              className="mt-6 block text-center bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 hover:text-white py-3 rounded-xl text-sm transition-all">
              Abrir tela publica ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
