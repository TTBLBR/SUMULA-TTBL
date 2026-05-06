"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface RankingEntry {
  position: number;
  athleteNumber: number;
  athleteName: string;
  totalScore: number;
  breakdown: Record<string, number>;
}

function RankingContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("categoryId") || "";
  const divisionId = searchParams.get("divisionId") || "";

  const [category, setCategory] = useState("");
  const [phase, setPhase] = useState("");
  const [division, setDivision] = useState("");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  const fetchRanking = useCallback(async () => {
    if (!categoryId) return;
    const divParam = divisionId ? `&divisionId=${divisionId}` : "";
    const res = await fetch(`/api/ranking?categoryId=${categoryId}${divParam}`);
    const data = await res.json();
    setCategory(data.category || "");
    setPhase(data.phase || "");
    setDivision(data.division || "");
    setRanking(data.ranking || []);
  }, [categoryId, divisionId]);

  useEffect(() => {
    fetchRanking();
    const interval = setInterval(fetchRanking, 2000);
    return () => clearInterval(interval);
  }, [fetchRanking]);

  if (!categoryId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400">categoryId ausente na URL</p>
      </div>
    );
  }

  const activeRanking = ranking.filter((r) => r.totalScore > 0);

  const getMedalStyle = (pos: number) => {
    if (pos === 1) return { bg: "bg-yellow-50 border-yellow-400", text: "text-yellow-600", badge: "bg-yellow-400 text-yellow-900" };
    if (pos === 2) return { bg: "bg-gray-50 border-gray-400", text: "text-gray-500", badge: "bg-gray-400 text-white" };
    if (pos === 3) return { bg: "bg-amber-50 border-amber-400", text: "text-amber-700", badge: "bg-amber-600 text-white" };
    return { bg: "bg-white border-gray-200", text: "text-gray-600", badge: "bg-gray-200 text-gray-700" };
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="text-center py-10 border-b border-gray-100">
        <h1 className="text-5xl font-black text-gray-900 tracking-wider mb-2">RANKING</h1>
        {category && <h2 className="text-3xl font-bold text-blue-600 uppercase tracking-wide">{category}</h2>}
        {division && <p className="text-xl text-gray-700 mt-1 uppercase font-semibold">{division}</p>}
        {phase && <p className="text-lg text-gray-500 mt-1 uppercase">{phase}</p>}
      </div>

      {/* Ranking */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeRanking.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-300">Aguardando pontuacoes...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRanking.map((entry) => {
              const style = getMedalStyle(entry.position);
              return (
                <div key={entry.athleteNumber}
                  className={`flex items-center border-2 rounded-2xl px-6 py-5 transition-all ${style.bg}`}>
                  {/* Position badge */}
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black ${style.badge}`}>
                    {entry.position}
                  </div>

                  {/* Athlete info */}
                  <div className="flex-1 ml-5">
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-bold text-gray-900">{entry.athleteName}</span>
                      <span className="text-lg text-gray-400">#{entry.athleteNumber}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      {Object.entries(entry.breakdown).map(([key, val]) => (
                        <span key={key}>
                          {key === "volume" ? "Vol" : key === "condicao" ? "Cond" : key === "proporcao" ? "Prop"
                            : key === "simetria" ? "Sim" : key === "estetica" ? "Est" : "Pose"}
                          : {val.toFixed(1)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Score */}
                  <div className={`text-4xl font-black ${style.text}`}>
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

export default function RankingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><p className="text-gray-400">Carregando...</p></div>}>
      <RankingContent />
    </Suspense>
  );
}
