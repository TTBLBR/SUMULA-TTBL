import { NextRequest, NextResponse } from "next/server";
import { calculateRanking, getRankingHistory } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const divisionId = searchParams.get("divisionId");

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  }

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .single();

  let divisionName = "";
  if (divisionId) {
    const { data: division } = await supabase
      .from("divisions")
      .select("name")
      .eq("id", divisionId)
      .single();
    divisionName = division?.name || "";
  }

  const [ranking, history] = await Promise.all([
    calculateRanking(categoryId, divisionId),
    getRankingHistory(categoryId, divisionId),
  ]);

  return NextResponse.json({
    category: category?.name || "",
    phase: category?.phase || "",
    division: divisionName,
    ranking,
    history,
  });
}
