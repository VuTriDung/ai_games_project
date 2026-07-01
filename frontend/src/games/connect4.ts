import { showView } from '../main';

// Connect4 frontend + API integration
const canvas = document.getElementById('connect4-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const COLS = 7;
const ROWS = 6;
const CELL = 70;

let board: number[][] = [];
let currentPlayer = 1; // 1 = red (player1), 2 = yellow (player2)
let aiMode: 'minimax' | 'mcts' | null = null;
let aiPlayer: number | null = null;
let animating = false;

document.getElementById('card-connect4')?.addEventListener('click', () => {
    showView('connect4');
    initBoard();
    draw();
});

document.getElementById('btn-start-connect4')?.addEventListener('click', () => {
    // Start human vs AI: red (human) vs yellow (AI Minimax)
    initBoard();
    aiMode = 'minimax';
    aiPlayer = 2;
    currentPlayer = 1;
    draw();
    document.getElementById('connect4-status')!.innerText = 'Human vs Minimax (Yellow)';
});

document.getElementById('btn-start-connect4-mcts')?.addEventListener('click', () => {
    initBoard();
    aiMode = 'mcts';
    aiPlayer = 2;
    currentPlayer = 1;
    draw();
    document.getElementById('connect4-status')!.innerText = 'Human vs MCTS (Yellow)';
});

document.getElementById('btn-ai-vs-ai')?.addEventListener('click', async () => {
    initBoard();
    aiMode = 'minimax';
    aiPlayer = null; // both AIs
    currentPlayer = 1;
    draw();
    document.getElementById('connect4-status')!.innerText = 'AI vs AI running...';
    await runAIVsAI();
});

canvas.addEventListener('click', async (e) => {
    if (animating) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const col = Math.floor(x / CELL);
    if (col < 0 || col >= COLS) return;
    if (!canPlay(col)) return;

    await dropPiece(col, currentPlayer);
    const winner = checkWinner(board);
    if (winner !== null) {
        showResult(winner);
        return;
    }

    currentPlayer = 1 + (currentPlayer % 2);

    // If AI should move
    if (aiMode && (aiPlayer === null || aiPlayer === currentPlayer)) {
        await aiMove();
    }
});

function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    currentPlayer = 1;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // background
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * CELL + CELL / 2;
            const y = r * CELL + CELL / 2;
            ctx.beginPath();
            ctx.arc(x, y, CELL * 0.38, 0, Math.PI * 2);
            const v = board[r][c];
            if (v === 0) ctx.fillStyle = '#34495e';
            else if (v === 1) ctx.fillStyle = '#e74c3c'; // red
            else ctx.fillStyle = '#f1c40f'; // yellow
            ctx.fill();
        }
    }
}

function canPlay(col: number) {
    return board[0][col] === 0;
}

async function dropPiece(col: number, player: number) {
    animating = true;
    // find target row
    let target = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][col] === 0) { target = r; break; }
    }
    if (target === -1) { animating = false; return; }

    // animate fall
    let y = CELL / 2;
    const x = col * CELL + CELL / 2;
    const step = 8;
    while (y < target * CELL + CELL / 2) {
        draw();
        ctx.beginPath();
        ctx.arc(x, y, CELL * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = player === 1 ? '#e74c3c' : '#f1c40f';
        ctx.fill();
        await new Promise(r => setTimeout(r, 8));
        y += step;
    }
    board[target][col] = player;
    draw();
    animating = false;
}

function checkWinner(bd: number[][]): number | null {
    // returns 1 or 2 if winner, 0 if draw, null otherwise
    // horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            const v = bd[r][c]; if (v === 0) continue;
            if (bd[r][c+1] === v && bd[r][c+2] === v && bd[r][c+3] === v) return v;
        }
    }
    // vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r <= ROWS - 4; r++) {
            const v = bd[r][c]; if (v === 0) continue;
            if (bd[r+1][c] === v && bd[r+2][c] === v && bd[r+3][c] === v) return v;
        }
    }
    // diag down-right
    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            const v = bd[r][c]; if (v === 0) continue;
            if (bd[r+1][c+1] === v && bd[r+2][c+2] === v && bd[r+3][c+3] === v) return v;
        }
    }
    // diag up-right
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            const v = bd[r][c]; if (v === 0) continue;
            if (bd[r-1][c+1] === v && bd[r-2][c+2] === v && bd[r-3][c+3] === v) return v;
        }
    }
    if (board[0].every(x => x !== 0)) return 0;
    return null;
}

function showResult(winner: number | null) {
    if (winner === 0) document.getElementById('connect4-status')!.innerText = 'Hòa!';
    else document.getElementById('connect4-status')!.innerText = `Người chơi ${winner} thắng!`;
}

async function aiMove() {
    if (!aiMode) return;
    document.getElementById('connect4-status')!.innerText = 'AI đang tính...';
    try {
        const depthInput = (document.getElementById('connect4-depth') as HTMLInputElement | null);
        const itersInput = (document.getElementById('connect4-iters') as HTMLInputElement | null);
        const body: any = { board, ai_player: currentPlayer };
        if (aiMode === 'minimax' && depthInput) body.depth = parseInt(depthInput.value) || 6;
        if (aiMode === 'mcts' && itersInput) body.iterations = parseInt(itersInput.value) || 600;

        const res = await fetch(`http://localhost:8000/play_connect4/${aiMode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        const col = data.col;
        if (typeof col === 'number') {
            await dropPiece(col, currentPlayer);
            const winner = checkWinner(board);
            if (winner !== null) { showResult(winner); return; }
            currentPlayer = 1 + (currentPlayer % 2);
            document.getElementById('connect4-status')!.innerText = '';
        }
    } catch (e) { document.getElementById('connect4-status')!.innerText = 'Lỗi kết nối API'; }
}

async function runAIVsAI() {
    // minimax vs mcts: red = minimax, yellow = mcts
    let turn = 1;
    const depthInput = (document.getElementById('connect4-depth') as HTMLInputElement | null);
    const itersInput = (document.getElementById('connect4-iters') as HTMLInputElement | null);
    const depthVal = depthInput ? parseInt(depthInput.value) || 6 : 6;
    const itersVal = itersInput ? parseInt(itersInput.value) || 600 : 600;
    while (true) {
        if (!validAnyMove()) break;
        const mode = turn === 1 ? 'minimax' : 'mcts';
        try {
            const body: any = { board, ai_player: turn };
            if (mode === 'minimax') body.depth = depthVal;
            if (mode === 'mcts') body.iterations = itersVal;
            const res = await fetch(`http://localhost:8000/play_connect4/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            const col = data.col;
            if (typeof col === 'number') {
                await dropPiece(col, turn);
                const winner = checkWinner(board);
                if (winner !== null) { showResult(winner); return; }
            } else break;
        } catch (e) { document.getElementById('connect4-status')!.innerText = 'Lỗi API AI vs AI'; break; }
        turn = 1 + (turn % 2);
        await new Promise(r => setTimeout(r, 200));
    }
}

function validAnyMove() { return board[0].some(x => x === 0); }

// expose for debug
export { initBoard, draw };