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
let snakeScore = 150;
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
    // (Code vẽ từng đốt thân rắn của bạn giữ nguyên)
    ctx.fillStyle = index === 0 ? "#00f3ff" : "rgba(0, 243, 255, 0.7)";
    ctx.fillRect(segment.x * 25 + 1, segment.y * 25 + 1, 23, 23);
  });

  // ==========================================
  // THÊM 3 DÒNG NÀY ĐỂ IN ĐIỂM THỂ LỰC LÊN GÓC TRÁI MÀN HÌNH
  // ==========================================
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; // Màu chữ trắng mờ mờ
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`Thể lực: ${snakeScore}`, 10, 25);
}

// Hàm tạo táo đảm bảo KHÔNG bao giờ đè lên thân rắn
function spawnFood(): { x: number; y: number } {
  // Khởi tạo giá trị mặc định để TypeScript không báo lỗi 'undefined'
  let newFood = { x: 0, y: 0 };
  let isOnSnake = true;

  while (isOnSnake) {
    newFood = {
      x: Math.floor(Math.random() * 20),
      y: Math.floor(Math.random() * 20),
    };
    // Kiểm tra xem tọa độ mới có nằm trên bất kỳ đốt nào của rắn không
    isOnSnake = snake.some((s) => s.x === newFood.x && s.y === newFood.y);
  }

  return newFood;
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
    (snakeDir.x === 1 && isCol({ x: head.x + 1, y: head.y })) ||
    (snakeDir.x === -1 && isCol({ x: head.x - 1, y: head.y })) ||
    (snakeDir.y === -1 && isCol({ x: head.x, y: head.y - 1 })) ||
    (snakeDir.y === 1 && isCol({ x: head.x, y: head.y + 1 }))
      ? 1
      : 0,
    (snakeDir.y === -1 && isCol({ x: head.x + 1, y: head.y })) ||
    (snakeDir.y === 1 && isCol({ x: head.x - 1, y: head.y })) ||
    (snakeDir.x === -1 && isCol({ x: head.x, y: head.y - 1 })) ||
    (snakeDir.x === 1 && isCol({ x: head.x, y: head.y + 1 }))
      ? 1
      : 0,
    (snakeDir.y === 1 && isCol({ x: head.x + 1, y: head.y })) ||
    (snakeDir.y === -1 && isCol({ x: head.x - 1, y: head.y })) ||
    (snakeDir.x === 1 && isCol({ x: head.x, y: head.y - 1 })) ||
    (snakeDir.x === -1 && isCol({ x: head.x, y: head.y + 1 }))
      ? 1
      : 0,
    snakeDir.x === -1 ? 1 : 0,
    snakeDir.x === 1 ? 1 : 0,
    snakeDir.y === -1 ? 1 : 0,
    snakeDir.y === 1 ? 1 : 0,
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
  snakeScore = 150;
  food = spawnFood();

  clearInterval(snakeInterval);
  document.getElementById("snake-status")!.innerText = "AI Running...";

  let stepsWithoutFood = 0;

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
      stepsWithoutFood++;
      realStats.snake.totalFoodSteps++;
      realStats.snake.totalSteps++;

      // Khởi tạo thông số AI mô phỏng
      realStats.snake.tdError = Math.random() * 0.1;
      realStats.snake.avgMaxQ = 40 + Math.random() * 20;
      realStats.snake.heuristicRewardShape = Math.random() * 2 - 1;

      const coverage = (snake.length / TOTAL_TILES) * 100;
      if (coverage > realStats.snake.maxCoverage)
        realStats.snake.maxCoverage = coverage;

      // 1. TRỪ ĐIỂM THỂ LỰC MỖI BƯỚC ĐI (-1)
      snakeScore -= 1;

      document.getElementById("snake-status")!.innerText =
        `AI Running... Thể lực: ${snakeScore}`;
      // 2. KIỂM TRA CÁC ĐIỀU KIỆN CHẾT
      // Chết do hết điểm (chết đói)
      if (snakeScore <= 0) {
        realStats.snake.deathStarve++;
        endSnakeGame("Chết: Bị đói (Hết điểm)");
        return;
      }
      // Chết đâm tường
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
      // Chết cắn đuôi
      if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        realStats.snake.deathTail++;
        endSnakeGame("Chết: Cắn đuôi");
        return;
      }

      snake.unshift(newHead);

      // 3. KHI ĂN TÁO ĐƯỢC THƯỞNG ĐIỂM
      if (newHead.x === food.x && newHead.y === food.y) {
        snakeScore += 100; // Cộng thêm 100 điểm để kéo dài sự sống
        realStats.snake.foodEaten++;
        food = spawnFood();
      } else {
        snake.pop(); // Chỉ xóa đuôi nếu không ăn táo
      }

      drawSnake();
    } catch (error) {
      clearInterval(snakeInterval);
      document.getElementById("snake-status")!.innerText = "Lỗi kết nối API";
    }
  }, 60);
});
