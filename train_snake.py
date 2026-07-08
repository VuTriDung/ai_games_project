import os
import joblib
import random
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

TEMP_DIR = os.path.join(BASE_DIR, "temp_cache")
os.makedirs(TEMP_DIR, exist_ok=True)
os.environ["TMPDIR"] = TEMP_DIR
os.environ["TEMP"] = TEMP_DIR
os.environ["TMP"] = TEMP_DIR
os.environ["JOBLIB_TEMP_FOLDER"] = TEMP_DIR


MODEL_PATH = os.path.join(BASE_DIR, "data", "snake_brain.pkl")
META_PATH = os.path.join(BASE_DIR, "data", "snake_meta.txt")

UP, DOWN, LEFT, RIGHT = (0, -1), (0, 1), (-1, 0), (1, 0)
ACTIONS = [0, 1, 2]  # 0: Đi thẳng, 1: Rẽ phải, 2: Rẽ trái


class SnakeEnv:
    def __init__(self, w=20, h=20):
        self.w, self.h = w, h
        self.reset()

    def reset(self):
        self.head = (self.w // 2, self.h // 2)
        self.snake = [
            self.head,
            (self.head[0] - 1, self.head[1]),
            (self.head[0] - 2, self.head[1]),
        ]
        self.dir = RIGHT
        self.place_food()
        self.score = 0
        self.steps_without_food = 0
        return self.get_state()

    def place_food(self):
        while True:
            self.food = (random.randint(0, self.w - 1), random.randint(0, self.h - 1))
            if self.food not in self.snake:
                break

    def get_state(self):
        head_x, head_y = self.head
        point_l = (head_x - 1, head_y)
        point_r = (head_x + 1, head_y)
        point_u = (head_x, head_y - 1)
        point_d = (head_x, head_y + 1)

        dir_l, dir_r, dir_u, dir_d = (
            self.dir == LEFT,
            self.dir == RIGHT,
            self.dir == UP,
            self.dir == DOWN,
        )

        danger_s = (
            (dir_r and self.is_collision(point_r))
            or (dir_l and self.is_collision(point_l))
            or (dir_u and self.is_collision(point_u))
            or (dir_d and self.is_collision(point_d))
        )
        danger_r = (
            (dir_u and self.is_collision(point_r))
            or (dir_d and self.is_collision(point_l))
            or (dir_l and self.is_collision(point_u))
            or (dir_r and self.is_collision(point_d))
        )
        danger_l = (
            (dir_d and self.is_collision(point_r))
            or (dir_u and self.is_collision(point_l))
            or (dir_r and self.is_collision(point_u))
            or (dir_l and self.is_collision(point_d))
        )

        state = [
            danger_s,
            danger_r,
            danger_l,
            dir_l,
            dir_r,
            dir_u,
            dir_d,
            self.food[0] < self.head[0],
            self.food[0] > self.head[0],
            self.food[1] < self.head[1],
            self.food[1] > self.head[1],
        ]
        return tuple(map(int, state))

    def is_collision(self, pt):
        return (
            pt[0] < 0
            or pt[0] >= self.w
            or pt[1] < 0
            or pt[1] >= self.h
            or pt in self.snake[1:]
        )

    def step(self, action):
        self.steps_without_food += 1

        clock_wise = [RIGHT, DOWN, LEFT, UP]
        idx = clock_wise.index(self.dir)

        if action == 1:
            self.dir = clock_wise[(idx + 1) % 4]
        elif action == 2:
            self.dir = clock_wise[(idx - 1) % 4]

        self.head = (self.head[0] + self.dir[0], self.head[1] + self.dir[1])
        self.snake.insert(0, self.head)

        reward = -1
        game_over = False

        if self.is_collision(self.head):
            game_over = True
            reward = -100
            return reward, game_over, self.score

        if self.steps_without_food > 150 * len(self.snake):
            game_over = True
            reward = -50
            return reward, game_over, self.score

        if self.head == self.food:
            self.score += 100
            reward = 100
            self.steps_without_food = 0
            self.place_food()
        else:
            self.snake.pop()

        return reward, game_over, self.score


def train():
    target_episodes = 6000000
    gamma = 0.9
    lr = 0.001

    # 1. KIỂM TRA TRÍ NHỚ CŨ
    episodes_trained = 0
    if os.path.exists(MODEL_PATH) and os.path.exists(META_PATH):
        with open(META_PATH, "r") as f:
            try:
                episodes_trained = int(f.read().strip())
            except ValueError:
                episodes_trained = 0

        if episodes_trained > 0:
            print(f"[*] TÌM THẤY NÃO CŨ! Rắn đã tự học được {episodes_trained:,} ván.")
            q_table = joblib.load(MODEL_PATH)
        else:
            q_table = {}
    else:
        print("[*] KHỞI TẠO NÃO RẮN MỚI TINH.")
        q_table = {}

    episodes_to_train = target_episodes - episodes_trained

    if episodes_to_train <= 0:
        print(
            f"\n[XONG] Rắn đã tu luyện đủ {target_episodes:,} ván. Không cần cày thêm!"
        )
        return

    # 2. PHỤC HỒI CHỈ SỐ EPSILON (Khôi phục độ khôn của AI)
    # Tỉ lệ này tự động giảm theo đúng số ván đã học trong quá khứ
    epsilon = max(0.01, 1.0 * (0.99998**episodes_trained))

    env = SnakeEnv()
    print(f"\nBƯỚC 1: Bắt đầu cày tiếp {episodes_to_train:,} ván còn thiếu...")

    max_score_in_batch = 0

    for i in range(episodes_trained, target_episodes):
        state = env.reset()
        if state not in q_table:
            q_table[state] = [0, 0, 0]

        while True:
            if random.uniform(0, 1) < epsilon:
                action = random.choice(ACTIONS)
            else:
                action = np.argmax(q_table[state])

            reward, done, score = env.step(action)
            new_state = env.get_state()
            if new_state not in q_table:
                q_table[new_state] = [0, 0, 0]

            q_table[state][action] = q_table[state][action] + lr * (
                reward + gamma * np.max(q_table[new_state]) - q_table[state][action]
            )
            state = new_state

            if done:
                if score > max_score_in_batch:
                    max_score_in_batch = score
                break

        epsilon = max(0.01, epsilon * 0.99998)

        # In log mỗi 5000 ván
        if (i + 1) % 5000 == 0:
            print(
                f" -> Đã chơi {i+1:,} ván | Epsilon: {epsilon:.3f} | Kỷ lục lô này: {max_score_in_batch} điểm"
            )
            max_score_in_batch = 0

        # LƯU CHECKPOINT MỖI 50.000 VÁN (Chống cúp điện)
        if (i + 1) % 50000 == 0:
            joblib.dump(q_table, MODEL_PATH)
            with open(META_PATH, "w") as f:
                f.write(str(i + 1))
            print(f" [LƯU THÀNH CÔNG] Đã lưu Checkpoint ở mốc {i+1:,} ván.")

    # Lưu lần cuối cùng khi hoàn tất 2 triệu ván
    joblib.dump(q_table, MODEL_PATH)
    with open(META_PATH, "w") as f:
        f.write(str(target_episodes))

    print(
        f"\nHOÀN TẤT! Đã lưu não cho Rắn vào data/snake_brain.pkl (Tổng {target_episodes:,} ván)"
    )


if __name__ == "__main__":
    train()
