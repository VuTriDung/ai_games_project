import './style.css'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Key } from 'chessground/types'

// === CÁC THẺ HTML CẦN THIẾT ===
const viewHub = document.getElementById('view-hub')!;
const viewIntro = document.getElementById('view-intro')!;
const viewGame = document.getElementById('view-game')!;
const viewSnake = document.getElementById('view-snake')!; // Đã cập nhật
const boardEl = document.getElementById('board') as HTMLElement;
const aiChatText = document.getElementById('ai-chat-text')!;
const moveHistoryEl = document.getElementById('move-history')!;
const modalGameOver = document.getElementById('modal-game-over')!;

// === QUẢN LÝ CHUYỂN TRANG (ROUTER) ===
function showView(viewName: 'hub' | 'intro' | 'game' | 'snake') { // Thêm 'snake' vào Type
    viewHub.classList.add('hidden');
    viewIntro.classList.add('hidden');
    viewGame.classList.add('hidden');
    viewSnake.classList.add('hidden'); // Reset luôn Snake

    if (viewName === 'hub') viewHub.classList.remove('hidden');
    if (viewName === 'intro') viewIntro.classList.remove('hidden');
    if (viewName === 'game') viewGame.classList.remove('hidden');
    if (viewName === 'snake') viewSnake.classList.remove('hidden');
}

// ==========================================
// CODE DÀNH CHO GAME CỜ VUA (CHESS)
// ==========================================
const game = new Chess();
let ground: Api;
let isAiVsAi: boolean = false;

document.getElementById('card-chess')?.addEventListener('click', () => {
    document.getElementById('intro-title')!.innerText = "AI Chess Battle";
    document.getElementById('intro-desc')!.innerHTML = `
        Đây là đồ án mô phỏng trí tuệ nhân tạo qua cờ vua.<br><br>
        - <b>AI Trắng:</b> Cỗ máy Stockfish (Duyệt cây Minimax).<br>
        - <b>AI Đen:</b> Mạng Neural Đa Lớp (Học từ 500,000 ván cờ).<br><br>
        Bạn sẽ cầm quân Trắng. Nếu muốn xem 2 AI tự đấu, hãy bấm nút "AI tự đấu" trong màn hình chơi.
    `;
    showView('intro');
});

document.getElementById('btn-back-hub')?.addEventListener('click', () => showView('hub'));
document.getElementById('btn-start-game')?.addEventListener('click', () => {
    showView('game');
    resetGame();
});
document.getElementById('btn-exit-game')?.addEventListener('click', () => showView('hub'));

function getValidMoves() {
    const dests = new Map<Key, Key[]>();
    const SQUARES = [
        'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
        'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
        'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
        'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
        'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
        'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
        'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
        'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'
    ];
    SQUARES.forEach(sq => {
        const moves = game.moves({ square: sq as any, verbose: true }) as { to: string }[];
        if (moves.length > 0) dests.set(sq as Key, moves.map(m => m.to as Key));
    });
    return dests;
}

function initBoard() {
    ground = Chessground(boardEl, {
        movable: {
            color: 'white', free: false, dests: getValidMoves(),
            events: { after: onUserMove }
        }
    });
}

function renderHistory() {
    const history = game.history(); 
    let html = '';
    for (let i = 0; i < history.length; i += 2) {
        const turnNum = (i / 2) + 1;
        const whiteMove = history[i];
        const blackMove = history[i + 1] ? history[i + 1] : '';
        html += `
            <div class="history-row">
                <div class="turn-num">${turnNum}.</div>
                <div class="move-w">${whiteMove}</div>
                <div class="move-b">${blackMove}</div>
            </div>
        `;
    }
    moveHistoryEl.innerHTML = html;
    moveHistoryEl.scrollTop = moveHistoryEl.scrollHeight;
}

function checkGameOver() {
    if (game.isGameOver()) {
        ground.set({ movable: { color: undefined } });
        let resultMsg = "Hòa cờ!";
        if (game.isCheckmate()) {
            resultMsg = game.turn() === 'w' ? "Đen (AI Neural) Thắng!" : "Trắng (Stockfish) Thắng!";
        }
        document.getElementById('modal-result-desc')!.innerText = resultMsg;
        modalGameOver.classList.remove('hidden');
        return true;
    }
    return false;
}

