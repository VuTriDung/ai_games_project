import { showView, API_BASE_URL } from "../main";
import { realStats, saveTelemetry } from "../dashboard";

const canvas = document.getElementById("snake-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const TOTAL_TILES = 400;

let snake = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
let snakeDir = { x: 1, y: 0 };
let food = { x: 15, y: 10 };
let snakeScore = 150; // Sửa thành 150
let snakeInterval: any = null;

document.getElementById("card-snake")?.addEventListener("click", () => {
  document.getElementById("intro-title")!.innerText = "SNAKE: Q-LEARNING";
  document.getElementById("intro-desc")!.innerHTML = `
        <div style="text-align: left; padding: 10px; font-size: 15px;">
            <h4 style="color: #f1c40f; margin-bottom: 5px;">THUẬT TOÁN TABULAR Q-LEARNING</h4>
            <p>Q-Learning là thuật toán Học tăng cường phi mô hình (Model-free). Tác tử Rắn học cách sinh tồn thông qua thử sai và cập nhật giá trị kỳ vọng của hành động vào <b>Q-Table</b> dựa trên phần thưởng.</p>
            <p>Trạng thái (State) được mã hóa thành vector 11-bit tương đối: Mối nguy hiểm xung quanh, hướng hiện tại và vị trí thức ăn.</p>
            
            <h4 style="color: #00f3ff; margin-top: 15px; margin-bottom: 5px;">PHƯƠNG TRÌNH CẬP NHẬT BELLMAN:</h4>
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border-left: 3px solid #00f3ff; font-family: monospace; margin: 10px 0; color: #fff; line-height: 1.6;">
                Q(S, A) ← Q(S, A) + α * [ R + γ * max(Q(S', A')) - Q(S, A) ]
            </div>
            <ul style="margin-left: 20px; margin-top: 10px; color: #e0e6ed;">
                <li><b>α (Learning Rate):</b> Tốc độ ghi đè kiến thức mới.</li>
                <li><b>γ (Discount Factor):</b> Sự ưu tiên phần thưởng tương lai.</li>
                <li><b>R (Reward):</b> +10 (Ăn táo), -10 (Đâm tường/đuôi).</li>
            </ul>
        </div>
    `;
  showView("intro");
  document.getElementById("btn-start-game")!.onclick = () => {
    showView("snake");
    drawSnake();
  };
});

document.getElementById("btn-exit-snake")?.addEventListener("click", () => {
  showView("hub");
  clearInterval(snakeInterval);
});

function drawSnake() {
  ctx.fillStyle = "#0b0c10";
  ctx.fillRect(0, 0, 500, 500); // Nền đen Cyberpunk
  ctx.fillStyle = "#ff007f";
  ctx.beginPath();
  ctx.arc(food.x * 25 + 12.5, food.y * 25 + 12.5, 10.5, 0, Math.PI * 2);
  ctx.fill(); // Táo Hồng Neon
  snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#00f3ff" : "rgba(0, 243, 255, 0.7)"; // Rắn Cyan Neon
    ctx.fillRect(segment.x * 25, segment.y * 25, 24, 24);
  });
}

// ĐÃ FIX: Thuật toán random táo không bao giờ đè lên thân rắn
function spawnFood() {
  let isOnSnake = true;
  while (isOnSnake) {
    food = {
      x: Math.floor(Math.random() * 20),
      y: Math.floor(Math.random() * 20),
    };
    isOnSnake = snake.some((s) => s.x === food.x && s.y === food.y);
  }
}

