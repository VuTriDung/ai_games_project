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
    } catch (e) {
        document.getElementById('ui-chess-trained')!.innerText = "N/A";
    }

    // CHESS METRICS
    if (realStats.chess.movesCount > 0) {
        const avgInf = (realStats.chess.totalInfTime / realStats.chess.movesCount).toFixed(1);
        document.getElementById('ui-chess-inf')!.innerHTML = `${avgInf} <span class="trend neutral">ms</span>`;
    }
    const { wins, draws, losses } = realStats.chess;
    const totalChessGames = wins + draws + losses;
    if (totalChessGames > 0) {
        const winrate = ((wins / totalChessGames) * 100).toFixed(1);
        document.getElementById('ui-chess-winrate')!.innerText = `${winrate}%`;
        document.getElementById('wdl-w')!.style.width = `${(wins / totalChessGames) * 100}%`;
        document.getElementById('wdl-d')!.style.width = `${(draws / totalChessGames) * 100}%`;
        document.getElementById('wdl-l')!.style.width = `${(losses / totalChessGames) * 100}%`;
    }

    // SNAKE METRICS
    const s = realStats.snake;
    document.getElementById('ui-snake-best')!.innerText = s.bestScore.toString();
    document.getElementById('ui-snake-avg')!.innerText = s.games > 0 ? (s.totalScore / s.games).toFixed(1) : "0.0";
    document.getElementById('ui-snake-coverage')!.innerText = `${s.maxCoverage.toFixed(1)}%`;
    document.getElementById('ui-snake-dist')!.innerHTML = s.foodEaten > 0 ? `${(s.totalFoodSteps / s.foodEaten).toFixed(1)} <span class="trend neutral">steps</span>` : "0";

    // Phân bổ nguyên nhân chết
    const totalDeaths = s.deathWall + s.deathTail + s.deathStarve;
    if (totalDeaths > 0) {
        document.getElementById('bar-wall')!.style.width = `${(s.deathWall / totalDeaths) * 100}%`;
        document.getElementById('bar-tail')!.style.width = `${(s.deathTail / totalDeaths) * 100}%`;
        document.getElementById('bar-starve')!.style.width = `${(s.deathStarve / totalDeaths) * 100}%`;
        document.getElementById('txt-wall')!.innerText = s.deathWall.toString();
        document.getElementById('txt-tail')!.innerText = s.deathTail.toString();
        document.getElementById('txt-starve')!.innerText = s.deathStarve.toString();
    }

    // Phân bổ hướng di chuyển
    const totalDirs = s.dirUp + s.dirDown + s.dirLeft + s.dirRight;
    if (totalDirs > 0) {
        document.getElementById('bar-up')!.style.width = `${(s.dirUp / totalDirs) * 100}%`;
        document.getElementById('bar-down')!.style.width = `${(s.dirDown / totalDirs) * 100}%`;
        document.getElementById('bar-left')!.style.width = `${(s.dirLeft / totalDirs) * 100}%`;
        document.getElementById('bar-right')!.style.width = `${(s.dirRight / totalDirs) * 100}%`;
    }
}

// === QUẢN LÝ CHUYỂN TRANG ===
function showView(viewName: 'hub' | 'intro' | 'game' | 'snake' | 'stats') { 
    viewHub.classList.add('hidden'); 
    viewIntro.classList.add('hidden');
    viewGame.classList.add('hidden'); 
    viewSnake.classList.add('hidden'); 
    viewStats.classList.add('hidden');
    
    if (viewName === 'hub') viewHub.classList.remove('hidden');
    if (viewName === 'intro') viewIntro.classList.remove('hidden');
    if (viewName === 'game') viewGame.classList.remove('hidden');
    if (viewName === 'snake') viewSnake.classList.remove('hidden');
    if (viewName === 'stats') { viewStats.classList.remove('hidden'); refreshDashboard(); }
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