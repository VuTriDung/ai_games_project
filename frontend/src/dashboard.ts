// BỘ KHO LƯU TRỮ CHỈ SỐ THỰC TẾ TRONG SUỐT QUÁ TRÌNH CHẠY LOCAL
export const realStats = {
    chess: {
        w_wins: 0, w_draws: 0, w_losses: 0,
        w_totalMoves: 0, w_totalTimeMs: 0,
        w_nodesEvaluated: 0, w_maxDepth: 0,
        w_alphaBetaPruningRate: 0, w_heuristicVariance: 0, w_heuristicAccuracy: 0,
        
        b_wins: 0, b_draws: 0, b_losses: 0,
        b_totalMoves: 0, b_inferenceTimeMs: 0,
        b_crossEntropyLoss: 0, b_predictionAccuracy: 0,
        b_softmaxConfidence: 0, b_valuePredictionError: 0
    },
    snake: {
        // Chỉ số Academic mới cho Dashboard
        games: 0, totalScore: 0, totalSteps: 0,
        deathWall: 0, deathTail: 0, deathStarve: 0,
        epsilon: 0, tdError: 0, avgMaxQ: 0, heuristicRewardShape: 0,
        
        // Các biến cũ giữ lại để UI game Snake không bị lỗi
        bestScore: 0, maxCoverage: 0, totalFoodSteps: 0, foodEaten: 0,
        dirUp: 0, dirDown: 0, dirLeft: 0, dirRight: 0
    },
    connect4: {
        r_games: 0, r_wins: 0, r_totalTimeMs: 0, r_movesToWin: 0,
        r_transpositionHits: 0, r_pat2: 0, r_pat3b: 0, r_pat3o: 0, r_flipRate: 0,
        
        y_games: 0, y_wins: 0, y_simulations: 0, y_maxDepth: 0, y_totalNodes: 0,
        y_ucb1: 0, y_exploreRatio: 0, y_predictedWinProb: 0
    },
    flappy: {
        generations: 0, bestScore: 0, avgGenScore: 0,
        fitnessBest: 0, selectionPressure: 0.1,
        jumpRate: 0, geneticDiversityStdDev: 0
    },
    game2048: {
        games: 0, totalFinalScore: 0, totalEmptyTiles: 0,
        chanceNodes: 0, maxNodes: 0, effectiveBranching: 0,
        monotonicity: 0, smoothness: 0, predictedEV: 0, evError: 0,
        reach1024: 0, reach2048: 0, reach4096: 0
    }
};

// Hàm cập nhật Tab giao diện
export function initDashboardTabs() {
    const tabs = ['chess', 'snake', 'connect4', 'flappy', '2048'];
    tabs.forEach(tab => {
        document.getElementById(`tab-${tab}`)?.addEventListener('click', (e) => {
            // Đổi class active cho button
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            (e.target as HTMLElement).classList.add('active');
            
            // Đổi panel
            tabs.forEach(t => document.getElementById(`stats-${t}`)?.classList.add('hidden'));
            document.getElementById(`stats-${tab}`)?.classList.remove('hidden');
        });
    });
}

