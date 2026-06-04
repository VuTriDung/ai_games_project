import './style.css'
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';    
import 'chessground/assets/chessground.cburnett.css';

import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'

interface ApiResponse {
    fen?: string;
    move?: string;
    game_over?: boolean;
    result?: string;
    error?: string;
}

const game = new Chess();
let ground: Api;
let isAiVsAi: boolean = false;

const statusEl = document.getElementById('status') as HTMLElement;
const boardEl = document.getElementById('board') as HTMLElement;

function getValidMoves() {
    const dests = new Map();
    game.board().forEach((row, rIdx) => {
        row.forEach((piece, cIdx) => {
            if (!piece) return;
            const square = String.fromCharCode(97 + cIdx) + (8 - rIdx) as any;
            const moves = game.moves({ square, verbose: true });
            if (moves.length) dests.set(square, moves.map(m => m.to));
        });
    });
    return dests;
}

function initBoard() {
    ground = Chessground(boardEl, {
        movable: {
            color: 'white',
            free: false,
            dests: getValidMoves(),
            events: { after: onUserMove }
        }
    });
}

async function onUserMove(orig: string, dest: string) {
    game.move({ from: orig, to: dest, promotion: 'q' });
    statusEl.innerText = "AI Đen đang suy nghĩ...";
    ground.set({ movable: { color: 'white', free: false, dests: new Map() } });

    try {
        const res = await fetch('http://localhost:8000/play_ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fen: game.fen(), ai_color: 'black' })
        });
        
        const data: ApiResponse = await res.json();
        
        if (data.move) {
            game.move(data.move, { sloppy: true } as any);
                ground.set({ 
                    fen: game.fen(),
                    // cast to any to satisfy chessground Key type
                    lastMove: [data.move.substring(0,2) as any, data.move.substring(2,4) as any]
                });
        }

        if (data.game_over || game.isGameOver()) {
            statusEl.innerText = "Ván cờ kết thúc!";
        } else {
            statusEl.innerText = "Lượt của bạn (Trắng)";
            ground.set({ movable: { color: 'white', dests: getValidMoves() } });
        }
    } catch (error) {
        console.error("Lỗi:", error);
        statusEl.innerText = "Chưa bật Server Python kìa!";
    }
}

document.getElementById('btnReset')?.addEventListener('click', () => {
    game.reset();
    isAiVsAi = false;
    ground.set({ fen: game.fen(), movable: { color: 'white', dests: getValidMoves() } });
    statusEl.innerText = "Lượt của bạn (Trắng)";
});

document.getElementById('btnAuto')?.addEventListener('click', async () => {
    isAiVsAi = true;
    let currentColor = 'white';
    
    while (isAiVsAi && !game.isGameOver()) {
        statusEl.innerText = `AI ${currentColor === 'white' ? 'Trắng' : 'Đen'} đang suy nghĩ...`;
        
        try {
            const res = await fetch('http://localhost:8000/play_ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen: game.fen(), ai_color: currentColor })
            });
            const data: ApiResponse = await res.json();
            
            if (data.move) {
                game.move(data.move, { sloppy: true } as any);
                ground.set({ 
                    fen: game.fen(),
                        // cast to any to satisfy chessground Key type
                        lastMove: [data.move.substring(0,2) as any, data.move.substring(2,4) as any]
                });
                currentColor = currentColor === 'white' ? 'black' : 'white';
                await new Promise(r => setTimeout(r, 500)); 
            } else {
                break;
            }
        } catch (error) {
            statusEl.innerText = "Lỗi kết nối AI Server!";
            break;
        }
    }
});

initBoard();