// Make sure this code is properly loaded
document.addEventListener('DOMContentLoaded', () => {
    let currentScreen = 'main-menu';
    let gameInitialized = false;

    window.showScreen = function(screenId) {
        // Hide all screens
        document.querySelectorAll('.menu-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show selected screen
        document.getElementById(screenId).classList.add('active');
        currentScreen = screenId;
        
        // Toggle game-active class
        document.querySelector('.content-wrapper').classList.toggle('game-active', screenId === 'game-screen');
    }

    window.startGame = function(mode) {
        if (mode === 'endless') {
            // First, create and add the canvas
            const gameScreen = document.getElementById('game-screen');
            gameScreen.innerHTML = '<canvas id="gameCanvas" width="400" height="600"></canvas>';
            
            // Show the game screen
            showScreen('game-screen');
            
            // Wait a frame before initializing the game
            requestAnimationFrame(() => {
                if (typeof initGame === 'function') {
                    initGame();
                } else {
                    console.error('Game initialization function not found');
                }
            });
        } else {
            showScreen('wip-menu');
        }
    }

    window.exitGame = function() {
        // Stop the game loop if it exists
        if (typeof stopGame === 'function') {
            stopGame();
        }
        
        // Clear the game screen
        const gameScreen = document.getElementById('game-screen');
        gameScreen.innerHTML = '';
        
        // Return to modes menu
        showScreen('modes-menu');
    }

    // Show main menu initially
    showScreen('main-menu');
}); 