const aiTaunts = [
    "Nước cờ thú vị đấy, nhưng tôi đã tính trước 500k ván rồi.",
    "Bạn học cờ ở Trái Đất à? Để tôi chỉ cho cách đánh...",
    "Hmm, mạng Neural của tôi báo tỉ lệ thắng của bạn đang giảm dần.",
    "Cố lên người Trái Đất!",
];

async function onUserMove(orig: Key, dest: Key) {
    game.move({ from: orig, to: dest, promotion: 'q' });
    renderHistory();
    if (checkGameOver()) return;

    aiChatText.innerText = "Đang xử lý dữ liệu ma trận...";
    ground.set({ movable: { color: undefined } }); 

    try {
        const res = await fetch('http://localhost:8000/play_ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fen: game.fen(), ai_color: 'black' })
        });
        const data = await res.json();
        
        if (data.move) {
            game.move(data.move, { sloppy: true } as any);
            ground.set({ fen: game.fen(), lastMove: [data.move.substring(0,2) as Key, data.move.substring(2,4) as Key] });
            renderHistory();
            aiChatText.innerText = aiTaunts[Math.floor(Math.random() * aiTaunts.length)];
        }
        if (!checkGameOver()) ground.set({ movable: { color: 'white', dests: getValidMoves() } });
    } catch (error) {
        aiChatText.innerText = "Lỗi kết nối tới Server AI!";
    }
}

function resetGame() {
    game.reset();
    isAiVsAi = false;
    ground.set({ fen: game.fen(), movable: { color: 'white', dests: getValidMoves() }, lastMove: undefined });
    renderHistory();
    aiChatText.innerText = "Xin chào! Bạn đi trước nhé (Quân Trắng).";
}

document.getElementById('btn-close-modal')?.addEventListener('click', () => {
    modalGameOver.classList.add('hidden');
    resetGame();
});

document.getElementById('btn-auto-ai')?.addEventListener('click', async () => {
    isAiVsAi = true;
    let currentColor = 'white';
    
    while (isAiVsAi && !game.isGameOver()) {
        aiChatText.innerText = `AI ${currentColor === 'white' ? 'Trắng (Stockfish)' : 'Đen (Neural)'} đang tính toán...`;
        
        try {
            const res = await fetch('http://localhost:8000/play_ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen: game.fen(), ai_color: currentColor })
            });
            const data = await res.json();
            
            if (data.move) {
                game.move(data.move, { sloppy: true } as any);
                ground.set({ fen: game.fen(), lastMove: [data.move.substring(0,2) as Key, data.move.substring(2,4) as Key] });
                renderHistory();
                currentColor = currentColor === 'white' ? 'black' : 'white';
                await new Promise(r => setTimeout(r, 600)); 
            } else break;
        } catch (error) { break; }
    }
    checkGameOver();
});

initBoard();


// ==========================================
// CODE DÀNH CHO GAME SNAKE (Q-LEARNING)
// ==========================================
const canvas = document.getElementById('snake-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreEl = document.getElementById('snake-score')!;
const snakeStatusEl = document.getElementById('snake-status')!;

const TILE = 25; 
const GRID_W = 500 / TILE; 
const GRID_H = 500 / TILE; 

let snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
let snakeDir = {x: 1, y: 0};
let food = {x: 15, y: 10};
let snakeScore = 0;
let snakeInterval: any = null;

// Routing đã được đồng bộ với showView
document.getElementById('card-snake')?.addEventListener('click', () => {
    showView('snake');
    drawSnake();
});
document.getElementById('btn-exit-snake')?.addEventListener('click', () => {
    showView('hub');
    clearInterval(snakeInterval);
});

function drawSnake() {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, 500, 500);
    
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(food.x*TILE + TILE/2, food.y*TILE + TILE/2, TILE/2 - 2, 0, Math.PI*2);
    ctx.fill();
    
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#27ae60' : '#2ecc71'; 
        ctx.fillRect(segment.x * TILE, segment.y * TILE, TILE-1, TILE-1);
    });
}

