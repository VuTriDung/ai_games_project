import chess
import chess.engine
import os
import platform
import stat
import random
import zipfile  # Thêm thư viện giải nén

# TỰ ĐỘNG NHẬN DIỆN HỆ ĐIỀU HÀNH
if platform.system() == "Windows":
    STOCKFISH_PATH = "stockfish.exe"
else:
    STOCKFISH_PATH = "stockfish_linux"


def get_best_move_white(board):
    # --- MÁNH KHÓE: TỰ ĐỘNG BUNG ZIP NẾU CHƯA CÓ FILE ---
    if not os.path.exists(STOCKFISH_PATH):
        zip_path = f"{STOCKFISH_PATH}.zip"
        if os.path.exists(zip_path):
            print(f"[*] Đang tự động giải nén {zip_path} trên Server...")
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                # Giải nén thẳng vào thư mục chứa code hiện tại
                zip_ref.extractall(os.path.dirname(__file__) or ".")
        else:
            print(f"CẢNH BÁO: Không tìm thấy file {STOCKFISH_PATH} hay file Zip!")
            legal_moves = list(board.legal_moves)
            return random.choice(legal_moves) if legal_moves else None

    # --- CẤP QUYỀN THỰC THI CHO LINUX (RENDER) ---
    if platform.system() != "Windows":
        st = os.stat(STOCKFISH_PATH)
        os.chmod(STOCKFISH_PATH, st.st_mode | stat.S_IEXEC)

    # --- GỌI ENGINE ---
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

    # Hạn chế sức mạnh
    engine.configure({"Skill Level": 0})

    # Giới hạn độ sâu xuống 2 để nhường AI Đen
    result = engine.play(board, chess.engine.Limit(depth=2))

    engine.quit()
    return result.move
