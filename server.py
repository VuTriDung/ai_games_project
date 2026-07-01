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
import random
from typing import List, Optional

# === THÊM MỚI: import AI 2048 ===
from src.ai_2048 import get_best_move_2048

DATA_DIR = Path(__file__).resolve().parent / "data"
FLAPPY_MODEL_PATH = DATA_DIR / "flappy_model.json"


def _load_flappy_model():
    default_payload = {
        "weights": [],
        "generation": 1,
        "best_score": 0,
        "all_time_best": 0,
    }

    if not FLAPPY_MODEL_PATH.exists():
        _save_flappy_model(default_payload)
        return default_payload

    try:
        with open(FLAPPY_MODEL_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        _save_flappy_model(default_payload)
        return default_payload


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

# === THÊM MỚI: khai báo pacman_model để tránh lỗi ===
pacman_model = None

class MoveRequest(BaseModel):
    fen: str
    ai_color: str

class SnakeState(BaseModel):
    state_vector: list[int]
    current_dir: dict


class PacmanState(BaseModel):
    pass


class FlappyModelPayload(BaseModel):
    weights: list[float]
    generation: int
    best_score: int
    all_time_best: int

# === THÊM MỚI: class Grid2048 ===
class Grid2048(BaseModel):
    grid: list[list[int]]


# ------------------ Connect4 Models & Logic ------------------
class Connect4State(BaseModel):
    # board: 6 rows x 7 cols, 0=empty, 1=player1, 2=player2
    board: List[List[int]]
    # ai_player: 1 or 2 - which side the AI will play
    ai_player: int
    # optional parameters for algorithms
    depth: Optional[int] = None
    iterations: Optional[int] = None


ROWS = 6
COLS = 7


def valid_moves(board: List[List[int]]) -> List[int]:
    moves = []
    for c in range(COLS):
        if board[0][c] == 0:
            moves.append(c)
    return moves


def apply_move(board: List[List[int]], col: int, player: int) -> List[List[int]]:
    b = [row.copy() for row in board]
    for r in range(ROWS - 1, -1, -1):
        if b[r][col] == 0:
            b[r][col] = player
            return b
    raise ValueError("Column full")


def check_winner(board: List[List[int]]) -> Optional[int]:
    # return 1 or 2 if winner, 0 for draw, None for ongoing
    for r in range(ROWS):
        for c in range(COLS):
            p = board[r][c]
            if p == 0:
                continue
            # horizontal
            if c <= COLS - 4 and all(board[r][c + i] == p for i in range(4)):
                return p
            # vertical
            if r <= ROWS - 4 and all(board[r + i][c] == p for i in range(4)):
                return p
            # diag down-right
            if r <= ROWS - 4 and c <= COLS - 4 and all(board[r + i][c + i] == p for i in range(4)):
                return p
            # diag up-right
            if r >= 3 and c <= COLS - 4 and all(board[r - i][c + i] == p for i in range(4)):
                return p

    if all(board[0][c] != 0 for c in range(COLS)):
        return 0
    return None


# Simple heuristic: count possible 2/3 sequences for player minus opponent
def heuristic(board: List[List[int]], player: int) -> int:
    score = 0
    opp = 1 if player == 2 else 2

    def window_score(window: List[int], p: int):
        if window.count(p) == 4:
            return 1000
        elif window.count(p) == 3 and window.count(0) == 1:
            return 50
        elif window.count(p) == 2 and window.count(0) == 2:
            return 10
        return 0

    # horizontal
    for r in range(ROWS):
        for c in range(COLS - 3):
            w = [board[r][c + i] for i in range(4)]
            score += window_score(w, player)
            score -= window_score(w, opp)

    # vertical
    for c in range(COLS):
        for r in range(ROWS - 3):
            w = [board[r + i][c] for i in range(4)]
            score += window_score(w, player)
            score -= window_score(w, opp)

    # diag down-right
    for r in range(ROWS - 3):
        for c in range(COLS - 3):
            w = [board[r + i][c + i] for i in range(4)]
            score += window_score(w, player)
            score -= window_score(w, opp)

    # diag up-right
    for r in range(3, ROWS):
        for c in range(COLS - 3):
            w = [board[r - i][c + i] for i in range(4)]
            score += window_score(w, player)
            score -= window_score(w, opp)

    return score


# Minimax with alpha-beta
def minimax(board: List[List[int]], depth: int, alpha: int, beta: int, maximizing: bool, player: int) -> (int, Optional[int]):
    winner = check_winner(board)
    if winner is not None:
        if winner == player:
            return (1000000, None)
        elif winner == 0:
            return (0, None)
        else:
            return (-1000000, None)

    if depth == 0:
        return (heuristic(board, player), None)

    moves = valid_moves(board)
    best_col = None

    if maximizing:
        value = -10**9
        for col in moves:
            nb = apply_move(board, col, player)
            v, _ = minimax(nb, depth - 1, alpha, beta, False, player)
            if v > value:
                value = v; best_col = col
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return (value, best_col)
    else:
        opp = 1 if player == 2 else 2
        value = 10**9
        for col in moves:
            nb = apply_move(board, col, opp)
            v, _ = minimax(nb, depth - 1, alpha, beta, True, player)
            if v < value:
                value = v; best_col = col
            beta = min(beta, value)
            if alpha >= beta:
                break
        return (value, best_col)


# MCTS - simple UCT with random playouts
class MCTSNode:
    def __init__(self, board, player_to_move, parent=None, move=None):
        self.board = board
        self.player_to_move = player_to_move
        self.parent = parent
        self.move = move
        self.children = []
        self.wins = 0
        self.visits = 0


def mcts(root_board: List[List[int]], ai_player: int, iterations: int = 800) -> int:
    root = MCTSNode(root_board, ai_player)

    for _ in range(iterations):
        # selection & expansion
        node = root
        board = [row.copy() for row in node.board]
        player = node.player_to_move

        # descend
        while node.children:
            # UCT
            log_total = math.log(sum(ch.visits for ch in node.children) + 1)
            best = None
            best_score = -1e9
            for ch in node.children:
                if ch.visits == 0:
                    score = 1e9
                else:
                    exploit = ch.wins / ch.visits
                    explore = math.sqrt(2 * log_total / ch.visits)
                    score = exploit + 1.41 * explore
                if score > best_score:
                    best_score = score; best = ch
            node = best
            if node.move is not None:
                board = apply_move(board, node.move, node.player_to_move)
                node_player = 1 if node.player_to_move == 2 else 2
                player = node_player

        # expand
        winner = check_winner(board)
        if winner is None:
            moves = valid_moves(board)
            for m in moves:
                nb = apply_move(board, m, player)
                node.children.append(MCTSNode(nb, 1 if player == 2 else 2, parent=node, move=m))

        # simulate from a random child or current node
        if node.children:
            node = random.choice(node.children)
            board = [row.copy() for row in node.board]
            sim_player = node.player_to_move
        else:
            sim_player = node.player_to_move

        # rollout
        sim_board = [row.copy() for row in board]
        sim_winner = check_winner(sim_board)
        cur_player = sim_player
        while sim_winner is None:
            moves = valid_moves(sim_board)
            if not moves:
                break
            mv = random.choice(moves)
            sim_board = apply_move(sim_board, mv, cur_player)
            cur_player = 1 if cur_player == 2 else 2
            sim_winner = check_winner(sim_board)

        # backpropagate
        result = sim_winner
        # result: winning player or 0 or None
        n = node
        while n is not None:
            n.visits += 1
            if result == ai_player:
                n.wins += 1
            n = n.parent

    # choose best child by visits
    best_child = max(root.children, key=lambda c: c.visits) if root.children else None
    return best_child.move if best_child else random.choice(valid_moves(root_board))

import math


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

# ==========================================
# 5. API GAME 2048 (Expectimax)
# ==========================================
@app.post("/play_2048")
def play_2048(req: Grid2048):
    try:
        direction = get_best_move_2048(req.grid)
        return {"direction": direction}
    except Exception as e:
        # Fallback: random nếu có lỗi
        import random
        return {"direction": random.choice(["up", "down", "left", "right"])}


# ---------------- Connect4 endpoints ----------------
@app.post('/play_connect4/minimax')
def play_connect4_minimax(req: Connect4State):
    try:
        depth = req.depth if req.depth is not None else 6
        _, col = minimax(req.board, depth=depth, alpha=-10**9, beta=10**9, maximizing=True, player=req.ai_player)
        if col is None:
            moves = valid_moves(req.board)
            col = random.choice(moves) if moves else None
        return {"col": col, "depth_used": depth}
    except Exception as e:
        return {"error": str(e)}


@app.post('/play_connect4/mcts')
def play_connect4_mcts(req: Connect4State):
    try:
        iterations = req.iterations if req.iterations is not None else 600
        col = mcts(req.board, req.ai_player, iterations=iterations)
        return {"col": col, "iterations_used": iterations}
    except Exception as e:
        return {"error": str(e)}


@app.post('/api/connect4/log')
def log_connect4(payload: dict):
    # optional: append play record to data/connect4_selfplay.jsonl
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / 'connect4_selfplay.jsonl'
    try:
        with open(path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(payload, ensure_ascii=False) + '\n')
        return {"saved": True, "path": str(path)}
    except Exception as e:
        return {"error": str(e)}