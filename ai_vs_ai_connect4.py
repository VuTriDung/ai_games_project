import pygame
import numpy as np
import random
import math
import sys

# =========================
# GAME CONSTANTS
# =========================
ROW_COUNT = 6
COLUMN_COUNT = 7
WINDOW_LENGTH = 4

EMPTY = 0
AI1_PIECE = 1
AI2_PIECE = 2

AI1 = 0
AI2 = 1

BLUE = (0, 0, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)
WHITE = (255, 255, 255)


# =========================
# BOARD FUNCTIONS
# =========================

def create_board():
    return np.zeros((ROW_COUNT, COLUMN_COUNT), dtype=int)


def drop_piece(board, row, col, piece):
    board[row][col] = piece


def is_valid_location(board, col):
    return board[ROW_COUNT - 1][col] == EMPTY


def get_next_open_row(board, col):

    for r in range(ROW_COUNT):

        if board[r][col] == EMPTY:
            return r

    return None


def get_valid_locations(board):

    valid = []

    for col in range(COLUMN_COUNT):

        if is_valid_location(board, col):
            valid.append(col)

    return valid


def board_full(board):

    return len(get_valid_locations(board)) == 0


def print_board(board):

    print(np.flip(board, 0))


# =========================
# CHECK WIN
# =========================

def winning_move(board, piece):

    # Horizontal

    for c in range(COLUMN_COUNT - 3):

        for r in range(ROW_COUNT):

            if (
                board[r][c] == piece
                and board[r][c + 1] == piece
                and board[r][c + 2] == piece
                and board[r][c + 3] == piece
            ):
                return True

    # Vertical

    for c in range(COLUMN_COUNT):

        for r in range(ROW_COUNT - 3):

            if (
                board[r][c] == piece
                and board[r + 1][c] == piece
                and board[r + 2][c] == piece
                and board[r + 3][c] == piece
            ):
                return True

    # Positive Diagonal

    for c in range(COLUMN_COUNT - 3):

        for r in range(ROW_COUNT - 3):

            if (
                board[r][c] == piece
                and board[r + 1][c + 1] == piece
                and board[r + 2][c + 2] == piece
                and board[r + 3][c + 3] == piece
            ):
                return True

    # Negative Diagonal

    for c in range(COLUMN_COUNT - 3):

        for r in range(3, ROW_COUNT):

            if (
                board[r][c] == piece
                and board[r - 1][c + 1] == piece
                and board[r - 2][c + 2] == piece
                and board[r - 3][c + 3] == piece
            ):
                return True

    return False


# =========================
# TERMINAL STATE
# =========================

def is_terminal_node(board):

    return (
        winning_move(board, AI1_PIECE)
        or winning_move(board, AI2_PIECE)
        or board_full(board)
    )
# =========================
# HEURISTIC EVALUATION
# =========================

def evaluate_window(window, piece):
    """
    Đánh giá một cửa sổ gồm 4 ô.
    """

    score = 0

    opponent = AI1_PIECE
    if piece == AI1_PIECE:
        opponent = AI2_PIECE

    piece_count = window.count(piece)
    empty_count = window.count(EMPTY)
    opp_count = window.count(opponent)

    # Tấn công
    if piece_count == 4:
        score += 100000

    elif piece_count == 3 and empty_count == 1:
        score += 100

    elif piece_count == 2 and empty_count == 2:
        score += 10

    # Phòng thủ
    if opp_count == 3 and empty_count == 1:
        score -= 120

    elif opp_count == 2 and empty_count == 2:
        score -= 8

    return score


# =========================
# BOARD EVALUATION
# =========================

