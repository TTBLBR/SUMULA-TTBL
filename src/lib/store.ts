// Supabase-backed store for competition data
import { supabase } from "./supabase";

// Normalize "overall" to null for DB operations
function normDiv(divisionId?: string | null): string | null {
  if (!divisionId || divisionId === "overall") return null;
  return divisionId;
}

// ============ Types ============

export interface Category {
  id: string;
  name: string;
  phase: string;
  created_at: string;
}

export interface Division {
  id: string;
  category_id: string;
  name: string;
  division_type: string;
  sort_order: number;
  created_at: string;
}

export interface CriteriaWeights {
  volume: number;
  condicao: number;
  proporcao: number;
  simetria: number;
  estetica: number;
  pose: number;
}

export interface Athlete {
  id: string;
  category_id: string;
  division_id: string | null;
  number: number;
  name: string;
}

export interface ScoreRow {
  id?: string;
  category_id: string;
  division_id?: string | null;
  judge_id: string;
  athlete_id: string;
  volume_frente: number | null;
  volume_lado: number | null;
  volume_costas: number | null;
  condicao: number | null;
  proporcao_frente: number | null;
  proporcao_lado: number | null;
  proporcao_costas: number | null;
  simetria_frente: number | null;
  simetria_lado: number | null;
  simetria_costas: number | null;
  estetica_frente: number | null;
  estetica_lado: number | null;
  estetica_costas: number | null;
  pose_frente: number | null;
  pose_lado: number | null;
  pose_costas: number | null;
}

export interface RankingEntry {
  position: number;
  athleteId: string;
  athleteNumber: number;
  athleteName: string;
  totalScore: number;
  breakdown: Record<string, number>;
  individualAverages?: Record<string, Record<string, number>>; // judgeId -> criteria -> avg
  generalAverages?: Record<string, number>; // criteria -> avg
}

// ============ Categories ============

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createCategory(name: string, phase: string = ""): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, phase })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, updates: { name?: string; phase?: string }): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ============ Divisions ============