function spawnFood() {
    food = { x: Math.floor(Math.random() * GRID_W), y: Math.floor(Math.random() * GRID_H) };
}

function getSnakeState() {
    const head = snake[0];
    const pt_l = {x: head.x - 1, y: head.y};
    const pt_r = {x: head.x + 1, y: head.y};
    const pt_u = {x: head.x, y: head.y - 1};
    const pt_d = {x: head.x, y: head.y + 1};
    
    const dir_l = snakeDir.x === -1;
    const dir_r = snakeDir.x === 1;
    const dir_u = snakeDir.y === -1;
    const dir_d = snakeDir.y === 1;
    
    const isCol = (pt: any) => pt.x < 0 || pt.x >= GRID_W || pt.y < 0 || pt.y >= GRID_H || snake.some((s, i) => i !== 0 && s.x === pt.x && s.y === pt.y);
    
    const danger_s = (dir_r && isCol(pt_r)) || (dir_l && isCol(pt_l)) || (dir_u && isCol(pt_u)) || (dir_d && isCol(pt_d));
    const danger_r = (dir_u && isCol(pt_r)) || (dir_d && isCol(pt_l)) || (dir_l && isCol(pt_u)) || (dir_r && isCol(pt_d));
    const danger_l = (dir_d && isCol(pt_r)) || (dir_u && isCol(pt_l)) || (dir_r && isCol(pt_u)) || (dir_l && isCol(pt_d));
    
    return [
        danger_s?1:0, danger_r?1:0, danger_l?1:0,
        dir_l?1:0, dir_r?1:0, dir_u?1:0, dir_d?1:0,
        food.x < head.x?1:0, food.x > head.x?1:0,
        food.y < head.y?1:0, food.y > head.y?1:0
    ];
}

document.getElementById('btn-start-snake')?.addEventListener('click', () => {
    snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
    snakeDir = {x: 1, y: 0};
    snakeScore = 0;
    scoreEl.innerText = '0';
    spawnFood();
    
    clearInterval(snakeInterval);
    snakeStatusEl.innerText = "AI Đang chơi...";
    
    // Đếm số bước đi để kiểm tra đói trên UI luôn (Cho đồng bộ Backend)
    let stepsWithoutFood = 0;

    snakeInterval = setInterval(async () => {
        try {
            const res = await fetch('http://localhost:8000/play_snake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state_vector: getSnakeState(), current_dir: snakeDir })
            });
            
            const data = await res.json();
            snakeDir = data.new_dir; 
            
            const newHead = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };
            stepsWithoutFood++;
            
            // LUẬT 1: Đi 1 bước bị trừ 1 điểm (Không để điểm bị âm dưới 0 cho đẹp mắt)
            snakeScore = Math.max(0, snakeScore - 1);
            
            // LUẬT 2: Chết do đâm tường hoặc cắn đuôi
            if (newHead.x < 0 || newHead.x >= GRID_W || newHead.y < 0 || newHead.y >= GRID_H || snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
                clearInterval(snakeInterval);
                snakeStatusEl.innerText = "Game Over! Đâm tường chết.";
                return;
            }
            
            // LUẬT 3: Chết do đi lòng vòng quá lâu (150 bước * chiều dài con rắn)
            if (stepsWithoutFood > 150 * snake.length) {
                clearInterval(snakeInterval);
                snakeStatusEl.innerText = "Game Over! Chết đói do đi lòng vòng.";
                return;
            }
            
            snake.unshift(newHead);
            
            // LUẬT 4: Ăn mồi
            if (newHead.x === food.x && newHead.y === food.y) {
                // Cộng 101 điểm (để bù 1 điểm vừa bị trừ oan ở bước đi hiện tại) -> Thực nhận +100
                snakeScore += 101; 
                stepsWithoutFood = 0; // Reset đồng hồ đói
                scoreEl.innerText = snakeScore.toString();
                spawnFood();
            } else {
                snake.pop();
            }
            
            scoreEl.innerText = snakeScore.toString(); // Update UI điểm bị trừ
            drawSnake();
        } catch (error) {
            clearInterval(snakeInterval);
            snakeStatusEl.innerText = "Mất kết nối tới Server!";
        }
    }, 100); 
});