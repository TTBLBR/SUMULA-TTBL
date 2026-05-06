"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";

interface Athlete { id: string; number: number; name: string; }
interface ScoreRow {
  athlete_id: string;
  volume_frente: number | null; volume_lado: number | null; volume_costas: number | null;
  condicao: number | null;
  proporcao_frente: number | null; proporcao_lado: number | null; proporcao_costas: number | null;
  simetria_frente: number | null; simetria_lado: number | null; simetria_costas: number | null;
  estetica_frente: number | null; estetica_lado: number | null; estetica_costas: number | null;
  pose_frente: number | null; pose_lado: number | null; pose_costas: number | null;
}

const SCORE_FIELDS = [
  { group: "VOLUME", fields: [
    { key: "volume_frente", label: "Frente" },
    { key: "volume_lado", label: "Lado" },
    { key: "volume_costas", label: "Costas" },
  ]},
  { group: "CONDICAO", fields: [
    { key: "condicao", label: "Geral" },
  ]},
  { group: "PROPORCAO", fields: [
    { key: "proporcao_frente", label: "Frente" },
    { key: "proporcao_lado", label: "Lado" },
    { key: "proporcao_costas", label: "Costas" },
  ]},
  { group: "SIMETRIA", fields: [
    { key: "simetria_frente", label: "Frente" },
    { key: "simetria_lado", label: "Lado" },
    { key: "simetria_costas", label: "Costas" },
  ]},
  { group: "ESTETICA", fields: [
    { key: "estetica_frente", label: "Frente" },
    { key: "estetica_lado", label: "Lado" },
    { key: "estetica_costas", label: "Costas" },
  ]},
  { group: "POSE", fields: [
    { key: "pose_frente", label: "Frente" },
    { key: "pose_lado", label: "Lado" },
    { key: "pose_costas", label: "Costas" },
  ]},
];

const SCORE_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

