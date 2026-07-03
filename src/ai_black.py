import chess
import numpy as np
import random
import joblib
import os
from pathlib import Path

# Từ điển định giá quân cờ
PIECE_MAP = {
    chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
    chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 100
}

# Tự động dò đường dẫn gốc bất kể chạy trên môi trường nào
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "data" / "black_brain.pkl"

try:
    model = joblib.load(MODEL_PATH)
    HAS_MODEL = True
    print("ĐÃ TẢI THÀNH CÔNG NÃO CỜ VUA MLP!")
except Exception as e:
    print(f"CẢNH BÁO: Chưa tìm thấy file black_brain.pkl do lỗi -> {e}. AI Đen sẽ đánh Random!")
    HAS_MODEL = False

def board_to_features(board):
    """
    Biến bàn cờ 64 ô thành mảng 64 con số (1D Array).
    Đầu vào cho Model học máy.
    """
    features = np.zeros(64, dtype=int)
    for square in range(64):
        piece = board.piece_at(square)
        if piece:
            value = PIECE_MAP[piece.piece_type]
            # Đánh dấu số âm cho quân Đen
            if piece.color == chess.BLACK:
                value = -value
            features[square] = value
            
    # Scikit-learn yêu cầu mảng 2D cho 1 sample, nên cần reshape
    return features.reshape(1, -1)

def get_best_move_black(board):
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        return None

    # Nếu chưa chạy file train_model.py, cho AI đi bừa để app không bị crash
    if not HAS_MODEL:
        return random.choice(legal_moves)

    best_move = None
    # Trắng thắng = 1.0, Đen thắng = -1.0. 
    # Do đó, AI Đen muốn tìm nước đi khiến điểm dự đoán càng thấp (âm) càng tốt.
    best_score = float('inf') 

    for move in legal_moves:
        board.push(move) # Thử đi nước cờ
        
        # Biến bàn cờ vừa thử thành các con số và dự đoán
        features = board_to_features(board)
        score = model.predict(features)[0]
        
        board.pop() # Lùi lại trạng thái cũ

        if score < best_score:
            best_score = score
            best_move = move

    # Đề phòng lỗi không tìm được nước tốt hơn, đi ngẫu nhiên 1 nước hợp lệ
    return best_move if best_move else random.choice(legal_moves)