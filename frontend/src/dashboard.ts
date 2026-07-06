declare const Chart: any;
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

import { API_BASE_URL } from './main';


// 1. Hàm Tải dữ liệu toàn cầu khi vừa vào Web
export async function fetchTelemetry() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/telemetry`);
        const data = await res.json();
        
        // KIỂM TRA ĐỂ TRÁNH GÁN DỮ LIỆU RỖNG
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            // Thay vì gán realStats = data (lỗi const), 
            // chúng ta dùng Object.assign để copy nội dung của data vào realStats hiện có
            Object.assign(realStats, data); 
            
            refreshDashboard(); // Cập nhật lại UI sau khi có data mới
        }
    } catch (e) { 
        console.error("Lỗi đồng bộ Database", e); 
    }
}

// 2. Hàm Lưu dữ liệu lên Đám mây mỗi khi có người chơi
export async function saveTelemetry() {
    try {
        await fetch(`${API_BASE_URL}/api/telemetry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(realStats)
        });
    } catch (e) {}
}

export function initDashboardTabs() {
    // Danh sách các ID tab tương ứng với 5 game
    const tabs = ['chess', 'snake', 'connect4', 'flappy', '2048'];

    tabs.forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        if (!btn) return;

        btn.addEventListener('click', () => {
            // 1. Reset màu: Xóa class 'active' khỏi tất cả các nút
            tabs.forEach(t => document.getElementById(`tab-${t}`)?.classList.remove('active'));
            
            // 2. Bật màu cho nút đang được click
            btn.classList.add('active');

            // 3. Ẩn TẤT CẢ các bảng thống kê (Tránh rò rỉ UI chéo)
            tabs.forEach(t => document.getElementById(`stats-${t}`)?.classList.add('hidden'));
            
            // 4. Chỉ hiển thị duy nhất bảng thống kê của game đang chọn
            document.getElementById(`stats-${tab}`)?.classList.remove('hidden');
        });
    });
}


// Biến lưu trữ các instance của Chart để update thay vì vẽ lại từ đầu
const charts: any = {};

// Cấu hình màu sắc mặc định của Chart.js cho hợp theme Cyberpunk
Chart.defaults.color = '#8b9bb4';
Chart.defaults.font.family = 'Rajdhani';

function createOrUpdateChart(id: string, type: string, data: any, options: any = {}) {
    const ctx = document.getElementById(id) as HTMLCanvasElement;
    if (!ctx) return;
    
    if (charts[id]) {
        charts[id].data = data;
        charts[id].update();
    } else {
        charts[id] = new Chart(ctx, { type, data, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, ...options } });
    }
}

