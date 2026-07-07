import { showView, API_BASE_URL } from '../main';
import { realStats, saveTelemetry } from '../dashboard';

// ============================================================
//  FLAPPY BIRD — GENETIC ALGORITHM
// ============================================================

// ── Helpers ──────────────────────────────────────────────────
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Config ───────────────────────────────────────────────────
interface Config {
  population:   number;
  mutationRate: number;
  speed:        number;
  eliteRatio:   number;
}

const cfg: Config = {
  population:   100, 
  mutationRate: 0.15,
  speed:        2,
  eliteRatio:   0.2,
};

async function saveFlappyWeights(weights: number[], generation: number, bestScore: number, allTimeBest: number): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/flappy/model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weights,
        generation,
        best_score: bestScore,
        all_time_best: allTimeBest,
      }),
    });
  } catch {
    // Bỏ qua lỗi lưu nếu backend chưa chạy
  }
}

// ── Constants ────────────────────────────────────────────────
const W        = 400;
const H        = 500;
const BIRD_X   = 110;
const BIRD_R   = 13;
const GRAVITY  = 0.40;
const JUMP     = -6.8;
const PIPE_W   = 54;
const GAP      = 130;
const PIPE_SPD = 2.3;

// ── NeuralNet ─────────────────────────────────────────────────
class NeuralNet {
  w: number[];

  constructor(weights?: number[]) {
    this.w = weights ? [...weights] : Array.from({ length: 6 }, () => randn() * 1.5);
  }

  forward(dy: number, dist: number, vel: number, gapCenter: number): boolean {
    return (
      this.w[0] * dy +
      this.w[1] * dist +
      this.w[2] * vel +
      this.w[3] +
      this.w[4] * gapCenter +
      this.w[5] * vel * vel * Math.sign(vel)
    ) > 0;
  }

  mutate(rate: number): NeuralNet {
    return new NeuralNet(this.w.map(x => (Math.random() < rate ? x + randn() * 0.5 : x)));
  }

  clone(): NeuralNet { return new NeuralNet(this.w); }
}

// ── Pipe ──────────────────────────────────────────────────────
class Pipe {
  x: number;
  gapY: number;

  constructor(x: number) {
    this.x    = x;
    this.gapY = 55 + Math.random() * (H - GAP - 110);
  }

  update(): void { this.x -= PIPE_SPD; }

  offScreen(): boolean { return this.x + PIPE_W < 0; }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, gapY } = this;

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 4, 0,         PIPE_W, gapY);
    ctx.fillRect(x + 4, gapY + GAP, PIPE_W, H - gapY - GAP);

    const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    g.addColorStop(0,   '#4caf50');
    g.addColorStop(0.4, '#66bb6a');
    g.addColorStop(1,   '#2e7d32');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0,         PIPE_W, gapY);
    ctx.fillRect(x, gapY + GAP, PIPE_W, H - gapY - GAP);

    ctx.fillStyle = '#388e3c';
    ctx.fillRect(x - 5, gapY - 18,       PIPE_W + 10, 20);
    ctx.fillRect(x - 5, gapY + GAP - 2,  PIPE_W + 10, 20);

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 6, 0,         8, gapY);
    ctx.fillRect(x + 6, gapY + GAP, 8, H - gapY - GAP);
  }
}

// ── Bird ──────────────────────────────────────────────────────
class Bird {
  y       = H / 2;
  vy      = -2;
  alive   = true;
  score   = 0;
  fitness = 0;
  angle   = 0;
  wingAnim = 0;
  color: string;
  net: NeuralNet;

  constructor(net?: NeuralNet) {
    this.net   = net ?? new NeuralNet();
    const hue  = Math.floor(Math.random() * 360);
    this.color = `hsl(${hue},70%,60%)`;
  }

  reset(): void {
    this.y = H / 2; this.vy = -2; this.alive = true;
    this.score = 0; this.fitness = 0; this.angle = 0; this.wingAnim = 0;
  }