def score_position(board, piece):

    score = 0

    # -------------------------
    # Center Column
    # -------------------------

    center_array = [int(i) for i in board[:, COLUMN_COUNT // 2]]

    center_count = center_array.count(piece)

    score += center_count * 6

    # -------------------------
    # Horizontal
    # -------------------------

    for r in range(ROW_COUNT):

        row_array = [int(i) for i in board[r, :]]

        for c in range(COLUMN_COUNT - 3):

            window = row_array[c:c + WINDOW_LENGTH]

            score += evaluate_window(window, piece)

    # -------------------------
    # Vertical
    # -------------------------

    for c in range(COLUMN_COUNT):

        col_array = [int(i) for i in board[:, c]]

        for r in range(ROW_COUNT - 3):

            window = col_array[r:r + WINDOW_LENGTH]

            score += evaluate_window(window, piece)

    # -------------------------
    # Positive Diagonal
    # -------------------------

    for r in range(ROW_COUNT - 3):

        for c in range(COLUMN_COUNT - 3):

            window = [
                board[r + i][c + i]
                for i in range(WINDOW_LENGTH)
            ]

            score += evaluate_window(window, piece)

    # -------------------------
    # Negative Diagonal
    # -------------------------

    for r in range(ROW_COUNT - 3):

        for c in range(COLUMN_COUNT - 3):

            window = [
                board[r + 3 - i][c + i]
                for i in range(WINDOW_LENGTH)
            ]

            score += evaluate_window(window, piece)

    return score


# =========================
# COPY BOARD
# =========================

def make_move(board, col, piece):

    temp = board.copy()

    row = get_next_open_row(temp, col)

    drop_piece(temp, row, col, piece)

    return temp


# =========================
# TERMINAL SCORE
# =========================

def terminal_score(board, piece):

    opponent = AI1_PIECE

    if piece == AI1_PIECE:
        opponent = AI2_PIECE

    if winning_move(board, piece):
        return 1000000000

    if winning_move(board, opponent):
        return -1000000000

    return 0
# =========================
# MINIMAX + ALPHA BETA
# =========================

def minimax(board, depth, alpha, beta, maximizing, piece):

    opponent = AI1_PIECE
    if piece == AI1_PIECE:
        opponent = AI2_PIECE

    valid_locations = get_valid_locations(board)

    terminal = is_terminal_node(board)

    # ---------------------------------
    # Kết thúc tìm kiếm
    # ---------------------------------

    if depth == 0 or terminal:

        if terminal:

            if winning_move(board, piece):
                return (None, 1000000000)

            elif winning_move(board, opponent):
                return (None, -1000000000)

            else:
                return (None, 0)

        else:
            return (None, score_position(board, piece))

    # ---------------------------------
    # MAX PLAYER
    # ---------------------------------

    if maximizing:

        value = -math.inf
        best_column = random.choice(valid_locations)

        for col in valid_locations:

            row = get_next_open_row(board, col)

            temp_board = board.copy()

            drop_piece(temp_board, row, col, piece)

            new_score = minimax(
                temp_board,
                depth - 1,
                alpha,
                beta,
                False,
                piece
            )[1]

            if new_score > value:

                value = new_score
                best_column = col

            alpha = max(alpha, value)

            if alpha >= beta:
                break

        return best_column, value

    # ---------------------------------
    # MIN PLAYER
    # ---------------------------------

    else:

        value = math.inf
        best_column = random.choice(valid_locations)

        for col in valid_locations:

            row = get_next_open_row(board, col)

            temp_board = board.copy()

            drop_piece(temp_board, row, col, opponent)

            new_score = minimax(
                temp_board,
                depth - 1,
                alpha,
                beta,
                True,
                piece
            )[1]

            if new_score < value:

                value = new_score
                best_column = col

            beta = min(beta, value)

            if alpha >= beta:
                break

        return best_column, value


# =========================
# AI CHỌN NƯỚC ĐI
# =========================

def get_ai_move(board, piece, depth=5):

    column, score = minimax(
        board,
        depth,
        -math.inf,
        math.inf,
        True,
        piece
    )

    return column


# =========================
# AI THỰC HIỆN NƯỚC ĐI
# =========================

def ai_move(board, piece):

    col = get_ai_move(board, piece)

    if col is None:
        return False

    if not is_valid_location(board, col):
        return False

    row = get_next_open_row(board, col)

    drop_piece(board, row, col, piece)

    return True
# =========================
# DRAW BOARD
# =========================

def draw_board(board):

    screen.fill(BLACK)

    # Vẽ nền và lỗ
    for c in range(COLUMN_COUNT):
        for r in range(ROW_COUNT):

            pygame.draw.rect(
                screen,
                BLUE,
                (
                    c * SQUARESIZE,
                    r * SQUARESIZE + SQUARESIZE,
                    SQUARESIZE,
                    SQUARESIZE,
                ),
            )

            pygame.draw.circle(
                screen,
                BLACK,
                (
                    int(c * SQUARESIZE + SQUARESIZE / 2),
                    int(r * SQUARESIZE + SQUARESIZE + SQUARESIZE / 2),
                ),
                RADIUS,
            )

    # Vẽ quân cờ
    for c in range(COLUMN_COUNT):
        for r in range(ROW_COUNT):

            if board[r][c] == AI1_PIECE:

                pygame.draw.circle(
                    screen,
                    RED,
                    (
                        int(c * SQUARESIZE + SQUARESIZE / 2),
                        height - int(r * SQUARESIZE + SQUARESIZE / 2),
                    ),
                    RADIUS,
                )

            elif board[r][c] == AI2_PIECE:

                pygame.draw.circle(
                    screen,
                    YELLOW,
                    (
                        int(c * SQUARESIZE + SQUARESIZE / 2),
                        height - int(r * SQUARESIZE + SQUARESIZE / 2),
                    ),
                    RADIUS,
                )

    pygame.display.update()


# =========================
# PYGAME INITIALIZATION
# =========================

pygame.init()

SQUARESIZE = 100

width = COLUMN_COUNT * SQUARESIZE
height = (ROW_COUNT + 1) * SQUARESIZE

screen = pygame.display.set_mode((width, height))
pygame.display.set_caption("Connect 4 - AI vs AI")

RADIUS = int(SQUARESIZE / 2 - 5)

font = pygame.font.SysFont("Arial", 50)

board = create_board()

draw_board(board)

print_board(board)

turn = random.randint(AI1, AI2)

game_over = False


# =========================
# MAIN LOOP
# =========================

while not game_over:

    for event in pygame.event.get():

        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    pygame.time.wait(500)

    if turn == AI1:

        ai_move(board, AI1_PIECE)

        print_board(board)

        draw_board(board)

        if winning_move(board, AI1_PIECE):

            label = font.render(
                "AI 1 WINS!",
                True,
                RED,
            )

            screen.blit(label, (40, 20))

            pygame.display.update()

            game_over = True

        else:
            turn = AI2

    else:

        ai_move(board, AI2_PIECE)

        print_board(board)

        draw_board(board)

        if winning_move(board, AI2_PIECE):

            label = font.render(
                "AI 2 WINS!",
                True,
                YELLOW,
            )

            screen.blit(label, (40, 20))

            pygame.display.update()

            game_over = True

        else:
            turn = AI1

    if board_full(board) and not game_over:

        label = font.render(
            "DRAW",
            True,
            WHITE,
        )

        screen.blit(label, (40, 20))

        pygame.display.update()

        game_over = True

if game_over:

    pygame.time.wait(5000)

pygame.quit()