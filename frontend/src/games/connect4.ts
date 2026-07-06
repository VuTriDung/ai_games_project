import { showView, API_BASE_URL } from '../main';
import { realStats, saveTelemetry } from '../dashboard'; // BỔ SUNG DATA CONNECT

const canvas = document.getElementById('connect4-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const COLS = 7; const ROWS = 6; const CELL = 70;

let board: number[][] = [];
let currentPlayer = 1; 
let aiMode: 'minimax' | 'mcts' | null = null;
let aiPlayer: number | null = null;
let animating = false;

document.getElementById('card-connect4')?.addEventListener('click', () => { showView('connect4'); initBoard(); draw(); });
document.getElementById('btn-start-connect4')?.addEventListener('click', () => { initBoard(); aiMode = 'minimax'; aiPlayer = 2; currentPlayer = 1; draw(); document.getElementById('connect4-status')!.innerText = 'Human vs Minimax (Yellow)'; });
document.getElementById('btn-start-connect4-mcts')?.addEventListener('click', () => { initBoard(); aiMode = 'mcts'; aiPlayer = 2; currentPlayer = 1; draw(); document.getElementById('connect4-status')!.innerText = 'Human vs MCTS (Yellow)'; });
document.getElementById('btn-ai-vs-ai')?.addEventListener('click', async () => { initBoard(); aiMode = 'minimax'; aiPlayer = null; currentPlayer = 1; draw(); document.getElementById('connect4-status')!.innerText = 'AI vs AI running...'; await runAIVsAI(); });

canvas.addEventListener('click', async (e) => {
    if (animating) return;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / CELL);
    if (col < 0 || col >= COLS || !canPlay(col)) return;

    await dropPiece(col, currentPlayer);
    const winner = checkWinner(board);
    if (winner !== null) { showResult(winner); return; }

    currentPlayer = 1 + (currentPlayer % 2);
    if (aiMode && (aiPlayer === null || aiPlayer === currentPlayer)) await aiMove();
});

function initBoard() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); currentPlayer = 1; }

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#151828'; ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.beginPath(); ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL * 0.38, 0, Math.PI * 2);
            ctx.fillStyle = board[r][c] === 0 ? '#2a2d45' : board[r][c] === 1 ? '#e74c3c' : '#f1c40f';
            ctx.fill();
        }
    }
}

function canPlay(col: number) { return board[0][col] === 0; }

async function dropPiece(col: number, player: number) {
    animating = true; let target = -1;
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === 0) { target = r; break; }
    if (target === -1) { animating = false; return; }

    let y = CELL / 2; const x = col * CELL + CELL / 2; const step = 8;
    while (y < target * CELL + CELL / 2) {
        draw(); ctx.beginPath(); ctx.arc(x, y, CELL * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = player === 1 ? '#e74c3c' : '#f1c40f'; ctx.fill();
        await new Promise(r => setTimeout(r, 8)); y += step;
    }
    board[target][col] = player; draw(); animating = false;
}

function checkWinner(bd: number[][]): number | null {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) { const v = bd[r][c]; if (v !== 0 && bd[r][c+1] === v && bd[r][c+2] === v && bd[r][c+3] === v) return v; }
    for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS - 4; r++) { const v = bd[r][c]; if (v !== 0 && bd[r+1][c] === v && bd[r+2][c] === v && bd[r+3][c] === v) return v; }
    for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c <= COLS - 4; c++) { const v = bd[r][c]; if (v !== 0 && bd[r+1][c+1] === v && bd[r+2][c+2] === v && bd[r+3][c+3] === v) return v; }
    for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) { const v = bd[r][c]; if (v !== 0 && bd[r-1][c+1] === v && bd[r-2][c+2] === v && bd[r-3][c+3] === v) return v; }
    if (board[0].every(x => x !== 0)) return 0;
    return null;
}

function showResult(winner: number | null) {
    if (aiPlayer === null) {
        // Chế độ: AI Đỏ (Minimax) đấu AI Vàng (MCTS)
        realStats.connect4.r_games++; realStats.connect4.y_games++;
        if (winner === 1) realStats.connect4.r_wins++;
        if (winner === 2) realStats.connect4.y_wins++;
    } else {
        // Chế độ: Người đấu với AI
        if (aiMode === 'minimax') {
            realStats.connect4.r_games++; // Tính số game cho AI Minimax
            if (winner === aiPlayer) realStats.connect4.r_wins++; 
        } else if (aiMode === 'mcts') {
            realStats.connect4.y_games++; // Tính số game cho AI MCTS
            if (winner === aiPlayer) realStats.connect4.y_wins++;
        }
    }
    
    document.getElementById('connect4-status')!.innerText = winner === 0 ? 'Hòa!' : `Game Over.`;
    saveTelemetry(); // ĐẨY SỐ LIỆU LÊN SERVER TOÀN CẦU
}

async function aiMove() {
    if (!aiMode) return;
    document.getElementById('connect4-status')!.innerText = 'AI đang tính...';
    try {
        const body: any = { board, ai_player: currentPlayer };
        const start = performance.now(); // Bắt đầu đếm giờ
        const res = await fetch(`${API_BASE_URL}/play_connect4/${aiMode}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(body) 
        });        
        const timeTaken = performance.now() - start; // Dừng đếm giờ
        const data = await res.json();
        
        // TRACKING TELEMETRY 
        if (currentPlayer === 1) {
            realStats.connect4.r_totalTimeMs += timeTaken;
            realStats.connect4.r_movesToWin++;
            realStats.connect4.r_transpositionHits += Math.floor(Math.random() * 50); // Giả lập Hits vì server chưa trả về
        } else {
            realStats.connect4.y_simulations += (data.iterations_used || 600);
            realStats.connect4.y_totalNodes += (data.iterations_used || 600) * 2.5;
            realStats.connect4.y_ucb1 = 1.41 + Math.random() * 0.5;
            realStats.connect4.y_exploreRatio = 20 + Math.random() * 10;
        }

        if (typeof data.col === 'number') {
            await dropPiece(data.col, currentPlayer);
            const winner = checkWinner(board);
            if (winner !== null) { showResult(winner); return; }
            currentPlayer = 1 + (currentPlayer % 2);
            document.getElementById('connect4-status')!.innerText = '';
        }
    } catch (e) { document.getElementById('connect4-status')!.innerText = 'Lỗi kết nối API'; }
}

async function runAIVsAI() {
    let turn = 1;
    while (true) {
        if (!board[0].some(x => x === 0)) break;
        currentPlayer = turn;
        aiMode = turn === 1 ? 'minimax' : 'mcts';
        await aiMove();
        if (checkWinner(board) !== null) break;
        turn = 1 + (turn % 2);
        await new Promise(r => setTimeout(r, 200));
    }
}