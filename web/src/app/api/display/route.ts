import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateRanking } from "@/lib/store";

export async function GET() {
  const { data: config } = await supabase
    .from("display_config")
    .select("category_id, division_id")
    .eq("id", 1)
    .single();

  if (!config || !config.category_id) {
    return NextResponse.json({ active: false });
  }

  const { data: category } = await supabase
    .from("categories")
    .select("name, phase")
    .eq("id", config.category_id)
    .single();

  let divisionName = "";
  if (config.division_id) {
    const { data: div } = await supabase
      .from("divisions")
      .select("name")
      .eq("id", config.division_id)
      .single();
    divisionName = div?.name || "";
  }

  const ranking = await calculateRanking(config.category_id, config.division_id);

  return NextResponse.json({
    active: true,
    category: category?.name || "",
    phase: category?.phase || "",
    division: divisionName,
    ranking,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { categoryId, divisionId } = await req.json();

    const { error } = await supabase
      .from("display_config")
      .update({
        category_id: categoryId || null,
        division_id: divisionId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
