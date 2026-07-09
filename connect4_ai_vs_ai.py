import numpy as np
import random
import pygame
import sys
import math

# ==========================
# MÀU SẮC
# ==========================
BLUE = (0, 0, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)

# ==========================
# KÍCH THƯỚC BÀN CỜ
# ==========================
ROW_COUNT = 6
COLUMN_COUNT = 7
WINDOW_LENGTH = 4

EMPTY = 0
AI1_PIECE = 1
AI2_PIECE = 2

AI1 = 0
AI2 = 1


# ==========================
# TẠO BÀN CỜ
# ==========================
def create_board():
    return np.zeros((ROW_COUNT, COLUMN_COUNT))


def drop_piece(board, row, col, piece):
    board[row][col] = piece


def is_valid_location(board, col):
    return board[ROW_COUNT - 1][col] == EMPTY


def get_next_open_row(board, col):
    for r in range(ROW_COUNT):
        if board[r][col] == EMPTY:
            return r


def print_board(board):
    print(np.flip(board, 0))


# ==========================
# KIỂM TRA THẮNG
# ==========================
def winning_move(board, piece):

    # ngang
    for c in range(COLUMN_COUNT - 3):
        for r in range(ROW_COUNT):
            if (board[r][c] == piece and
                board[r][c+1] == piece and
                board[r][c+2] == piece and
                board[r][c+3] == piece):
                return True

    # dọc
    for c in range(COLUMN_COUNT):
        for r in range(ROW_COUNT - 3):
            if (board[r][c] == piece and
                board[r+1][c] == piece and
                board[r+2][c] == piece and
                board[r+3][c] == piece):
                return True

    # chéo /
    for c in range(COLUMN_COUNT - 3):
        for r in range(ROW_COUNT - 3):
            if (board[r][c] == piece and
                board[r+1][c+1] == piece and
                board[r+2][c+2] == piece and
                board[r+3][c+3] == piece):
                return True

    # chéo \
    for c in range(COLUMN_COUNT - 3):
        for r in range(3, ROW_COUNT):
            if (board[r][c] == piece and
                board[r-1][c+1] == piece and
                board[r-2][c+2] == piece and
                board[r-3][c+3] == piece):
                return True

    return False


# ==========================
# ĐÁNH GIÁ CỬA SỔ 4 Ô
# ==========================
def evaluate_window(window, piece):

    score = 0

    opponent = AI1_PIECE
    if piece == AI1_PIECE:
        opponent = AI2_PIECE

    if window.count(piece) == 4:
        score += 100

    elif window.count(piece) == 3 and window.count(EMPTY) == 1:
        score += 5

    elif window.count(piece) == 2 and window.count(EMPTY) == 2:
        score += 2

    if window.count(opponent) == 3 and window.count(EMPTY) == 1:
        score -= 4

    return score


