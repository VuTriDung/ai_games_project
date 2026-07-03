import { showView } from '../main';
import { realStats } from '../dashboard';

const canvas = document.getElementById('snake-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const TOTAL_TILES = 400;

let snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}];
let snakeDir = {x: 1, y: 0}; 
let food = {x: 15, y: 10}; 
let snakeScore = 0; 
let snakeInterval: any = null;

document.getElementById('card-snake')?.addEventListener('click', () => { showView('snake'); drawSnake(); });
document.getElementById('btn-exit-snake')?.addEventListener('click', () => { showView('hub'); clearInterval(snakeInterval); });

function drawSnake() {
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, 500, 500); // Nền đen Cyberpunk
    ctx.fillStyle = '#ff007f'; ctx.beginPath(); ctx.arc(food.x*25 + 12.5, food.y*25 + 12.5, 10.5, 0, Math.PI*2); ctx.fill(); // Táo Hồng Neon
    snake.forEach((segment, index) => { 
        ctx.fillStyle = index === 0 ? '#00f3ff' : 'rgba(0, 243, 255, 0.7)'; // Rắn Cyan Neon
        ctx.fillRect(segment.x * 25, segment.y * 25, 24, 24); 
    });
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
    clearInterval(snakeInterval); 
    document.getElementById('snake-status')!.innerText = reason;
    realStats.snake.games++; 
    realStats.snake.totalScore += snakeScore;
    if (snakeScore > realStats.snake.bestScore) { 
        realStats.snake.bestScore = snakeScore; 
        document.getElementById('snake-max-ui')!.innerText = snakeScore.toString(); 
    }
}

document.getElementById('btn-start-snake')?.addEventListener('click', () => {
    snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}]; snakeDir = {x: 1, y: 0}; snakeScore = 0; spawnFood();
    clearInterval(snakeInterval); document.getElementById('snake-status')!.innerText = "AI Running...";
    let stepsWithoutFood = 0;

    snakeInterval = setInterval(async () => {
        try {
            // Thay link này bằng link Backend Render của bạn
            const res = await fetch('https://ai-arcade-backend.onrender.com/play_snake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state_vector: getSnakeState(), current_dir: snakeDir }) });
            snakeDir = (await res.json()).new_dir; 
            
            if (snakeDir.y === -1) realStats.snake.dirUp++; else if (snakeDir.y === 1) realStats.snake.dirDown++; else if (snakeDir.x === -1) realStats.snake.dirLeft++; else realStats.snake.dirRight++;
            
            const newHead = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };
            stepsWithoutFood++; 
            realStats.snake.totalFoodSteps++;
            realStats.snake.totalSteps++; // Cập nhật tổng bước đi
            
            // Khởi tạo thông số AI mô phỏng
            realStats.snake.tdError = Math.random() * 0.1;
            realStats.snake.avgMaxQ = 40 + Math.random() * 20;
            realStats.snake.heuristicRewardShape = (Math.random() * 2) - 1;

            const coverage = (snake.length / TOTAL_TILES) * 100;
            if (coverage > realStats.snake.maxCoverage) realStats.snake.maxCoverage = coverage;
            
            if (newHead.x < 0 || newHead.x >= 20 || newHead.y < 0 || newHead.y >= 20) { realStats.snake.deathWall++; endSnakeGame("Chết: Đâm tường"); return; }
            if (snake.some(s => s.x === newHead.x && s.y === newHead.y)) { realStats.snake.deathTail++; endSnakeGame("Chết: Cắn đuôi"); return; }
            if (stepsWithoutFood > 150 * snake.length) { realStats.snake.deathStarve++; endSnakeGame("Chết: Bị đói"); return; }
            
            snake.unshift(newHead);
            if (newHead.x === food.x && newHead.y === food.y) {
                snakeScore += 100; stepsWithoutFood = 0; realStats.snake.foodEaten++;
                document.getElementById('snake-score')!.innerText = snakeScore.toString(); spawnFood();
            } else { snake.pop(); }
            
            drawSnake();
        } catch (error) { clearInterval(snakeInterval); document.getElementById('snake-status')!.innerText = "Lỗi kết nối API"; }
    }, 60); 
});