import chess
import numpy as np
import random
import joblib
from pathlib import Path

# Từ điển định giá quân cờ
PIECE_MAP = {
    chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
    chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 100
}

# Tự động dò đường dẫn
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "data" / "black_brain.pkl"

try:
    model = joblib.load(MODEL_PATH)
    HAS_MODEL = True
    print("✅ ĐÃ TẢI THÀNH CÔNG NÃO CỜ VUA MLP (BATCH PROCESSING)!")
except Exception as e:
    HAS_MODEL = False

def board_to_features_flat(board):
    """Trích xuất ma trận 1D cực nhanh"""
    features = np.zeros(64, dtype=int)
    for square in range(64):
        piece = board.piece_at(square)
        if piece:
            value = PIECE_MAP[piece.piece_type]
            if piece.color == chess.BLACK:
                value = -value
            features[square] = value
    return features

def get_best_move_black(board):
    legal_moves = list(board.legal_moves)
    if not legal_moves: return None
    if not HAS_MODEL: return random.choice(legal_moves)

    # 1. Kiểm tra xem có nước nào ăn Vua luôn không (Nhìn thấy chiếu bí là chớp ngay)
    for move in legal_moves:
        board.push(move)
        if board.is_checkmate():
            board.pop()
            return move
        board.pop()

    all_features = []
    move_indices = []

    # 2. Sinh ra toàn bộ các thế cờ tương lai (Nhìn trước 2 bước)
    for i, black_move in enumerate(legal_moves):
        board.push(black_move)
        white_responses = list(board.legal_moves)
        
        if not white_responses:
            if board.is_checkmate():
                board.pop()
                return black_move # Đen thắng luôn
        else:
            for white_move in white_responses:
                board.push(white_move)
                all_features.append(board_to_features_flat(board))
                move_indices.append(i)
                board.pop()
                
        board.pop()

    if not all_features:
        return random.choice(legal_moves)

    # 3. KỸ THUẬT XỬ LÝ LÔ (BATCHING): GỌI MODEL 1 LẦN DUY NHẤT CHO HÀNG NGÀN THẾ CỜ
    features_batch = np.array(all_features)
    scores = model.predict(features_batch)

    # 4. Phân tích kết quả
    black_move_scores = {i: -float('inf') for i in range(len(legal_moves))}
    for idx, score in zip(move_indices, scores):
        if score > black_move_scores[idx]:
            black_move_scores[idx] = score # Trắng sẽ luôn chọn nước có điểm cao nhất

    # Đen khôn ngoan chọn nước đi khiến điểm cao nhất của Trắng bị ép xuống thấp nhất
    best_move_idx = min(black_move_scores, key=black_move_scores.get)
    return legal_moves[best_move_idx]