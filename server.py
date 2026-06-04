from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chess
from src.ai_white import get_best_move_white
from src.ai_black import get_best_move_black
import joblib
import os
import numpy as np

app = FastAPI()

# Mở cửa (CORS) cho phép Web Frontend (cổng 5173) kết nối vào
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Cho phép mọi nguồn truy cập
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------- CHESS API -----------------
class MoveRequest(BaseModel):
    fen: str
    ai_color: str

@app.post("/play_ai")
def play_ai(req: MoveRequest):
    board = chess.Board(req.fen)
    if board.is_game_over():
        return {"game_over": True, "result": board.result()}
    if req.ai_color == "white":
        move = get_best_move_white(board)
    else:
        move = get_best_move_black(board)
    
    if move:
        board.push(move)
        return {
            "fen": board.fen(), 
            "move": move.uci(), 
            "game_over": board.is_game_over()
        }
    return {"error": "Không tìm thấy nước đi"}


# ----------------- SNAKE API -----------------
# Load não Rắn
try:
    snake_q_table = joblib.load(os.path.join("data", "snake_brain.pkl"))
except:
    snake_q_table = {}

class SnakeState(BaseModel):
    state_vector: list[int]
    current_dir: dict

@app.post("/play_snake")
def play_snake(req: SnakeState):
    # Chuyển state JSON thành Tuple để tra từ điển Q-Table
    state_tuple = tuple(req.state_vector)
    
    # 0: Thẳng, 1: Phải, 2: Trái
    if state_tuple in snake_q_table:
        action = int(np.argmax(snake_q_table[state_tuple]))
    else:
        action = 0 # Chưa gặp bao giờ thì đi thẳng cầu nguyện
        
    # Tính toán lại hướng tuyệt đối (UP/DOWN/LEFT/RIGHT) để trả về cho Web
    UP, DOWN, LEFT, RIGHT = {"x":0,"y":-1}, {"x":0,"y":1}, {"x":-1,"y":0}, {"x":1,"y":0}
    clock_wise = [RIGHT, DOWN, LEFT, UP]
    
    # Tìm index hướng hiện tại
    idx = 0
    for i, d in enumerate(clock_wise):
        if d["x"] == req.current_dir["x"] and d["y"] == req.current_dir["y"]:
            idx = i
            break
            
    if action == 1: new_dir = clock_wise[(idx + 1) % 4]
    elif action == 2: new_dir = clock_wise[(idx - 1) % 4]
    else: new_dir = clock_wise[idx]
    
    return {"new_dir": new_dir}