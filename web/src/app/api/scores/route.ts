import { NextRequest, NextResponse } from "next/server";
import {
  getScoresByJudge,
  getCurrentCall,
  getAthletes,
  upsertScore,
  checkOutliers,
  ScoreRow,
} from "@/lib/store";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const judgeId = searchParams.get("judgeId");
  const categoryId = searchParams.get("categoryId");

  if (!judgeId || !categoryId) {
    return NextResponse.json({ error: "judgeId and categoryId required" }, { status: 400 });
  }

  // Get judge profile (includes division_id)
  const { data: judge } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", judgeId)
    .single();

  if (!judge) {
    return NextResponse.json({ error: "Judge not found" }, { status: 404 });
  }

  // Judges see ALL calls and athletes for their category (not filtered by division)
  // The division assignment is for admin organization, not judge visibility
  const [scores, currentCall, athletes] = await Promise.all([
    getScoresByJudge(categoryId, judgeId),
    getCurrentCall(categoryId),
    getAthletes(categoryId),
  ]);

  // Check outliers for each athlete in call
  const outliers: Record<string, Record<string, string>> = {};
  for (const athlete of currentCall) {
    outliers[athlete.id] = await checkOutliers(categoryId, judgeId, athlete.id);
  }

  return NextResponse.json({
    judge,
    scores,
    currentCall,
    athletes,
    outliers,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categoryId, judgeId, athleteId, scores } = body;

    // Always use the athlete's own division_id for the score
    const { data: athlete } = await supabase
      .from("athletes")
      .select("division_id")
      .eq("id", athleteId)
      .single();

    const scoreRow: Omit<ScoreRow, "id"> = {
      category_id: categoryId,
      division_id: athlete?.division_id || null,
      judge_id: judgeId,
      athlete_id: athleteId,
      volume_frente: scores.volume?.frente ?? null,
      volume_lado: scores.volume?.lado ?? null,
      volume_costas: scores.volume?.costas ?? null,
      condicao: scores.condicao ?? null,
      proporcao_frente: scores.proporcao?.frente ?? null,
      proporcao_lado: scores.proporcao?.lado ?? null,
      proporcao_costas: scores.proporcao?.costas ?? null,
      simetria_frente: scores.simetria?.frente ?? null,
      simetria_lado: scores.simetria?.lado ?? null,
      simetria_costas: scores.simetria?.costas ?? null,
      estetica_frente: scores.estetica?.frente ?? null,
      estetica_lado: scores.estetica?.lado ?? null,
      estetica_costas: scores.estetica?.costas ?? null,
      pose_frente: scores.pose?.frente ?? null,
      pose_lado: scores.pose?.lado ?? null,
      pose_costas: scores.pose?.costas ?? null,
    };

    await upsertScore(scoreRow);

    const outliers = await checkOutliers(categoryId, judgeId, athleteId);

    return NextResponse.json({ success: true, outliers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