export default function DashboardPage() {
  const [judgeName, setJudgeName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [currentCall, setCurrentCall] = useState<Athlete[]>([]);
  const [scores, setScores] = useState<Record<string, Record<string, number | null>>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  // Track if user has unsaved local edits
  const hasLocalEdits = useRef(false);
  const lastCallIds = useRef("");

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/login"; return; }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (!profile || !profile.approved) { window.location.href = "/login"; return; }

    setJudgeName(profile.full_name || profile.nickname || profile.email);
    setUserId(profile.id);
    setDivisionId(profile.division_id || null);

    if (!profile.category_id) { setCategoryId(null); return; }
    setCategoryId(profile.category_id);

    const { data: cat } = await supabase.from("categories").select("name").eq("id", profile.category_id).single();
    let catLabel = cat?.name || "";
    if (profile.division_id) {
      const { data: div } = await supabase.from("divisions").select("name").eq("id", profile.division_id).single();
      if (div) catLabel += ` — ${div.name}`;
    }
    setCategoryName(catLabel);

    const res = await fetch(`/api/scores?judgeId=${profile.id}&categoryId=${profile.category_id}`);
    if (!res.ok) return;
    const data = await res.json();

    // Reset hasLocalEdits if the call changed (different athletes)
    const newCallIds = ((data.currentCall || []) as Athlete[]).map((a) => a.id).sort().join(",");
    if (newCallIds !== lastCallIds.current) {
      hasLocalEdits.current = false;
      lastCallIds.current = newCallIds;
    }

    setCurrentCall(data.currentCall || []);

    const serverScores: Record<string, Record<string, number | null>> = {};
    for (const row of (data.scores || []) as ScoreRow[]) {
      const flat: Record<string, number | null> = {};
      for (const group of SCORE_FIELDS) {
        for (const f of group.fields) {
          flat[f.key] = (row as unknown as Record<string, number | null>)[f.key] ?? null;
        }
      }
      serverScores[row.athlete_id] = flat;
    }

    // Only overwrite with server data if user has NO local edits
    if (!hasLocalEdits.current) {
      const merged: Record<string, Record<string, number | null>> = {};
      for (const athlete of (data.currentCall || []) as Athlete[]) {
        merged[athlete.id] = serverScores[athlete.id] || {};
      }
      setScores(merged);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const setScore = (athleteId: string, fieldKey: string, value: number | null) => {
    hasLocalEdits.current = true;
    setScores((prev) => ({
      ...prev,
      [athleteId]: { ...(prev[athleteId] || {}), [fieldKey]: value },
    }));
  };

  const saveAllScores = async () => {
    if (!categoryId) return;
    setSaving(true);
    try {
      let saved = 0;
      for (const athlete of currentCall) {
        const as2 = scores[athlete.id] || {};
        const structured = {
          volume: { frente: as2.volume_frente ?? null, lado: as2.volume_lado ?? null, costas: as2.volume_costas ?? null },
          condicao: as2.condicao ?? null,
          proporcao: { frente: as2.proporcao_frente ?? null, lado: as2.proporcao_lado ?? null, costas: as2.proporcao_costas ?? null },
          simetria: { frente: as2.simetria_frente ?? null, lado: as2.simetria_lado ?? null, costas: as2.simetria_costas ?? null },
          estetica: { frente: as2.estetica_frente ?? null, lado: as2.estetica_lado ?? null, costas: as2.estetica_costas ?? null },
          pose: { frente: as2.pose_frente ?? null, lado: as2.pose_lado ?? null, costas: as2.pose_costas ?? null },
        };
        const hasAny = Object.values(as2).some((v) => v !== null && v !== undefined);
        if (hasAny) {
          await fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId, judgeId: userId, athleteId: athlete.id, scores: structured, divisionId }),
          });
          saved++;
        }
      }
      // After save, allow server refresh
      hasLocalEdits.current = false;
      showMsg(`${saved} atleta(s) salvo(s)`);
      fetchData();
    } catch { showMsg("Erro ao salvar"); }
    setSaving(false);
  };

  const clearAllScores = () => {
    // Mark as local edits so server doesn't overwrite until save
    hasLocalEdits.current = true;
    const cleared: Record<string, Record<string, number | null>> = {};
    for (const a of currentCall) cleared[a.id] = {};
    setScores(cleared);
    showMsg("Notas apagadas (clique SALVAR para confirmar)");
  };

  const handleSignOut = async () => { await signOut(); window.location.href = "/login"; };

  const totalFields = SCORE_FIELDS.reduce((sum, g) => sum + g.fields.length, 0);
  const filledCount = (athleteId: string) => {
    const s = scores[athleteId] || {};
    return Object.values(s).filter((v) => v !== null && v !== undefined).length;
  };

  // Dynamic column width: min 100px, max 200px
  const colWidth = currentCall.length > 0
    ? Math.min(200, Math.max(100, Math.floor(800 / currentCall.length)))
    : 150;

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Toast */}
      {message && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-black px-6 py-3 rounded-full text-[14px] font-bold shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-[fadeUp_0.3s_ease]">
          {message}
        </div>
      )}

      {/* Header */}
      <header className="bg-[#0c0c0e] border-b border-white/[0.06] shrink-0">
        <div className="px-5 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-white">{judgeName}</span>
            <span className="text-[12px] text-zinc-600">/ {categoryName || "—"}</span>
          </div>
          <button onClick={handleSignOut} className="text-zinc-600 hover:text-zinc-300 text-[12px] transition-colors">Sair</button>
        </div>
      </header>

      {!categoryId ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600 text-sm">Sem categoria atribuida</p>
        </div>
      ) : currentCall.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-zinc-800 border-t-zinc-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-600 text-sm">Aguardando chamada...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Scrollable table area */}
          <div className="flex-1 overflow-auto pl-5 pr-4 pt-3">
            <div className="inline-block min-w-full">
              <table className="border-collapse">
                <colgroup>
                  <col style={{ width: "90px" }} />
                  {currentCall.map((a) => (
                    <col key={a.id} style={{ width: `${colWidth}px` }} />
                  ))}
                </colgroup>

                {/* Sticky athlete header */}
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-1 bg-[#09090b]" />
                    {currentCall.map((a) => {
                      const filled = filledCount(a.id);
                      const pct = totalFields > 0 ? Math.round((filled / totalFields) * 100) : 0;
                      return (
                        <th key={a.id} className="py-2 px-1 bg-[#09090b]">
                          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 px-2">
                            <div className="text-[14px] font-bold text-white">#{a.number}</div>
                            <div className="text-[11px] text-zinc-500 truncate">{a.name}</div>
                            <div className="mt-1.5 mx-auto w-10 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-white/40" : ""}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                {/* Score rows */}
                {SCORE_FIELDS.map((group) => (
                  <tbody key={group.group}>
                    <tr>
                      <td colSpan={currentCall.length + 1} className="pt-4 pb-1 px-1">
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.1em]">{group.group}</span>
                      </td>
                    </tr>
                    {group.fields.map((field) => (
                      <tr key={field.key} className="hover:bg-white/[0.015]">
                        <td className="py-1.5 px-1 text-[12px] text-zinc-400 whitespace-nowrap">{field.label}</td>
                        {currentCall.map((a) => {
                          const val = scores[a.id]?.[field.key];
                          const hasValue = val !== null && val !== undefined;
                          return (
                            <td key={a.id} className="py-1 px-1">
                              <select
                                value={val ?? ""}
                                onChange={(e) => setScore(a.id, field.key, e.target.value === "" ? null : parseFloat(e.target.value))}
                                className={`w-full text-center text-[13px] py-2 rounded-lg border outline-none cursor-pointer transition-all ${
                                  hasValue
                                    ? "bg-white text-zinc-900 border-white/30 font-bold"
                                    : "bg-white/[0.03] text-zinc-700 border-white/[0.05] hover:border-white/[0.12]"
                                }`}
                              >
                                <option value="">—</option>
                                {SCORE_OPTIONS.map((v) => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </div>

          {/* Fixed bottom actions */}
          <div className="shrink-0 bg-[#0c0c0e] border-t border-white/[0.06] px-4 py-3 flex gap-3">
            <button onClick={clearAllScores}
              className="w-28 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-500 py-3 rounded-xl font-semibold text-[13px] transition-colors shrink-0">
              APAGAR
            </button>
            <button onClick={saveAllScores} disabled={saving}
              className="flex-1 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 py-3 rounded-xl font-bold text-[14px] transition-colors">
              {saving ? "SALVANDO..." : "SALVAR TUDO"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
