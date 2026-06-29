import json
import os
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chess
from src.ai_white import get_best_move_white
from src.ai_black import get_best_move_black
import joblib
import numpy as np

DATA_DIR = Path(__file__).resolve().parent / "data"
FLAPPY_MODEL_PATH = DATA_DIR / "flappy_model.json"


def _load_flappy_model():
    if not FLAPPY_MODEL_PATH.exists():
        return None
    try:
        with open(FLAPPY_MODEL_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _save_flappy_model(payload: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(FLAPPY_MODEL_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- KHAI BÁO BIẾN CHO SNAKE ---
try:
    snake_q_table = joblib.load(os.path.join("data", "snake_brain.pkl"))
except:
    snake_q_table = {}

class MoveRequest(BaseModel):
    fen: str
    ai_color: str

class SnakeState(BaseModel):
    state_vector: list[int]
    current_dir: dict


class PacmanState(BaseModel):


class FlappyModelPayload(BaseModel):
    weights: list[float]
    generation: int
    best_score: int
    all_time_best: int

# ==========================================
# 1. API CỜ VUA
# ==========================================
@app.post("/play_ai")
def play_ai(req: MoveRequest):
    board = chess.Board(req.fen)
    if board.is_game_over(): 
        return {"game_over": True, "result": board.result()}
        
    start_time = time.time()
    move = get_best_move_white(board) if req.ai_color == "white" else get_best_move_black(board)
    inference_time = round((time.time() - start_time) * 1000, 2)
    
    if move:
        board.push(move)
        return {
            "fen": board.fen(), 
            "move": move.uci(), 
            "game_over": board.is_game_over(),
            "inference_time_ms": inference_time 
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
# 3. API FLAPPY BIRD MODEL
# ==========================================
@app.get("/api/flappy/model")
def get_flappy_model():
    saved = _load_flappy_model()
    if not saved:
        return {"exists": False}

    return {
        "exists": True,
        "weights": saved.get("weights", []),
        "generation": saved.get("generation", 1),
        "best_score": saved.get("best_score", 0),
        "all_time_best": saved.get("all_time_best", 0),
        "path": str(FLAPPY_MODEL_PATH),
    }


@app.post("/api/flappy/model")
def save_flappy_model(req: FlappyModelPayload):
    _save_flappy_model({
        "weights": req.weights,
        "generation": req.generation,
        "best_score": req.best_score,
        "all_time_best": req.all_time_best,
    })
    return {"saved": True, "path": str(FLAPPY_MODEL_PATH)}

# ==========================================
# 4. API THỐNG KÊ (TELEMETRY)
# ==========================================
# 3. API THỐNG KÊ (TELEMETRY)
# ==========================================
@app.get("/api/stats")
def get_stats():
    chess_games = 0
    snake_episodes = 0
    
    try:
        with open("data/training_meta.txt", "r") as f: chess_games = int(f.read().strip())
    except: pass
    
    try:
        with open("data/snake_meta.txt", "r") as f: snake_episodes = int(f.read().strip())
    except: pass
    
    epsilon = max(0.01, 1.0 * (0.99998 ** snake_episodes))
    
    return {
        "chess_trained_games": chess_games,
        "snake_trained_episodes": snake_episodes,
        "snake_epsilon": round(epsilon, 4)
    }