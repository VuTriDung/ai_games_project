import './style.css'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

// === ROUTER QUẢN LÝ CHUYỂN TRANG ===
export function showView(viewName: string) { 
    ['view-hub', 'view-intro', 'view-game', 'view-snake', 'view-stats', 'view-connect4', 'view-flappy', 'view-2048']
    .forEach(id => document.getElementById(id)?.classList.add('hidden'));
    
    document.getElementById(`view-${viewName}`)?.classList.remove('hidden');
}

// Bắt sự kiện quay về Hub từ tất cả các trang
document.querySelectorAll('[id^="btn-exit-"], #btn-back-hub, #btn-back-hub-stats').forEach(btn => {
    btn.addEventListener('click', () => showView('hub'));
});

// Bắt sự kiện chuyển sang trang Thống kê
document.getElementById('card-stats')?.addEventListener('click', () => showView('stats'));

// === ĐĂNG KÝ CÁC MODULE GAME ===
// Các file này tự động lắng nghe sự kiện khi được import
import './games/chess';
import './games/snake';
import './games/connect4';
import './games/flappy';
import './games/game2048';