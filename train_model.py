import os
import pandas as pd
import numpy as np
import chess
import joblib
import re
import time
from sklearn.neural_network import MLPRegressor

# --- ÉP HỆ THỐNG DÙNG THƯ MỤC CHỨA PROJECT LÀM BỘ NHỚ TẠM ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_cache")
os.makedirs(TEMP_DIR, exist_ok=True)

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
    model_path = os.path.join(BASE_DIR, "data", "black_brain.pkl")
    meta_path = os.path.join(BASE_DIR, "data", "training_meta.txt")
    
    # Số ván cờ BẠN MUỐN ĐẠT ĐƯỢC (Đổi số này thành 6000000 sau này)
    target_total_games = 2000000 
    chunk_size = 100000 
    
    # 1. KIỂM TRA TRÍ NHỚ CŨ
    games_trained = 0
    if os.path.exists(model_path) and os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            try:
                games_trained = int(f.read().strip())
            except ValueError:
                games_trained = 0
                
        if games_trained > 0:
            print(f"[*] TÌM THẤY BỘ NÃO CŨ! AI đã học được {games_trained:,} ván cờ.")
            model = joblib.load(model_path)
        else:
            model = MLPRegressor(hidden_layer_sizes=(128, 128), random_state=42, verbose=True)
    else:
        print("[*] KHỞI TẠO MÔ HÌNH MỚI TINH.")
        model = MLPRegressor(hidden_layer_sizes=(128, 128), random_state=42, verbose=True)

    games_to_train_now = target_total_games - games_trained
    
    if games_to_train_now <= 0:
        print(f"\n[XONG] Mô hình đã học đủ {target_total_games:,} ván cờ. Không cần cày thêm!")
        return

    print(f"\nBƯỚC 1: Bắt đầu cày tiếp {games_to_train_now:,} ván cờ còn thiếu...")
    start_time = time.time()
    
    csv_path = os.path.join(BASE_DIR, "data", "chess_games.csv")
    
    # Bỏ qua các ván đã học (Bỏ qua từ dòng 1 đến games_trained, chừa lại dòng 0 là Tiêu đề)
    skip_rows = range(1, games_trained + 1) if games_trained > 0 else None
    
    chunk_iterator = pd.read_csv(
        csv_path, 
        chunksize=chunk_size, 
        nrows=games_to_train_now,
        skiprows=skip_rows
    )
    
    chunk_count = 1
    current_progress = games_trained

    for df_chunk in chunk_iterator:
        print(f"\n--- ĐANG XỬ LÝ LÔ {chunk_count} (Ván {current_progress + 1:,} đến {current_progress + len(df_chunk):,}) ---")
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
        
        print(f" -> Trích xuất được {len(X_train):,} thế cờ.")
        print(" -> Đang nạp kiến thức vào Mạng Neural...")
        
        # Học tăng cường
        model.partial_fit(X_train, y_train)
        
        # LƯU CHECKPOINT NGAY SAU MỖI LÔ
        current_progress += len(df_chunk)
        joblib.dump(model, model_path)
        with open(meta_path, "w") as f:
            f.write(str(current_progress))
            
        print(f" [LƯU THÀNH CÔNG] Đã lưu an toàn tiến trình: {current_progress:,} ván.")
        
        # Xóa biến bộ nhớ
        del X_chunk, y_chunk, X_train, y_train
        chunk_count += 1
        
    end_time = time.time()
    print(f"\n[THÀNH CÔNG] Quá trình huấn luyện hoàn tất!")
    print(f"Tổng thời gian chạy đợt này: {round(end_time - start_time, 2)} giây.")

if __name__ == "__main__":
    main()