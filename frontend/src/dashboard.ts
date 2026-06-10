// BỘ KHO LƯU TRỮ CHỈ SỐ THỰC TẾ TRONG SUỐT QUÁ TRÌNH CHẠY LOCAL
export const realStats = {
    chess: {
        wins: 0, draws: 0, losses: 0, 
        totalInfTime: 0, movesCount: 0
    },
    snake: {
        games: 0, bestScore: 0, totalScore: 0,
        deathWall: 0, deathTail: 0, deathStarve: 0,
        maxCoverage: 0, totalFoodSteps: 0, foodEaten: 0,
        dirUp: 0, dirDown: 0, dirLeft: 0, dirRight: 0
    }
};

export async function refreshDashboard() {
    // Gọi API lấy dữ liệu huấn luyện thực tế từ Server Python
    try {
        const res = await fetch('http://localhost:8000/api/stats');
        const data = await res.json();
        document.getElementById('ui-chess-trained')!.innerText = (data.chess_trained_games / 1000).toFixed(1) + "K games";
        document.getElementById('ui-snake-trained')!.innerText = (data.snake_trained_episodes / 1000).toFixed(1) + "K eps";
        document.getElementById('ui-snake-epsilon')!.innerText = data.snake_epsilon;
    } catch (e) {
        document.getElementById('ui-chess-trained')!.innerText = "N/A";
        document.getElementById('ui-snake-trained')!.innerText = "N/A";
    }

    // CẬP NHẬT LIVE CHESS METRICS (100% SỐ THẬT)
    const { wins, draws, losses, totalInfTime, movesCount } = realStats.chess;
    const totalChessGames = wins + draws + losses;
    
    document.getElementById('ui-chess-total-matches')!.innerText = totalChessGames.toString();
    document.getElementById('ui-chess-total-moves')!.innerText = movesCount.toString();

    if (movesCount > 0) {
        const avgInf = (totalInfTime / movesCount).toFixed(1);
        document.getElementById('ui-chess-inf')!.innerHTML = `${avgInf} <span class="trend neutral">ms/nước</span>`;
    }
    
    if (totalChessGames > 0) {
        const winrate = ((wins / totalChessGames) * 100).toFixed(1);
        document.getElementById('ui-chess-winrate')!.innerText = `${winrate}%`;
        document.getElementById('wdl-w')!.style.width = `${(wins / totalChessGames) * 100}%`;
        document.getElementById('wdl-d')!.style.width = `${(draws / totalChessGames) * 100}%`;
        document.getElementById('wdl-l')!.style.width = `${(losses / totalChessGames) * 100}%`;
    }

    // CẬP NHẬT LIVE SNAKE METRICS (100% SỐ THẬT)
    const s = realStats.snake;
    document.getElementById('ui-snake-best')!.innerText = s.bestScore.toString();
    document.getElementById('ui-snake-avg')!.innerText = s.games > 0 ? (s.totalScore / s.games).toFixed(1) : "0.0";
    document.getElementById('ui-snake-coverage')!.innerText = `${s.maxCoverage.toFixed(1)}%`;
    document.getElementById('ui-snake-dist')!.innerHTML = s.foodEaten > 0 ? `${(s.totalFoodSteps / s.foodEaten).toFixed(1)} <span class="trend neutral">steps</span>` : "0";

    // Phân bổ nguyên nhân chết thực tế
    const totalDeaths = s.deathWall + s.deathTail + s.deathStarve;
    if (totalDeaths > 0) {
        document.getElementById('bar-wall')!.style.width = `${(s.deathWall / totalDeaths) * 100}%`;
        document.getElementById('bar-tail')!.style.width = `${(s.deathTail / totalDeaths) * 100}%`;
        document.getElementById('bar-starve')!.style.width = `${(s.deathStarve / totalDeaths) * 100}%`;
        document.getElementById('txt-wall')!.innerText = s.deathWall.toString();
        document.getElementById('txt-tail')!.innerText = s.deathTail.toString();
        document.getElementById('txt-starve')!.innerText = s.deathStarve.toString();
    }

    // Phân bổ hướng di chuyển thực tế
    const totalDirs = s.dirUp + s.dirDown + s.dirLeft + s.dirRight;
    if (totalDirs > 0) {
        document.getElementById('bar-up')!.style.width = `${(s.dirUp / totalDirs) * 100}%`;
        document.getElementById('bar-down')!.style.width = `${(s.dirDown / totalDirs) * 100}%`;
        document.getElementById('bar-left')!.style.width = `${(s.dirLeft / totalDirs) * 100}%`;
        document.getElementById('bar-right')!.style.width = `${(s.dirRight / totalDirs) * 100}%`;
    }
}