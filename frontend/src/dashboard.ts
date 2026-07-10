import { API_BASE_URL } from "./main";

declare const Chart: any;

// BỘ KHO LƯU TRỮ CHỈ SỐ THỰC TẾ TRONG SUỐT QUÁ TRÌNH CHẠY LOCAL (Bao quát 100% telemetry_db.json)
export const realStats = {
  chess: {
    w_wins: 0,
    w_draws: 0,
    w_losses: 0,
    w_totalMoves: 0,
    w_totalTimeMs: 0,
    w_nodesEvaluated: 0,
    w_maxDepth: 0,
    w_alphaBetaPruningRate: 0,
    w_heuristicVariance: 0,
    w_heuristicAccuracy: 0,

    b_wins: 0,
    b_draws: 0,
    b_losses: 0,
    b_totalMoves: 0,
    b_inferenceTimeMs: 0,
    b_crossEntropyLoss: 0,
    b_predictionAccuracy: 0,
    b_softmaxConfidence: 0,
    b_valuePredictionError: 0,
  },
  snake: {
    games: 0,
    totalScore: 0,
    totalSteps: 0,
    deathWall: 0,
    deathTail: 0,
    deathStarve: 0,
    epsilon: 0,
    tdError: 0,
    avgMaxQ: 0,
    heuristicRewardShape: 0,
    bestScore: 0,
    maxCoverage: 0,
    totalFoodSteps: 0,
    foodEaten: 0,
    dirUp: 0,
    dirDown: 0,
    dirLeft: 0,
    dirRight: 0,
  },
  connect4: {
    r_games: 0,
    r_wins: 0,
    r_totalTimeMs: 0,
    r_movesToWin: 0,
    r_transpositionHits: 0,
    r_pat2: 0,
    r_pat3b: 0,
    r_pat3o: 0,
    r_flipRate: 0,

    y_games: 0,
    y_wins: 0,
    y_totalTimeMs: 0,
    y_simulations: 0,
    y_totalNodes: 0,
    y_ucb1: 0,
    y_exploreRatio: 0,
  },
  flappy: {
    generations: 0,
    alive: 0,
    bestScore: 0,
    avgGenScore: 0,
    geneticDiversityStdDev: 0,
    mutationRate: 0.15,
    jumpRate: 0,
    survivalTime: 0,
    allTimeBest: 0,
    overallAvg: 0,
    history: [] as { gen: number; best: number; avg: number }[],
  },
  game2048: {
    games: 0,
    totalFinalScore: 0,
    totalEmptyTiles: 0,
    reach1024: 0,
    reach2048: 0,
    reach4096: 0,
    chanceNodes: 0,
    maxNodes: 0,
    effectiveBranching: 0,
    monotonicity: 0,
    smoothness: 0,
    predictedEV: 0,
    evError: 0,
  },
};

export async function fetchTelemetry() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/telemetry`);
    if (res.ok) {
      const data = await res.json();
      if (data.chess) Object.assign(realStats.chess, data.chess);
      if (data.snake) Object.assign(realStats.snake, data.snake);
      if (data.connect4) Object.assign(realStats.connect4, data.connect4);
      if (data.flappy) Object.assign(realStats.flappy, data.flappy);
      if (data.game2048) Object.assign(realStats.game2048, data.game2048);
      refreshDashboard();
    }
  } catch (e) {
    console.error("Lỗi khi tải DB:", e);
  }
}

export async function saveTelemetry() {
  try {
    await fetch(`${API_BASE_URL}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(realStats),
    });
    refreshDashboard();
  } catch (e) {
    console.error("Lỗi khi lưu DB:", e);
  }
}

export function initDashboardTabs() {
  const tabs = ["chess", "snake", "connect4", "flappy", "2048"];
  tabs.forEach((tab) => {
    const btn = document.getElementById(`tab-${tab}`);
    if (!btn) return;
    btn.addEventListener("click", () => {
      tabs.forEach((t) =>
        document.getElementById(`tab-${t}`)?.classList.remove("active"),
      );
      btn.classList.add("active");
      tabs.forEach((t) =>
        document.getElementById(`stats-${t}`)?.classList.add("hidden"),
      );
      document.getElementById(`stats-${tab}`)?.classList.remove("hidden");
    });
  });
}

const charts: any = {};
Chart.defaults.color = "#8b9bb4";
Chart.defaults.font.family = "Rajdhani";

function createOrUpdateChart(
  id: string,
  type: string,
  data: any,
  options: any = {},
) {
  const ctx = document.getElementById(id) as HTMLCanvasElement;
  if (!ctx) return;
  if (charts[id]) {
    charts[id].data = data;
    charts[id].update();
  } else {
    charts[id] = new Chart(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        ...options,
      },
    });
  }
}

