import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getDivisions,
  createDivision,
  deleteDivision,
  getWeights,
  updateWeights,
  getAthletes,
  addAthlete,
  removeAthlete,
  getCurrentCall,
  setCurrentCall,
  reorderCurrentCall,
  saveRoundAndClear,
  resetAllScores,
  exportFinalRanking,
  calculateRanking,
  getRankingHistory,
} from "@/lib/store";

export async function GET(
  request: NextRequest
) {
  const { searchParams } =
    new URL(request.url);

  const categoryId =
    searchParams.get(
      "categoryId"
    );

  const divisionId =
    searchParams.get(
      "divisionId"
    );

  if (!categoryId) {
    const categories =
      await getCategories();

    return NextResponse.json({
      categories,
    });
  }

  const [
    athletes,
    weights,
    currentCall,
    ranking,
    history,
    divisions,
  ] = await Promise.all([
    getAthletes(
      categoryId,
      divisionId
    ),

    getWeights(
      categoryId
    ),

    getCurrentCall(
      categoryId,
      divisionId
    ),

    calculateRanking(
      categoryId,
      divisionId
    ),

    getRankingHistory(
      categoryId,
      divisionId
    ),

    getDivisions(
      categoryId
    ),
  ]);

  return NextResponse.json({
    athletes,
    weights,
    currentCall,
    ranking,
    history,
    divisions,
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const { action } =
      body;

    if (
      action ===
      "createCategory"
    ) {
      const category =
        await createCategory(
          body.name,
          body.phase || ""
        );

      return NextResponse.json({
        category,
      });
    }

    if (
      action ===
      "updateCategory"
    ) {
      const category =
        await updateCategory(
          body.categoryId,
          {
            name:
              body.name,

            phase:
              body.phase,
          }
        );

      return NextResponse.json({
        category,
      });
    }

    if (
      action ===
      "deleteCategory"
    ) {
      await deleteCategory(
        body.categoryId
      );

      return NextResponse.json({
        success: true,
      });
    }

    if (
      action ===
      "createDivision"
    ) {
      const division =
        await createDivision(
          body.categoryId,
          body.name,
          body.divisionType ||
            ""
        );

      return NextResponse.json({
        division,
      });
    }

    if (
      action ===
      "deleteDivision"
    ) {
      await deleteDivision(
        body.divisionId
      );

      return NextResponse.json({
        success: true,
      });
    }

    if (
      action ===
      "updateWeights"
    ) {
      const weights =
        await updateWeights(
          body.categoryId,
          body.weights
        );

      return NextResponse.json({
        weights,
      });
    }

    if (
      action ===
      "addAthlete"
    ) {
      const athlete =
        await addAthlete(
          body.categoryId,
          body.number,
          body.name,
          body.divisionId
        );

      return NextResponse.json({
        athlete,
      });
    }

    if (
      action ===
      "removeAthlete"
    ) {
      await removeAthlete(
        body.athleteId
      );

      return NextResponse.json({
        success: true,
      });
    }

    if (
      action ===
      "setCurrentCall"
    ) {
      await setCurrentCall(
        body.categoryId,
        body.athleteIds,
        body.divisionId
      );

      return NextResponse.json({
        success: true,
      });
    }

    if (
      action ===
      "reorderCurrentCall"
    ) {
      await reorderCurrentCall(
        body.categoryId,
        body.athleteIds,
        body.divisionId
      );

      return NextResponse.json({
        success: true,
      });
    }

    if (
      action ===
      "saveAndClear"
    ) {
      await saveRoundAndClear(
        body.categoryId,
        body.divisionId
      );

      return NextResponse.json({
        success: true,
      });
    }

    if (
      action ===
      "resetScores"
    ) {
      await resetAllScores(
        body.categoryId,
        body.divisionId
      );

      return NextResponse.json({
        success: true,
      });
    }

    if (
      action ===
      "exportRanking"
    ) {
      const result =
        await exportFinalRanking(
          body.categoryId,
          body.divisionId
        );

      return NextResponse.json(
        result
      );
    }

    return NextResponse.json(
      {
        error:
          "Unknown action",
      },
      {
        status: 400,
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Server error";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