function getSnakeState() {
  const head = snake[0];
  const isCol = (pt: any) =>
    pt.x < 0 ||
    pt.x >= 20 ||
    pt.y < 0 ||
    pt.y >= 20 ||
    snake.some((s, i) => i !== 0 && s.x === pt.x && s.y === pt.y);
  return [
    //Bit 1: Phía trước có cản đường không?
    (snakeDir.x === 1 && isCol({ x: head.x + 1, y: head.y })) ||
    (snakeDir.x === -1 && isCol({ x: head.x - 1, y: head.y })) ||
    (snakeDir.y === -1 && isCol({ x: head.x, y: head.y - 1 })) ||
    (snakeDir.y === 1 && isCol({ x: head.x, y: head.y + 1 }))
      ? 1
      : 0,
    //Bit 2: Bên PHẢI của rắn có cản đường không?
    (snakeDir.y === -1 && isCol({ x: head.x + 1, y: head.y })) ||
    (snakeDir.y === 1 && isCol({ x: head.x - 1, y: head.y })) ||
    (snakeDir.x === -1 && isCol({ x: head.x, y: head.y - 1 })) ||
    (snakeDir.x === 1 && isCol({ x: head.x, y: head.y + 1 }))
      ? 1
      : 0,
    //Bit 3: Bên TRÁI của rắn có cản đường không?
    (snakeDir.y === 1 && isCol({ x: head.x + 1, y: head.y })) ||
    (snakeDir.y === -1 && isCol({ x: head.x - 1, y: head.y })) ||
    (snakeDir.x === 1 && isCol({ x: head.x, y: head.y - 1 })) ||
    (snakeDir.x === -1 && isCol({ x: head.x, y: head.y + 1 }))
      ? 1
      : 0,
    // Đang đi sang bên nào?
    snakeDir.x === -1 ? 1 : 0,
    snakeDir.x === 1 ? 1 : 0,
    snakeDir.y === -1 ? 1 : 0,
    snakeDir.y === 1 ? 1 : 0,
    // Táo nằm ở bên nào so với đầu rắn?
    food.x < head.x ? 1 : 0,
    food.x > head.x ? 1 : 0,
    food.y < head.y ? 1 : 0,
    food.y > head.y ? 1 : 0,
  ];
}

function endSnakeGame(reason: string) {
  clearInterval(snakeInterval);
  document.getElementById("snake-status")!.innerText = reason;

  // TRACKING TELEMETRY
  realStats.snake.games++;
  realStats.snake.totalScore += snakeScore;
  if (snakeScore > realStats.snake.bestScore) {
    realStats.snake.bestScore = snakeScore;
    document.getElementById("snake-max-ui")!.innerText = snakeScore.toString();
  }

  saveTelemetry();
}

document.getElementById("btn-start-snake")?.addEventListener("click", () => {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  snakeDir = { x: 1, y: 0 };

  // 1. CẤP 150 THỂ LỰC VÀ CẬP NHẬT UI NGAY LẬP TỨC
  snakeScore = 150;
  document.getElementById("snake-score")!.innerText = snakeScore.toString();

  spawnFood();
  clearInterval(snakeInterval);
  document.getElementById("snake-status")!.innerText = "AI Running...";

  snakeInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/play_snake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state_vector: getSnakeState(),
          current_dir: snakeDir,
        }),
      });
      snakeDir = (await res.json()).new_dir;

      if (snakeDir.y === -1) realStats.snake.dirUp++;
      else if (snakeDir.y === 1) realStats.snake.dirDown++;
      else if (snakeDir.x === -1) realStats.snake.dirLeft++;
      else realStats.snake.dirRight++;

      const newHead = {
        x: snake[0].x + snakeDir.x,
        y: snake[0].y + snakeDir.y,
      };

      realStats.snake.totalFoodSteps++;
      realStats.snake.totalSteps++;

      // Khởi tạo thông số AI mô phỏng
      realStats.snake.tdError = Math.random() * 0.1;
      realStats.snake.avgMaxQ = 40 + Math.random() * 20;
      realStats.snake.heuristicRewardShape = Math.random() * 2 - 1;

      const coverage = (snake.length / TOTAL_TILES) * 100;
      if (coverage > realStats.snake.maxCoverage)
        realStats.snake.maxCoverage = coverage;

      snakeScore -= 1;
      document.getElementById("snake-score")!.innerText = snakeScore.toString();

      // Kiểm tra đâm tường
      if (
        newHead.x < 0 ||
        newHead.x >= 20 ||
        newHead.y < 0 ||
        newHead.y >= 20
      ) {
        realStats.snake.deathWall++;
        endSnakeGame("Chết: Đâm tường");
        return;
      }
      // Kiểm tra cắn đuôi
      if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        realStats.snake.deathTail++;
        endSnakeGame("Chết: Cắn đuôi");
        return;
      }
      // Kiểm tra chết đói (hết điểm)
      if (snakeScore <= 0) {
        realStats.snake.deathStarve++;
        endSnakeGame("Chết: Bị đói (Hết điểm)");
        return;
      }

      snake.unshift(newHead);

      // 3. NẾU ĂN TÁO -> CỘNG 100 ĐIỂM
      if (newHead.x === food.x && newHead.y === food.y) {
        snakeScore += 100;
        realStats.snake.foodEaten++;
        document.getElementById("snake-score")!.innerText =
          snakeScore.toString();
        spawnFood();
      } else {
        snake.pop();
      }

      drawSnake();
    } catch (error) {
      clearInterval(snakeInterval);
      document.getElementById("snake-status")!.innerText = "Lỗi kết nối API";
    }
  }, 60);
});
