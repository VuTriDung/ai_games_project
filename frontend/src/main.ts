import './style.css'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Key } from 'chessground/types'

const viewHub = document.getElementById('view-hub')!;
const viewIntro = document.getElementById('view-intro')!;
const viewGame = document.getElementById('view-game')!;
const viewSnake = document.getElementById('view-snake')!;
const viewStats = document.getElementById('view-stats')!;
const viewPacman = document.getElementById('view-pacman')!;
const boardEl = document.getElementById('board') as HTMLElement;
const aiChatText = document.getElementById('ai-chat-text')!;
const moveHistoryEl = document.getElementById('move-history')!;
const modalGameOver = document.getElementById('modal-game-over')!;

// === KHO LƯU TRỮ RESEARCH METRICS ===
const realStats = {
    chess: { wins: 0, draws: 0, losses: 0, totalInfTime: 0, movesCount: 0 },
    snake: { games: 0, bestScore: 0, totalScore: 0, deathWall: 0, deathTail: 0, deathStarve: 0, maxCoverage: 0, totalFoodSteps: 0, foodEaten: 0, dirUp: 0, dirDown: 0, dirLeft: 0, dirRight: 0 }
};

async function refreshDashboard() {
    try {
        const res = await fetch('http://localhost:8000/api/stats');
        const data = await res.json();
        document.getElementById('ui-chess-trained')!.innerText = (data.chess_trained_games / 1000).toFixed(1) + "K";
        document.getElementById('ui-snake-trained')!.innerText = (data.snake_trained_episodes / 1000).toFixed(1) + "K";
        document.getElementById('ui-snake-epsilon')!.innerText = data.snake_epsilon;
    } catch (e) { document.getElementById('ui-chess-trained')!.innerText = "N/A"; }
    // Update logic as before...
}

function showView(viewName: string) { 
    viewHub.classList.add('hidden'); viewIntro.classList.add('hidden');
    viewGame.classList.add('hidden'); viewSnake.classList.add('hidden'); 
    viewStats.classList.add('hidden'); viewPacman.classList.add('hidden');
    
    if (viewName === 'hub') viewHub.classList.remove('hidden');
    if (viewName === 'intro') viewIntro.classList.remove('hidden');
    if (viewName === 'game') viewGame.classList.remove('hidden');
    if (viewName === 'snake') viewSnake.classList.remove('hidden');
    if (viewName === 'stats') { viewStats.classList.remove('hidden'); refreshDashboard(); }
    if (viewName === 'pacman') viewPacman.classList.remove('hidden');
}

document.getElementById('card-stats')?.addEventListener('click', () => showView('stats'));
document.getElementById('btn-back-hub-stats')?.addEventListener('click', () => showView('hub'));
document.getElementById('tab-chess')?.addEventListener('click', () => {
    document.getElementById('tab-chess')!.classList.add('active'); document.getElementById('tab-snake')!.classList.remove('active');
    document.getElementById('stats-chess')!.classList.remove('hidden'); document.getElementById('stats-snake')!.classList.add('hidden');
});
document.getElementById('tab-snake')?.addEventListener('click', () => {
    document.getElementById('tab-snake')!.classList.add('active'); document.getElementById('tab-chess')!.classList.remove('active');
    document.getElementById('stats-snake')!.classList.remove('hidden'); document.getElementById('stats-chess')!.classList.add('hidden');
});
document.getElementById('card-pacman')?.addEventListener('click', () => { showView('pacman'); });


// ==========================================
// CODE CHESS 
// ==========================================
const game = new Chess();
let ground: Api;
let isAiVsAi: boolean = false;

document.getElementById('card-chess')?.addEventListener('click', () => {
    document.getElementById('intro-title')!.innerText = "AI Chess Battle";
    document.getElementById('intro-desc')!.innerHTML = `- <b>AI Trắng:</b> Cỗ máy Stockfish (Minimax).<br>- <b>AI Đen:</b> Mạng Neural Đa Lớp.`;
    showView('intro');
});

document.getElementById('btn-back-hub')?.addEventListener('click', () => showView('hub'));
document.getElementById('btn-start-game')?.addEventListener('click', () => { showView('game'); if (!ground) initBoard(); resetGame(); });
document.getElementById('btn-exit-game')?.addEventListener('click', () => { isAiVsAi = false; showView('hub'); });

function getValidMoves() {
    const dests = new Map<Key, Key[]>();
    const SQUARES = ['a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', 'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6', 'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', 'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', 'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'];
    SQUARES.forEach(sq => { const moves = game.moves({ square: sq as any, verbose: true }) as { to: string }[]; if (moves.length > 0) dests.set(sq as Key, moves.map(m => m.to as Key)); });
    return dests;
}

function initBoard() { ground = Chessground(boardEl, { movable: { color: 'white', free: false, dests: getValidMoves(), events: { after: onUserMove } } }); }

function renderHistory() {
    const history = game.history(); let html = '';
    for (let i = 0; i < history.length; i += 2) { html += `<div class="history-row"><div class="turn-num">${(i/2)+1}.</div><div class="move-w">${history[i]}</div><div class="move-b">${history[i+1]||''}</div></div>`; }
    moveHistoryEl.innerHTML = html; moveHistoryEl.scrollTop = moveHistoryEl.scrollHeight;
}

