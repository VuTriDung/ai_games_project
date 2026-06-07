from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chess
from src.ai_white import get_best_move_white
from src.ai_black import get_best_move_black
import joblib
import os
import numpy as np
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- KHAI BÁO BIẾN ---
try:
    snake_q_table = joblib.load(os.path.join("data", "snake_brain.pkl"))
except:
    snake_q_table = {}

try:
    pacman_model = joblib.load(os.path.join("data", "pacman_brain.pkl"))
except:
    pacman_model = None


class MoveRequest(BaseModel):
    fen: str
    ai_color: str

class SnakeState(BaseModel):
    state_vector: list[int]
    current_dir: dict

class PacmanState(BaseModel):
    state_vector: list[int]

# ==========================================
# 1. API CỜ VUA
# ==========================================
@app.post("/play_ai")
def play_ai(req: MoveRequest):
    board = chess.Board(req.fen)
    if board.is_game_over(): 
        return {"game_over": True, "result": board.result()}
        
    start_time = time.time() # Bắt đầu bấm giờ
    
    move = get_best_move_white(board) if req.ai_color == "white" else get_best_move_black(board)
    
    inference_time = round((time.time() - start_time) * 1000, 2) # Đổi ra mili-giây (ms)
    
    if move:
        board.push(move)
        return {
            "fen": board.fen(), 
            "move": move.uci(), 
            "game_over": board.is_game_over(),
            "inference_time_ms": inference_time # Gửi thời gian AI suy nghĩ về cho Web
        }
    return {"error": "Không tìm thấy nước đi"}

# ==========================================
# 2. API RẮN SĂN MỒI
# ==========================================
@app.post("/play_snake")
def play_snake(req: SnakeState):
    state_tuple = tuple(req.state_vector)
    
    if state_tuple in snake_q_table:
        action = int(np.argmax(snake_q_table[state_tuple]))
    else:
        action = 0 
        
    UP, DOWN, LEFT, RIGHT = {"x":0,"y":-1}, {"x":0,"y":1}, {"x":-1,"y":0}, {"x":1,"y":0}
    clock_wise = [RIGHT, DOWN, LEFT, UP]
    
    idx = 0
    for i, d in enumerate(clock_wise):
        if d["x"] == req.current_dir["x"] and d["y"] == req.current_dir["y"]:
            idx = i
            break
            
    if action == 1: new_dir = clock_wise[(idx + 1) % 4]
    elif action == 2: new_dir = clock_wise[(idx - 1) % 4]
    else: new_dir = clock_wise[idx]
    
    return {"new_dir": new_dir}


# ==========================================
# 4. API PAC-MAN (DQN)
# ==========================================
@app.post("/play_pacman")
def play_pacman(req: PacmanState):
    if pacman_model is None:
        # Nếu chưa train xong, đi bừa
        return {"action": int(np.random.choice([0, 1, 2, 3]))}
    
    # Đưa ma trận 16 giác quan vào Mạng Neural
    q_values = pacman_model.predict([req.state_vector])[0]
    
    # Chọn nước đi có điểm Q cao nhất (0: Lên, 1: Xuống, 2: Trái, 3: Phải)
    action = int(np.argmax(q_values))
    
    return {"action": action}

# ==========================================
# 3. API THỐNG KÊ (MỚI)
# ==========================================
@app.get("/api/stats")
def get_stats():
    chess_games = 0
    snake_episodes = 0
    
    # Đọc số ván cờ đã train
    try:
        with open("data/training_meta.txt", "r") as f:
            chess_games = int(f.read().strip())
    except: pass
    
    # Đọc số ván rắn đã train
    try:
        with open("data/snake_meta.txt", "r") as f:
            snake_episodes = int(f.read().strip())
    except: pass
    
    # Tính toán lại độ tự tin của rắn dựa vào Epsilon
    epsilon = max(0.01, 1.0 * (0.99998 ** snake_episodes))
    
    return {
        "chess_trained_games": chess_games,
        "snake_trained_episodes": snake_episodes,
        "snake_epsilon": round(epsilon, 4)
    }