import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAllScores, getCurrentCall } from "@/lib/store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  }

  // Get all judges assigned to this category
  const { data: judges } = await supabase
    .from("profiles")
    .select("id, full_name, nickname, email")
    .eq("category_id", categoryId)
    .eq("role", "judge")
    .eq("approved", true)
    .order("full_name");

  // Get current call athletes
  const currentCall = await getCurrentCall(categoryId);

  // Get all scores
  const scores = await getAllScores(categoryId);

  // Build scorecard: judge -> athlete -> criteria scores
  const scorecard = (judges || []).map((judge) => {
    const judgeScores = scores.filter((s) => s.judge_id === judge.id);
    const athleteScores: Record<string, Record<string, number | null>> = {};

    for (const athlete of currentCall) {
      const s = judgeScores.find((sc) => sc.athlete_id === athlete.id);
      if (s) {
        const criteria: Record<string, number | null> = {
          vol_f: s.volume_frente, vol_l: s.volume_lado, vol_c: s.volume_costas,
          cond: s.condicao,
          prop_f: s.proporcao_frente, prop_l: s.proporcao_lado, prop_c: s.proporcao_costas,
          sim_f: s.simetria_frente, sim_l: s.simetria_lado, sim_c: s.simetria_costas,
          est_f: s.estetica_frente, est_l: s.estetica_lado, est_c: s.estetica_costas,
          pose_f: s.pose_frente, pose_l: s.pose_lado, pose_c: s.pose_costas,
        };
        athleteScores[athlete.id] = criteria;
      }
    }

    // Count how many scores this judge has given
    const totalPossible = currentCall.length * 16; // 16 score fields per athlete
    let filled = 0;
    for (const athleteId of Object.keys(athleteScores)) {
      filled += Object.values(athleteScores[athleteId]).filter((v) => v !== null).length;
    }

    return {
      judgeId: judge.id,
      judgeName: judge.full_name || judge.nickname || judge.email,
      filled,
      totalPossible,
      athleteScores,
    };
  });

  return NextResponse.json({
    judges: scorecard,
    currentCall,
  });
}
