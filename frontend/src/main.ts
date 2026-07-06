import './style.css'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'


export const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'http://localhost:8000' 
    : 'https://ai-games-project-wkyu.onrender.com';

    
// Import hàm khởi tạo Tab từ dashboard
import { initDashboardTabs, fetchTelemetry } from './dashboard';

// Khởi tạo tính năng chuyển Tab cho trang Thống kê (NẾU THIẾU DÒNG NÀY SẼ BỊ LỖI KHÔNG CLICK ĐƯỢC)
initDashboardTabs();
fetchTelemetry();
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
document.getElementById('card-stats')?.addEventListener('click', () => {
    showView('stats');
    // Cập nhật lại số liệu mới nhất khi mở trang
    import('./dashboard').then(m => m.refreshDashboard());
});

// === ĐĂNG KÝ CÁC MODULE GAME ===
import './games/chess';
import './games/snake';
import './games/connect4';
import './games/flappy';
import './games/game2048';