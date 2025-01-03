document.addEventListener('DOMContentLoaded', () => {
    let currentScreen = 'main-menu';
    let gameInstance = null;

    window.showScreen = function(screenId) {
        document.querySelectorAll('.menu-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        document.getElementById(screenId).classList.add('active');
        currentScreen = screenId;
    }

    window.startGame = function(mode) {
        if (mode === 'endless') {
            const gameScreen = document.getElementById('game-screen');
            gameScreen.innerHTML = '<canvas id="gameCanvas" width="400" height="600"></canvas>';
            
            showScreen('game-screen');
            
            if (typeof initGame === 'function') {
                initGame();
            } else {
                console.error('Game initialization function not found');
            }
        } else {
            showScreen('wip-menu');
        }
    }

    window.exitGame = function() {
        if (typeof stopGame === 'function') {
            stopGame();
        }
        
        const gameScreen = document.getElementById('game-screen');
        gameScreen.innerHTML = '';
        
        showScreen('modes-menu');
    }

    showScreen('main-menu');
}); 