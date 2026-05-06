"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface Athlete { id: string; number: number; name: string; division_id: string | null; }
interface Judge { id: string; full_name: string; email: string; }
interface Division { id: string; name: string; division_type: string; }
interface Weights { volume: number; condicao: number; proporcao: number; simetria: number; estetica: number; pose: number; }
interface RankingEntry { position: number; athleteNumber: number; athleteName: string; totalScore: number; breakdown: Record<string, number>; }
interface JudgeScorecard { judgeId: string; judgeName: string; filled: number; totalPossible: number; athleteScores: Record<string, Record<string, number | null>>; }

const DIVISION_TYPES = [
  { value: "", label: "Geral" }, { value: "weight", label: "Peso" },
  { value: "height", label: "Altura" }, { value: "age", label: "Idade" },
];

export default function CategoryManagePage() {
  const params = useParams();
  const categoryId = params.categoryId as string;

  const [catName, setCatName] = useState("");
  const [catPhase, setCatPhase] = useState("");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const didAutoSelect = useRef(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [weights, setWeights] = useState<Weights>({ volume: 4, condicao: 3, proporcao: 2, simetria: 2, estetica: 1, pose: 2 });
  const [currentCall, setCurrentCallState] = useState<{ id: string; number: number; name: string }[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [newAthleteNum, setNewAthleteNum] = useState("");
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newDivName, setNewDivName] = useState("");
  const [newDivType, setNewDivType] = useState("");
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [scorecard, setScorecard] = useState<JudgeScorecard[]>([]);
  const [scorecardAthletes, setScorecardAthletes] = useState<{ id: string; number: number; name: string }[]>([]);
  const [tab, setTab] = useState<"setup" | "call" | "ranking" | "scores">("setup");

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 3000); };

  const apiPost = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/competition", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return res.json();
  };

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/login"; return; }

    const { data: cat } = await supabase.from("categories").select("*").eq("id", categoryId).single();
    if (cat && !document.activeElement?.closest("input")) {
      setCatName(cat.name); setCatPhase(cat.phase || "");
    }

    const { data: divs } = await supabase.from("divisions").select("*").eq("category_id", categoryId).order("sort_order");
    setDivisions(divs || []);

    // Auto-select overall only once on first load
    let activeDivision = selectedDivision;
    if (!didAutoSelect.current && !activeDivision && divs && divs.length > 0) {
      activeDivision = "overall";
      setSelectedDivision("overall");
      didAutoSelect.current = true;
    }

    const divParam = activeDivision ? `&divisionId=${activeDivision}` : "";
    const [compRes, rankRes, weightsRes] = await Promise.all([
      fetch(`/api/competition?categoryId=${categoryId}${divParam}`).then((r) => r.json()),
      fetch(`/api/ranking?categoryId=${categoryId}${divParam}`).then((r) => r.json()),
      fetch(`/api/competition?categoryId=${categoryId}`).then((r) => r.json()),
    ]);

    setAthletes(compRes.athletes || []);
    if (weightsRes.weights) setWeights(weightsRes.weights);
    setCurrentCallState(compRes.currentCall || []);
    setRanking(rankRes.ranking || []);

    const { data: judgeProfiles } = await supabase
      .from("profiles").select("id, full_name, email")
      .eq("category_id", categoryId).eq("role", "judge").eq("approved", true);
    setJudges(judgeProfiles || []);

    // Fetch live scorecard
    const scRes = await fetch(`/api/scorecard?categoryId=${categoryId}`).then((r) => r.json());
    setScorecard(scRes.judges || []);
    setScorecardAthletes(scRes.currentCall || []);
  }, [categoryId, selectedDivision]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateCategory = async () => {
    const { error } = await supabase.from("categories").update({ name: catName, phase: catPhase }).eq("id", categoryId);
    if (error) { showMsg("Erro: " + error.message); return; }
    showMsg("Salvo!");
  };

  const addDivision = async () => {
    if (!newDivName.trim()) return;
    await apiPost({ action: "createDivision", categoryId, name: newDivName.trim(), divisionType: newDivType });
    setNewDivName(""); setNewDivType(""); showMsg("Divisao criada!"); fetchData();
  };

  const removeDivision = async (id: string) => {
    if (!confirm("Excluir divisao?")) return;
    await apiPost({ action: "deleteDivision", divisionId: id });
    if (selectedDivision === id) setSelectedDivision(null);
    fetchData();
  };

  const addAthleteHandler = async () => {
    const num = parseInt(newAthleteNum);
    if (isNaN(num) || !newAthleteName.trim()) { showMsg("Preencha numero e nome"); return; }
    const result = await apiPost({ action: "addAthlete", categoryId, number: num, name: newAthleteName.trim(), divisionId: selectedDivision });
    if (result.error) { showMsg("Erro: " + result.error); return; }
    setNewAthleteNum(""); setNewAthleteName(""); fetchData();
  };

  const removeAthleteHandler = async (id: string) => { await apiPost({ action: "removeAthlete", athleteId: id }); fetchData(); };

  const updateWeight = async (key: string, val: string) => {
    const num = parseFloat(val); if (isNaN(num)) return;
    const newW = { ...weights, [key]: num }; setWeights(newW);
    await apiPost({ action: "updateWeights", categoryId, weights: newW });
  };

  const toggleAthleteInCall = (id: string) => {
    setSelectedAthleteIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : prev.length < 10 ? [...prev, id] : prev);
  };

  const startCall = async () => {
    if (selectedAthleteIds.length === 0) { showMsg("Selecione atletas"); return; }
    const result = await apiPost({ action: "setCurrentCall", categoryId, athleteIds: selectedAthleteIds, divisionId: selectedDivision });
    if (result.error) { showMsg("Erro: " + result.error); return; }
    setSelectedAthleteIds([]);
    showMsg("Chamada iniciada!");
    await fetchData();
  };

  const saveAndClear = async () => {
    const result = await apiPost({ action: "saveAndClear", categoryId, divisionId: selectedDivision });
    if (result.error) { showMsg("Erro: " + result.error); return; }
    setSelectedAthleteIds([]);
    showMsg("Salvo!");
    await fetchData();
  };

  const weightLabels: Record<string, string> = {
    volume: "Volume", condicao: "Cond", proporcao: "Prop", simetria: "Sim", estetica: "Est", pose: "Pose",
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      <header className="bg-[#0c0c0e] border-b border-white/[0.06] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-zinc-500 hover:text-zinc-300 text-[12px] transition-colors">← Voltar</a>
            <div className="h-4 w-px bg-white/10" />
            <h1 className="text-sm font-semibold text-white">{catName}</h1>
            {catPhase && <span className="text-[11px] text-zinc-600 bg-white/[0.04] px-2 py-0.5 rounded-md">{catPhase}</span>}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {message && (
          <div className="bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 px-4 py-2.5 rounded-xl mb-6 text-[13px] flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-6 mb-4 border-b border-white/[0.06]">
          {(["setup", "call", "scores", "ranking"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                tab === t ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {t === "setup" ? "Config" : t === "call" ? "Chamada" : t === "scores" ? "Notas" : "Ranking"}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />}
            </button>
          ))}
        </div>

        {/* Division selector - visible across all tabs */}
        {divisions.length > 0 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest self-center mr-1 shrink-0">Divisao:</span>
            <button onClick={() => { setSelectedDivision("overall"); setSelectedAthleteIds([]); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                selectedDivision === "overall" ? "bg-white text-zinc-900" : "bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06]"}`}>
              Overall
            </button>
            {divisions.filter((d) => d.name.toLowerCase() !== "overall").map((d) => (
              <button key={d.id} onClick={() => { setSelectedDivision(d.id); setSelectedAthleteIds([]); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  selectedDivision === d.id ? "bg-white text-zinc-900" : "bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.06]"}`}>
                {d.name}
              </button>
            ))}
          </div>
        )}

        {tab === "setup" && (
          <div className="space-y-4">
            {/* Category info */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-3">Categoria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors" />
                <input type="text" value={catPhase} onChange={(e) => setCatPhase(e.target.value)} placeholder="Fase"
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors placeholder:text-zinc-600" />
              </div>
              <button onClick={updateCategory} className="mt-3 bg-white hover:bg-zinc-100 text-zinc-900 font-medium px-4 py-2 rounded-xl text-[13px] transition-colors">Salvar</button>
            </div>

            {/* Divisions */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-3">Divisoes</h2>
              <div className="flex gap-2 mb-3">
                <input type="text" value={newDivName} onChange={(e) => setNewDivName(e.target.value)}
                  placeholder="Ex: Ate 80kg, Junior" className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors placeholder:text-zinc-600"
                  onKeyDown={(e) => e.key === "Enter" && addDivision()} />
                <select value={newDivType} onChange={(e) => setNewDivType(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-white/[0.15] transition-colors">
                  {DIVISION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button onClick={addDivision} className="bg-white hover:bg-zinc-100 text-zinc-900 font-bold px-4 py-2.5 rounded-xl transition-colors">+</button>
              </div>
              <div className="space-y-1">
                {divisions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] rounded-xl px-4 py-2 transition-colors">
                    <span className="text-[13px] text-zinc-300">{d.name}</span>
                    <button onClick={() => removeDivision(d.id)} className="text-zinc-600 hover:text-red-400 text-[11px] transition-colors">Excluir</button>
                  </div>
                ))}
                {divisions.length === 0 && <p className="text-zinc-600 text-[12px]">Sem divisoes</p>}
              </div>
            </div>

            {/* Weights */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-3">Pesos</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(weights).map(([key, val]) => (
                  <div key={key}>
                    <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1">{weightLabels[key]}</label>
                    <input type="number" min="0" max="10" step="0.5" value={val}
                      onChange={(e) => updateWeight(key, e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-center text-sm text-white outline-none focus:border-white/[0.15] transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            {/* Athletes */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-3">Atletas ({athletes.length})</h2>
              <div className="flex gap-2 mb-3">
                <input type="number" value={newAthleteNum} onChange={(e) => setNewAthleteNum(e.target.value)}
                  placeholder="No" className="w-20 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors placeholder:text-zinc-600" />
                <input type="text" value={newAthleteName} onChange={(e) => setNewAthleteName(e.target.value)}
                  placeholder="Nome" className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/[0.15] transition-colors placeholder:text-zinc-600"
                  onKeyDown={(e) => e.key === "Enter" && addAthleteHandler()} />
                <button onClick={addAthleteHandler} className="bg-white hover:bg-zinc-100 text-zinc-900 font-bold px-4 py-2.5 rounded-xl transition-colors">+</button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {athletes.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] rounded-xl px-4 py-2 transition-colors">
                    <span className="text-[13px]">
                      <span className="text-zinc-500 font-mono">#{a.number}</span> <span className="text-white">{a.name}</span>
                      {selectedDivision === "overall" && a.division_id && divisions.find((d) => d.id === a.division_id) && (
                        <span className="text-[10px] text-zinc-600 ml-2">{divisions.find((d) => d.id === a.division_id)!.name}</span>
                      )}
                    </span>
                    <button onClick={() => removeAthleteHandler(a.id)} className="text-zinc-600 hover:text-red-400 text-[11px] transition-colors">x</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Judges */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-3">Arbitros ({judges.length})</h2>
              <div className="space-y-1">
                {judges.map((j) => (
                  <div key={j.id} className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] rounded-xl px-4 py-2 transition-colors">
                    <span className="text-[13px] text-white">{j.full_name}</span>
                    <span className="text-zinc-600 ml-2 text-[12px]">{j.email}</span>
                  </div>
                ))}
                {judges.length === 0 && <p className="text-zinc-600 text-[12px]">Atribua arbitros no painel de Usuarios</p>}
              </div>
            </div>
          </div>
        )}

        {tab === "call" && (() => {
          return (
          <div>
            {currentCall.length > 0 ? (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-4">Chamada em Andamento</h2>
                <div className="flex flex-wrap gap-2 mb-6">
                  {currentCall.map((a) => (
                    <span key={a.id} className="bg-white/[0.04] border border-white/[0.06] text-white px-4 py-2 rounded-xl text-[13px] font-mono">#{a.number} {a.name}</span>
                  ))}
                </div>
                <button onClick={saveAndClear}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-[13px] transition-colors">
                  SALVAR E ENCERRAR
                </button>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-4">Nova Chamada ({selectedAthleteIds.length}/10)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                  {athletes.map((a) => (
                    <button key={a.id} onClick={() => toggleAthleteInCall(a.id)}
                      className={`px-4 py-3 rounded-xl border text-[13px] font-medium transition-all ${
                        selectedAthleteIds.includes(a.id) ? "bg-white border-white text-zinc-900" : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] hover:border-white/[0.1]"}`}>
                      #{a.number} {a.name}
                    </button>
                  ))}
                  {athletes.length === 0 && <p className="text-zinc-600 col-span-4 text-[13px]">Adicione atletas em Config</p>}
                </div>
                <button onClick={startCall} disabled={selectedAthleteIds.length === 0}
                  className="w-full bg-white hover:bg-zinc-100 disabled:bg-white/[0.03] disabled:text-zinc-600 text-zinc-900 font-bold py-3 rounded-xl text-[13px] transition-colors">
                  INICIAR CHAMADA
                </button>
              </div>
            )}
          </div>
          );
        })()}

        {tab === "scores" && (
          <div className="space-y-4">
            {scorecardAthletes.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <p className="text-zinc-600 text-[13px]">Nenhuma chamada ativa</p>
              </div>
            ) : (
              scorecard.map((judge) => (
                <div key={judge.judgeId} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-[11px] text-blue-400 font-medium">
                        {judge.judgeName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[14px] font-medium text-white">{judge.judgeName}</span>
                        <span className="text-[11px] text-zinc-600 ml-2">
                          {judge.filled}/{judge.totalPossible} notas
                        </span>
                      </div>
                    </div>
                    <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${judge.filled === judge.totalPossible && judge.totalPossible > 0 ? "bg-emerald-500" : "bg-white/30"}`}
                        style={{ width: judge.totalPossible > 0 ? `${(judge.filled / judge.totalPossible) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr>
                          <th className="text-left px-2 py-1 text-zinc-600 font-medium">Criterio</th>
                          {scorecardAthletes.map((a) => (
                            <th key={a.id} className="text-center px-2 py-1 text-zinc-500 font-medium">#{a.number}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Vol F", key: "vol_f" }, { label: "Vol L", key: "vol_l" }, { label: "Vol C", key: "vol_c" },
                          { label: "Cond", key: "cond" },
                          { label: "Prop F", key: "prop_f" }, { label: "Prop L", key: "prop_l" }, { label: "Prop C", key: "prop_c" },
                          { label: "Sim F", key: "sim_f" }, { label: "Sim L", key: "sim_l" }, { label: "Sim C", key: "sim_c" },
                          { label: "Est F", key: "est_f" }, { label: "Est L", key: "est_l" }, { label: "Est C", key: "est_c" },
                          { label: "Pose F", key: "pose_f" }, { label: "Pose L", key: "pose_l" }, { label: "Pose C", key: "pose_c" },
                        ].map((row) => (
                          <tr key={row.key} className="border-t border-white/[0.03]">
                            <td className="px-2 py-1 text-zinc-500">{row.label}</td>
                            {scorecardAthletes.map((a) => {
                              const val = judge.athleteScores[a.id]?.[row.key];
                              return (
                                <td key={a.id} className="px-2 py-1 text-center">
                                  <span className={val !== null && val !== undefined ? "text-white font-medium" : "text-zinc-700"}>
                                    {val !== null && val !== undefined ? val : "—"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
            {scorecard.length === 0 && scorecardAthletes.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                <p className="text-zinc-600 text-[13px]">Nenhum arbitro atribuido a esta categoria</p>
              </div>
            )}
          </div>
        )}

        {tab === "ranking" && (
          <div className="space-y-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-6 py-3.5 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Pos</th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">No</th>
                    <th className="text-left px-6 py-3.5 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Atleta</th>
                    <th className="text-right px-6 py-3.5 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.filter((r) => r.totalScore > 0).map((r) => (
                    <tr key={r.athleteNumber} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-white text-[13px]">{r.position}</td>
                      <td className="px-6 py-3.5 text-zinc-500 font-mono text-[13px]">#{r.athleteNumber}</td>
                      <td className="px-6 py-3.5 text-white text-[13px]">{r.athleteName}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-white text-[13px]">{r.totalScore.toFixed(2)}</td>
                    </tr>
                  ))}
                  {ranking.filter((r) => r.totalScore > 0).length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-600 text-[13px]">Sem pontuacoes</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={async () => {
                const res = await apiPost({ action: "exportRanking", categoryId, divisionId: selectedDivision });
                if (res.error) { showMsg("Erro: " + res.error); return; }

                // Build Excel workbook
                const wb = XLSX.utils.book_new();

                // Sheet 1: Ranking summary
                const summaryRows = (res.ranking || []).map((r: { position: number; athleteNumber: number; athleteName: string; totalScore: number; breakdown: Record<string, number> }) => ({
                  Posicao: r.position,
                  Numero: r.athleteNumber,
                  Atleta: r.athleteName,
                  Volume: r.breakdown.volume,
                  Condicao: r.breakdown.condicao,
                  Proporcao: r.breakdown.proporcao,
                  Simetria: r.breakdown.simetria,
                  Estetica: r.breakdown.estetica,
                  Pose: r.breakdown.pose,
                  Total: r.totalScore,
                }));
                const ws1 = XLSX.utils.json_to_sheet(summaryRows);
                XLSX.utils.book_append_sheet(wb, ws1, "Ranking");

                // Sheet 2: Detailed averages per athlete
                const detailRows: Record<string, string | number>[] = [];
                for (const r of (res.ranking || []) as { athleteNumber: number; athleteName: string; generalAverages?: Record<string, number>; individualAverages?: Record<string, Record<string, number>> }[]) {
                  const judges = Object.keys(r.individualAverages || {});
                  for (const criteria of ["volume", "condicao", "proporcao", "simetria", "estetica", "pose"]) {
                    const row: Record<string, string | number> = {
                      Atleta: `#${r.athleteNumber} ${r.athleteName}`,
                      Criterio: criteria.toUpperCase(),
                      "Media Geral": r.generalAverages?.[criteria] ?? 0,
                    };
                    judges.forEach((j, i) => {
                      row[`Juiz ${i + 1}`] = r.individualAverages?.[j]?.[criteria] ?? 0;
                    });
                    detailRows.push(row);
                  }
                }
                if (detailRows.length > 0) {
                  const ws2 = XLSX.utils.json_to_sheet(detailRows);
                  XLSX.utils.book_append_sheet(wb, ws2, "Detalhes");
                }

                // Sheet 3: Metadata
                const metaRows = [
                  { Campo: "Categoria", Valor: res.category || "" },
                  { Campo: "Divisao", Valor: res.division || "Todas" },
                  { Campo: "Fase", Valor: res.phase || "" },
                  { Campo: "Exportado em", Valor: new Date(res.exportedAt).toLocaleString("pt-BR") },
                ];
                const ws3 = XLSX.utils.json_to_sheet(metaRows);
                XLSX.utils.book_append_sheet(wb, ws3, "Info");

                const fileName = `ranking-${res.category || "export"}-${res.division || "todas"}-${res.phase || ""}.xlsx`.replace(/\s+/g, "_");
                XLSX.writeFile(wb, fileName);
                showMsg("Ranking exportado!");
              }}
                className="flex-1 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] text-zinc-400 py-3 rounded-xl text-[13px] font-medium transition-colors">
                Exportar Ranking
              </button>
              <button onClick={async () => {
                if (!confirm("ATENCAO: Isso vai apagar TODAS as notas desta divisao. Tem certeza?")) return;
                await apiPost({ action: "resetScores", categoryId, divisionId: selectedDivision });
                showMsg("Notas resetadas!"); fetchData();
              }}
                className="bg-white/[0.03] border border-red-500/20 hover:bg-red-500/10 text-red-400 py-3 px-6 rounded-xl text-[13px] font-medium transition-colors">
                Resetar Notas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