export async function refreshDashboard() {
  // 1. CẬP NHẬT CHESS
  const c = realStats.chess;
  createOrUpdateChart("chart-chess-wdl", "doughnut", {
    labels: ["Trắng Thắng", "Hòa", "Đen Thắng"],
    datasets: [
      {
        data: [c.w_wins, c.w_draws, c.b_wins],
        backgroundColor: ["#00f3ff", "#8b9bb4", "#ff007f"],
        borderWidth: 0,
      },
    ],
  });

  // Hàm hỗ trợ gán dữ liệu an toàn (tránh lỗi nếu HTML chưa có ID đó)
  const setElement = (id: string, value: string | number) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value.toString();
  };

  // --- THÔNG SỐ AI TRẮNG (MINIMAX) ---
  setElement("c-w-wins", c.w_wins);
  setElement("c-w-draws", c.w_draws);
  setElement("c-w-losses", c.w_losses);
  setElement("c-w-total-moves", c.w_totalMoves.toLocaleString());
  setElement("c-w-total-time-ms", c.w_totalTimeMs.toLocaleString());
  setElement("c-w-nodes", c.w_nodesEvaluated.toLocaleString());
  setElement(
    "c-w-time",
    c.w_totalMoves ? (c.w_totalTimeMs / c.w_totalMoves).toFixed(1) : "0",
  );
  setElement("c-w-depth", c.w_maxDepth);
  setElement("c-w-prun", c.w_alphaBetaPruningRate.toFixed(2));
  setElement("c-w-var", c.w_heuristicVariance.toFixed(2));
  setElement("c-w-hacc", c.w_heuristicAccuracy.toFixed(1));

  // --- THÔNG SỐ AI ĐEN (MLP) ---
  setElement("c-b-wins", c.b_wins);
  setElement("c-b-draws", c.b_draws);
  setElement("c-b-losses", c.b_losses);
  setElement("c-b-total-moves", c.b_totalMoves.toLocaleString());
  setElement("c-b-total-time-ms", c.b_inferenceTimeMs.toLocaleString());
  setElement("c-b-loss", c.b_crossEntropyLoss.toFixed(4));
  setElement("c-b-conf", c.b_softmaxConfidence.toFixed(1));
  setElement(
    "c-b-time",
    c.b_totalMoves ? (c.b_inferenceTimeMs / c.b_totalMoves).toFixed(1) : "0",
  );
  setElement("c-b-acc", c.b_predictionAccuracy.toFixed(1));
  setElement("c-b-vpe", c.b_valuePredictionError.toFixed(3));

  // 2. CẬP NHẬT SNAKE
  const s = realStats.snake;
  createOrUpdateChart("chart-snake-death", "pie", {
    labels: ["Đâm Tường", "Cắn Đuôi", "Chết Đói"],
    datasets: [
      {
        data: [s.deathWall, s.deathTail, s.deathStarve],
        backgroundColor: ["#ff007f", "#f1c40f", "#8b9bb4"],
        borderWidth: 0,
      },
    ],
  });

  createOrUpdateChart(
    "chart-snake-dir",
    "polarArea",
    {
      labels: ["Lên", "Xuống", "Trái", "Phải"],
      datasets: [
        {
          data: [s.dirUp, s.dirDown, s.dirLeft, s.dirRight],
          backgroundColor: ["#00f3ff", "#ff007f", "#f1c40f", "#00ff00"],
          borderWidth: 0,
        },
      ],
    },
    {
      scales: {
        r: {
          ticks: { display: false },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
      },
    },
  );

  document.getElementById("s-games")!.innerText = s.games.toLocaleString();
  document.getElementById("s-avg-score")!.innerText = s.games
    ? (s.totalScore / s.games).toFixed(1)
    : "0";
  document.getElementById("s-best")!.innerText = s.bestScore.toLocaleString();
  document.getElementById("s-cov")!.innerText = s.maxCoverage.toFixed(2);
  document.getElementById("s-food")!.innerText = s.foodEaten.toLocaleString();
  document.getElementById("s-steps")!.innerText = s.totalSteps.toLocaleString();

  document.getElementById("s-td")!.innerText = s.tdError.toFixed(4);
  document.getElementById("s-q")!.innerText = s.avgMaxQ.toFixed(2);
  document.getElementById("s-eps")!.innerText = s.epsilon.toFixed(4);
  document.getElementById("s-hr")!.innerText =
    s.heuristicRewardShape.toFixed(3);

  // 3. CẬP NHẬT CONNECT 4
  const c4 = realStats.connect4;
  createOrUpdateChart("chart-c4-win", "doughnut", {
    labels: ["Đỏ (Minimax) Thắng", "Vàng (MCTS) Thắng"],
    datasets: [
      {
        data: [c4.r_wins, c4.y_wins],
        backgroundColor: ["#e74c3c", "#f1c40f"],
        borderWidth: 0,
      },
    ],
  });

  document.getElementById("c4-r-moves")!.innerText = c4.r_wins
    ? Math.round(c4.r_movesToWin / c4.r_wins).toString()
    : "0";
  document.getElementById("c4-r-time")!.innerText = c4.r_games
    ? (c4.r_totalTimeMs / c4.r_games).toFixed(1)
    : "0";
  document.getElementById("c4-r-hit")!.innerText =
    c4.r_transpositionHits.toLocaleString();
  document.getElementById("c4-r-p2")!.innerText = c4.r_pat2.toString();
  document.getElementById("c4-r-p3b")!.innerText = c4.r_pat3b.toString();
  document.getElementById("c4-r-p3o")!.innerText = c4.r_pat3o.toString();
  document.getElementById("c4-r-flip")!.innerText = c4.r_flipRate.toFixed(1);

  document.getElementById("c4-y-games")!.innerText =
    c4.y_games.toLocaleString();
  document.getElementById("c4-y-sim")!.innerText =
    c4.y_simulations.toLocaleString();
  document.getElementById("c4-y-node")!.innerText =
    c4.y_totalNodes.toLocaleString();
  document.getElementById("c4-y-ucb")!.innerText = c4.y_ucb1.toFixed(3);
  document.getElementById("c4-y-exp")!.innerText = c4.y_exploreRatio.toFixed(1);

  // 4. CẬP NHẬT FLAPPY
  const f = realStats.flappy;
  document.getElementById("f-gen-title")!.innerText = `${f.generations}`;
  document.getElementById("f-alive")!.innerText = `${f.alive}/100`;
  document.getElementById("f-surv")!.innerText = f.survivalTime.toFixed(1);
  document.getElementById("f-jump")!.innerText = f.jumpRate.toFixed(1);

  document.getElementById("f-all-best")!.innerText = f.allTimeBest.toString();
  document.getElementById("f-all-avg")!.innerText = f.overallAvg.toFixed(1);
  document.getElementById("f-div")!.innerText =
    f.geneticDiversityStdDev.toFixed(3);
  document.getElementById("f-mut")!.innerText = (f.mutationRate * 100).toFixed(
    1,
  );

  // Xử lý dữ liệu mảng History cho Chart.js
  const fHistory = f.history || [];
  const flappyLabels = fHistory.map((h: any) => `Gen ${h.gen}`);
  const flappyBestData = fHistory.map((h: any) => h.best);
  const flappyAvgData = fHistory.map((h: any) => h.avg);

  createOrUpdateChart("chart-flappy-history", "line", {
    labels: flappyLabels,
    datasets: [
      {
        label: "Điểm Kỷ Lục (Best)",
        data: flappyBestData,
        borderColor: "#00ff00",
        backgroundColor: "rgba(0,255,0,0.1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Điểm Trung Bình (Avg)",
        data: flappyAvgData,
        borderColor: "#00f3ff",
        backgroundColor: "transparent",
        borderDash: [5, 5],
        tension: 0.3,
      },
    ],
  });

  // 5. CẬP NHẬT 2048
  const g = realStats.game2048;
  const p1024 = g.games ? ((g.reach1024 / g.games) * 100).toFixed(1) : 0;
  const p2048 = g.games ? ((g.reach2048 / g.games) * 100).toFixed(1) : 0;
  const p4096 = g.games ? ((g.reach4096 / g.games) * 100).toFixed(1) : 0;

  createOrUpdateChart(
    "chart-2048-tiles",
    "bar",
    {
      labels: ["Ô 1024", "Ô 2048", "Ô 4096"],
      datasets: [
        {
          label: "% Đạt được",
          data: [p1024, p2048, p4096],
          backgroundColor: "#edc22e",
          borderRadius: 4,
        },
      ],
    },
    { scales: { y: { beginAtZero: true, max: 100 } } },
  );

  document.getElementById("g-games")!.innerText = g.games.toLocaleString();
  document.getElementById("g-avg")!.innerText = g.games
    ? (g.totalFinalScore / g.games).toFixed(0)
    : "0";
  document.getElementById("g-empty")!.innerText = g.games
    ? (g.totalEmptyTiles / g.games).toFixed(1)
    : "0";
  document.getElementById("g-mono")!.innerText = g.monotonicity.toFixed(1);
  document.getElementById("g-smooth")!.innerText = g.smoothness.toFixed(1);

  document.getElementById("g-branch")!.innerText =
    g.effectiveBranching.toFixed(2);
  document.getElementById("g-chance")!.innerText =
    g.chanceNodes.toLocaleString();
  document.getElementById("g-max")!.innerText = g.maxNodes.toLocaleString();
  document.getElementById("g-ev")!.innerText = g.predictedEV.toFixed(1);
  document.getElementById("g-err")!.innerText = g.evError.toFixed(2);
}