function checkGameOver() {
    if (game.isGameOver()) {
        ground.set({ movable: { color: undefined } });
        let resultMsg = "Hòa cờ!";
        if (game.isCheckmate()) {
            if (game.turn() === 'w') { resultMsg = "Đen (Neural) Thắng!"; realStats.chess.wins++; } 
            else { resultMsg = "Trắng Thắng!"; realStats.chess.losses++; }
        } else { realStats.chess.draws++; }
        document.getElementById('modal-result-desc')!.innerText = resultMsg; modalGameOver.classList.remove('hidden'); return true;
    }
    return false;
}

async function onUserMove(orig: Key, dest: Key) {
    game.move({ from: orig, to: dest, promotion: 'q' }); renderHistory(); if (checkGameOver()) return;
    aiChatText.innerText = "Đang xử lý..."; ground.set({ movable: { color: undefined } }); 
    try {
        const res = await fetch('http://localhost:8000/play_ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fen: game.fen(), ai_color: 'black' }) });
        const data = await res.json();
        if (data.move) {
            realStats.chess.movesCount++; realStats.chess.totalInfTime += data.inference_time_ms;
            game.move(data.move, { sloppy: true } as any); ground.set({ fen: game.fen(), lastMove: [data.move.substring(0,2) as Key, data.move.substring(2,4) as Key] });
            renderHistory(); aiChatText.innerText = `Inference latency: ${data.inference_time_ms} ms.`;
        }
        if (!checkGameOver()) ground.set({ movable: { color: 'white', dests: getValidMoves() } });
    } catch (error) { aiChatText.innerText = "Lỗi kết nối Server!"; }
}

function resetGame() { game.reset(); isAiVsAi = false; ground.set({ fen: game.fen(), movable: { color: 'white', dests: getValidMoves() }, lastMove: undefined }); renderHistory(); aiChatText.innerText = "Bạn đi trước."; }
document.getElementById('btn-close-modal')?.addEventListener('click', () => { modalGameOver.classList.add('hidden'); resetGame(); });
document.getElementById('btn-dismiss-modal')?.addEventListener('click', () => { modalGameOver.classList.add('hidden'); showView('hub'); });

document.getElementById('btn-auto-ai')?.addEventListener('click', async () => {
    isAiVsAi = true; let currentColor = 'white';
    while (isAiVsAi && !game.isGameOver()) {
        aiChatText.innerText = `AI ${currentColor} đang tính...`;
        try {
            const res = await fetch('http://localhost:8000/play_ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fen: game.fen(), ai_color: currentColor }) });
            const data = await res.json();
            if (data.move) {
                if (currentColor === 'black') { realStats.chess.movesCount++; realStats.chess.totalInfTime += data.inference_time_ms; }
                game.move(data.move, { sloppy: true } as any); ground.set({ fen: game.fen(), lastMove: [data.move.substring(0,2) as Key, data.move.substring(2,4) as Key] });
                renderHistory(); currentColor = currentColor === 'white' ? 'black' : 'white'; await new Promise(r => setTimeout(r, 600)); 
            } else break;
        } catch (error) { break; }
    }
    checkGameOver();
});

// ==========================================
// CODE SNAKE 
// ==========================================
const canvas = document.getElementById('snake-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const TOTAL_TILES = 400;

let snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
let snakeDir = {x: 1, y: 0}; let food = {x: 15, y: 10}; let snakeScore = 0; let snakeInterval: any = null;

document.getElementById('card-snake')?.addEventListener('click', () => { showView('snake'); drawSnake(); });
document.getElementById('btn-exit-snake')?.addEventListener('click', () => { showView('hub'); clearInterval(snakeInterval); });

function drawSnake() {
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, 500, 500);
    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(food.x*25 + 12.5, food.y*25 + 12.5, 10.5, 0, Math.PI*2); ctx.fill();
    snake.forEach((segment, index) => { ctx.fillStyle = index === 0 ? '#27ae60' : '#2ecc71'; ctx.fillRect(segment.x * 25, segment.y * 25, 24, 24); });
}

function spawnFood() { food = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) }; }

function getSnakeState() {
    const head = snake[0];
    const isCol = (pt: any) => pt.x < 0 || pt.x >= 20 || pt.y < 0 || pt.y >= 20 || snake.some((s, i) => i !== 0 && s.x === pt.x && s.y === pt.y);
    return [
        (snakeDir.x===1 && isCol({x:head.x+1, y:head.y})) || (snakeDir.x===-1 && isCol({x:head.x-1, y:head.y})) || (snakeDir.y===-1 && isCol({x:head.x, y:head.y-1})) || (snakeDir.y===1 && isCol({x:head.x, y:head.y+1})) ? 1 : 0,
        (snakeDir.y===-1 && isCol({x:head.x+1, y:head.y})) || (snakeDir.y===1 && isCol({x:head.x-1, y:head.y})) || (snakeDir.x===-1 && isCol({x:head.x, y:head.y-1})) || (snakeDir.x===1 && isCol({x:head.x, y:head.y+1})) ? 1 : 0,
        (snakeDir.y===1 && isCol({x:head.x+1, y:head.y})) || (snakeDir.y===-1 && isCol({x:head.x-1, y:head.y})) || (snakeDir.x===1 && isCol({x:head.x, y:head.y-1})) || (snakeDir.x===-1 && isCol({x:head.x, y:head.y+1})) ? 1 : 0,
        snakeDir.x===-1?1:0, snakeDir.x===1?1:0, snakeDir.y===-1?1:0, snakeDir.y===1?1:0,
        food.x < head.x?1:0, food.x > head.x?1:0, food.y < head.y?1:0, food.y > head.y?1:0
    ];
}