# ==========================
# HÀM ĐÁNH GIÁ BÀN CỜ
# ==========================
def score_position(board, piece):

    score = 0

    center = [int(i) for i in list(board[:, COLUMN_COUNT // 2])]
    score += center.count(piece) * 3

    # ngang
    for r in range(ROW_COUNT):
        row = [int(i) for i in list(board[r, :])]

        for c in range(COLUMN_COUNT - 3):
            window = row[c:c + WINDOW_LENGTH]
            score += evaluate_window(window, piece)

    # dọc
    for c in range(COLUMN_COUNT):
        col = [int(i) for i in list(board[:, c])]

        for r in range(ROW_COUNT - 3):
            window = col[r:r + WINDOW_LENGTH]
            score += evaluate_window(window, piece)

    # chéo /
    for r in range(ROW_COUNT - 3):
        for c in range(COLUMN_COUNT - 3):
            window = [board[r+i][c+i] for i in range(WINDOW_LENGTH)]
            score += evaluate_window(window, piece)

    # chéo \
    for r in range(ROW_COUNT - 3):
        for c in range(COLUMN_COUNT - 3):
            window = [board[r+3-i][c+i] for i in range(WINDOW_LENGTH)]
            score += evaluate_window(window, piece)

    return score
# ==========================
# CÁC HÀM HỖ TRỢ
# ==========================

def get_valid_locations(board):
    valid_locations = []
    for col in range(COLUMN_COUNT):
        if is_valid_location(board, col):
            valid_locations.append(col)
    return valid_locations


def is_terminal_node(board):
    return (
        winning_move(board, AI1_PIECE)
        or winning_move(board, AI2_PIECE)
        or len(get_valid_locations(board)) == 0
    )


# ==========================
# MINIMAX
# ==========================

def minimax(board, depth, alpha, beta, maximizingPlayer, piece):

    valid_locations = get_valid_locations(board)
    terminal = is_terminal_node(board)

    if piece == AI1_PIECE:
        opponent = AI2_PIECE
    else:
        opponent = AI1_PIECE

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

    if maximizingPlayer:

        value = -math.inf
        column = random.choice(valid_locations)

        for col in valid_locations:

            row = get_next_open_row(board, col)
            temp = board.copy()

            drop_piece(temp, row, col, piece)

            new_score = minimax(
                temp,
                depth - 1,
                alpha,
                beta,
                False,
                piece
            )[1]

            if new_score > value:
                value = new_score
                column = col

            alpha = max(alpha, value)

            if alpha >= beta:
                break

        return column, value

    else:

        value = math.inf
        column = random.choice(valid_locations)

        for col in valid_locations:

            row = get_next_open_row(board, col)
            temp = board.copy()

            drop_piece(temp, row, col, opponent)

            new_score = minimax(
                temp,
                depth - 1,
                alpha,
                beta,
                True,
                piece
            )[1]

            if new_score < value:
                value = new_score
                column = col

            beta = min(beta, value)

            if alpha >= beta:
                break

        return column, value


# ==========================
# VẼ BÀN CỜ
# ==========================

def draw_board(board):

    for c in range(COLUMN_COUNT):
        for r in range(ROW_COUNT):

            pygame.draw.rect(
                screen,
                BLUE,
                (c*SQUARESIZE,
                 r*SQUARESIZE+SQUARESIZE,
                 SQUARESIZE,
                 SQUARESIZE)
            )

            pygame.draw.circle(
                screen,
                BLACK,
                (
                    int(c*SQUARESIZE+SQUARESIZE/2),
                    int(r*SQUARESIZE+SQUARESIZE+SQUARESIZE/2)
                ),
                RADIUS
            )

    for c in range(COLUMN_COUNT):
        for r in range(ROW_COUNT):

            if board[r][c] == AI1_PIECE:

                pygame.draw.circle(
                    screen,
                    RED,
                    (
                        int(c*SQUARESIZE+SQUARESIZE/2),
                        height-int(r*SQUARESIZE+SQUARESIZE/2)
                    ),
                    RADIUS
                )

            elif board[r][c] == AI2_PIECE:

                pygame.draw.circle(
                    screen,
                    YELLOW,
                    (
                        int(c*SQUARESIZE+SQUARESIZE/2),
                        height-int(r*SQUARESIZE+SQUARESIZE/2)
                    ),
                    RADIUS
                )

    pygame.display.update()


# ==========================
# MAIN
# ==========================

board = create_board()

pygame.init()

SQUARESIZE = 100

width = COLUMN_COUNT * SQUARESIZE
height = (ROW_COUNT + 1) * SQUARESIZE

screen = pygame.display.set_mode((width, height))
pygame.display.set_caption("Connect 4 - AI vs AI")

RADIUS = int(SQUARESIZE / 2 - 5)

font = pygame.font.SysFont("Arial", 50)

draw_board(board)

turn = random.randint(AI1, AI2)
game_over = False

while not game_over:

    for event in pygame.event.get():

        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    pygame.time.wait(500)

    if turn == AI1:

        col, _ = minimax(
            board,
            5,
            -math.inf,
            math.inf,
            True,
            AI1_PIECE
        )

        if is_valid_location(board, col):

            row = get_next_open_row(board, col)

            drop_piece(board, row, col, AI1_PIECE)

            if winning_move(board, AI1_PIECE):

                label = font.render(
                    "AI 1 WINS!",
                    True,
                    RED
                )

                screen.blit(label, (40, 20))
                game_over = True

            draw_board(board)

            turn = AI2

    else:

        col, _ = minimax(
            board,
            5,
            -math.inf,
            math.inf,
            True,
            AI2_PIECE
        )

        if is_valid_location(board, col):

            row = get_next_open_row(board, col)

            drop_piece(board, row, col, AI2_PIECE)

            if winning_move(board, AI2_PIECE):

                label = font.render(
                    "AI 2 WINS!",
                    True,
                    YELLOW
                )

                screen.blit(label, (40, 20))
                game_over = True

            draw_board(board)

            turn = AI1

    print_board(board)

    if len(get_valid_locations(board)) == 0 and not game_over:

        label = font.render(
            "DRAW!",
            True,
            (255,255,255)
        )

        screen.blit(label, (40,20))

        game_over = True

if game_over:

    pygame.display.update()

    pygame.time.wait(5000)