import chess
import chess.engine
import os
import random

# Trỏ tới cỗ máy Stockfish
STOCKFISH_PATH = "stockfish.exe"


def get_best_move_white(board):
    # Nếu quên chưa tải Stockfish, AI đi random để không bị sập app
    if not os.path.exists(STOCKFISH_PATH):
        print("CẢNH BÁO: Chưa có file stockfish.exe ở thư mục gốc!")
        legal_moves = list(board.legal_moves)
        return random.choice(legal_moves) if legal_moves else None

    # Gọi Stockfish
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

    # Hạn chế sức mạnh (Từ 0 đến 20). Mức 0 là yếu nhất, 20 là mạnh nhất. Mức 0 sẽ giúp AI Đen đánh bại AI Trắng (vì AI Đen chỉ là model học máy).
    engine.configure({"Skill Level": 0})

    # Ép AI Trắng chỉ được phép suy nghĩ tối đa 0.5 giây, đảm bảo Web không bao giờ bị đơ
    result = engine.play(board, chess.engine.Limit(time=0.5))

    # result = engine.play(board, chess.engine.Limit(depth=2))

    engine.quit()
    return result.move
