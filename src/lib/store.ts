// Supabase-backed store for competition data
import { supabase } from "./supabase";

// Normalize "overall" to null for DB operations
function normDiv(
  divisionId?: string | null
): string | null {
  if (
    !divisionId ||
    divisionId === "overall"
  ) {
    return null;
  }

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

  individualAverages?: Record<
    string,
    Record<string, number>
  >;

  generalAverages?: Record<
    string,
    number
  >;
}

// ============ Categories ============

export async function getCategories(): Promise<
  Category[]
> {
  const { data, error } =
    await supabase
      .from("categories")
      .select("*")
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createCategory(
  name: string,
  phase: string = ""
): Promise<Category> {
  const { data, error } =
    await supabase
      .from("categories")
      .insert({
        name,
        phase,
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCategory(
  id: string,
  updates: {
    name?: string;
    phase?: string;
  }
): Promise<Category> {
  const { data, error } =
    await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteCategory(
  id: string
): Promise<void> {
  const { error } =
    await supabase
      .from("categories")
      .delete()
      .eq("id", id);

  if (error) {
    throw error;
  }
}

// ============ Divisions ============

export async function getDivisions(
  categoryId: string
): Promise<Division[]> {
  const { data, error } =
    await supabase
      .from("divisions")
      .select("*")
      .eq(
        "category_id",
        categoryId
      )
      .order("sort_order", {
        ascending: true,
      });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createDivision(
  categoryId: string,
  name: string,
  divisionType: string = ""
): Promise<Division> {
  const { data, error } =
    await supabase
      .from("divisions")
      .insert({
        category_id: categoryId,
        name,
        division_type:
          divisionType,
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteDivision(
  id: string
): Promise<void> {
  const { error } =
    await supabase
      .from("divisions")
      .delete()
      .eq("id", id);

  if (error) {
    throw error;
  }
}

// ============ Weights ============

export async function getWeights(
  categoryId: string
): Promise<CriteriaWeights> {
  const { data, error } =
    await supabase
      .from("criteria_weights")
      .select(
        "volume, condicao, proporcao, simetria, estetica, pose"
      )
      .eq(
        "category_id",
        categoryId
      )
      .is("division_id", null)
      .single();

  if (error) {
    return {
      volume: 4,
      condicao: 3,
      proporcao: 2,
      simetria: 2,
      estetica: 1,
      pose: 2,
    };
  }

  return data;
}

export async function updateWeights(
  categoryId: string,
  weights: Partial<CriteriaWeights>
): Promise<CriteriaWeights> {
  const { data, error } =
    await supabase
      .from("criteria_weights")
      .update(weights)
      .eq(
        "category_id",
        categoryId
      )
      .is("division_id", null)
      .select(
        "volume, condicao, proporcao, simetria, estetica, pose"
      )
      .single();

  if (error || !data) {
    const defaults = {
      volume: 4,
      condicao: 3,
      proporcao: 2,
      simetria: 2,
      estetica: 1,
      pose: 2,
      ...weights,
    };

    const {
      data: inserted,
      error: insertError,
    } = await supabase
      .from("criteria_weights")
      .insert({
        category_id: categoryId,
        ...defaults,
      })
      .select(
        "volume, condicao, proporcao, simetria, estetica, pose"
      )
      .single();

    if (insertError) {
      throw insertError;
    }

    return inserted;
  }

  return data;
}

// ============ Athletes ============

export async function getAthletes(
  categoryId: string,
  divisionId?: string | null
): Promise<Athlete[]> {
  let query = supabase
    .from("athletes")
    .select("*")
    .eq(
      "category_id",
      categoryId
    )
    .order("number", {
      ascending: true,
    });

  if (
    divisionId &&
    divisionId !== "overall"
  ) {
    query = query.eq(
      "division_id",
      divisionId
    );
  }

  const { data, error } =
    await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function addAthlete(
  categoryId: string,
  number: number,
  name: string,
  divisionId?: string | null
): Promise<Athlete> {
  const insert: Record<
    string,
    unknown
  > = {
    category_id: categoryId,
    number,
    name,
  };

  const division =
    normDiv(divisionId);

  if (division) {
    insert.division_id =
      division;
  }

  const { data, error } =
    await supabase
      .from("athletes")
      .insert(insert)
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function removeAthlete(
  id: string
): Promise<void> {
  const { error } =
    await supabase
      .from("athletes")
      .delete()
      .eq("id", id);

  if (error) {
    throw error;
  }
}

// ============ Current Call ============

export async function getCurrentCall(
  categoryId: string,
  divisionId?: string | null
): Promise<Athlete[]> {
  let query = supabase
    .from("current_call")
    .select(
      `
        athlete_id,
        sort_order,
        athletes (
          id,
          number,
          name,
          category_id,
          division_id
        )
      `
    )
    .eq(
      "category_id",
      categoryId
    )
    .order("sort_order", {
      ascending: true,
    });

  if (
    divisionId &&
    divisionId !== "overall"
  ) {
    query = query.eq(
      "division_id",
      divisionId
    );
  }

  const { data, error } =
    await query;

  if (error) {
    throw error;
  }

  return (data || [])
    .map(
      (
        row: Record<
          string,
          unknown
        >
      ) =>
        row.athletes as unknown as Athlete
    )
    .filter(Boolean);
}

export async function setCurrentCall(
  categoryId: string,
  athleteIds: string[],
  divisionId?: string | null
): Promise<void> {
  const division =
    normDiv(divisionId);

  if (division) {
    const { error } =
      await supabase
        .from("current_call")
        .delete()
        .eq(
          "category_id",
          categoryId
        )
        .eq(
          "division_id",
          division
        );

    if (error) {
      throw error;
    }
  } else {
    const { error } =
      await supabase
        .from("current_call")
        .delete()
        .eq(
          "category_id",
          categoryId
        );

    if (error) {
      throw error;
    }
  }

  if (
    athleteIds.length === 0
  ) {
    return;
  }

  const {
    data: athleteData,
    error: athleteError,
  } = await supabase
    .from("athletes")
    .select(
      "id, division_id"
    )
    .in("id", athleteIds);

  if (athleteError) {
    throw athleteError;
  }

  const athleteDivisionMap: Record<
    string,
    string | null
  > = {};

  for (
    const athlete of
    athleteData || []
  ) {
    athleteDivisionMap[
      athlete.id
    ] =
      athlete.division_id;
  }

  const rows = athleteIds.map(
    (
      athleteId,
      index
    ) => ({
      category_id:
        categoryId,

      athlete_id:
        athleteId,

      division_id:
        division ||
        athleteDivisionMap[
          athleteId
        ] ||
        null,

      sort_order:
        index,
    })
  );

  const { error } =
    await supabase
      .from("current_call")
      .insert(rows);

  if (error) {
    throw error;
  }
}

export async function reorderCurrentCall(
  categoryId: string,
  athleteIds: string[],
  divisionId?: string | null
): Promise<void> {
  if (
    !Array.isArray(
      athleteIds
    ) ||
    athleteIds.length === 0
  ) {
    throw new Error(
      "A chamada precisa ter pelo menos um atleta."
    );
  }

  if (
    athleteIds.length > 10
  ) {
    throw new Error(
      "A chamada pode ter no máximo 10 atletas."
    );
  }

  const uniqueIds =
    new Set(athleteIds);

  if (
    uniqueIds.size !==
    athleteIds.length
  ) {
    throw new Error(
      "A chamada contém atletas repetidos."
    );
  }

  await setCurrentCall(
    categoryId,
    athleteIds,
    divisionId
  );
}

export async function clearCurrentCall(
  categoryId: string,
  divisionId?: string | null
): Promise<void> {
  const division =
    normDiv(divisionId);

  let query = supabase
    .from("current_call")
    .delete()
    .eq(
      "category_id",
      categoryId
    );

  if (division) {
    query = query.eq(
      "division_id",
      division
    );
  }

  const { error } =
    await query;

  if (error) {
    throw error;
  }
}

// ============ Scores ============

export async function getScoresByJudge(
  categoryId: string,
  judgeId: string
): Promise<ScoreRow[]> {
  const { data, error } =
    await supabase
      .from("scores")
      .select("*")
      .eq(
        "category_id",
        categoryId
      )
      .eq(
        "judge_id",
        judgeId
      );

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getAllScores(
  categoryId: string,
  divisionId?: string | null
): Promise<ScoreRow[]> {
  let query = supabase
    .from("scores")
    .select("*")
    .eq(
      "category_id",
      categoryId
    );

  if (
    divisionId &&
    divisionId !== "overall"
  ) {
    query = query.eq(
      "division_id",
      divisionId
    );
  }

  const { data, error } =
    await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function upsertScore(
  score: Omit<
    ScoreRow,
    "id"
  >
): Promise<ScoreRow> {
  const { data, error } =
    await supabase
      .from("scores")
      .upsert(
        {
          ...score,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "category_id,judge_id,athlete_id",
        }
      )
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function clearScores(
  categoryId: string,
  divisionId?: string | null
): Promise<void> {
  const division =
    normDiv(divisionId);

  let query = supabase
    .from("scores")
    .delete()
    .eq(
      "category_id",
      categoryId
    );

  if (division) {
    query = query.eq(
      "division_id",
      division
    );
  }

  const { error } =
    await query;

  if (error) {
    throw error;
  }
}

// ============ Ranking Calculation ============

function avg(
  values: (
    number | null
  )[]
): number {
  const validValues =
    values.filter(
      (
        value
      ): value is number =>
        value !== null
    );

  if (
    validValues.length === 0
  ) {
    return 0;
  }

  return (
    validValues.reduce(
      (
        total,
        value
      ) =>
        total + value,
      0
    ) /
    validValues.length
  );
}

const OUTLIER_THRESHOLD =
  1.5;

function getJudgeAvgForCriteria(
  score: ScoreRow,
  criteria: string
): number | null {
  if (
    criteria ===
    "condicao"
  ) {
    return score.condicao;
  }

  const front =
    score[
      `${criteria}_frente` as keyof ScoreRow
    ] as number | null;

  const side =
    score[
      `${criteria}_lado` as keyof ScoreRow
    ] as number | null;

  const back =
    score[
      `${criteria}_costas` as keyof ScoreRow
    ] as number | null;

  if (
    [
      front,
      side,
      back,
    ].some(
      (value) =>
        value !== null
    )
  ) {
    return avg([
      front,
      side,
      back,
    ]);
  }

  return null;
}

function criteriaAvgFromScores(
  scores: ScoreRow[],
  athleteId: string,
  criteria: string
): number {
  const athleteScores =
    scores.filter(
      (score) =>
        score.athlete_id ===
        athleteId
    );

  if (
    athleteScores.length === 0
  ) {
    return 0;
  }

  const judgeAverages:
    number[] = [];

  for (
    const score of
    athleteScores
  ) {
    const value =
      getJudgeAvgForCriteria(
        score,
        criteria
      );

    if (value !== null) {
      judgeAverages.push(
        value
      );
    }
  }

  if (
    judgeAverages.length === 0
  ) {
    return 0;
  }

  if (
    judgeAverages.length <= 2
  ) {
    return (
      judgeAverages.reduce(
        (
          total,
          value
        ) =>
          total + value,
        0
      ) /
      judgeAverages.length
    );
  }

  const initialAverage =
    judgeAverages.reduce(
      (
        total,
        value
      ) =>
        total + value,
      0
    ) /
    judgeAverages.length;

  const filtered =
    judgeAverages.filter(
      (value) =>
        Math.abs(
          value -
            initialAverage
        ) <=
        OUTLIER_THRESHOLD
    );

  if (
    filtered.length === 0
  ) {
    return initialAverage;
  }

  return (
    filtered.reduce(
      (
        total,
        value
      ) =>
        total + value,
      0
    ) /
    filtered.length
  );
}

function getIndividualAverages(
  scores: ScoreRow[],
  athleteId: string
): Record<
  string,
  Record<string, number>
> {
  const criteriaKeys = [
    "volume",
    "condicao",
    "proporcao",
    "simetria",
    "estetica",
    "pose",
  ];

  const athleteScores =
    scores.filter(
      (score) =>
        score.athlete_id ===
        athleteId
    );

  const result: Record<
    string,
    Record<string, number>
  > = {};

  for (
    const score of
    athleteScores
  ) {
    const judgeAverages: Record<
      string,
      number
    > = {};

    for (
      const key of
      criteriaKeys
    ) {
      if (
        key ===
        "condicao"
      ) {
        judgeAverages[
          key
        ] =
          score.condicao ??
          0;
      } else {
        const front =
          score[
            `${key}_frente` as keyof ScoreRow
          ] as number | null;

        const side =
          score[
            `${key}_lado` as keyof ScoreRow
          ] as number | null;

        const back =
          score[
            `${key}_costas` as keyof ScoreRow
          ] as number | null;

        judgeAverages[
          key
        ] = avg([
          front,
          side,
          back,
        ]);
      }
    }

    result[
      score.judge_id
    ] =
      judgeAverages;
  }

  return result;
}

export async function calculateRanking(
  categoryId: string,
  divisionId?: string | null
): Promise<RankingEntry[]> {
  const [
    athletes,
    weights,
    scores,
  ] = await Promise.all([
    getAthletes(
      categoryId,
      divisionId
    ),

    getWeights(
      categoryId
    ),

    getAllScores(
      categoryId,
      divisionId
    ),
  ]);

  const criteriaKeys = [
    "volume",
    "condicao",
    "proporcao",
    "simetria",
    "estetica",
    "pose",
  ] as const;

  const entries =
    athletes.map(
      (athlete) => {
        const breakdown: Record<
          string,
          number
        > = {};

        const generalAverages: Record<
          string,
          number
        > = {};

        let total = 0;

        for (
          const key of
          criteriaKeys
        ) {
          const generalAverage =
            criteriaAvgFromScores(
              scores,
              athlete.id,
              key
            );

          generalAverages[
            key
          ] =
            Math.round(
              generalAverage *
                100
            ) / 100;

          const weight =
            weights[key];

          const points =
            generalAverage *
            weight;

          breakdown[key] =
            Math.round(
              points * 100
            ) / 100;

          total += points;
        }

        const individualAverages =
          getIndividualAverages(
            scores,
            athlete.id
          );

        return {
          position: 0,

          athleteId:
            athlete.id,

          athleteNumber:
            athlete.number,

          athleteName:
            athlete.name,

          totalScore:
            Math.round(
              total * 100
            ) / 100,

          breakdown,

          individualAverages,

          generalAverages,
        };
      }
    );

  entries.sort(
    (
      first,
      second
    ) =>
      second.totalScore -
      first.totalScore
  );

  entries.forEach(
    (
      entry,
      index
    ) => {
      entry.position =
        index + 1;
    }
  );

  return entries;
}

// ============ Outlier Detection ============

export async function checkOutliers(
  categoryId: string,
  judgeId: string,
  athleteId: string,
  divisionId?: string | null
): Promise<
  Record<
    string,
    "OK" | "ERRO"
  >
> {
  const scores =
    await getAllScores(
      categoryId,
      divisionId
    );

  const judgeScore =
    scores.find(
      (score) =>
        score.judge_id ===
          judgeId &&
        score.athlete_id ===
          athleteId
    );

  const criteriaKeys = [
    "volume",
    "condicao",
    "proporcao",
    "simetria",
    "estetica",
    "pose",
  ] as const;

  const result: Record<
    string,
    "OK" | "ERRO"
  > = {};

  for (
    const key of
    criteriaKeys
  ) {
    if (!judgeScore) {
      result[key] = "OK";
      continue;
    }

    const generalAverage =
      criteriaAvgFromScores(
        scores,
        athleteId,
        key
      );

    let judgeAverage:
      number;

    if (
      key ===
      "condicao"
    ) {
      judgeAverage =
        judgeScore.condicao ??
        0;
    } else {
      const front =
        judgeScore[
          `${key}_frente` as keyof ScoreRow
        ] as number | null;

      const side =
        judgeScore[
          `${key}_lado` as keyof ScoreRow
        ] as number | null;

      const back =
        judgeScore[
          `${key}_costas` as keyof ScoreRow
        ] as number | null;

      judgeAverage = avg([
        front,
        side,
        back,
      ]);
    }

    result[key] =
      Math.abs(
        judgeAverage -
          generalAverage
      ) >
      OUTLIER_THRESHOLD
        ? "ERRO"
        : "OK";
  }

  return result;
}

// ============ Save Round & Clear ============

export async function saveRoundAndClear(
  categoryId: string,
  divisionId?: string | null
): Promise<void> {
  const division =
    normDiv(divisionId);

  const ranking =
    await calculateRanking(
      categoryId,
      divisionId
    );

  const scores =
    await getAllScores(
      categoryId,
      divisionId
    );

  let roundQuery =
    supabase
      .from(
        "ranking_history"
      )
      .select("round")
      .eq(
        "category_id",
        categoryId
      )
      .order("round", {
        ascending: false,
      })
      .limit(1);

  if (division) {
    roundQuery =
      roundQuery.eq(
        "division_id",
        division
      );
  }

  const {
    data: lastRound,
  } = await roundQuery;

  const roundNumber =
    (
      lastRound &&
      lastRound.length > 0
        ? lastRound[0]
            .round
        : 0
    ) + 1;

  const historyRows =
    ranking
      .filter(
        (entry) =>
          entry.totalScore >
          0
      )
      .map(
        (entry) => ({
          category_id:
            categoryId,

          division_id:
            division,

          round:
            roundNumber,

          athlete_id:
            entry.athleteId,

          athlete_number:
            entry.athleteNumber,

          athlete_name:
            entry.athleteName,

          position:
            entry.position,

          total_score:
            entry.totalScore,

          breakdown:
            entry.breakdown,

          individual_averages:
            getIndividualAverages(
              scores,
              entry.athleteId
            ),

          general_averages:
            entry.generalAverages ||
            {},
        })
      );

  if (
    historyRows.length > 0
  ) {
    const { error } =
      await supabase
        .from(
          "ranking_history"
        )
        .insert(
          historyRows
        );

    if (error) {
      throw error;
    }
  }

  await clearCurrentCall(
    categoryId,
    division
  );
}

export async function resetAllScores(
  categoryId: string,
  divisionId?: string | null
): Promise<void> {
  await clearScores(
    categoryId,
    divisionId
  );
}

export async function exportFinalRanking(
  categoryId: string,
  divisionId?: string | null
) {
  const division =
    normDiv(divisionId);

  const ranking =
    await calculateRanking(
      categoryId,
      divisionId
    );

  const scores =
    await getAllScores(
      categoryId,
      divisionId
    );

  const { data: category } =
    await supabase
      .from("categories")
      .select(
        "name, phase"
      )
      .eq("id", categoryId)
      .single();

  let divisionName =
    divisionId ===
    "overall"
      ? "Overall"
      : "";

  if (division) {
    const {
      data: divisionData,
    } = await supabase
      .from("divisions")
      .select("name")
      .eq("id", division)
      .single();

    divisionName =
      divisionData?.name ||
      "";
  }

  return {
    category:
      category?.name ||
      "",

    phase:
      category?.phase ||
      "",

    division:
      divisionName,

    exportedAt:
      new Date().toISOString(),

    ranking:
      ranking
        .filter(
          (entry) =>
            entry.totalScore >
            0
        )
        .map(
          (entry) => ({
            position:
              entry.position,

            athleteNumber:
              entry.athleteNumber,

            athleteName:
              entry.athleteName,

            totalScore:
              entry.totalScore,

            breakdown:
              entry.breakdown,

            generalAverages:
              entry.generalAverages,

            individualAverages:
              getIndividualAverages(
                scores,
                entry.athleteId
              ),
          })
        ),
  };
}

// ============ History ============

export async function getRankingHistory(
  categoryId: string,
  divisionId?: string | null
) {
  const division =
    normDiv(divisionId);

  let query = supabase
    .from("ranking_history")
    .select("*")
    .eq(
      "category_id",
      categoryId
    )
    .order("round", {
      ascending: true,
    })
    .order("position", {
      ascending: true,
    });

  if (division) {
    query = query.eq(
      "division_id",
      division
    );
  }

  const { data, error } =
    await query;

  if (error) {
    throw error;
  }

  return data || [];
}
