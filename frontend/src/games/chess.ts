import { showView } from '../main';
import { realStats } from '../dashboard';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';

const boardEl = document.getElementById('board') as HTMLElement;
const aiChatText = document.getElementById('ai-chat-text')!;
const moveHistoryEl = document.getElementById('move-history')!;
const modalGameOver = document.getElementById('modal-game-over')!;

const game = new Chess();
let ground: Api;
let isAiVsAi: boolean = false;

document.getElementById('card-chess')?.addEventListener('click', () => {
    document.getElementById('intro-title')!.innerText = "AI Chess Battle";
    document.getElementById('intro-desc')!.innerHTML = `- <b>AI Trắng:</b> Thuật toán duyệt cây Alpha-Beta (Minimax).<br>- <b>AI Đen:</b> Mạng Nơ-ron Đa Lớp (MLP Regressor).`;
    showView('intro');
});

document.getElementById('btn-start-game')?.addEventListener('click', () => { 
    showView('game'); 
    if (!ground) initBoard(); 
    resetGame(); 
});

document.getElementById('btn-exit-game')?.addEventListener('click', () => { 
    isAiVsAi = false; 
    showView('hub'); 
});

function getValidMoves() {
    const dests = new Map<Key, Key[]>();
    const SQUARES = ['a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', 'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', 'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6', 'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', 'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', 'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', 'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', 'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'];
    SQUARES.forEach(sq => { 
        const moves = game.moves({ square: sq as any, verbose: true }) as { to: string }[]; 
        if (moves.length > 0) dests.set(sq as Key, moves.map(m => m.to as Key)); 
    });
    return dests;
}

function initBoard() { 
    ground = Chessground(boardEl, { movable: { color: 'white', free: false, dests: getValidMoves(), events: { after: onUserMove } } }); 
}

function renderHistory() {
    const history = game.history(); 
    let html = '';
    for (let i = 0; i < history.length; i += 2) { 
        html += `<div class="history-row"><div class="turn-num">${(i/2)+1}.</div><div class="move-w">${history[i]}</div><div class="move-b">${history[i+1]||''}</div></div>`; 
    }
    moveHistoryEl.innerHTML = html; 
    moveHistoryEl.scrollTop = moveHistoryEl.scrollHeight;
}

function checkGameOver() {
    if (game.isGameOver()) {
        ground.set({ movable: { color: undefined } });
        let resultMsg = "Hòa cờ!";
        if (game.isCheckmate()) {
            if (game.turn() === 'w') { resultMsg = "Đen (Neural) Thắng!"; realStats.chess.wins++; } 
            else { resultMsg = "Trắng Thắng!"; realStats.chess.losses++; }
        } else { realStats.chess.draws++; }
        document.getElementById('modal-result-desc')!.innerText = resultMsg; 
        modalGameOver.classList.remove('hidden'); 
        return true;
    }
    return false;
}

async function onUserMove(orig: Key, dest: Key) {
    game.move({ from: orig, to: dest, promotion: 'q' }); 
    renderHistory(); 
    if (checkGameOver()) return;
    
    aiChatText.innerText = "Mạng Neural đang tính..."; 
    ground.set({ movable: { color: undefined } }); 
    
    try {
        const res = await fetch('http://localhost:8000/play_ai', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ fen: game.fen(), ai_color: 'black' }) 
        });
        const data = await res.json();
        if (data.move) {
            realStats.chess.movesCount++; 
            realStats.chess.totalInfTime += data.inference_time_ms;
            game.move(data.move, { sloppy: true } as any); 
            ground.set({ fen: game.fen(), lastMove: [data.move.substring(0,2) as Key, data.move.substring(2,4) as Key] });
            renderHistory(); 
            aiChatText.innerText = `Inference latency: ${data.inference_time_ms} ms.`;
        }
        if (!checkGameOver()) ground.set({ movable: { color: 'white', dests: getValidMoves() } });
    } catch (error) { aiChatText.innerText = "Lỗi kết nối Server!"; }
}

function resetGame() { 
    game.reset(); 
    isAiVsAi = false; 
    ground.set({ fen: game.fen(), movable: { color: 'white', dests: getValidMoves() }, lastMove: undefined }); 
    renderHistory(); 
    aiChatText.innerText = "Bạn cầm quân Trắng, đi trước."; 
}

document.getElementById('btn-close-modal')?.addEventListener('click', () => { modalGameOver.classList.add('hidden'); resetGame(); });
document.getElementById('btn-dismiss-modal')?.addEventListener('click', () => { modalGameOver.classList.add('hidden'); showView('hub'); });

document.getElementById('btn-auto-ai')?.addEventListener('click', async () => {
    isAiVsAi = true; 
    let currentColor = 'white';
    while (isAiVsAi && !game.isGameOver()) {
        aiChatText.innerText = `AI ${currentColor} đang suy nghĩ...`;
        try {
            const res = await fetch('http://localhost:8000/play_ai', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ fen: game.fen(), ai_color: currentColor }) 
            });
            const data = await res.json();
            if (data.move) {
                if (currentColor === 'black') { 
                    realStats.chess.movesCount++; 
                    realStats.chess.totalInfTime += data.inference_time_ms; 
                }
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