export async function refreshDashboard() {
    // 1. CẬP NHẬT CHESS
    const c = realStats.chess;
    createOrUpdateChart('chart-chess-wdl', 'doughnut', {
        labels: ['Trắng Thắng', 'Hòa', 'Đen Thắng'],
        datasets: [{ data: [c.w_wins, c.w_draws, c.b_wins], backgroundColor: ['#00f3ff', '#8b9bb4', '#ff007f'], borderWidth: 0 }]
    });
    
    document.getElementById('c-w-nodes')!.innerText = c.w_nodesEvaluated.toLocaleString();
    document.getElementById('c-w-time')!.innerText = c.w_totalMoves ? (c.w_totalTimeMs / c.w_totalMoves).toFixed(1) : "0";
    document.getElementById('c-w-depth')!.innerText = c.w_maxDepth.toString();
    document.getElementById('c-w-prun')!.innerText = c.w_alphaBetaPruningRate.toFixed(1);

    document.getElementById('c-b-loss')!.innerText = c.b_crossEntropyLoss.toFixed(4);
    document.getElementById('c-b-conf')!.innerText = c.b_softmaxConfidence.toFixed(1);
    document.getElementById('c-b-time')!.innerText = c.b_totalMoves ? (c.b_inferenceTimeMs / c.b_totalMoves).toFixed(1) : "0";
    document.getElementById('c-b-acc')!.innerText = c.b_predictionAccuracy.toFixed(1);

    // 2. CẬP NHẬT SNAKE
    const s = realStats.snake;
    createOrUpdateChart('chart-snake-death', 'pie', {
        labels: ['Đâm Tường', 'Cắn Đuôi', 'Chết Đói'],
        datasets: [{ data: [s.deathWall, s.deathTail, s.deathStarve], backgroundColor: ['#ff007f', '#f1c40f', '#8b9bb4'], borderWidth: 0 }]
    });

    createOrUpdateChart('chart-snake-dir', 'polarArea', {
        labels: ['Lên', 'Xuống', 'Trái', 'Phải'],
        datasets: [{ data: [s.dirUp, s.dirDown, s.dirLeft, s.dirRight], backgroundColor: ['#00f3ff', '#ff007f', '#f1c40f', '#00ff00'], borderWidth: 0 }]
    }, { scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.1)' } } } });

    document.getElementById('s-avg-score')!.innerText = s.games ? (s.totalScore / s.games).toFixed(1) : "0";
    document.getElementById('s-td')!.innerText = s.tdError.toFixed(4);
    document.getElementById('s-q')!.innerText = s.avgMaxQ.toFixed(2);
    document.getElementById('s-eps')!.innerText = s.epsilon.toFixed(4);

    // 3. CẬP NHẬT CONNECT 4
    const c4 = realStats.connect4;
    createOrUpdateChart('chart-c4-win', 'doughnut', {
        labels: ['Đỏ (Minimax) Thắng', 'Vàng (MCTS) Thắng'],
        datasets: [{ data: [c4.r_wins, c4.y_wins], backgroundColor: ['#e74c3c', '#f1c40f'], borderWidth: 0 }]
    });

    document.getElementById('c4-r-moves')!.innerText = c4.r_games ? Math.round(c4.r_movesToWin / c4.r_games).toString() : "0";
    document.getElementById('c4-r-time')!.innerText = c4.r_games ? (c4.r_totalTimeMs / c4.r_games).toFixed(1) : "0";
    document.getElementById('c4-r-hit')!.innerText = c4.r_transpositionHits.toLocaleString();

    document.getElementById('c4-y-sim')!.innerText = c4.y_simulations.toLocaleString();
    document.getElementById('c4-y-node')!.innerText = c4.y_totalNodes.toLocaleString();
    document.getElementById('c4-y-ucb')!.innerText = c4.y_ucb1.toFixed(3);

    // 4. CẬP NHẬT FLAPPY
    const f = realStats.flappy;
    document.getElementById('f-gen')!.innerText = `Gen ${f.generations}`;
    document.getElementById('f-best')!.innerText = f.bestScore.toString();
    document.getElementById('f-avg')!.innerText = f.avgGenScore.toFixed(1);
    document.getElementById('f-div')!.innerText = f.geneticDiversityStdDev.toFixed(3);
    document.getElementById('f-jump')!.innerText = f.jumpRate.toFixed(2);

    // 5. CẬP NHẬT 2048
    const g = realStats.game2048;
    const p1024 = g.games ? ((g.reach1024 / g.games) * 100).toFixed(1) : 0;
    const p2048 = g.games ? ((g.reach2048 / g.games) * 100).toFixed(1) : 0;
    const p4096 = g.games ? ((g.reach4096 / g.games) * 100).toFixed(1) : 0;

    createOrUpdateChart('chart-2048-tiles', 'bar', {
        labels: ['Ô 1024', 'Ô 2048', 'Ô 4096'],
        datasets: [{ label: '% Đạt được', data: [p1024, p2048, p4096], backgroundColor: '#edc22e', borderRadius: 4 }]
    }, { scales: { y: { beginAtZero: true, max: 100 } } });

    document.getElementById('g-branch')!.innerText = g.effectiveBranching.toFixed(2);
    document.getElementById('g-chance')!.innerText = g.chanceNodes.toLocaleString();
    document.getElementById('g-max')!.innerText = g.maxNodes.toLocaleString();
    document.getElementById('g-ev')!.innerText = g.predictedEV.toFixed(1);
    document.getElementById('g-err')!.innerText = g.evError.toFixed(2);
}

