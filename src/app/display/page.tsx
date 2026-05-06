"use client";

import { useState, useEffect, useCallback } from "react";

interface RankingEntry {
  position: number;
  athleteNumber: number;
  athleteName: string;
  totalScore: number;
  breakdown: Record<string, number>;
}

export default function DisplayPage() {
  const [active, setActive] = useState(false);
  const [category, setCategory] = useState("");
  const [phase, setPhase] = useState("");
  const [division, setDivision] = useState("");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/display");
    const data = await res.json();
    setActive(data.active);
    setCategory(data.category || "");
    setPhase(data.phase || "");
    setDivision(data.division || "");
    setRanking(data.ranking || []);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeRanking = ranking.filter((r) => r.totalScore > 0);

  if (!active) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-700 tracking-wide">SPORTS RANKING</h1>
          <p className="text-zinc-800 mt-2">Aguardando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="text-center py-10">
        <p className="text-[11px] text-zinc-600 uppercase tracking-[0.3em] mb-2">RANKING</p>
        <h1 className="text-4xl font-bold text-white tracking-wide uppercase">{category}</h1>
        {division && <p className="text-xl text-zinc-300 mt-2 font-medium uppercase tracking-wide">{division}</p>}
        {phase && <p className="text-sm text-zinc-600 mt-1 uppercase tracking-widest">{phase}</p>}
        <div className="mt-4 mx-auto w-16 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
      </div>

      {/* Ranking */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        {activeRanking.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-zinc-800 text-lg">Aguardando pontuacoes...</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activeRanking.map((entry, i) => {
              const isTop3 = entry.position <= 3;
              const posColors = ["", "text-yellow-400", "text-zinc-400", "text-amber-600"];
              const borderColors = ["", "border-yellow-500/20", "border-zinc-500/15", "border-amber-600/15"];
              const bgColors = ["", "bg-yellow-500/[0.03]", "bg-white/[0.01]", "bg-amber-500/[0.02]"];

              return (
                <div key={entry.athleteNumber}
                  className={`flex items-center rounded-xl px-6 py-4 border transition-all ${
                    isTop3 ? `${borderColors[entry.position]} ${bgColors[entry.position]}` : "border-white/[0.03] bg-white/[0.01]"
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}>
                  {/* Position */}
                  <div className={`text-3xl font-black w-14 text-center tabular-nums ${
                    isTop3 ? posColors[entry.position] : "text-zinc-700"
                  }`}>
                    {entry.position}
                  </div>

                  {/* Separator */}
                  <div className="w-px h-8 bg-white/[0.06] mx-4" />

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3">
                      <span className={`text-xl font-semibold ${isTop3 ? "text-white" : "text-zinc-300"}`}>
                        {entry.athleteName}
                      </span>
                      <span className="text-zinc-700 text-sm font-mono">#{entry.athleteNumber}</span>
                    </div>
                    <div className="flex gap-4 mt-0.5">
                      {Object.entries(entry.breakdown).map(([key, val]) => (
                        <span key={key} className="text-[11px] text-zinc-700 tabular-nums">
                          {key === "volume" ? "VOL" : key === "condicao" ? "CND" : key === "proporcao" ? "PRP"
                            : key === "simetria" ? "SIM" : key === "estetica" ? "EST" : "PSE"}
                          <span className="text-zinc-500 ml-0.5">{val.toFixed(1)}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Score */}
                  <div className={`text-2xl font-bold tabular-nums ${
                    isTop3 ? posColors[entry.position] : "text-zinc-500"
                  }`}>
                    {entry.totalScore.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