function endSnakeGame(reason: string) {
    clearInterval(snakeInterval); document.getElementById('snake-status')!.innerText = reason;
    realStats.snake.games++; realStats.snake.totalScore += snakeScore;
    if (snakeScore > realStats.snake.bestScore) { realStats.snake.bestScore = snakeScore; document.getElementById('snake-max-ui')!.innerText = snakeScore.toString(); }
}

document.getElementById('btn-start-snake')?.addEventListener('click', () => {
    snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}]; snakeDir = {x: 1, y: 0}; snakeScore = 0; spawnFood();
    clearInterval(snakeInterval); document.getElementById('snake-status')!.innerText = "AI Running...";
    let stepsWithoutFood = 0;

    snakeInterval = setInterval(async () => {
        try {
            const res = await fetch('http://localhost:8000/play_snake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state_vector: getSnakeState(), current_dir: snakeDir }) });
            snakeDir = (await res.json()).new_dir; 
            
            // Theo dõi hướng đi
            if (snakeDir.y === -1) realStats.snake.dirUp++; else if (snakeDir.y === 1) realStats.snake.dirDown++; else if (snakeDir.x === -1) realStats.snake.dirLeft++; else realStats.snake.dirRight++;
            
            const newHead = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };
            stepsWithoutFood++; realStats.snake.totalFoodSteps++;
            
            const coverage = (snake.length / TOTAL_TILES) * 100;
            if (coverage > realStats.snake.maxCoverage) realStats.snake.maxCoverage = coverage;
            
            if (newHead.x < 0 || newHead.x >= 20 || newHead.y < 0 || newHead.y >= 20) { realStats.snake.deathWall++; endSnakeGame("Đâm tường"); return; }
            if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) { realStats.snake.deathTail++; endSnakeGame("Cắn đuôi"); return; }
            if (stepsWithoutFood > 150 * snake.length) { realStats.snake.deathStarve++; endSnakeGame("Chết đói"); return; }
            
            snake.unshift(newHead);
            if (newHead.x === food.x && newHead.y === food.y) {
                snakeScore += 100; stepsWithoutFood = 0; realStats.snake.foodEaten++;
                document.getElementById('snake-score')!.innerText = snakeScore.toString(); spawnFood();
            } else { snake.pop(); }
            
            drawSnake();
        } catch (error) { clearInterval(snakeInterval); document.getElementById('snake-status')!.innerText = "Lỗi kết nối API"; }
    }, 60); 
});

// ==========================================
// TÍCH HỢP ENGINE PAC-MAN GỐC (DALE HARVEY) + AI HOOKS
// ==========================================
let aiInterval: any = null;
let isAiPlaying = false;

// ĐỊNH NGHĨA PHÍM ĐỂ GIẢ LẬP NHẤN PHÍM TỪ AI
const KEY = {'ARROW_LEFT': 37, 'ARROW_UP': 38, 'ARROW_RIGHT': 39, 'ARROW_DOWN': 40, 'N': 78, 'S': 83, 'P': 80};
const NONE = 4, UP = 3, LEFT = 2, DOWN = 1, RIGHT = 11, WAITING = 5, PAUSE = 6, PLAYING = 7, COUNTDOWN = 8, EATEN_PAUSE = 9, DYING = 10;

// Ép kiểu prototype clone cho TypeScript
(Object.prototype as any).clone = function () {
    var i, newObj:any = (this instanceof Array) ? [] : {};
    for (i in this) {
        if (i === 'clone') continue;
        if (this[i] && typeof this[i] === "object") newObj[i] = this[i].clone();
        else newObj[i] = this[i];
    }
    return newObj;
};

var Pacman: any = {};
Pacman.FPS = 30;
Pacman.WALL = 0; Pacman.BISCUIT = 1; Pacman.EMPTY = 2; Pacman.BLOCK = 3; Pacman.PILL = 4;

