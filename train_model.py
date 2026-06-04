import os
import pandas as pd
import numpy as np
import chess
import joblib
import re
import time
from sklearn.neural_network import MLPRegressor

# --- ÉP HỆ THỐNG DÙNG THƯ MỤC CHỨA PROJECT LÀM BỘ NHỚ TẠM ---
# Lấy đường dẫn động của thư mục gốc dự án (Ai clone về máy cũng tự đúng)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_cache")

# Tự động tạo thư mục nếu chưa có
os.makedirs(TEMP_DIR, exist_ok=True)

# Ghi đè các biến môi trường để trỏ hết về thư mục động này
os.environ['TMPDIR'] = TEMP_DIR
os.environ['TEMP'] = TEMP_DIR
os.environ['TMP'] = TEMP_DIR
os.environ['JOBLIB_TEMP_FOLDER'] = TEMP_DIR
# --------------------------------------------------------------

def board_to_features(board):
    PIECE_MAP = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 100}
    features = np.zeros(64, dtype=int)
    for square in range(64):
        piece = board.piece_at(square)
        if piece:
            val = PIECE_MAP[piece.piece_type]
            features[square] = val if piece.color == chess.WHITE else -val
    return features

def main():
    # Sử dụng Mạng Neural Đa Lớp
    model = MLPRegressor(hidden_layer_sizes=(128, 128), random_state=42, verbose=True)
    
    total_games = 50000000
    chunk_size = 100000 
    
    print(f"BƯỚC 1: Bắt đầu chiến dịch huấn luyện 'Cày Cuốc' ({total_games} ván cờ)...")
    start_time = time.time()
    
    # Mở file CSV và cấu hình đọc theo từng Chunk (Lô)
    csv_path = os.path.join(BASE_DIR, "data", "chess_games.csv")
    chunk_iterator = pd.read_csv(csv_path, chunksize=chunk_size, nrows=total_games)
    
    chunk_count = 1
    for df_chunk in chunk_iterator:
        print(f"\n--- ĐANG XỬ LÝ LÔ THỨ {chunk_count} (Ván {(chunk_count-1)*chunk_size + 1} đến {chunk_count*chunk_size}) ---")
        X_chunk = []
        y_chunk = []
        
        for index, row in df_chunk.iterrows():
            board = chess.Board()
            moves_str = re.sub(r'\d+\.', '', str(row['AN']))
            moves = moves_str.split()
            
            result = row['Result']
            if result == '1-0': score = 1.0
            elif result == '0-1': score = -1.0
            else: score = 0.0

            for move_san in moves:
                try:
                    clean_move = re.sub(r'[?!#+]', '', move_san)
                    if clean_move:
                        board.push_san(clean_move)
                        X_chunk.append(board_to_features(board))
                        y_chunk.append(score)
                except:
                    break 
        
        X_train = np.array(X_chunk)
        y_train = np.array(y_chunk)
        
        print(f" -> Trích xuất được {len(X_train)} thế cờ từ Lô {chunk_count}.")
        print(f" -> Đang đẩy Lô {chunk_count} vào Mạng Neural để học...")
        
        # SỨC MẠNH CỦA PARTIAL_FIT: Học đắp thêm kiến thức mà không cần học lại từ đầu
        model.partial_fit(X_train, y_train)
        
        # Xóa biến bộ nhớ ngay lập tức để giữ cho RAM luôn trống trải
        del X_chunk, y_chunk, X_train, y_train
        chunk_count += 1
        
    print("\nBƯỚC 2: Lưu bộ não AI...")
    model_path = os.path.join(BASE_DIR, "data", "black_brain.pkl")
    joblib.dump(model, model_path)
    
    end_time = time.time()
    print(f"\n[THÀNH CÔNG] Đã cày xong {total_games} ván cờ và tạo file data/black_brain.pkl!")
    print(f"Tổng thời gian: {round(end_time - start_time, 2)} giây.")

if __name__ == "__main__":
    main()