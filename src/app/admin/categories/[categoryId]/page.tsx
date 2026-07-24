"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface Athlete {
  id: string;
  number: number;
  name: string;
  division_id:
    string | null;
}

interface CallAthlete {
  id: string;
  number: number;
  name: string;
}

interface Judge {
  id: string;
  full_name: string;
  email: string;
}

interface Division {
  id: string;
  name: string;
  division_type: string;
}

interface Weights {
  volume: number;
  condicao: number;
  proporcao: number;
  simetria: number;
  estetica: number;
  pose: number;
}

interface RankingEntry {
  position: number;
  athleteNumber: number;
  athleteName: string;
  totalScore: number;
  breakdown: Record<
    string,
    number
  >;
}

interface JudgeScorecard {
  judgeId: string;
  judgeName: string;
  filled: number;
  totalPossible: number;

  athleteScores: Record<
    string,
    Record<
      string,
      number | null
    >
  >;
}

const DIVISION_TYPES = [
  {
    value: "",
    label: "Geral",
  },
  {
    value: "weight",
    label: "Peso",
  },
  {
    value: "height",
    label: "Altura",
  },
  {
    value: "age",
    label: "Idade",
  },
];

export default function CategoryManagePage() {
  const params =
    useParams();

  const categoryId =
    params.categoryId as string;

  const [
    catName,
    setCatName,
  ] = useState("");

  const [
    catPhase,
    setCatPhase,
  ] = useState("");

  const [
    divisions,
    setDivisions,
  ] = useState<
    Division[]
  >([]);

  const [
    selectedDivision,
    setSelectedDivision,
  ] = useState<
    string | null
  >(null);

  const didAutoSelect =
    useRef(false);

  const callOrderBusyRef =
    useRef(false);

  const [
    athletes,
    setAthletes,
  ] = useState<
    Athlete[]
  >([]);

  const [
    judges,
    setJudges,
  ] = useState<
    Judge[]
  >([]);

  const [
    weights,
    setWeights,
  ] = useState<Weights>({
    volume: 4,
    condicao: 3,
    proporcao: 2,
    simetria: 2,
    estetica: 1,
    pose: 2,
  });

  const [
    currentCall,
    setCurrentCallState,
  ] = useState<
    CallAthlete[]
  >([]);

  const [
    savingCallOrder,
    setSavingCallOrder,
  ] = useState(false);

  const [
    ranking,
    setRanking,
  ] = useState<
    RankingEntry[]
  >([]);

  const [
    newAthleteNum,
    setNewAthleteNum,
  ] = useState("");

  const [
    newAthleteName,
    setNewAthleteName,
  ] = useState("");

  const [
    newDivName,
    setNewDivName,
  ] = useState("");

  const [
    newDivType,
    setNewDivType,
  ] = useState("");

  const [
    selectedAthleteIds,
    setSelectedAthleteIds,
  ] = useState<
    string[]
  >([]);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    scorecard,
    setScorecard,
  ] = useState<
    JudgeScorecard[]
  >([]);

  const [
    scorecardAthletes,
    setScorecardAthletes,
  ] = useState<
    CallAthlete[]
  >([]);

  const [
    tab,
    setTab,
  ] = useState<
    | "setup"
    | "call"
    | "ranking"
    | "scores"
  >("setup");

  const showMsg = (
    text: string
  ) => {
    setMessage(text);

    window.setTimeout(
      () => {
        setMessage("");
      },
      3000
    );
  };

  const apiPost = async (
    body: Record<
      string,
      unknown
    >
  ) => {
    const response =
      await fetch(
        "/api/competition",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              body
            ),
        }
      );

    return response.json();
  };

  const fetchData =
    useCallback(async () => {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session) {
        window.location.href =
          "/login";

        return;
      }

      const {
        data: category,
      } = await supabase
        .from("categories")
        .select("*")
        .eq(
          "id",
          categoryId
        )
        .single();

      if (
        category &&
        !document.activeElement?.closest(
          "input"
        )
      ) {
        setCatName(
          category.name
        );

        setCatPhase(
          category.phase ||
            ""
        );
      }

      const {
        data: divisionData,
      } = await supabase
        .from("divisions")
        .select("*")
        .eq(
          "category_id",
          categoryId
        )
        .order(
          "sort_order"
        );

      setDivisions(
        divisionData ||
          []
      );

      let activeDivision =
        selectedDivision;

      if (
        !didAutoSelect.current &&
        !activeDivision &&
        divisionData &&
        divisionData.length >
          0
      ) {
        activeDivision =
          "overall";

        setSelectedDivision(
          "overall"
        );

        didAutoSelect.current =
          true;
      }

      const divisionParameter =
        activeDivision
          ? `&divisionId=${activeDivision}`
          : "";

      const [
        competitionResponse,
        rankingResponse,
        weightsResponse,
      ] = await Promise.all([
        fetch(
          `/api/competition?categoryId=${categoryId}${divisionParameter}`
        ).then(
          (response) =>
            response.json()
        ),

        fetch(
          `/api/ranking?categoryId=${categoryId}${divisionParameter}`
        ).then(
          (response) =>
            response.json()
        ),

        fetch(
          `/api/competition?categoryId=${categoryId}`
        ).then(
          (response) =>
            response.json()
        ),
      ]);

      setAthletes(
        competitionResponse.athletes ||
          []
      );

      if (
        weightsResponse.weights
      ) {
        setWeights(
          weightsResponse.weights
        );
      }

      if (
        !callOrderBusyRef.current
      ) {
        setCurrentCallState(
          competitionResponse.currentCall ||
            []
        );
      }

      setRanking(
        rankingResponse.ranking ||
          []
      );

      const {
        data: judgeProfiles,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email"
        )
        .eq(
          "category_id",
          categoryId
        )
        .eq(
          "role",
          "judge"
        )
        .eq(
          "approved",
          true
        );

      setJudges(
        judgeProfiles ||
          []
      );

      const scorecardResponse =
        await fetch(
          `/api/scorecard?categoryId=${categoryId}`
        ).then(
          (response) =>
            response.json()
        );

      setScorecard(
        scorecardResponse.judges ||
          []
      );

      setScorecardAthletes(
        scorecardResponse.currentCall ||
          []
      );
    }, [
      categoryId,
      selectedDivision,
    ]);

  useEffect(() => {
    fetchData();

    const interval =
      window.setInterval(
        fetchData,
        4000
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, [fetchData]);

  const updateCategory =
    async () => {
      const { error } =
        await supabase
          .from("categories")
          .update({
            name:
              catName,

            phase:
              catPhase,
          })
          .eq(
            "id",
            categoryId
          );

      if (error) {
        showMsg(
          "Erro: " +
            error.message
        );

        return;
      }

      showMsg("Salvo!");
    };

  const addDivision =
    async () => {
      if (
        !newDivName.trim()
      ) {
        return;
      }

      const result =
        await apiPost({
          action:
            "createDivision",

          categoryId,

          name:
            newDivName.trim(),

          divisionType:
            newDivType,
        });

      if (result.error) {
        showMsg(
          "Erro: " +
            result.error
        );

        return;
      }

      setNewDivName("");
      setNewDivType("");

      showMsg(
        "Divisão criada!"
      );

      await fetchData();
    };

  const removeDivision =
    async (
      id: string
    ) => {
      if (
        !window.confirm(
          "Excluir divisão?"
        )
      ) {
        return;
      }

      const result =
        await apiPost({
          action:
            "deleteDivision",

          divisionId:
            id,
        });

      if (result.error) {
        showMsg(
          "Erro: " +
            result.error
        );

        return;
      }

      if (
        selectedDivision ===
        id
      ) {
        setSelectedDivision(
          null
        );
      }

      await fetchData();
    };

  const addAthleteHandler =
    async () => {
      const number =
        Number.parseInt(
          newAthleteNum,
          10
        );

      if (
        Number.isNaN(
          number
        ) ||
        !newAthleteName.trim()
      ) {
        showMsg(
          "Preencha número e nome"
        );

        return;
      }

      const result =
        await apiPost({
          action:
            "addAthlete",

          categoryId,

          number,

          name:
            newAthleteName.trim(),

          divisionId:
            selectedDivision,
        });

      if (result.error) {
        showMsg(
          "Erro: " +
            result.error
        );

        return;
      }

      setNewAthleteNum("");
      setNewAthleteName("");

      await fetchData();
    };

  const removeAthleteHandler =
    async (
      id: string
    ) => {
      const result =
        await apiPost({
          action:
            "removeAthlete",

          athleteId:
            id,
        });

      if (result.error) {
        showMsg(
          "Erro: " +
            result.error
        );

        return;
      }

      await fetchData();
    };

  const updateWeight =
    async (
      key: string,
      value: string
    ) => {
      const number =
        Number.parseFloat(
          value
        );

      if (
        Number.isNaN(
          number
        )
      ) {
        return;
      }

      const newWeights = {
        ...weights,
        [key]: number,
      };

      setWeights(
        newWeights
      );

      const result =
        await apiPost({
          action:
            "updateWeights",

          categoryId,

          weights:
            newWeights,
        });

      if (result.error) {
        showMsg(
          "Erro: " +
            result.error
        );
      }
    };

  const toggleAthleteInCall = (
    id: string
  ) => {
    setSelectedAthleteIds(
      (previous) => {
        if (
          previous.includes(
            id
          )
        ) {
          return previous.filter(
            (athleteId) =>
              athleteId !==
              id
          );
        }

        if (
          previous.length >=
          10
        ) {
          return previous;
        }

        return [
          ...previous,
          id,
        ];
      }
    );
  };

  const selectedCallAthletes =
    selectedAthleteIds
      .map(
        (athleteId) =>
          athletes.find(
            (athlete) =>
              athlete.id ===
              athleteId
          )
      )
      .filter(
        (
          athlete
        ): athlete is Athlete =>
          Boolean(athlete)
      )
      .map(
        (athlete) => ({
          id:
            athlete.id,

          number:
            athlete.number,

          name:
            athlete.name,
        })
      );

  const reorderSelectedCall = (
    orderedAthletes:
      CallAthlete[]
  ) => {
    setSelectedAthleteIds(
      orderedAthletes.map(
        (athlete) =>
          athlete.id
      )
    );
  };

  const startCall =
    async () => {
      if (
        selectedAthleteIds.length ===
        0
      ) {
        showMsg(
          "Selecione atletas"
        );

        return;
      }

      const result =
        await apiPost({
          action:
            "setCurrentCall",

          categoryId,

          athleteIds:
            selectedAthleteIds,

          divisionId:
            selectedDivision,
        });

      if (result.error) {
        showMsg(
          "Erro: " +
            result.error
        );

        return;
      }

      setSelectedAthleteIds(
        []
      );

      showMsg(
        "Chamada iniciada!"
      );

      await fetchData();
    };

  const persistCurrentCallOrder =
    async (
      orderedAthletes:
        CallAthlete[]
    ) => {
      if (
        callOrderBusyRef.current ||
        orderedAthletes.length ===
          0
      ) {
        return;
      }

      const previousOrder = [
        ...currentCall,
      ];

      setCurrentCallState(
        orderedAthletes
      );

      callOrderBusyRef.current =
        true;

      setSavingCallOrder(
        true
      );

      try {
        const result =
          await apiPost({
            action:
              "reorderCurrentCall",

            categoryId,

            athleteIds:
              orderedAthletes.map(
                (athlete) =>
                  athlete.id
              ),

            divisionId:
              selectedDivision,
          });

        if (result.error) {
          setCurrentCallState(
            previousOrder
          );

          showMsg(
            "Erro ao mudar a ordem: " +
              result.error
          );

          return;
        }

        showMsg(
          "Ordem atualizada!"
        );
      } catch (error) {
        setCurrentCallState(
          previousOrder
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erro desconhecido";

        showMsg(
          "Erro ao mudar a ordem: " +
            errorMessage
        );
      } finally {
        callOrderBusyRef.current =
          false;

        setSavingCallOrder(
          false
        );
      }
    };

  const saveAndClear =
    async () => {
      const result =
        await apiPost({
          action:
            "saveAndClear",

          categoryId,

          divisionId:
            selectedDivision,
        });

      if (result.error) {
        showMsg(
          "Erro: " +
            result.error
        );

        return;
      }

      setSelectedAthleteIds(
        []
      );

      showMsg("Salvo!");

      await fetchData();
    };

  const weightLabels: Record<
    string,
    string
  > = {
    volume: "Volume",
    condicao: "Cond",
    proporcao: "Prop",
    simetria: "Sim",
    estetica: "Est",
    pose: "Pose",
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0c0c0e]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="text-[12px] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              ← Voltar
            </a>

            <div className="h-4 w-px bg-white/10" />

            <h1 className="text-sm font-semibold text-white">
              {catName}
            </h1>

            {catPhase && (
              <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-600">
                {catPhase}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {message && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/8 px-4 py-2.5 text-[13px] text-emerald-400">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={
                  2
                }
                d="M5 13l4 4L19 7"
              />
            </svg>

            {message}
          </div>
        )}

        <div className="mb-4 flex gap-6 border-b border-white/[0.06]">
          {(
            [
              "setup",
              "call",
              "scores",
              "ranking",
            ] as const
          ).map(
            (
              currentTab
            ) => (
              <button
                key={
                  currentTab
                }
                onClick={() =>
                  setTab(
                    currentTab
                  )
                }
                className={`relative pb-3 text-sm font-medium transition-colors ${
                  tab ===
                  currentTab
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {currentTab ===
                "setup"
                  ? "Config"
                  : currentTab ===
                      "call"
                    ? "Chamada"
                    : currentTab ===
                        "scores"
                      ? "Notas"
                      : "Ranking"}

                {tab ===
                  currentTab && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-white" />
                )}
              </button>
            )
          )}
        </div>

        {divisions.length >
          0 && (
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            <span className="mr-1 shrink-0 self-center text-[10px] uppercase tracking-widest text-zinc-600">
              Divisão:
            </span>

            <button
              onClick={() => {
                setSelectedDivision(
                  "overall"
                );

                setSelectedAthleteIds(
                  []
                );
              }}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                selectedDivision ===
                "overall"
                  ? "bg-white text-zinc-900"
                  : "border border-white/[0.06] bg-white/[0.04] text-zinc-400 hover:bg-white/[0.06]"
              }`}
            >
              Overall
            </button>

            {divisions
              .filter(
                (division) =>
                  division.name.toLowerCase() !==
                  "overall"
              )
              .map(
                (
                  division
                ) => (
                  <button
                    key={
                      division.id
                    }
                    onClick={() => {
                      setSelectedDivision(
                        division.id
                      );

                      setSelectedAthleteIds(
                        []
                      );
                    }}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                      selectedDivision ===
                      division.id
                        ? "bg-white text-zinc-900"
                        : "border border-white/[0.06] bg-white/[0.04] text-zinc-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    {
                      division.name
                    }
                  </button>
                )
              )}
          </div>
        )}

        {tab ===
          "setup" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Categoria
              </h2>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={catName}
                  onChange={(
                    event
                  ) =>
                    setCatName(
                      event.target.value
                    )
                  }
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/[0.15]"
                />

                <input
                  type="text"
                  value={catPhase}
                  onChange={(
                    event
                  ) =>
                    setCatPhase(
                      event.target.value
                    )
                  }
                  placeholder="Fase"
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/[0.15]"
                />
              </div>

              <button
                onClick={
                  updateCategory
                }
                className="mt-3 rounded-xl bg-white px-4 py-2 text-[13px] font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
              >
                Salvar
              </button>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Divisões
              </h2>

              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={
                    newDivName
                  }
                  onChange={(
                    event
                  ) =>
                    setNewDivName(
                      event.target.value
                    )
                  }
                  placeholder="Ex: Até 80kg, Junior"
                  className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/[0.15]"
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      addDivision();
                    }
                  }}
                />

                <select
                  value={
                    newDivType
                  }
                  onChange={(
                    event
                  ) =>
                    setNewDivType(
                      event.target.value
                    )
                  }
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-300 outline-none transition-colors focus:border-white/[0.15]"
                >
                  {DIVISION_TYPES.map(
                    (
                      divisionType
                    ) => (
                      <option
                        key={
                          divisionType.value
                        }
                        value={
                          divisionType.value
                        }
                      >
                        {
                          divisionType.label
                        }
                      </option>
                    )
                  )}
                </select>

                <button
                  onClick={
                    addDivision
                  }
                  className="rounded-xl bg-white px-4 py-2.5 font-bold text-zinc-900 transition-colors hover:bg-zinc-100"
                >
                  +
                </button>
              </div>

              <div className="space-y-1">
                {divisions.map(
                  (
                    division
                  ) => (
                    <div
                      key={
                        division.id
                      }
                      className="flex items-center justify-between rounded-xl border border-white/[0.03] bg-white/[0.02] px-4 py-2 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="text-[13px] text-zinc-300">
                        {
                          division.name
                        }
                      </span>

                      <button
                        onClick={() =>
                          removeDivision(
                            division.id
                          )
                        }
                        className="text-[11px] text-zinc-600 transition-colors hover:text-red-400"
                      >
                        Excluir
                      </button>
                    </div>
                  )
                )}

                {divisions.length ===
                  0 && (
                  <p className="text-[12px] text-zinc-600">
                    Sem divisões
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Pesos
              </h2>

              <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                {Object.entries(
                  weights
                ).map(
                  ([
                    key,
                    value,
                  ]) => (
                    <div
                      key={
                        key
                      }
                    >
                      <label className="mb-1 block text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                        {
                          weightLabels[
                            key
                          ]
                        }
                      </label>

                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={
                          value
                        }
                        onChange={(
                          event
                        ) =>
                          updateWeight(
                            key,
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-center text-sm text-white outline-none transition-colors focus:border-white/[0.15]"
                      />
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Atletas (
                {
                  athletes.length
                }
                )
              </h2>

              <div className="mb-3 flex gap-2">
                <input
                  type="number"
                  value={
                    newAthleteNum
                  }
                  onChange={(
                    event
                  ) =>
                    setNewAthleteNum(
                      event.target.value
                    )
                  }
                  placeholder="Nº"
                  className="w-20 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/[0.15]"
                />

                <input
                  type="text"
                  value={
                    newAthleteName
                  }
                  onChange={(
                    event
                  ) =>
                    setNewAthleteName(
                      event.target.value
                    )
                  }
                  placeholder="Nome"
                  className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/[0.15]"
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      addAthleteHandler();
                    }
                  }}
                />

                <button
                  onClick={
                    addAthleteHandler
                  }
                  className="rounded-xl bg-white px-4 py-2.5 font-bold text-zinc-900 transition-colors hover:bg-zinc-100"
                >
                  +
                </button>
              </div>

              <div className="max-h-48 space-y-1 overflow-y-auto">
                {athletes.map(
                  (
                    athlete
                  ) => (
                    <div
                      key={
                        athlete.id
                      }
                      className="flex items-center justify-between rounded-xl border border-white/[0.03] bg-white/[0.02] px-4 py-2 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="text-[13px]">
                        <span className="font-mono text-zinc-500">
                          #
                          {
                            athlete.number
                          }
                        </span>{" "}

                        <span className="text-white">
                          {
                            athlete.name
                          }
                        </span>

                        {selectedDivision ===
                          "overall" &&
                          athlete.division_id &&
                          divisions.find(
                            (
                              division
                            ) =>
                              division.id ===
                              athlete.division_id
                          ) && (
                            <span className="ml-2 text-[10px] text-zinc-600">
                              {
                                divisions.find(
                                  (
                                    division
                                  ) =>
                                    division.id ===
                                    athlete.division_id
                                )!
                                  .name
                              }
                            </span>
                          )}
                      </span>

                      <button
                        onClick={() =>
                          removeAthleteHandler(
                            athlete.id
                          )
                        }
                        className="text-[11px] text-zinc-600 transition-colors hover:text-red-400"
                      >
                        x
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Árbitros (
                {
                  judges.length
                }
                )
              </h2>

              <div className="space-y-1">
                {judges.map(
                  (
                    judge
                  ) => (
                    <div
                      key={
                        judge.id
                      }
                      className="rounded-xl border border-white/[0.03] bg-white/[0.02] px-4 py-2 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="text-[13px] text-white">
                        {
                          judge.full_name
                        }
                      </span>

                      <span className="ml-2 text-[12px] text-zinc-600">
                        {
                          judge.email
                        }
                      </span>
                    </div>
                  )
                )}

                {judges.length ===
                  0 && (
                  <p className="text-[12px] text-zinc-600">
                    Atribua árbitros no painel de Usuários
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab ===
          "call" && (
          <div className="space-y-4">
            {currentCall.length >
            0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                      Chamada em andamento
                    </h2>

                    <p className="mt-1 text-[11px] text-zinc-600">
                      Arraste um atleta ou use as setas. A alteração é salva automaticamente.
                    </p>
                  </div>

                  {savingCallOrder && (
                    <span className="rounded-lg border border-amber-400/15 bg-amber-400/10 px-3 py-2 text-[11px] font-medium text-amber-300">
                      Salvando ordem...
                    </span>
                  )}
                </div>

                <CallOrderList
                  items={
                    currentCall
                  }
                  disabled={
                    savingCallOrder
                  }
                  onReorder={
                    persistCurrentCallOrder
                  }
                />

                <div className="mb-6 mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      savingCallOrder ||
                      currentCall.length <
                        2
                    }
                    onClick={() =>
                      persistCurrentCallOrder(
                        [
                          ...currentCall,
                        ].sort(
                          (
                            first,
                            second
                          ) =>
                            first.number -
                            second.number
                        )
                      )
                    }
                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                  >
                    Ordenar por número
                  </button>
                </div>

                <button
                  onClick={
                    saveAndClear
                  }
                  disabled={
                    savingCallOrder
                  }
                  className="w-full rounded-xl bg-red-600 py-3 text-[13px] font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  SALVAR E ENCERRAR
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h2 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                  Nova chamada (
                  {
                    selectedAthleteIds.length
                  }
                  /10)
                </h2>

                <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {athletes.map(
                    (
                      athlete
                    ) => (
                      <button
                        key={
                          athlete.id
                        }
                        onClick={() =>
                          toggleAthleteInCall(
                            athlete.id
                          )
                        }
                        className={`rounded-xl border px-4 py-3 text-[13px] font-medium transition-all ${
                          selectedAthleteIds.includes(
                            athlete.id
                          )
                            ? "border-white bg-white text-zinc-900"
                            : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.1] hover:bg-white/[0.04]"
                        }`}
                      >
                        #
                        {
                          athlete.number
                        }{" "}
                        {
                          athlete.name
                        }
                      </button>
                    )
                  )}

                  {athletes.length ===
                    0 && (
                    <p className="col-span-4 text-[13px] text-zinc-600">
                      Adicione atletas em Config
                    </p>
                  )}
                </div>

                {selectedCallAthletes.length >
                  0 && (
                  <div className="mb-6 rounded-2xl border border-blue-400/10 bg-blue-400/[0.04] p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-[11px] font-medium uppercase tracking-widest text-blue-300">
                          Ordem da chamada
                        </h3>

                        <p className="mt-1 text-[11px] text-zinc-600">
                          Esta será a ordem exibida para os árbitros.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          selectedCallAthletes.length <
                          2
                        }
                        onClick={() =>
                          reorderSelectedCall(
                            [
                              ...selectedCallAthletes,
                            ].sort(
                              (
                                first,
                                second
                              ) =>
                                first.number -
                                second.number
                            )
                          )
                        }
                        className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white disabled:opacity-40"
                      >
                        Ordenar por número
                      </button>
                    </div>

                    <CallOrderList
                      items={
                        selectedCallAthletes
                      }
                      onReorder={
                        reorderSelectedCall
                      }
                    />
                  </div>
                )}

                <button
                  onClick={
                    startCall
                  }
                  disabled={
                    selectedAthleteIds.length ===
                    0
                  }
                  className="w-full rounded-xl bg-white py-3 text-[13px] font-bold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:bg-white/[0.03] disabled:text-zinc-600"
                >
                  INICIAR CHAMADA
                </button>
              </div>
            )}
          </div>
        )}

        {tab ===
          "scores" && (
          <div className="space-y-4">
            {scorecardAthletes.length ===
            0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="text-[13px] text-zinc-600">
                  Nenhuma chamada ativa
                </p>
              </div>
            ) : (
              scorecard.map(
                (
                  judge
                ) => (
                  <div
                    key={
                      judge.judgeId
                    }
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-[11px] font-medium text-blue-400">
                          {judge.judgeName
                            .split(
                              " "
                            )
                            .map(
                              (
                                name
                              ) =>
                                name[0]
                            )
                            .slice(
                              0,
                              2
                            )
                            .join(
                              ""
                            )
                            .toUpperCase()}
                        </div>

                        <div>
                          <span className="text-[14px] font-medium text-white">
                            {
                              judge.judgeName
                            }
                          </span>

                          <span className="ml-2 text-[11px] text-zinc-600">
                            {
                              judge.filled
                            }
                            /
                            {
                              judge.totalPossible
                            }{" "}
                            notas
                          </span>
                        </div>
                      </div>

                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            judge.filled ===
                              judge.totalPossible &&
                            judge.totalPossible >
                              0
                              ? "bg-emerald-500"
                              : "bg-white/30"
                          }`}
                          style={{
                            width:
                              judge.totalPossible >
                              0
                                ? `${(judge.filled / judge.totalPossible) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr>
                            <th className="px-2 py-1 text-left font-medium text-zinc-600">
                              Critério
                            </th>

                            {scorecardAthletes.map(
                              (
                                athlete
                              ) => (
                                <th
                                  key={
                                    athlete.id
                                  }
                                  className="px-2 py-1 text-center font-medium text-zinc-500"
                                >
                                  #
                                  {
                                    athlete.number
                                  }
                                </th>
                              )
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {[
                            {
                              label:
                                "Vol F",
                              key: "vol_f",
                            },
                            {
                              label:
                                "Vol L",
                              key: "vol_l",
                            },
                            {
                              label:
                                "Vol C",
                              key: "vol_c",
                            },
                            {
                              label:
                                "Cond",
                              key: "cond",
                            },
                            {
                              label:
                                "Prop F",
                              key: "prop_f",
                            },
                            {
                              label:
                                "Prop L",
                              key: "prop_l",
                            },
                            {
                              label:
                                "Prop C",
                              key: "prop_c",
                            },
                            {
                              label:
                                "Sim F",
                              key: "sim_f",
                            },
                            {
                              label:
                                "Sim L",
                              key: "sim_l",
                            },
                            {
                              label:
                                "Sim C",
                              key: "sim_c",
                            },
                            {
                              label:
                                "Est F",
                              key: "est_f",
                            },
                            {
                              label:
                                "Est L",
                              key: "est_l",
                            },
                            {
                              label:
                                "Est C",
                              key: "est_c",
                            },
                            {
                              label:
                                "Pose F",
                              key: "pose_f",
                            },
                            {
                              label:
                                "Pose L",
                              key: "pose_l",
                            },
                            {
                              label:
                                "Pose C",
                              key: "pose_c",
                            },
                          ].map(
                            (
                              row
                            ) => (
                              <tr
                                key={
                                  row.key
                                }
                                className="border-t border-white/[0.03]"
                              >
                                <td className="px-2 py-1 text-zinc-500">
                                  {
                                    row.label
                                  }
                                </td>

                                {scorecardAthletes.map(
                                  (
                                    athlete
                                  ) => {
                                    const value =
                                      judge.athleteScores[
                                        athlete.id
                                      ]?.[
                                        row.key
                                      ];

                                    return (
                                      <td
                                        key={
                                          athlete.id
                                        }
                                        className="px-2 py-1 text-center"
                                      >
                                        <span
                                          className={
                                            value !==
                                              null &&
                                            value !==
                                              undefined
                                              ? "font-medium text-white"
                                              : "text-zinc-700"
                                          }
                                        >
                                          {value !==
                                            null &&
                                          value !==
                                            undefined
                                            ? value
                                            : "—"}
                                        </span>
                                      </td>
                                    );
                                  }
                                )}
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )
            )}

            {scorecard.length ===
              0 &&
              scorecardAthletes.length >
                0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <p className="text-[13px] text-zinc-600">
                    Nenhum árbitro atribuído a esta categoria
                  </p>
                </div>
              )}
          </div>
        )}

        {tab ===
          "ranking" && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                      Pos
                    </th>

                    <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                      Nº
                    </th>

                    <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                      Atleta
                    </th>

                    <th className="px-6 py-3.5 text-right text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                      Pontos
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {ranking
                    .filter(
                      (
                        entry
                      ) =>
                        entry.totalScore >
                        0
                    )
                    .map(
                      (
                        entry
                      ) => (
                        <tr
                          key={
                            entry.athleteNumber
                          }
                          className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-6 py-3.5 text-[13px] font-bold text-white">
                            {
                              entry.position
                            }
                          </td>

                          <td className="px-6 py-3.5 font-mono text-[13px] text-zinc-500">
                            #
                            {
                              entry.athleteNumber
                            }
                          </td>

                          <td className="px-6 py-3.5 text-[13px] text-white">
                            {
                              entry.athleteName
                            }
                          </td>

                          <td className="px-6 py-3.5 text-right text-[13px] font-bold text-white">
                            {entry.totalScore.toFixed(
                              2
                            )}
                          </td>
                        </tr>
                      )
                    )}

                  {ranking.filter(
                    (
                      entry
                    ) =>
                      entry.totalScore >
                      0
                  ).length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={
                          4
                        }
                        className="px-6 py-8 text-center text-[13px] text-zinc-600"
                      >
                        Sem pontuações
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const result =
                    await apiPost({
                      action:
                        "exportRanking",

                      categoryId,

                      divisionId:
                        selectedDivision,
                    });

                  if (
                    result.error
                  ) {
                    showMsg(
                      "Erro: " +
                        result.error
                    );

                    return;
                  }

                  const workbook =
                    XLSX.utils.book_new();

                  const summaryRows =
                    (
                      result.ranking ||
                      []
                    ).map(
                      (
                        entry: {
                          position:
                            number;

                          athleteNumber:
                            number;

                          athleteName:
                            string;

                          totalScore:
                            number;

                          breakdown: Record<
                            string,
                            number
                          >;
                        }
                      ) => ({
                        Posicao:
                          entry.position,

                        Numero:
                          entry.athleteNumber,

                        Atleta:
                          entry.athleteName,

                        Volume:
                          entry.breakdown
                            .volume,

                        Condicao:
                          entry.breakdown
                            .condicao,

                        Proporcao:
                          entry.breakdown
                            .proporcao,

                        Simetria:
                          entry.breakdown
                            .simetria,

                        Estetica:
                          entry.breakdown
                            .estetica,

                        Pose:
                          entry.breakdown
                            .pose,

                        Total:
                          entry.totalScore,
                      })
                    );

                  const rankingSheet =
                    XLSX.utils.json_to_sheet(
                      summaryRows
                    );

                  XLSX.utils.book_append_sheet(
                    workbook,
                    rankingSheet,
                    "Ranking"
                  );

                  const detailRows: Record<
                    string,
                    string | number
                  >[] = [];

                  for (
                    const entry of
                    (
                      result.ranking ||
                      []
                    ) as {
                      athleteNumber:
                        number;

                      athleteName:
                        string;

                      generalAverages?: Record<
                        string,
                        number
                      >;

                      individualAverages?: Record<
                        string,
                        Record<
                          string,
                          number
                        >
                      >;
                    }[]
                  ) {
                    const judgeIds =
                      Object.keys(
                        entry.individualAverages ||
                          {}
                      );

                    for (
                      const criteria of
                      [
                        "volume",
                        "condicao",
                        "proporcao",
                        "simetria",
                        "estetica",
                        "pose",
                      ]
                    ) {
                      const row: Record<
                        string,
                        string | number
                      > = {
                        Atleta: `#${entry.athleteNumber} ${entry.athleteName}`,

                        Criterio:
                          criteria.toUpperCase(),

                        "Media Geral":
                          entry.generalAverages?.[
                            criteria
                          ] ??
                          0,
                      };

                      judgeIds.forEach(
                        (
                          judgeId,
                          index
                        ) => {
                          row[
                            `Juiz ${index + 1}`
                          ] =
                            entry.individualAverages?.[
                              judgeId
                            ]?.[
                              criteria
                            ] ??
                            0;
                        }
                      );

                      detailRows.push(
                        row
                      );
                    }
                  }

                  if (
                    detailRows.length >
                    0
                  ) {
                    const detailsSheet =
                      XLSX.utils.json_to_sheet(
                        detailRows
                      );

                    XLSX.utils.book_append_sheet(
                      workbook,
                      detailsSheet,
                      "Detalhes"
                    );
                  }

                  const informationRows =
                    [
                      {
                        Campo:
                          "Categoria",

                        Valor:
                          result.category ||
                          "",
                      },
                      {
                        Campo:
                          "Divisão",

                        Valor:
                          result.division ||
                          "Todas",
                      },
                      {
                        Campo:
                          "Fase",

                        Valor:
                          result.phase ||
                          "",
                      },
                      {
                        Campo:
                          "Exportado em",

                        Valor:
                          new Date(
                            result.exportedAt
                          ).toLocaleString(
                            "pt-BR"
                          ),
                      },
                    ];

                  const informationSheet =
                    XLSX.utils.json_to_sheet(
                      informationRows
                    );

                  XLSX.utils.book_append_sheet(
                    workbook,
                    informationSheet,
                    "Info"
                  );

                  const fileName =
                    `ranking-${result.category || "export"}-${result.division || "todas"}-${result.phase || ""}.xlsx`.replace(
                      /\s+/g,
                      "_"
                    );

                  XLSX.writeFile(
                    workbook,
                    fileName
                  );

                  showMsg(
                    "Ranking exportado!"
                  );
                }}
                className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] py-3 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06]"
              >
                Exportar Ranking
              </button>

              <button
                onClick={async () => {
                  if (
                    !window.confirm(
                      "ATENÇÃO: isso vai apagar TODAS as notas desta divisão. Tem certeza?"
                    )
                  ) {
                    return;
                  }

                  const result =
                    await apiPost({
                      action:
                        "resetScores",

                      categoryId,

                      divisionId:
                        selectedDivision,
                    });

                  if (
                    result.error
                  ) {
                    showMsg(
                      "Erro: " +
                        result.error
                    );

                    return;
                  }

                  showMsg(
                    "Notas resetadas!"
                  );

                  await fetchData();
                }}
                className="rounded-xl border border-red-500/20 bg-white/[0.03] px-6 py-3 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
              >
                Resetar Notas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CallOrderList({
  items,
  disabled = false,
  onReorder,
}: {
  items: CallAthlete[];
  disabled?: boolean;

  onReorder: (
    orderedAthletes:
      CallAthlete[]
  ) => void | Promise<void>;
}) {
  const [
    draggedId,
    setDraggedId,
  ] = useState<
    string | null
  >(null);

  const [
    dragOverId,
    setDragOverId,
  ] = useState<
    string | null
  >(null);

  const moveAthlete = (
    sourceId: string,
    targetId: string
  ) => {
    if (
      disabled ||
      sourceId ===
        targetId
    ) {
      return;
    }

    const sourceIndex =
      items.findIndex(
        (item) =>
          item.id ===
          sourceId
      );

    const targetIndex =
      items.findIndex(
        (item) =>
          item.id ===
          targetId
      );

    if (
      sourceIndex < 0 ||
      targetIndex < 0
    ) {
      return;
    }

    const newOrder = [
      ...items,
    ];

    const [
      movedAthlete,
    ] = newOrder.splice(
      sourceIndex,
      1
    );

    newOrder.splice(
      targetIndex,
      0,
      movedAthlete
    );

    void onReorder(
      newOrder
    );
  };

  const moveByDirection = (
    index: number,
    direction:
      | -1
      | 1
  ) => {
    if (disabled) {
      return;
    }

    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >=
        items.length
    ) {
      return;
    }

    const newOrder = [
      ...items,
    ];

    const current =
      newOrder[index];

    newOrder[index] =
      newOrder[
        targetIndex
      ];

    newOrder[
      targetIndex
    ] = current;

    void onReorder(
      newOrder
    );
  };

  return (
    <div className="space-y-2">
      {items.map(
        (
          athlete,
          index
        ) => (
          <div
            key={
              athlete.id
            }
            draggable={
              !disabled
            }
            onDragStart={(
              event
            ) => {
              if (disabled) {
                event.preventDefault();
                return;
              }

              setDraggedId(
                athlete.id
              );

              event.dataTransfer.effectAllowed =
                "move";

              event.dataTransfer.setData(
                "text/plain",
                athlete.id
              );
            }}
            onDragEnter={() => {
              if (
                draggedId &&
                draggedId !==
                  athlete.id
              ) {
                setDragOverId(
                  athlete.id
                );
              }
            }}
            onDragOver={(
              event
            ) => {
              if (!disabled) {
                event.preventDefault();

                event.dataTransfer.dropEffect =
                  "move";
              }
            }}
            onDrop={(
              event
            ) => {
              event.preventDefault();

              const sourceId =
                draggedId ||
                event.dataTransfer.getData(
                  "text/plain"
                );

              moveAthlete(
                sourceId,
                athlete.id
              );

              setDraggedId(
                null
              );

              setDragOverId(
                null
              );
            }}
            onDragEnd={() => {
              setDraggedId(
                null
              );

              setDragOverId(
                null
              );
            }}
            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-all ${
              draggedId ===
              athlete.id
                ? "scale-[0.99] border-blue-400/30 bg-blue-400/10 opacity-50"
                : dragOverId ===
                    athlete.id
                  ? "border-amber-400/40 bg-amber-400/10"
                  : "border-white/[0.06] bg-white/[0.03]"
            } ${
              disabled
                ? "cursor-wait"
                : "cursor-grab active:cursor-grabbing"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-black/20 text-[15px] text-zinc-500">
                ⋮⋮
              </div>

              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-zinc-900">
                {index + 1}
              </span>

              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-white">
                  <span className="mr-2 font-mono text-zinc-400">
                    #
                    {
                      athlete.number
                    }
                  </span>

                  {athlete.name}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                disabled={
                  disabled ||
                  index === 0
                }
                onClick={(
                  event
                ) => {
                  event.stopPropagation();

                  moveByDirection(
                    index,
                    -1
                  );
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-sm text-zinc-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-20"
                aria-label={`Subir ${athlete.name}`}
              >
                ↑
              </button>

              <button
                type="button"
                disabled={
                  disabled ||
                  index ===
                    items.length -
                      1
                }
                onClick={(
                  event
                ) => {
                  event.stopPropagation();

                  moveByDirection(
                    index,
                    1
                  );
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-sm text-zinc-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-20"
                aria-label={`Descer ${athlete.name}`}
              >
                ↓
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