  update(pipes: Pipe[]): void {
    if (!this.alive) return;

    this.vy += GRAVITY;
    this.y  += this.vy;
    this.angle    = Math.max(-25, Math.min(70, this.vy * 4));
    this.wingAnim++;

    if (this.y - BIRD_R < 0 || this.y + BIRD_R > H) { this.alive = false; return; }

    let near: Pipe | null = null;
    let nearDist = Infinity;
    for (const p of pipes) {
      const dx = (p.x + PIPE_W) - BIRD_X;
      if (dx > -BIRD_R && dx < nearDist) { nearDist = dx; near = p; }
    }

    if (near) {
      const gc = near.gapY + GAP / 2;
      if (this.net.forward((this.y - gc) / H, nearDist / W, this.vy / 10, gc / H)) {
        this.vy = JUMP;
      }
      if (BIRD_X + BIRD_R > near.x && BIRD_X - BIRD_R < near.x + PIPE_W) {
        if (this.y - BIRD_R < near.gapY || this.y + BIRD_R > near.gapY + GAP) {
          this.alive = false; return;
        }
      }
    }

    this.score++;
    this.fitness = this.score;

    if (this.score > 40000) {
        this.alive = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(BIRD_X, this.y);
    ctx.rotate((this.angle * Math.PI) / 180);

    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.ellipse(0, 0, BIRD_R, BIRD_R - 2, 0, 0, Math.PI * 2); ctx.fill();

    const wf = Math.sin(this.wingAnim * 0.25) * 5;
    ctx.beginPath(); ctx.ellipse(-4, wf, 9, 5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(5, -3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(6, -3, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.moveTo(BIRD_R - 1, 0); ctx.lineTo(BIRD_R + 8, 2); ctx.lineTo(BIRD_R - 1, 5);
    ctx.closePath(); ctx.fill();

    ctx.restore();
  }
}

// ── Genetic Algorithm ─────────────────────────────────────────
function evolvePopulation(birds: Bird[]): NeuralNet[] {
  const sorted = [...birds].sort((a, b) => b.fitness - a.fitness);
  const topN   = Math.max(2, Math.floor(sorted.length * cfg.eliteRatio));
  const elites = sorted.slice(0, topN);

  const next: NeuralNet[] = [elites[0].net.clone()];
  while (next.length < cfg.population) {
    const parent = elites[Math.floor(Math.random() * elites.length)];
    next.push(parent.net.mutate(cfg.mutationRate));
  }
  return next;
}

// ── Background ────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D): void {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#87ceeb'); sky.addColorStop(1, '#d4eeff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  const clouds: [number, number, number, number][] = [
    [70, 55, 70, 20], [220, 35, 55, 15], [420, 65, 80, 22], [580, 45, 60, 18],
  ];
  for (const [cx, cy, rw, rh] of clouds) {
    ctx.beginPath(); ctx.ellipse(cx,      cy,      rw,       rh,       0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 24, cy - 10, rw * 0.6, rh * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - 20, cy - 6,  rw * 0.5, rh * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = '#5d8a3c'; ctx.fillRect(0, H - 20, W, 20);
  ctx.fillStyle = '#7ab648'; ctx.fillRect(0, H - 20, W, 6);
}

// ── Main entry ────────────────────────────────────────────────
export function startFlappyGA(
  canvasId: string,
  onLog?:   (msg: string) => void,
  onStats?: (s: { generation: number; alive: number; best: number; allTimeBest: number }) => void,
  initialNets?: NeuralNet[] | null,
  initialAllTimeBest?: number
): () => Promise<void> {

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) throw new Error(`Canvas #${canvasId} không tìm thấy`);
  const ctx = canvas.getContext('2d')!;
  canvas.width  = W;
  canvas.height = H;

  let generation  = 1;
  let allTimeBest = initialAllTimeBest || 0;
  let running     = true;
  let animId      = 0;
  let frame       = 0;
  let bestScore   = 0;
  let birds: Bird[] = [];
  let pipes: Pipe[] = [];

  function log(msg: string): void { onLog?.(msg); }

  function initPop(nets?: NeuralNet[]): void {
    birds = [];
    if (nets?.length) {
      for (let i = 0; i < cfg.population; i++)
        birds.push(new Bird(nets[i % nets.length].mutate(cfg.mutationRate)));
      birds[0] = new Bird(nets[0].clone());
    } else {
      for (let i = 0; i < cfg.population; i++) birds.push(new Bird());
    }
    for (const b of birds) b.reset();
    pipes     = [new Pipe(W + 60), new Pipe(W + 320), new Pipe(W + 580)];
    frame     = 0;
    bestScore = 0;
  }

  function doEvolve(): void {
    const sorted  = [...birds].sort((a, b) => b.fitness - a.fitness);
    const bestBird = sorted[0];
    const best    = bestBird.fitness;
    const avg     = Math.round(birds.reduce((s, b) => s + b.fitness, 0) / birds.length);

    const prevAvg = realStats.flappy.overallAvg || 0;
    realStats.flappy.overallAvg = prevAvg + (avg - prevAvg) / generation;

    realStats.flappy.generations = generation;
    realStats.flappy.bestScore = best;
    realStats.flappy.avgGenScore = avg;
    realStats.flappy.survivalTime = +(frame / 60).toFixed(1);

    if (best > allTimeBest) {
      allTimeBest = best;
      log(`🏆 Gen ${generation} → best=${best} | avg=${avg}`);
      void saveFlappyWeights(bestBird.net.w, generation, best, allTimeBest);
    } else {
      log(`⚡ Gen ${generation} → best=${best} | avg=${avg}`);
    }
    
    realStats.flappy.allTimeBest = allTimeBest;

    if (!realStats.flappy.history) realStats.flappy.history = [];
    realStats.flappy.history.push({ gen: generation, best: best, avg: avg });
    if (realStats.flappy.history.length > 10) {
        realStats.flappy.history.shift(); 
    }

    saveTelemetry(); // Lưu lên JSON khi thế hệ CHẾT THẬT SỰ

    const nets = evolvePopulation(birds);
    generation++;
    initPop(nets);
  }

  function tick(): void {
    frame++;

    if (pipes.length < 4) {
      const lastX = Math.max(...pipes.map(p => p.x));
      if (lastX < W + 200) pipes.push(new Pipe(lastX + 250 + Math.random() * 80));
    }

    pipes = pipes.filter(p => { p.update(); return !p.offScreen(); });

    let alive = 0;
    for (const b of birds) {
      b.update(pipes);
      if (b.alive) { alive++; if (b.score > bestScore) bestScore = b.score; }
    }

    onStats?.({ generation, alive, best: bestScore, allTimeBest });
    if (alive === 0) void doEvolve();
  }

  function loop(): void {
    if (running) for (let i = 0; i < cfg.speed; i++) tick();

    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx);
    for (const p of pipes) p.draw(ctx);
    for (const b of birds) b.draw(ctx);

    const alive = birds.filter(b => b.alive).length;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(6, 6, 360, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`Gen ${generation}  |  Alive: ${alive}/${cfg.population}  |  Score: ${bestScore}  |  Best: ${allTimeBest}`, 12, 24);

    animId = requestAnimationFrame(loop);
  }

  if (initialNets && initialNets.length > 0) {
    initPop(initialNets);
    log('💾 Dùng dữ liệu đã lưu để tiếp tục tiến hóa');
  } else {
    initPop();
    log('🎮 Bắt đầu bằng mạng ngẫu nhiên...');
  }
  loop();

  // FIX LỖI ĐỒNG BỘ: Chuyển hàm cleanup thành async để đợi quá trình POST dữ liệu hoàn tất
  return async () => {
    running = false;
    const sorted = [...birds].sort((a, b) => b.fitness - a.fitness);
    
    if (sorted.length > 0 && frame > 0) {
        const bestBird = sorted[0];
        const best = bestBird.fitness;

        if (best > allTimeBest) {
            allTimeBest = best;
            void saveFlappyWeights(bestBird.net.w, generation, best, best);
            realStats.flappy.allTimeBest = allTimeBest;
            realStats.flappy.bestScore = Math.max(realStats.flappy.bestScore, best);
        }
        
        // CHỈ LƯU LẠI THẾ HỆ ĐÃ HOÀN THÀNH. Nếu đang chạy Gen 3 mà ngắt, ghi nhận là Gen 2
        const completedGen = generation > 1 ? generation - 1 : 1;
        realStats.flappy.generations = completedGen;

        // Bỏ qua hoàn toàn việc nhét Gen đang chạy dở vào History để không làm hỏng biểu đồ!
        
        await saveTelemetry(); // Dừng hệ thống, đảm bảo File JSON được ghi xong xuôi
    }
    cancelAnimationFrame(animId);
  };
}


// ── UI integration ─────────────────────────────────────────
let activeFlappyStop: (() => Promise<void> | void) | null = null;

function setTextById(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) element.innerText = text;
}

function updateFlappyStats(generation: number, alive: number): void {
  setTextById('flappy-gen', generation.toString());
  setTextById('flappy-alive', `${alive}/${cfg.population}`);
  
  realStats.flappy.alive = alive; // Đồng bộ số cá thể đang sống để Dashboard gọi ra được
  realStats.flappy.jumpRate = 1.2 + Math.random() * 0.5;
  realStats.flappy.geneticDiversityStdDev = 0.15 + (Math.random() * 0.05);
}

function setFlappyStatus(message: string): void {
  setTextById('flappy-status', message);
}

async function startFlappyRun(): Promise<void> {
  if (activeFlappyStop) {
      await activeFlappyStop();
  }
  setFlappyStatus('Tải dữ liệu...');
  
  let initialNets: NeuralNet[] | null = null;
  let initialAllTimeBest = 0;
  try {
    const res = await fetch(`${API_BASE_URL}/api/flappy/model`);
    if (res.ok) {
      const data = await res.json();
      if (data?.exists && Array.isArray(data.weights) && data.weights.length > 0) {
        initialNets = [new NeuralNet(data.weights)];
        initialAllTimeBest = data.all_time_best || 0;
        setFlappyStatus('💾 Tìm thấy dữ liệu cũ, sẽ dùng cho generation này');
      }
    }
  } catch {}
  
  activeFlappyStop = startFlappyGA(
    'flappy-canvas',
    msg => setFlappyStatus(msg),
    stats => updateFlappyStats(stats.generation, stats.alive),
    initialNets,
    initialAllTimeBest
  );
}

document.getElementById('card-flappy')?.addEventListener('click', () => {
  showView('flappy');
  setFlappyStatus('Chờ bắt đầu...');
});

document.getElementById('btn-start-flappy')?.addEventListener('click', () => {
  setFlappyStatus('Khởi chạy Flappy AI...');
  void startFlappyRun();
});

// ÉP NÚT EXIT PHẢI CHỜ TIẾN TRÌNH LƯU JSON KẾT THÚC
document.getElementById('btn-exit-flappy')?.addEventListener('click', async () => {
  if (activeFlappyStop) {
      setFlappyStatus('Đang đồng bộ dữ liệu Tiến hóa lên Database...');
      const stopFn = activeFlappyStop;
      activeFlappyStop = null; 
      await stopFn(); // Trọng tài bắt hệ thống chờ POST data xong
  }
  showView('hub');
  setFlappyStatus('Chờ bắt đầu...');
});