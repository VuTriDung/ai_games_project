from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chess
from src.ai_white import get_best_move_white
from src.ai_black import get_best_move_black

app = FastAPI()

# Mở cửa (CORS) cho phép Web Frontend (cổng 5173) kết nối vào
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Cho phép mọi nguồn truy cập
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MoveRequest(BaseModel):
    fen: str
    ai_color: str

@app.post("/play_ai")
def play_ai(req: MoveRequest):
    board = chess.Board(req.fen)
    
    if board.is_game_over():
        return {"game_over": True, "result": board.result()}

    # Gọi hàm AI tương ứng
    if req.ai_color == "white":
        # ĐÃ SỬA LỖI Ở DÒNG NÀY: Xóa depth=3 đi vì Stockfish không cần
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