Pacman.MAP = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 4, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 4, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    [2, 2, 2, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 2, 2, 2],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 3, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [2, 2, 2, 2, 1, 1, 1, 0, 3, 3, 3, 0, 1, 1, 1, 2, 2, 2, 2],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [2, 2, 2, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 2, 2, 2],
    [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    [0, 4, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 4, 0],
    [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
    [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

Pacman.WALLS = [
    [{"move": [0, 9.5]}, {"line": [3, 9.5]}, {"curve": [3.5, 9.5, 3.5, 9]}, {"line": [3.5, 8]}, {"curve": [3.5, 7.5, 3, 7.5]}, {"line": [1, 7.5]}, {"curve": [0.5, 7.5, 0.5, 7]}, {"line": [0.5, 1]}, {"curve": [0.5, 0.5, 1, 0.5]}, {"line": [9, 0.5]}, {"curve": [9.5, 0.5, 9.5, 1]}, {"line": [9.5, 3.5]}],
    [{"move": [9.5, 1]}, {"curve": [9.5, 0.5, 10, 0.5]}, {"line": [18, 0.5]}, {"curve": [18.5, 0.5, 18.5, 1]}, {"line": [18.5, 7]}, {"curve": [18.5, 7.5, 18, 7.5]}, {"line": [16, 7.5]}, {"curve": [15.5, 7.5, 15.5, 8]}, {"line": [15.5, 9]}, {"curve": [15.5, 9.5, 16, 9.5]}, {"line": [19, 9.5]}],
    [{"move": [2.5, 5.5]}, {"line": [3.5, 5.5]}], [{"move": [3, 2.5]}, {"curve": [3.5, 2.5, 3.5, 3]}, {"curve": [3.5, 3.5, 3, 3.5]}, {"curve": [2.5, 3.5, 2.5, 3]}, {"curve": [2.5, 2.5, 3, 2.5]}],
    [{"move": [15.5, 5.5]}, {"line": [16.5, 5.5]}], [{"move": [16, 2.5]}, {"curve": [16.5, 2.5, 16.5, 3]}, {"curve": [16.5, 3.5, 16, 3.5]}, {"curve": [15.5, 3.5, 15.5, 3]}, {"curve": [15.5, 2.5, 16, 2.5]}],
    [{"move": [6, 2.5]}, {"line": [7, 2.5]}, {"curve": [7.5, 2.5, 7.5, 3]}, {"curve": [7.5, 3.5, 7, 3.5]}, {"line": [6, 3.5]}, {"curve": [5.5, 3.5, 5.5, 3]}, {"curve": [5.5, 2.5, 6, 2.5]}],
    [{"move": [12, 2.5]}, {"line": [13, 2.5]}, {"curve": [13.5, 2.5, 13.5, 3]}, {"curve": [13.5, 3.5, 13, 3.5]}, {"line": [12, 3.5]}, {"curve": [11.5, 3.5, 11.5, 3]}, {"curve": [11.5, 2.5, 12, 2.5]}],
    [{"move": [7.5, 5.5]}, {"line": [9, 5.5]}, {"curve": [9.5, 5.5, 9.5, 6]}, {"line": [9.5, 7.5]}], [{"move": [9.5, 6]}, {"curve": [9.5, 5.5, 10.5, 5.5]}, {"line": [11.5, 5.5]}],
    [{"move": [5.5, 5.5]}, {"line": [5.5, 7]}, {"curve": [5.5, 7.5, 6, 7.5]}, {"line": [7.5, 7.5]}], [{"move": [6, 7.5]}, {"curve": [5.5, 7.5, 5.5, 8]}, {"line": [5.5, 9.5]}],
    [{"move": [13.5, 5.5]}, {"line": [13.5, 7]}, {"curve": [13.5, 7.5, 13, 7.5]}, {"line": [11.5, 7.5]}], [{"move": [13, 7.5]}, {"curve": [13.5, 7.5, 13.5, 8]}, {"line": [13.5, 9.5]}],
    [{"move": [0, 11.5]}, {"line": [3, 11.5]}, {"curve": [3.5, 11.5, 3.5, 12]}, {"line": [3.5, 13]}, {"curve": [3.5, 13.5, 3, 13.5]}, {"line": [1, 13.5]}, {"curve": [0.5, 13.5, 0.5, 14]}, {"line": [0.5, 17]}, {"curve": [0.5, 17.5, 1, 17.5]}, {"line": [1.5, 17.5]}],
    [{"move": [1, 17.5]}, {"curve": [0.5, 17.5, 0.5, 18]}, {"line": [0.5, 21]}, {"curve": [0.5, 21.5, 1, 21.5]}, {"line": [18, 21.5]}, {"curve": [18.5, 21.5, 18.5, 21]}, {"line": [18.5, 18]}, {"curve": [18.5, 17.5, 18, 17.5]}, {"line": [17.5, 17.5]}],
    [{"move": [18, 17.5]}, {"curve": [18.5, 17.5, 18.5, 17]}, {"line": [18.5, 14]}, {"curve": [18.5, 13.5, 18, 13.5]}, {"line": [16, 13.5]}, {"curve": [15.5, 13.5, 15.5, 13]}, {"line": [15.5, 12]}, {"curve": [15.5, 11.5, 16, 11.5]}, {"line": [19, 11.5]}],
    [{"move": [5.5, 11.5]}, {"line": [5.5, 13.5]}], [{"move": [13.5, 11.5]}, {"line": [13.5, 13.5]}],
    [{"move": [2.5, 15.5]}, {"line": [3, 15.5]}, {"curve": [3.5, 15.5, 3.5, 16]}, {"line": [3.5, 17.5]}], [{"move": [16.5, 15.5]}, {"line": [16, 15.5]}, {"curve": [15.5, 15.5, 15.5, 16]}, {"line": [15.5, 17.5]}],
    [{"move": [5.5, 15.5]}, {"line": [7.5, 15.5]}], [{"move": [11.5, 15.5]}, {"line": [13.5, 15.5]}],
    [{"move": [2.5, 19.5]}, {"line": [5, 19.5]}, {"curve": [5.5, 19.5, 5.5, 19]}, {"line": [5.5, 17.5]}], [{"move": [5.5, 19]}, {"curve": [5.5, 19.5, 6, 19.5]}, {"line": [7.5, 19.5]}],
    [{"move": [11.5, 19.5]}, {"line": [13, 19.5]}, {"curve": [13.5, 19.5, 13.5, 19]}, {"line": [13.5, 17.5]}], [{"move": [13.5, 19]}, {"curve": [13.5, 19.5, 14, 19.5]}, {"line": [16.5, 19.5]}],
    [{"move": [7.5, 13.5]}, {"line": [9, 13.5]}, {"curve": [9.5, 13.5, 9.5, 14]}, {"line": [9.5, 15.5]}], [{"move": [9.5, 14]}, {"curve": [9.5, 13.5, 10, 13.5]}, {"line": [11.5, 13.5]}],
    [{"move": [7.5, 17.5]}, {"line": [9, 17.5]}, {"curve": [9.5, 17.5, 9.5, 18]}, {"line": [9.5, 19.5]}], [{"move": [9.5, 18]}, {"curve": [9.5, 17.5, 10, 17.5]}, {"line": [11.5, 17.5]}],
    [{"move": [8.5, 9.5]}, {"line": [8, 9.5]}, {"curve": [7.5, 9.5, 7.5, 10]}, {"line": [7.5, 11]}, {"curve": [7.5, 11.5, 8, 11.5]}, {"line": [11, 11.5]}, {"curve": [11.5, 11.5, 11.5, 11]}, {"line": [11.5, 10]}, {"curve": [11.5, 9.5, 11, 9.5]}, {"line": [10.5, 9.5]}]
];

Pacman.Ghost = function (game:any, map:any, colour:any) {
    var position:any = null, direction:any = null, eatable:any = null, eaten:any = null, due:any = null;
    function getNewCoord(dir:any, current:any) { 
        var speed = isVunerable() ? 1 : isHidden() ? 4 : 2,
            xSpeed = (dir === LEFT && -speed || dir === RIGHT && speed || 0),
            ySpeed = (dir === DOWN && speed || dir === UP && -speed || 0);
        return { "x": addBounded(current.x, xSpeed), "y": addBounded(current.y, ySpeed) };
    };
    function addBounded(x1:any, x2:any) { 
        var rem = x1 % 10, result = rem + x2;
        if (rem !== 0 && result > 10) return x1 + (10 - rem);
        else if(rem > 0 && result < 0) return x1 - rem;
        return x1 + x2;
    };
    function isVunerable() { return eatable !== null; };
    function isDangerous() { return eaten === null; };
    function isHidden() { return eatable === null && eaten !== null; };
    function getRandomDirection() {
        var moves = (direction === LEFT || direction === RIGHT) ? [UP, DOWN] : [LEFT, RIGHT];
        return moves[Math.floor(Math.random() * 2)];
    };
    function reset() {
        eaten = null; eatable = null; position = {"x": 90, "y": 80};
        direction = getRandomDirection(); due = getRandomDirection();
    };
    function oppositeDirection(dir:any) { return dir === LEFT && RIGHT || dir === RIGHT && LEFT || dir === UP && DOWN || UP; };
    function makeEatable() { direction = oppositeDirection(direction); eatable = game.getTick(); };
    function eat() { eatable = null; eaten = game.getTick(); };
    function pointToCoord(x:any) { return Math.round(x / 10); };
    function nextSquare(x:any, dir:any) {
        var rem = x % 10;
        if (rem === 0) return x; 
        else if (dir === RIGHT || dir === DOWN) return x + (10 - rem);
        else return x - rem;
    };
    function onGridSquare(pos:any) { return pos.y % 10 === 0 && pos.x % 10 === 0; };
    function secondsAgo(tick:any) { return (game.getTick() - tick) / Pacman.FPS; };
    function getColour() { 
        if (eatable) { 
            if (secondsAgo(eatable) > 5) return game.getTick() % 20 > 10 ? "#FFFFFF" : "#0000BB";
            else return "#0000BB";
        } else if(eaten) return "#222"; 
        return colour;
    };
    function draw(ctx:any) {
        var s = map.blockSize, top = (position.y/10) * s, left = (position.x/10) * s;
        if (eatable && secondsAgo(eatable) > 8) eatable = null;
        if (eaten && secondsAgo(eaten) > 3) eaten = null;
        var tl = left + s, base = top + s - 3, inc = s / 10;
        var high = game.getTick() % 10 > 5 ? 3  : -3, low = game.getTick() % 10 > 5 ? -3 : 3;
        ctx.fillStyle = getColour(); ctx.beginPath(); ctx.moveTo(left, base);
        ctx.quadraticCurveTo(left, top, left + (s/2),  top); ctx.quadraticCurveTo(left + s, top, left+s,  base);
        ctx.quadraticCurveTo(tl-(inc*1), base+high, tl - (inc * 2),  base); ctx.quadraticCurveTo(tl-(inc*3), base+low, tl - (inc * 4),  base);
        ctx.quadraticCurveTo(tl-(inc*5), base+high, tl - (inc * 6),  base); ctx.quadraticCurveTo(tl-(inc*7), base+low, tl - (inc * 8),  base); 
        ctx.quadraticCurveTo(tl-(inc*9), base+high, tl - (inc * 10), base); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.fillStyle = "#FFF"; ctx.arc(left + 6,top + 6, s / 6, 0, 300, false); ctx.arc((left + s) - 6,top + 6, s / 6, 0, 300, false); ctx.closePath(); ctx.fill();
        var f = s / 12, off:any = {};
        off[RIGHT] = [f, 0]; off[LEFT] = [-f, 0]; off[UP] = [0, -f]; off[DOWN] = [0, f];
        ctx.beginPath(); ctx.fillStyle = "#000";
        ctx.arc(left+6+off[direction][0], top+6+off[direction][1], s / 15, 0, 300, false);
        ctx.arc((left+s)-6+off[direction][0], top+6+off[direction][1], s / 15, 0, 300, false); ctx.closePath(); ctx.fill();
    };
    function pane(pos:any) {
        if (pos.y === 100 && pos.x >= 190 && direction === RIGHT) return {"y": 100, "x": -10};
        if (pos.y === 100 && pos.x <= -10 && direction === LEFT) return position = {"y": 100, "x": 190};
        return false;
    };
    function move(ctx:any) {
        var oldPos = position, onGrid = onGridSquare(position), npos = null;
        if (due !== direction) {
            npos = getNewCoord(due, position);
            if (onGrid && map.isFloorSpace({"y":pointToCoord(nextSquare(npos.y, due)), "x":pointToCoord(nextSquare(npos.x, due))})) direction = due;
            else npos = null;
        }
        if (npos === null) npos = getNewCoord(direction, position);
        if (onGrid && map.isWallSpace({"y" : pointToCoord(nextSquare(npos.y, direction)), "x" : pointToCoord(nextSquare(npos.x, direction))})) {
            due = getRandomDirection(); return move(ctx);
        }
        position = npos;        
        var tmp = pane(position); if (tmp) position = tmp;
        due = getRandomDirection();
        return { "new" : position, "old" : oldPos };
    };
    return {
        "eat": eat, "isVunerable": isVunerable, "isDangerous": isDangerous, "makeEatable": makeEatable,
        "reset": reset, "move": move, "draw": draw,
        "getPos": function() { return position; } // MỞ KHÓA CHO AI ĐỌC
    };
};

Pacman.Map = function (size:any) {
    var height:any = null, width:any = null, blockSize = size, pillSize = 0, map:any = null;
    function withinBounds(y:any, x:any) { return y >= 0 && y < height && x >= 0 && x < width; }
    function isWall(pos:any) { return withinBounds(pos.y, pos.x) && map[pos.y][pos.x] === Pacman.WALL; }
    function isFloorSpace(pos:any) {
        if (!withinBounds(pos.y, pos.x)) return false;
        var peice = map[pos.y][pos.x]; return peice === Pacman.EMPTY || peice === Pacman.BISCUIT || peice === Pacman.PILL;
    }
    function reset() { map = JSON.parse(JSON.stringify(Pacman.MAP)); height = map.length; width = map[0].length; };
    function block(pos:any) { return map[pos.y][pos.x]; };
    function setBlock(pos:any, type:any) { map[pos.y][pos.x] = type; };
    function drawPills(ctx:any) { 
        if (++pillSize > 30) pillSize = 0;
        for (let i = 0; i < height; i += 1) {
            for (let j = 0; j < width; j += 1) {
                if (map[i][j] === Pacman.PILL) {
                    ctx.beginPath(); ctx.fillStyle = "#000"; ctx.fillRect((j * blockSize), (i * blockSize), blockSize, blockSize);
                    ctx.fillStyle = "#FFF"; ctx.arc((j * blockSize) + blockSize / 2, (i * blockSize) + blockSize / 2, Math.abs(5 - (pillSize/3)), 0, Math.PI * 2, false); 
                    ctx.fill(); ctx.closePath();
                }
            }
        }
    };
    function drawWall(ctx:any) {
        ctx.strokeStyle = "#0000FF"; ctx.lineWidth = 5; ctx.lineCap = "round";
        for (let i = 0; i < Pacman.WALLS.length; i += 1) {
            let line = Pacman.WALLS[i]; ctx.beginPath();
            for (let j = 0; j < line.length; j += 1) {
                let p = line[j];
                if (p.move) ctx.moveTo(p.move[0] * blockSize, p.move[1] * blockSize);
                else if (p.line) ctx.lineTo(p.line[0] * blockSize, p.line[1] * blockSize);
                else if (p.curve) ctx.quadraticCurveTo(p.curve[0] * blockSize, p.curve[1] * blockSize, p.curve[2] * blockSize, p.curve[3] * blockSize);   
            }
            ctx.stroke();
        }
    }
    function draw(ctx:any) {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, width * blockSize, height * blockSize);
        drawWall(ctx);
        for (let i = 0; i < height; i += 1) {
            for (let j = 0; j < width; j += 1) drawBlock(i, j, ctx);
        }
    };
    function drawBlock(y:any, x:any, ctx:any) {
        var layout = map[y][x];
        if (layout === Pacman.PILL) return;
        ctx.beginPath();
        if (layout === Pacman.EMPTY || layout === Pacman.BLOCK || layout === Pacman.BISCUIT) {
            ctx.fillStyle = "#000"; ctx.fillRect((x * blockSize), (y * blockSize), blockSize, blockSize);
            if (layout === Pacman.BISCUIT) {
                ctx.fillStyle = "#FFF"; ctx.fillRect((x * blockSize) + (blockSize / 2.5), (y * blockSize) + (blockSize / 2.5), blockSize / 6, blockSize / 6);
            }
        }
        ctx.closePath();     
    };
    reset();
    return { "draw": draw, "drawBlock": drawBlock, "drawPills": drawPills, "block": block, "setBlock": setBlock, "reset": reset, "isFloorSpace": isFloorSpace, "isWallSpace": isWall };
};

Pacman.User = function (game:any, map:any) {
    var position:any = null, direction:any = null, eaten:any = null, due:any = null, lives:any = null, score = 5, keyMap:any = {};
    keyMap[KEY.ARROW_LEFT] = LEFT; keyMap[KEY.ARROW_UP] = UP; keyMap[KEY.ARROW_RIGHT] = RIGHT; keyMap[KEY.ARROW_DOWN] = DOWN;
    function addScore(nScore:any) { score += nScore; if (score >= 10000 && score - nScore < 10000) lives += 1; };
    function theScore() { return score; };
    function loseLife() { lives -= 1; };
    function getLives() { return lives; };
    function initUser() { score = 0; lives = 3; newLevel(); }
    function newLevel() { resetPosition(); eaten = 0; };
    function resetPosition() { position = {"x": 90, "y": 120}; direction = LEFT; due = LEFT; };
    function reset() { initUser(); resetPosition(); };        
    function keyDown(e:any) {
        if (typeof keyMap[e.keyCode] !== "undefined") { 
            due = keyMap[e.keyCode];
            if(e.preventDefault) e.preventDefault();
            if(e.stopPropagation) e.stopPropagation();
            return false;
        }
        return true;
    };
    function getNewCoord(dir:any, current:any) { return { "x": current.x + (dir === LEFT && -2 || dir === RIGHT && 2 || 0), "y": current.y + (dir === DOWN && 2 || dir === UP && -2 || 0) }; };
    function pointToCoord(x:any) { return Math.round(x/10); };
    function nextSquare(x:any, dir:any) {
        var rem = x % 10;
        if (rem === 0) return x; 
        else if (dir === RIGHT || dir === DOWN) return x + (10 - rem);
        else return x - rem;
    };
    function next(pos:any, dir:any) { return { "y" : pointToCoord(nextSquare(pos.y, dir)), "x" : pointToCoord(nextSquare(pos.x, dir)) }; };
    function onGridSquare(pos:any) { return pos.y % 10 === 0 && pos.x % 10 === 0; };
    function isOnSamePlane(due:any, dir:any) { return ((due === LEFT || due === RIGHT) && (dir === LEFT || dir === RIGHT)) || ((due === UP || due === DOWN) && (dir === UP || dir === DOWN)); };
    function move(ctx:any) {
        var npos = null, nextWhole = null, oldPosition = position, block = null;
        if (due !== direction) {
            npos = getNewCoord(due, position);
            if (isOnSamePlane(due, direction) || (onGridSquare(position) && map.isFloorSpace(next(npos, due)))) direction = due;
            else npos = null;
        }
        if (npos === null) npos = getNewCoord(direction, position);
        if (onGridSquare(position) && map.isWallSpace(next(npos, direction))) direction = NONE;
        if (direction === NONE) return {"new" : position, "old" : position};
        if (npos.y === 100 && npos.x >= 190 && direction === RIGHT) npos = {"y": 100, "x": -10};
        if (npos.y === 100 && npos.x <= -12 && direction === LEFT) npos = {"y": 100, "x": 190};
        position = npos; nextWhole = next(position, direction); block = map.block(nextWhole);        
        if (((position.y%10>3 && position.y%10<7) || (position.x%10>3 && position.x%10<7)) && (block === Pacman.BISCUIT || block === Pacman.PILL)) {
            map.setBlock(nextWhole, Pacman.EMPTY); addScore((block === Pacman.BISCUIT) ? 10 : 50); eaten += 1;
            if (eaten === 182) game.completedLevel();
            if (block === Pacman.PILL) game.eatenPill();
        }                
        return { "new" : position, "old" : oldPosition };
    };
    function drawDead(ctx:any, amount:any) { 
        var size = map.blockSize, half = size / 2;
        if (amount >= 1) return;
        ctx.fillStyle = "#FFFF00"; ctx.beginPath();        
        ctx.moveTo(((position.x/10) * size) + half, ((position.y/10) * size) + half);
        ctx.arc(((position.x/10) * size) + half, ((position.y/10) * size) + half, half, 0, Math.PI * 2 * amount, true); ctx.fill();    
    };
    function draw(ctx:any) { 
        var s = map.blockSize;
        var angle:any = {"start":0, "end":2, "direction": false};
        if (direction == RIGHT && (position.x % 10 < 5)) angle = {"start":0.25, "end":1.75, "direction": false};
        else if (direction === DOWN && (position.y % 10 < 5)) angle = {"start":0.75, "end":2.25, "direction": false};
        else if (direction === UP && (position.y % 10 < 5)) angle = {"start":1.25, "end":1.75, "direction": true};
        else if (direction === LEFT && (position.x % 10 < 5)) angle = {"start":0.75, "end":1.25, "direction": true};
        ctx.fillStyle = "#FFFF00"; ctx.beginPath();        
        ctx.moveTo(((position.x/10) * s) + s / 2, ((position.y/10) * s) + s / 2);
        ctx.arc(((position.x/10) * s) + s / 2, ((position.y/10) * s) + s / 2, s / 2, Math.PI * angle.start, Math.PI * angle.end, angle.direction); ctx.fill();    
    };
    initUser();
    return {
        "draw": draw, "drawDead": drawDead, "loseLife": loseLife, "getLives": getLives,
        "score": score, "addScore": addScore, "theScore": theScore, "keyDown": keyDown,
        "move": move, "newLevel": newLevel, "reset": reset, "resetPosition": resetPosition,
        "getPos": function() { return position; } // MỞ KHÓA CHO AI ĐỌC
    };
};

var PACMAN_ENGINE = (function () {
    var ghosts:any = [], ghostSpecs = ["#00FFDE", "#FF0000", "#FFB8DE", "#FFB847"],
        tick = 0, ctx:any = null, map:any = null, user:any = null, timer:any = null, state=7;
    
    function init(wrapper:any) {
        var blockSize = wrapper.offsetWidth / 19;
        var canvas = document.createElement("canvas");
        canvas.setAttribute("width", (blockSize * 19) + "px");
        canvas.setAttribute("height", (blockSize * 22) + 30 + "px");
        wrapper.innerHTML = ""; wrapper.appendChild(canvas);
        ctx = canvas.getContext('2d');
        
        // MỘT SỐ HÀM DUMMY THAY THẾ ÂM THANH
        let dummyGame = {
            getTick: () => tick, soundDisabled: () => true,
            completedLevel: () => { user.newLevel(); }, eatenPill: () => { ghosts.forEach((g:any)=>g.makeEatable(ctx)); }
        };

        map = new Pacman.Map(blockSize);
        user = new Pacman.User(dummyGame, map);
        for (let i = 0; i < ghostSpecs.length; i += 1) {
            ghosts.push(new Pacman.Ghost(dummyGame, map, ghostSpecs[i]));
        }
        
        timer = window.setInterval(() => {
            if (state !== 6) ++tick;
            map.drawPills(ctx);
            // Main Draw
            ghosts.forEach((g:any) => g.move(ctx));
            user.move(ctx);
            ghosts.forEach((g:any) => g.draw(ctx));
            user.draw(ctx);
        }, 1000 / Pacman.FPS);
    }
    
    return {
        "init": init,
        "getUser": function() { return user; },
        "getGhosts": function() { return ghosts; },
        "triggerKey": function(keyCode:any) { user.keyDown({keyCode: keyCode}); } // HÀM CHO AI BẤM NÚT
    };
}());

// ==========================================
// KẾT NỐI AI VỚI PACMAN ENGINE MỚI
// ==========================================
document.getElementById('btn-start-pacman')?.addEventListener('click', () => {
    isAiPlaying = true;
    document.getElementById('pacman-status')!.innerText = "AI đang cầm lái...";
    
    // Khởi tạo Engine Game Gốc
    var el = document.getElementById("pacman");
    PACMAN_ENGINE.init(el);

    clearInterval(aiInterval);
    aiInterval = setInterval(async () => {
        if (!isAiPlaying) return;
        
        let userPos = PACMAN_ENGINE.getUser().getPos();
        let ghostPosList = PACMAN_ENGINE.getGhosts().map((g:any) => g.getPos());
        
        // Vector hóa trạng thái (Tọa độ x, y thật chia 10)
        let state_vector = [Math.round(userPos.x/10), Math.round(userPos.y/10)];
        ghostPosList.forEach((gp:any) => { state_vector.push(Math.round(gp.x/10), Math.round(gp.y/10)); });
        
        try {
            const res = await fetch('http://localhost:8000/play_pacman', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state_vector: state_vector })
            });
            const data = await res.json();
            let action = data.action; 
            
            // AI BẤM NÚT VÀO GAME GỐC
            let keyToPress = KEY.ARROW_UP;
            if (action === 0) keyToPress = KEY.ARROW_UP;
            else if (action === 1) keyToPress = KEY.ARROW_DOWN;
            else if (action === 2) keyToPress = KEY.ARROW_LEFT;
            else if (action === 3) keyToPress = KEY.ARROW_RIGHT;
            
            PACMAN_ENGINE.triggerKey(keyToPress);
            
        } catch (error) { 
            console.error("AI Error:", error); 
        }
    }, 200); // 200ms API chạy 1 lần, Game loop gốc chạy ngầm 30fps
});

document.getElementById('btn-exit-pacman')?.addEventListener('click', () => { 
    isAiPlaying = false; 
    clearInterval(aiInterval); 
    showView('hub'); 
});