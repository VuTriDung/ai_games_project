import random
import copy


# Hàm đánh giá bàn cờ
def evaluate_board(grid):
    size = 4
    score = 0
    empty_cells = sum(row.count(0) for row in grid)

    # 1. Ưu tiên ô trống
    score += empty_cells * 100

    # 2. Độ mượt (smoothness) - tổng chênh lệch giữa các ô kề nhau
    smoothness = 0
    for i in range(size):
        for j in range(size):
            if grid[i][j] != 0:
                if j < size - 1 and grid[i][j + 1] != 0:
                    smoothness -= abs(grid[i][j] - grid[i][j + 1])
                if i < size - 1 and grid[i + 1][j] != 0:
                    smoothness -= abs(grid[i][j] - grid[i + 1][j])
    score += smoothness * 2

    # 3. Tính đơn điệu (monotonicity) - khuyến khích các ô lớn ở góc
    # Kiểm tra xu hướng tăng dần theo hàng ngang và dọc
    mono = 0
    for i in range(size):
        for j in range(size - 1):
            if grid[i][j] != 0 and grid[i][j + 1] != 0:
                if grid[i][j] > grid[i][j + 1]:
                    mono += grid[i][j + 1] - grid[i][j]
                else:
                    mono += grid[i][j] - grid[i][j + 1]
    score += mono * 1.5

    # 4. Phần thưởng nếu ô lớn nhất nằm ở góc
    max_tile = max(max(row) for row in grid)
    if grid[0][0] == max_tile:
        score += 500

    return score


# Hàm di chuyển và trả về grid mới (không thay đổi grid gốc)
def simulate_move(grid, direction):
    size = 4
    new_grid = [row[:] for row in grid]

    # Xoay ma trận để chuẩn hóa về di chuyển sang trái
    def rotate(times):
        nonlocal new_grid
        for _ in range(times):
            new_grid = [
                [new_grid[size - 1 - c][r] for c in range(size)] for r in range(size)
            ]

    # Thực hiện di chuyển sang trái
    def move_left():
        moved = False
        for r in range(size):
            row = [v for v in new_grid[r] if v != 0]
            merged = []
            i = 0
            while i < len(row):
                if i + 1 < len(row) and row[i] == row[i + 1]:
                    merged.append(row[i] * 2)
                    i += 2
                else:
                    merged.append(row[i])
                    i += 1
            while len(merged) < size:
                merged.append(0)
            if new_grid[r] != merged:
                moved = True
            new_grid[r] = merged
        return moved

    # Áp dụng xoay cho hướng
    if direction == "up":
        rotate(1)  # xoay 90 độ
    elif direction == "right":
        rotate(2)  # xoay 180
    elif direction == "down":
        rotate(3)  # xoay 270

    moved = move_left()

    # Xoay ngược lại
    if direction == "up":
        rotate(3)
    elif direction == "right":
        rotate(2)
    elif direction == "down":
        rotate(1)

    if not moved:
        return None  # không thể di chuyển
    return new_grid


# Thuật toán Expectimax
def expectimax(grid, depth, is_maximizing):
    if depth == 0:
        return evaluate_board(grid)

    size = 4
    if is_maximizing:
        best_score = -float("inf")
        for direction in ["up", "down", "left", "right"]:
            new_grid = simulate_move(grid, direction)
            if new_grid is not None:
                score = expectimax(new_grid, depth - 1, False)
                best_score = max(best_score, score)
        return best_score if best_score != -float("inf") else evaluate_board(grid)
    else:
        # Lượt của thiên nhiên (spawn 2 hoặc 4)
        empty_cells = [
            (i, j) for i in range(size) for j in range(size) if grid[i][j] == 0
        ]
        if not empty_cells:
            return evaluate_board(grid)
        total_score = 0
        for i, j in empty_cells:
            # Thử đặt 2 (xác suất 0.9) và 4 (xác suất 0.1)
            g1 = [row[:] for row in grid]
            g1[i][j] = 2
            total_score += 0.9 * expectimax(g1, depth - 1, True)

            g2 = [row[:] for row in grid]
            g2[i][j] = 4
            total_score += 0.1 * expectimax(g2, depth - 1, True)

        return total_score / len(empty_cells)


# Hàm chính để chọn nước đi tốt nhất
def get_best_move_2048(grid):
    best_dir = None
    best_score = -float("inf")
    for direction in ["up", "down", "left", "right"]:
        new_grid = simulate_move(grid, direction)
        if new_grid is not None:
            score = expectimax(new_grid, depth=3, is_maximizing=False)
            if score > best_score:
                best_score = score
                best_dir = direction
    if best_dir is None:
        # nếu không có nước đi hợp lệ, chọn ngẫu nhiên
        return random.choice(["up", "down", "left", "right"])
    return best_dir