export async function getDivisions(categoryId: string): Promise<Division[]> {
  const { data, error } = await supabase
    .from("divisions")
    .select("*")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createDivision(categoryId: string, name: string, divisionType: string = ""): Promise<Division> {
  const { data, error } = await supabase
    .from("divisions")
    .insert({ category_id: categoryId, name, division_type: divisionType })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDivision(id: string): Promise<void> {
  const { error } = await supabase.from("divisions").delete().eq("id", id);
  if (error) throw error;
}

// ============ Weights ============

export async function getWeights(categoryId: string): Promise<CriteriaWeights> {
  const { data, error } = await supabase
    .from("criteria_weights")
    .select("volume, condicao, proporcao, simetria, estetica, pose")
    .eq("category_id", categoryId)
    .is("division_id", null)
    .single();

  if (error) {
    return { volume: 4, condicao: 3, proporcao: 2, simetria: 2, estetica: 1, pose: 2 };
  }
  return data;
}

export async function updateWeights(categoryId: string, weights: Partial<CriteriaWeights>): Promise<CriteriaWeights> {
  // Try update first
  const { data, error } = await supabase
    .from("criteria_weights")
    .update(weights)
    .eq("category_id", categoryId)
    .is("division_id", null)
    .select("volume, condicao, proporcao, simetria, estetica, pose")
    .single();

  if (error || !data) {
    // Row doesn't exist, insert it
    const defaults = { volume: 4, condicao: 3, proporcao: 2, simetria: 2, estetica: 1, pose: 2, ...weights };
    const { data: inserted, error: insertErr } = await supabase
      .from("criteria_weights")
      .insert({ category_id: categoryId, ...defaults })
      .select("volume, condicao, proporcao, simetria, estetica, pose")
      .single();
    if (insertErr) throw insertErr;
    return inserted;
  }
  return data;
}

// ============ Athletes ============

export async function getAthletes(categoryId: string, divisionId?: string | null): Promise<Athlete[]> {
  let query = supabase
    .from("athletes")
    .select("*")
    .eq("category_id", categoryId)
    .order("number", { ascending: true });

  // "overall" = all athletes, any other divisionId = filter
  if (divisionId && divisionId !== "overall") {
    query = query.eq("division_id", divisionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addAthlete(categoryId: string, number: number, name: string, divisionId?: string | null): Promise<Athlete> {
  const insert: Record<string, unknown> = { category_id: categoryId, number, name };
  const div = normDiv(divisionId);
  if (div) insert.division_id = div;

  const { data, error } = await supabase
    .from("athletes")
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeAthlete(id: string): Promise<void> {
  const { error } = await supabase.from("athletes").delete().eq("id", id);
  if (error) throw error;
}

// ============ Current Call ============

export async function getCurrentCall(categoryId: string, divisionId?: string | null): Promise<Athlete[]> {
  let query = supabase
    .from("current_call")
    .select("athlete_id, athletes(id, number, name, category_id, division_id)")
    .eq("category_id", categoryId);

  if (divisionId && divisionId !== "overall") {
    query = query.eq("division_id", divisionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row: Record<string, unknown>) => row.athletes as unknown as Athlete);
}

export async function setCurrentCall(categoryId: string, athleteIds: string[], divisionId?: string | null): Promise<void> {
  const div = normDiv(divisionId);
  // Clear existing calls for this category
  // If specific division, clear only that division's calls
  // If overall/null, clear ALL calls for this category
  if (div) {
    await supabase.from("current_call").delete().eq("category_id", categoryId).eq("division_id", div);
  } else {
    await supabase.from("current_call").delete().eq("category_id", categoryId);
  }

  if (athleteIds.length > 0) {
    // Look up each athlete's actual division_id
    const { data: athleteData } = await supabase
      .from("athletes")
      .select("id, division_id")
      .in("id", athleteIds);

    const athleteDivMap: Record<string, string | null> = {};
    for (const a of (athleteData || [])) {
      athleteDivMap[a.id] = a.division_id;
    }

    const rows = athleteIds.map((athlete_id) => ({
      category_id: categoryId,
      athlete_id,
      division_id: div || athleteDivMap[athlete_id] || null,
    }));
    const { error } = await supabase.from("current_call").insert(rows);
    if (error) throw error;
  }
}

export async function clearCurrentCall(categoryId: string, divisionId?: string | null): Promise<void> {
  const div = normDiv(divisionId);
  let query = supabase.from("current_call").delete().eq("category_id", categoryId);
  if (div) query = query.eq("division_id", div);
  // If no division (overall), clear ALL calls for this category
  const { error } = await query;
  if (error) throw error;
}

// ============ Scores ============

export async function getScoresByJudge(categoryId: string, judgeId: string): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("category_id", categoryId)
    .eq("judge_id", judgeId);
  if (error) throw error;
  return data || [];
}

export async function getAllScores(categoryId: string, divisionId?: string | null): Promise<ScoreRow[]> {
  let query = supabase
    .from("scores")
    .select("*")
    .eq("category_id", categoryId);

  if (divisionId && divisionId !== "overall") {
    query = query.eq("division_id", divisionId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function upsertScore(score: Omit<ScoreRow, "id">): Promise<ScoreRow> {
  const { data, error } = await supabase
    .from("scores")
    .upsert(
      { ...score, updated_at: new Date().toISOString() },
      { onConflict: "category_id,judge_id,athlete_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function clearScores(categoryId: string, divisionId?: string | null): Promise<void> {
  const div = normDiv(divisionId);
  let query = supabase.from("scores").delete().eq("category_id", categoryId);
  if (div) query = query.eq("division_id", div);
  // If no division (or "overall"), delete ALL scores for this category
  // This is intentional for the reset function
  const { error } = await query;
  if (error) throw error;
}

// ============ Ranking Calculation ============

function avg(vals: (number | null)[]): number {
  const valid = vals.filter((v): v is number => v !== null);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

const OUTLIER_THRESHOLD = 1.5;

function getJudgeAvgForCriteria(s: ScoreRow, criteria: string): number | null {
  if (criteria === "condicao") {
    return s.condicao;
  }
  const frente = s[`${criteria}_frente` as keyof ScoreRow] as number | null;
  const lado = s[`${criteria}_lado` as keyof ScoreRow] as number | null;
  const costas = s[`${criteria}_costas` as keyof ScoreRow] as number | null;
  // If at least one sub-score is filled, compute the average (including 0)
  if ([frente, lado, costas].some((v) => v !== null)) {
    return avg([frente, lado, costas]);
  }
  return null;
}

function criteriaAvgFromScores(
  scores: ScoreRow[],
  athleteId: string,
  criteria: string
): number {
  const athleteScores = scores.filter((s) => s.athlete_id === athleteId);
  if (athleteScores.length === 0) return 0;

  // Step 1: collect all judge averages
  const judgeAverages: number[] = [];
  for (const s of athleteScores) {
    const val = getJudgeAvgForCriteria(s, criteria);
    if (val !== null) judgeAverages.push(val);
  }

  if (judgeAverages.length === 0) return 0;
  if (judgeAverages.length <= 2) {
    // With 1-2 judges, no outlier filtering
    return judgeAverages.reduce((a, b) => a + b, 0) / judgeAverages.length;
  }

  // Step 2: calculate initial average
  const initialAvg = judgeAverages.reduce((a, b) => a + b, 0) / judgeAverages.length;

  // Step 3: exclude outliers (deviation > 1.5 from initial average)
  const filtered = judgeAverages.filter((v) => Math.abs(v - initialAvg) <= OUTLIER_THRESHOLD);

  if (filtered.length === 0) return initialAvg; // fallback if all are outliers
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

// Get individual averages per judge per criteria for an athlete
function getIndividualAverages(
  scores: ScoreRow[],
  athleteId: string
): Record<string, Record<string, number>> {
  const criteriaKeys = ["volume", "condicao", "proporcao", "simetria", "estetica", "pose"];
  const athleteScores = scores.filter((s) => s.athlete_id === athleteId);
  const result: Record<string, Record<string, number>> = {};

  for (const s of athleteScores) {
    const judgeAvgs: Record<string, number> = {};
    for (const key of criteriaKeys) {
      if (key === "condicao") {
        judgeAvgs[key] = s.condicao ?? 0;
      } else {
        const f = s[`${key}_frente` as keyof ScoreRow] as number | null;
        const l = s[`${key}_lado` as keyof ScoreRow] as number | null;
        const c = s[`${key}_costas` as keyof ScoreRow] as number | null;
        judgeAvgs[key] = avg([f, l, c]);
      }
    }
    result[s.judge_id] = judgeAvgs;
  }
  return result;
}

export async function calculateRanking(categoryId: string, divisionId?: string | null): Promise<RankingEntry[]> {
  const [athletes, weights, scores] = await Promise.all([
    getAthletes(categoryId, divisionId),
    getWeights(categoryId),
    getAllScores(categoryId, divisionId),
  ]);

  const criteriaKeys = ["volume", "condicao", "proporcao", "simetria", "estetica", "pose"] as const;

  const entries: RankingEntry[] = athletes.map((athlete) => {
    const breakdown: Record<string, number> = {};
    const generalAverages: Record<string, number> = {};
    let total = 0;

    for (const key of criteriaKeys) {
      const generalAvg = criteriaAvgFromScores(scores, athlete.id, key);
      generalAverages[key] = Math.round(generalAvg * 100) / 100;
      const weight = weights[key];
      const points = generalAvg * weight;
      breakdown[key] = Math.round(points * 100) / 100;
      total += points;
    }

    const individualAverages = getIndividualAverages(scores, athlete.id);

    return {
      position: 0,
      athleteId: athlete.id,
      athleteNumber: athlete.number,
      athleteName: athlete.name,
      totalScore: Math.round(total * 100) / 100,
      breakdown,
      individualAverages,
      generalAverages,
    };
  });

  entries.sort((a, b) => b.totalScore - a.totalScore);
  entries.forEach((e, i) => (e.position = i + 1));

  return entries;
}

// ============ Outlier Detection ============

export async function checkOutliers(
  categoryId: string,
  judgeId: string,
  athleteId: string,
  divisionId?: string | null
): Promise<Record<string, "OK" | "ERRO">> {
  const scores = await getAllScores(categoryId, divisionId);
  const judgeScore = scores.find((s) => s.judge_id === judgeId && s.athlete_id === athleteId);
  const criteriaKeys = ["volume", "condicao", "proporcao", "simetria", "estetica", "pose"] as const;
  const result: Record<string, "OK" | "ERRO"> = {};

  for (const key of criteriaKeys) {
    if (!judgeScore) {
      result[key] = "OK";
      continue;
    }

    const generalAvg = criteriaAvgFromScores(scores, athleteId, key);

    let judgeAvg: number;
    if (key === "condicao") {
      judgeAvg = judgeScore.condicao ?? 0;
    } else {
      const f = judgeScore[`${key}_frente` as keyof ScoreRow] as number | null;
      const l = judgeScore[`${key}_lado` as keyof ScoreRow] as number | null;
      const c = judgeScore[`${key}_costas` as keyof ScoreRow] as number | null;
      judgeAvg = avg([f, l, c]);
    }

    result[key] = Math.abs(judgeAvg - generalAvg) > OUTLIER_THRESHOLD ? "ERRO" : "OK";
  }

  return result;
}

// ============ Save Round & Clear ============

export async function saveRoundAndClear(categoryId: string, divisionId?: string | null): Promise<void> {
  const div = normDiv(divisionId);
  const ranking = await calculateRanking(categoryId, divisionId);
  const scores = await getAllScores(categoryId, divisionId);

  // Get current round number
  let roundQuery = supabase
    .from("ranking_history")
    .select("round")
    .eq("category_id", categoryId)
    .order("round", { ascending: false })
    .limit(1);

  if (div) roundQuery = roundQuery.eq("division_id", div);

  const { data: lastRound } = await roundQuery;
  const roundNum = (lastRound && lastRound.length > 0 ? lastRound[0].round : 0) + 1;

  // Save ranking to history with averages
  const historyRows = ranking
    .filter((r) => r.totalScore > 0)
    .map((r) => ({
      category_id: categoryId,
      division_id: div,
      round: roundNum,
      athlete_id: r.athleteId,
      athlete_number: r.athleteNumber,
      athlete_name: r.athleteName,
      position: r.position,
      total_score: r.totalScore,
      breakdown: r.breakdown,
      individual_averages: getIndividualAverages(scores, r.athleteId),
      general_averages: r.generalAverages || {},
    }));

  if (historyRows.length > 0) {
    const { error } = await supabase.from("ranking_history").insert(historyRows);
    if (error) throw error;
  }

  // Only clear the call, NOT the scores - scores accumulate across chamadas
  await clearCurrentCall(categoryId, div);
}

// Separate function to reset all scores (used when starting a new phase)
export async function resetAllScores(categoryId: string, divisionId?: string | null): Promise<void> {
  await clearScores(categoryId, divisionId);
}

// Export final ranking as evidence
export async function exportFinalRanking(categoryId: string, divisionId?: string | null) {
  const div = normDiv(divisionId);
  const ranking = await calculateRanking(categoryId, divisionId);
  const scores = await getAllScores(categoryId, divisionId);

  const { data: cat } = await supabase.from("categories").select("name, phase").eq("id", categoryId).single();

  let divName = divisionId === "overall" ? "Overall" : "";
  if (div) {
    const { data: divData } = await supabase.from("divisions").select("name").eq("id", div).single();
    divName = divData?.name || "";
  }

  return {
    category: cat?.name || "",
    phase: cat?.phase || "",
    division: divName,
    exportedAt: new Date().toISOString(),
    ranking: ranking.filter((r) => r.totalScore > 0).map((r) => ({
      position: r.position,
      athleteNumber: r.athleteNumber,
      athleteName: r.athleteName,
      totalScore: r.totalScore,
      breakdown: r.breakdown,
      generalAverages: r.generalAverages,
      individualAverages: getIndividualAverages(scores, r.athleteId),
    })),
  };
}

// ============ History ============

export async function getRankingHistory(categoryId: string, divisionId?: string | null) {
  const div = normDiv(divisionId);
  let query = supabase
    .from("ranking_history")
    .select("*")
    .eq("category_id", categoryId)
    .order("round", { ascending: true })
    .order("position", { ascending: true });

  if (div) query = query.eq("division_id", div);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
