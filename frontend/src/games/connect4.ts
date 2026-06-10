//TODO: Code game Connect 4 ở đây, ở đây mới chỉ là giao diện thôi

import { showView } from '../main';

document.getElementById('card-connect4')?.addEventListener('click', () => {
    showView('connect4');
    drawConnect4Grid();
});

const canvas = document.getElementById('connect4-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// UI Vẽ bảng Connect 4 cơ bản (7 cột x 6 hàng)
function drawConnect4Grid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2980b9'; // Màu xanh bảng
    ctx.fillRect(0, 0, 490, 420);
    
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            ctx.beginPath();
            ctx.arc(c * 70 + 35, r * 70 + 35, 25, 0, 2 * Math.PI);
            ctx.fillStyle = '#34495e'; // Lỗ hổng (Trống)
            ctx.fill();
        }
    }
}

document.getElementById('btn-start-connect4')?.addEventListener('click', () => {
    document.getElementById('connect4-status')!.innerText = "Chờ đồng đội code MCTS...";
});