// Hàm đẩy số liệu lên DOM
export async function refreshDashboard() {
    // 1. CẬP NHẬT CHESS (MINIMAX vs MLP)
    const c = realStats.chess;
    document.getElementById('chess-w-wdl')!.innerText = `${c.w_wins} / ${c.w_draws} / ${c.w_losses}`;
    document.getElementById('chess-b-wdl')!.innerText = `${c.b_wins} / ${c.b_draws} / ${c.b_losses}`;
    
    if (c.w_totalMoves > 0) document.getElementById('chess-w-time')!.innerText = (c.w_totalTimeMs / c.w_totalMoves).toFixed(1);
    document.getElementById('chess-w-nodes')!.innerText = c.w_nodesEvaluated.toLocaleString();
    document.getElementById('chess-w-depth')!.innerText = c.w_maxDepth.toString();
    document.getElementById('chess-w-pruning')!.innerText = `${c.w_alphaBetaPruningRate.toFixed(1)}%`;
    document.getElementById('chess-w-variance')!.innerText = c.w_heuristicVariance.toFixed(2);
    document.getElementById('chess-w-accuracy')!.style.width = `${c.w_heuristicAccuracy}%`;
    document.getElementById('chess-w-acc-text')!.innerText = `${c.w_heuristicAccuracy.toFixed(1)}%`;

    if (c.b_totalMoves > 0) document.getElementById('chess-b-inf')!.innerText = (c.b_inferenceTimeMs / c.b_totalMoves).toFixed(2);
    document.getElementById('chess-b-loss')!.innerText = c.b_crossEntropyLoss.toFixed(4);
    document.getElementById('chess-b-conf')!.innerText = c.b_softmaxConfidence.toFixed(1);
    document.getElementById('chess-b-error')!.innerText = `±${c.b_valuePredictionError.toFixed(2)}`;
    document.getElementById('chess-b-moves')!.innerText = c.b_totalMoves.toString();
    document.getElementById('chess-b-accuracy')!.style.width = `${c.b_predictionAccuracy}%`;
    document.getElementById('chess-b-acc-text')!.innerText = `${c.b_predictionAccuracy.toFixed(1)}%`;

    // 2. CẬP NHẬT SNAKE
    const s = realStats.snake;
    if (s.games > 0) {
        document.getElementById('snake-avg-score')!.innerText = (s.totalScore / s.games).toFixed(1);
        document.getElementById('snake-avg-steps')!.innerText = Math.round(s.totalSteps / s.games).toString();
    }
    document.getElementById('snake-ratio')!.innerText = s.totalScore > 0 ? (s.totalSteps / s.totalScore).toFixed(2) : "0.0";
    document.getElementById('snake-epsilon')!.innerText = s.epsilon.toFixed(4);
    document.getElementById('snake-td-error')!.innerText = s.tdError.toFixed(4);
    document.getElementById('snake-max-q')!.innerText = s.avgMaxQ.toFixed(2);
    document.getElementById('snake-reward-shape')!.innerText = s.heuristicRewardShape > 0 ? `+${s.heuristicRewardShape.toFixed(2)}` : s.heuristicRewardShape.toFixed(2);

    const sTotalDeaths = s.deathWall + s.deathTail;
    if (sTotalDeaths > 0) {
        const wPct = (s.deathWall / sTotalDeaths * 100).toFixed(1);
        const tPct = (s.deathTail / sTotalDeaths * 100).toFixed(1);
        document.getElementById('snake-death-wall')!.style.width = `${wPct}%`;
        document.getElementById('txt-s-wall')!.innerText = `${wPct}%`;
        document.getElementById('snake-death-tail')!.style.width = `${tPct}%`;
        document.getElementById('txt-s-tail')!.innerText = `${tPct}%`;
    }

    // 3. CẬP NHẬT CONNECT 4
    const c4 = realStats.connect4;
    document.getElementById('c4-r-winrate')!.innerText = c4.r_games > 0 ? `${(c4.r_wins / c4.r_games * 100).toFixed(1)}%` : "0%";
    if(c4.r_games > 0) document.getElementById('c4-r-time')!.innerText = (c4.r_totalTimeMs / c4.r_games).toFixed(1);
    document.getElementById('c4-r-moves')!.innerText = c4.r_games > 0 ? Math.round(c4.r_movesToWin / c4.r_games).toString() : "0";
    document.getElementById('c4-r-hits')!.innerText = c4.r_transpositionHits.toLocaleString();
    document.getElementById('c4-r-pat2')!.innerText = c4.r_pat2.toString();
    document.getElementById('c4-r-pat3b')!.innerText = c4.r_pat3b.toString();
    document.getElementById('c4-r-pat3o')!.innerText = c4.r_pat3o.toString();
    document.getElementById('c4-r-flip')!.innerText = `${c4.r_flipRate.toFixed(1)}%`;

    document.getElementById('c4-y-winrate')!.innerText = c4.y_games > 0 ? `${(c4.y_wins / c4.y_games * 100).toFixed(1)}%` : "0%";
    document.getElementById('c4-y-sims')!.innerText = c4.y_simulations.toLocaleString();
    document.getElementById('c4-y-depth')!.innerText = c4.y_maxDepth.toString();
    document.getElementById('c4-y-nodes')!.innerText = c4.y_totalNodes.toLocaleString();
    document.getElementById('c4-y-ucb1')!.innerText = c4.y_ucb1.toFixed(3);
    document.getElementById('c4-y-ratio')!.innerText = `${c4.y_exploreRatio.toFixed(1)}% / ${(100 - c4.y_exploreRatio).toFixed(1)}%`;
    document.getElementById('c4-y-prob')!.innerText = `${(c4.y_predictedWinProb * 100).toFixed(1)}%`;

    // 4. CẬP NHẬT FLAPPY BIRD
    const f = realStats.flappy;
    document.getElementById('flappy-gens')!.innerText = f.generations.toString();
    document.getElementById('flappy-best')!.innerText = f.bestScore.toString();
    document.getElementById('flappy-avg')!.innerText = f.avgGenScore.toFixed(1);
    document.getElementById('flappy-fitness')!.innerText = Math.round(f.fitnessBest).toLocaleString();
    document.getElementById('flappy-pressure')!.innerText = `${(f.selectionPressure * 100).toFixed(1)}%`;
    document.getElementById('flappy-jump-rate')!.innerText = f.jumpRate.toFixed(1);
    document.getElementById('flappy-diversity')!.innerText = f.geneticDiversityStdDev.toFixed(3);

    // 5. CẬP NHẬT 2048
    const g2 = realStats.game2048;
    document.getElementById('g2048-avg-score')!.innerText = g2.games > 0 ? Math.round(g2.totalFinalScore / g2.games).toLocaleString() : "0";
    document.getElementById('g2048-empty')!.innerText = g2.games > 0 ? (g2.totalEmptyTiles / g2.games).toFixed(1) : "0.0";
    document.getElementById('g2048-nodes-ratio')!.innerText = `${g2.chanceNodes.toLocaleString()} : ${g2.maxNodes.toLocaleString()}`;
    document.getElementById('g2048-branching')!.innerText = g2.effectiveBranching.toFixed(2);
    
    document.getElementById('g2048-mono')!.innerText = g2.monotonicity.toFixed(1);
    document.getElementById('g2048-smooth')!.innerText = g2.smoothness.toFixed(1);
    document.getElementById('g2048-ev')!.innerText = g2.predictedEV.toFixed(1);
    document.getElementById('g2048-ev-err')!.innerText = `±${g2.evError.toFixed(2)}`;

    if(g2.games > 0) {
        document.getElementById('g2048-1024')!.style.width = `${(g2.reach1024 / g2.games) * 100}%`;
        document.getElementById('txt-g-1024')!.innerText = `${(g2.reach1024 / g2.games * 100).toFixed(1)}%`;
        document.getElementById('g2048-2048')!.style.width = `${(g2.reach2048 / g2.games) * 100}%`;
        document.getElementById('txt-g-2048')!.innerText = `${(g2.reach2048 / g2.games * 100).toFixed(1)}%`;
        document.getElementById('g2048-4096')!.style.width = `${(g2.reach4096 / g2.games) * 100}%`;
        document.getElementById('txt-g-4096')!.innerText = `${(g2.reach4096 / g2.games * 100).toFixed(1)}%`;
    }
}