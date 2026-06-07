import os
import random
import numpy as np
import joblib
from collections import deque
from sklearn.neural_network import MLPRegressor

# --- THIẾT LẬP ĐƯỜNG DẪN BỘ NHỚ ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_cache")
os.makedirs(TEMP_DIR, exist_ok=True)
os.environ['TMPDIR'] = TEMP_DIR
os.environ['TEMP'] = TEMP_DIR
os.environ['TMP'] = TEMP_DIR

MODEL_PATH = os.path.join(BASE_DIR, "data", "pacman_brain.pkl")
META_PATH = os.path.join(BASE_DIR, "data", "pacman_meta.txt")

# Hành động: 0: LÊN, 1: XUỐNG, 2: TRÁI, 3: PHẢI
ACTIONS = [0, 1, 2, 3]
MOVES = [(0, -1), (0, 1), (-1, 0), (1, 0)]

class PacmanEnv:
    def __init__(self, w=15, h=15):
        self.w, self.h = w, h
        self.reset()

    def reset(self):
        # Tọa độ Pacman
        self.pacman = [self.w//2, self.h//2]
        
        # Tọa độ 4 con Ma (Xuất phát ở 4 góc)
        self.ghosts = [[1,1], [self.w-2, 1], [1, self.h-2], [self.w-2, self.h-2]]
        
        # Sinh mồi ngẫu nhiên
        self.food = []
        for _ in range(10):
            fx, fy = random.randint(1, self.w-2), random.randint(1, self.h-2)
            if [fx, fy] != self.pacman and [fx, fy] not in self.ghosts:
                self.food.append([fx, fy])
                
        self.score = 0
        self.steps = 0
        return self.get_state()

    def get_state(self):
        # Đầu vào cho Mạng Neural (16 nơ-ron):
        # [pac_x, pac_y, 4x ghost_x, 4x ghost_y, nearest_food_dx, nearest_food_dy, wall_u, wall_d, wall_l, wall_r]
        px, py = self.pacman
        state = [px, py]
        for gx, gy in self.ghosts:
            state.extend([gx, gy])
            
        if self.food:
            # Tìm mồi gần nhất
            closest = min(self.food, key=lambda f: abs(f[0]-px) + abs(f[1]-py))
            state.extend([closest[0] - px, closest[1] - py])
        else:
            state.extend([0, 0])
            
        # Tường (Bản đồ đơn giản: viền là tường)
        state.extend([
            1 if py == 0 else 0, # Tường Lên
            1 if py == self.h-1 else 0, # Tường Xuống
            1 if px == 0 else 0, # Tường Trái
            1 if px == self.w-1 else 0  # Tường Phải
        ])
        return np.array(state)

    def move_ghosts(self):
        # Ma di chuyển đơn giản: Tìm cách thu hẹp khoảng cách với Pacman
        px, py = self.pacman
        for i in range(len(self.ghosts)):
            gx, gy = self.ghosts[i]
            possible_moves = []
            if gx < px: possible_moves.append((1, 0))
            elif gx > px: possible_moves.append((-1, 0))
            if gy < py: possible_moves.append((0, 1))
            elif gy > py: possible_moves.append((0, -1))
            
            if not possible_moves:
                possible_moves = MOVES
                
            move = random.choice(possible_moves)
            new_gx, new_gy = gx + move[0], gy + move[1]
            
            # Ma không xuyên viền
            if 0 < new_gx < self.w-1 and 0 < new_gy < self.h-1:
                self.ghosts[i] = [new_gx, new_gy]

    def step(self, action):
        self.steps += 1
        px, py = self.pacman
        dx, dy = MOVES[action]
        new_px, new_py = px + dx, py + dy
        
        reward = -1 # Trừ 1 điểm mỗi bước để ép ăn mồi nhanh
        game_over = False

        # Đâm tường
        if new_px <= 0 or new_px >= self.w-1 or new_py <= 0 or new_py >= self.h-1:
            reward = -10
        else:
            self.pacman = [new_px, new_py]

        # Đụng ma
        if self.pacman in self.ghosts:
            reward = -100
            game_over = True
            return reward, game_over, self.score

        # Ăn mồi
        if self.pacman in self.food:
            self.food.remove(self.pacman)
            reward = 50
            self.score += 50
            if not self.food: # Ăn hết mồi
                reward = 200
                game_over = True
                
        # Ma di chuyển
        self.move_ghosts()
        if self.pacman in self.ghosts:
            reward = -100
            game_over = True

        # Chết vì đi quá lâu
        if self.steps > 200:
            game_over = True

        return reward, game_over, self.score

def train():
    env = PacmanEnv()
    
    # KHỞI TẠO HOẶC TẢI LẠI MẠNG NEURAL (DQN Approximation)
    episodes_trained = 0
    if os.path.exists(MODEL_PATH) and os.path.exists(META_PATH):
        with open(META_PATH, "r") as f:
            try: episodes_trained = int(f.read().strip())
            except: pass
            
    if episodes_trained > 0:
        print(f"[*] Phục hồi não Pac-Man ({episodes_trained} ván)...")
        model = joblib.load(MODEL_PATH)
    else:
        print("[*] Khởi tạo mạng DQN mới...")
        # 16 Input -> 2 Lớp ẩn (64 Nơ-ron) -> 4 Output (Lên, Xuống, Trái, Phải)
        model = MLPRegressor(hidden_layer_sizes=(64, 64), learning_rate_init=0.001, warm_start=True)
        # Ép model tạo cấu trúc ma trận bằng cách train giả 1 nhịp
        dummy_state = env.get_state()
        model.partial_fit([dummy_state], [[0,0,0,0]])

    target_episodes = 50000 
    epsilon = max(0.01, 1.0 * (0.9999 ** episodes_trained))
    gamma = 0.95
    batch_size = 64
    memory = deque(maxlen=20000) # Cuốn sổ tay nhớ tối đa 20 ngàn hành động
    
    print(f"\nBẮT ĐẦU HUẤN LUYỆN PAC-MAN (Mục tiêu: {target_episodes} ván)")
    
    for i in range(episodes_trained, target_episodes):
        state = env.reset()
        total_reward = 0
        
        while True:
            # Chọn hành động
            if random.uniform(0, 1) < epsilon:
                action = random.choice(ACTIONS)
            else:
                # Mạng Neural dự đoán điểm số của 4 hướng
                q_values = model.predict([state])[0]
                action = np.argmax(q_values)
                
            # Thực thi
            reward, done, score = env.step(action)
            next_state = env.get_state()
            
            # Ghi vào sổ tay
            memory.append((state, action, reward, next_state, done))
            state = next_state
            total_reward += reward
            
            # ----------------------------------------------------
            # CƠ CHẾ EXPERIENCE REPLAY (Học từ quá khứ)
            # ----------------------------------------------------
            if len(memory) >= batch_size:
                minibatch = random.sample(memory, batch_size)
                X_batch, y_batch = [], []
                
                for s_b, a_b, r_b, ns_b, d_b in minibatch:
                    target = r_b
                    if not d_b:
                        # Q(s, a) = Reward + Gamma * Max(Q(ns, a_all))
                        target = r_b + gamma * np.max(model.predict([ns_b])[0])
                        
                    # Dự đoán giá trị hiện tại để chỉ cập nhật đúng hướng vừa đi
                    target_f = model.predict([s_b])[0]
                    target_f[a_b] = target
                    
                    X_batch.append(s_b)
                    y_batch.append(target_f)
                    
                # Nạp Batch vào Mạng Nơ-ron
                model.partial_fit(X_batch, y_batch)
            
            if done: break
            
        epsilon = max(0.01, epsilon * 0.9999)
        
        if (i+1) % 100 == 0:
            print(f"Ván {i+1} | Epsilon: {epsilon:.3f} | Score: {score} | Reward: {total_reward:.1f} | Sổ tay: {len(memory)}/20000")
            
        if (i+1) % 5000 == 0:
            joblib.dump(model, MODEL_PATH)
            with open(META_PATH, "w") as f: f.write(str(i+1))
            print(" [LƯU NÃO THÀNH CÔNG]")

if __name__ == "__main__":
    train()