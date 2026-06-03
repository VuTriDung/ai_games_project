import pygame
import sys

# Khởi tạo các module của pygame
pygame.init()

# Thiết lập kích thước cửa sổ game
WIDTH, HEIGHT = 600, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("AI Chess Project - Base Code")

# Vòng lặp game chính (Game Loop)
while True:
    # Bắt các sự kiện (ví dụ: bấm nút X để đóng cửa sổ)
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    # Đổ màu nền cho giao diện (Sử dụng mã màu RGB, ví dụ màu hồng Sakura: 255, 182, 193)
    screen.fill((255, 182, 193))

    # Cập nhật thay đổi lên màn hình
    pygame.display.flip()