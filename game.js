// Game variables
let canvas, ctx;
let gameLoop;
let player;
let platforms = [];
let clouds = [];
let gameOver = false;
let score = 0;
let totalHeight = 0;
let highScore = parseInt(localStorage.getItem('endlessHighScore')) || 0;
let isPaused = false;
let countingDown = false;
let countdown = 3;
let lastTime = 0;
let activeKeys = new Set();
let touchedPlatforms = new Set();
let stars = [];
const STARS_START = 25000;  // Start seeing stars at 25,000 feet
const STARS_FULL = 70000;   // Maximum star density at 70,000 feet
let shootingStars = [];
const SHOOTING_STAR_FREQUENCY = 1; // Increase frequency of shooting stars
let shootingStarTimer;

// Platform properties
const platformWidth = 80;
const platformHeight = 15;
const platformGap = 100;

// Cloud properties
const CLOUD_FADE_START = 20000;
const CLOUD_FADE_END = 60000;

// Load audio files
const bounceSound = new Audio('audio/bounce.wav');
const dingSound = new Audio('audio/ding.wav');
const bgMusic = new Audio('audio/bg.wav');

bounceSound.volume = 0.03; // 3% volume
bgMusic.loop = true;

function playBackgroundMusic() {
    bgMusic.play().catch(error => {
        console.error("Error playing background music:", error);
    });
}

function playBounceSound() {
    bounceSound.currentTime = 0; 
    bounceSound.play().catch(error => {
        console.error("Error playing bounce sound:", error);
    });
}

function playDingSound() {
    dingSound.currentTime = 0; 
    dingSound.play().catch(error => {
        console.error("Error playing ding sound:", error);
    });
}

class Star {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.baseSize = size;
        this.size = size;
        this.alpha = Math.random() * 0.5 + 0.5;
        this.pulseSpeed = Math.random() * 0.005 + 0.002;
        this.pulseOffset = Math.random() * Math.PI * 2;
        this.timeOffset = Math.random() * 1000;
        this.color = this.generateStarColor();
    }

    generateStarColor() {
        // Array of possible star colors (mostly white with slight variations)
        const colors = [
            {r: 255, g: 255, b: 255},    // Pure white
            {r: 255, g: 255, b: 230},    // Slightly warm
            {r: 230, g: 255, b: 255},    // Slightly cool
            {r: 255, g: 240, b: 230},    // Slightly pink
            {r: 240, g: 240, b: 255}     // Slightly blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update(time) {
        const pulse = Math.sin((time + this.timeOffset) * this.pulseSpeed + this.pulseOffset);
        this.size = this.baseSize * (1 + pulse * 0.2);
        this.alpha = 0.6 + pulse * 0.4;
    }

    draw(ctx) {
        // Main star
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        ctx.fill();

        // Inner glow
        const innerGlow = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * 2
        );
        innerGlow.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha * 0.7})`);
        innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = innerGlow;
        ctx.fill();

        // Outer glow
        const outerGlow = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size * 4
        );
        outerGlow.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha * 0.3})`);
        outerGlow.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha * 0.1})`);
        outerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = outerGlow;
        ctx.fill();

        // Cross glare effect
        ctx.save();
        ctx.globalAlpha = this.alpha * 0.4;
        ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        ctx.lineWidth = this.size / 4;
        ctx.beginPath();
        
        // Horizontal line
        ctx.moveTo(this.x - this.size * 2, this.y);
        ctx.lineTo(this.x + this.size * 2, this.y);
        
        // Vertical line
        ctx.moveTo(this.x, this.y - this.size * 2);
        ctx.lineTo(this.x, this.y + this.size * 2);
        
        ctx.stroke();
        ctx.restore();
    }
}

class ShootingStar {
    constructor() {
        this.reset();
        // Initialize at random position along the top and right edges
        const startFromTop = Math.random() > 0.5;
        if (startFromTop) {
            this.x = Math.random() * canvas.width;
            this.y = -20;
        } else {
            this.x = canvas.width + 20;
            this.y = Math.random() * (canvas.height);
        }
    }

    reset() {
        // Angle between -30 and -60 degrees (converted to radians)
        this.angle = (-30 - Math.random() * 30) * Math.PI / 180;
        this.speed = 15 + Math.random() * 25;
        this.length = 150 + Math.random() * 200;
        this.opacity = 0;
        this.fadeInSpeed = 0.05;
        this.fadeOutSpeed = 0.02;
        this.active = true;
    }

    update() {
        if (!this.active) return;

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Fade in
        if (this.opacity < 1) {
            this.opacity += this.fadeInSpeed;
        }

        // Start fading out when near edge
        if (this.x < 0 || this.y > canvas.height) {
            this.opacity -= this.fadeOutSpeed;
            if (this.opacity <= 0) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (!this.active || this.opacity <= 0) return;

        ctx.save();
        
        const gradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x - Math.cos(this.angle) * this.length,
            this.y - Math.sin(this.angle) * this.length
        );
        
        // Main streak
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
        gradient.addColorStop(0.1, `rgba(255, 255, 255, ${this.opacity * 0.8})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        // Draw the main streak
        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x - Math.cos(this.angle) * this.length,
            this.y - Math.sin(this.angle) * this.length
        );
        ctx.stroke();

        // Add a glowing effect
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.3})`;
        ctx.lineWidth = 4;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x - Math.cos(this.angle) * (this.length * 0.7),
            this.y - Math.sin(this.angle) * (this.length * 0.7)
        );
        ctx.stroke();

        ctx.restore();
    }
}

function generatePlatforms() {
    platforms = [];
    
    // Add starting platform
    platforms.push({
        x: canvas.width / 2 - platformWidth / 2,
        y: canvas.height - 50,
        width: platformWidth,
        height: platformHeight
    });

    // Generate initial platforms with random positions
    let y = canvas.height - 150;
    for (let i = 0; i < 6; i++) {
        platforms.push({
            x: Math.random() * (canvas.width - platformWidth),
            y: y,
            width: platformWidth,
            height: platformHeight
        });
        y -= platformGap;
    }
}

function generateCloud() {
    const heightInFeet = totalHeight * 3.28084;
    
    if (heightInFeet >= CLOUD_FADE_END) {
        return {
            x: 0,
            y: -1000,
            width: 0,
            height: 0,
            speed: 0,
            color: 'rgba(0,0,0,0)',
            layer: 0
        };
    }

    const density = getCloudDensity(heightInFeet);
    const greyShade = Math.floor(Math.random() * 20) + 80;
    
    // Different speed ranges for each layer
    const speeds = [
        [-0.3, 0.3],    // Layer 0: Slowest
        [-0.5, 0.5],    // Layer 1: Medium
        [-0.7, 0.7]     // Layer 2: Fastest
    ];
    
    const layer = Math.floor(Math.random() * 3);
    const [minSpeed, maxSpeed] = speeds[layer];
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    
    // Base sizes for clouds
    const baseWidth = Math.random() * 120 + 60;
    const baseHeight = Math.random() * 60 + 30;
    
    // Adjust size based on height
    const sizeMultiplier = density;
    const width = baseWidth * sizeMultiplier;
    const height = baseHeight * sizeMultiplier;
    
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        width: width,
        height: height,
        speed: speed,
        color: `rgba(${greyShade}%, ${greyShade}%, ${greyShade}%, ${density * 0.8})`,
        layer: layer
    };
}

function getCloudDensity(heightInFeet) {
    if (heightInFeet >= CLOUD_FADE_END) {
        return 0; // No clouds above 60,000 feet
    } else if (heightInFeet < CLOUD_FADE_START) {
        return 1; // Full density below 20,000 feet
    } else {
        return 1 - ((heightInFeet - CLOUD_FADE_START) / (CLOUD_FADE_END - CLOUD_FADE_START));
    }
}

function drawCloud(cloud) {
    const centerX = cloud.x + cloud.width / 2;
    const centerY = cloud.y + cloud.height / 2;
    
    ctx.fillStyle = cloud.color;
    
    const numCircles = 5;
    const radiusX = cloud.width / 4;
    const radiusY = cloud.height / 4;

    for (let i = 0; i < numCircles; i++) {
        const offsetX = (i - 2) * radiusX;
        const offsetY = Math.sin(i * Math.PI / 3) * radiusY / 2;
        
        ctx.beginPath();
        ctx.ellipse(
            centerX + offsetX,
            centerY + offsetY,
            radiusX,
            radiusY,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

// Update sky colors with new space gradients
const skyColors = {
    ground: {
        top: '#87CEEB',    // Light blue
        bottom: '#B0E2FF'  // Lighter blue
    },
    middle: {
        top: '#4A90E2',    // Medium blue
        bottom: '#76B4FF'  // Light blue
    },
    high: {
        top: '#1a1a4c',    // Deep blue/purple
        bottom: '#2d2d7a'  // Lighter deep blue
    },
    space: {
        top: '#0d0d2b',    // Very dark blue
        bottom: '#1a1a3c'  // Dark blue
    },
    outerSpace: {
        top: '#000000',    // Pure black
        bottom: '#1a1a4c'  // Deep blue (atmosphere glow)
    },
    deepSpace: {
        top: '#000000',    // Pure black
        bottom: '#000000'  // Pure black
    }
};

function interpolateColor(color1, color2, factor) {
    // Convert hex to RGB
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    
    // Interpolate each channel
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    
    // Convert back to hex
    return rgbToHex(r, g, b);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function getSkyGradient(height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const heightInFeet = height * 3.28084;
    
    // Define height ranges for transitions
    const ranges = {
        ground: { start: 0, end: 3_000 },
        middle: { start: 3_000, end: 10_000 },
        high: { start: 10_000, end: 25_000 },
        space: { start: 25_000, end: 45_000 },
        outerSpace: { start: 45_000, end: 80_000 },
        deepSpace: { start: 80_000, end: 100_000 }
    };
    
    let topColor, bottomColor;
    
    if (heightInFeet <= ranges.ground.end) {
        // Ground level
        topColor = skyColors.ground.top;
        bottomColor = skyColors.ground.bottom;
    } 
    else if (heightInFeet <= ranges.middle.end) {
        // Ground to middle transition
        const factor = (heightInFeet - ranges.ground.end) / (ranges.middle.end - ranges.ground.end);
        topColor = interpolateColor(skyColors.ground.top, skyColors.middle.top, factor);
        bottomColor = interpolateColor(skyColors.ground.bottom, skyColors.middle.bottom, factor);
    } 
    else if (heightInFeet <= ranges.high.end) {
        // Middle to high transition
        const factor = (heightInFeet - ranges.middle.end) / (ranges.high.end - ranges.middle.end);
        topColor = interpolateColor(skyColors.middle.top, skyColors.high.top, factor);
        bottomColor = interpolateColor(skyColors.middle.bottom, skyColors.high.bottom, factor);
    } 
    else if (heightInFeet <= ranges.space.end) {
        // High to space transition
        const factor = (heightInFeet - ranges.high.end) / (ranges.space.end - ranges.high.end);
        topColor = interpolateColor(skyColors.high.top, skyColors.space.top, factor);
        bottomColor = interpolateColor(skyColors.high.bottom, skyColors.space.bottom, factor);
    }
    else if (heightInFeet <= ranges.outerSpace.end) {
        // Space to outer space transition (starting to see pure black at top)
        const factor = (heightInFeet - ranges.space.end) / (ranges.outerSpace.end - ranges.space.end);
        topColor = interpolateColor(skyColors.space.top, skyColors.outerSpace.top, factor);
        bottomColor = interpolateColor(skyColors.space.bottom, skyColors.outerSpace.bottom, factor);
    }
    else {
        // Outer space to deep space transition (fading to complete black)
        const factor = Math.min((heightInFeet - ranges.outerSpace.end) / 
                              (ranges.deepSpace.end - ranges.outerSpace.end), 1);
        topColor = skyColors.deepSpace.top; // Always pure black
        bottomColor = interpolateColor(skyColors.outerSpace.bottom, skyColors.deepSpace.bottom, factor);
    }
    
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    
    return gradient;
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        return;
    }

    console.log('Game initializing...');

    // Initialize game state
    gameOver = false;
    isPaused = false;
    countingDown = false;
    countdown = 3;
    score = 0;
    totalHeight = 0;
    
    // Initialize player
    player = {
        x: canvas.width / 2 - 20,
        y: canvas.height - 100,
        width: 40,
        height: 40,
        velocityY: 0,
        velocityX: 0,
        speed: 5,
        jumpForce: -15,
        gravity: 0.5
    };

    // Clear and generate platforms
    platforms = [];
    generatePlatforms();
    
    // Generate clouds
    clouds = [];
    for (let i = 0; i < 15; i++) {
        clouds.push(generateCloud());
    }

    draw();

    // Start game loop
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
    }
    gameLoop = requestAnimationFrame(update);

    // Set up keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Clear touched platforms
    touchedPlatforms.clear();

    console.log('Game initialized!');

    stars = [];
    generateInitialStars();
    shootingStars = [new ShootingStar()];
    startShootingStarTimer();
    playBackgroundMusic();
}

function handleKeyDown(e) {
    activeKeys.add(e.key);
}

function handleKeyUp(e) {
    activeKeys.delete(e.key);
}

function update() {
    if (isPaused) {
        if (countingDown) {
            const currentTime = Date.now();
            if (currentTime - lastTime >= 1000) {
                countdown--;
                lastTime = currentTime;
                if (countdown <= 0) {
                    countingDown = false;
                    isPaused = false;
                }
            }
        }
        draw();
        gameLoop = requestAnimationFrame(update);
        return;
    }

    // Handle keyboard input
    if (activeKeys.has('ArrowLeft')) {
        player.velocityX = -player.speed;
    } else if (activeKeys.has('ArrowRight')) {
        player.velocityX = player.speed;
    } else {
        player.velocityX = 0;
    }

    player.velocityY += player.gravity;
    
    player.x += player.velocityX;
    player.y += player.velocityY;

    if (player.x + player.width < 0) {
        player.x = canvas.width;
    } else if (player.x > canvas.width) {
        player.x = -player.width;
    }

    clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        
        if (cloud.x > canvas.width + cloud.width) {
            cloud.x = -cloud.width;
        } else if (cloud.x < -cloud.width) {
            cloud.x = canvas.width + cloud.width;
        }
    });

    if (player.y < canvas.height / 2) {
        const cameraDiff = canvas.height / 2 - player.y;
        totalHeight += cameraDiff;
        
        player.y += cameraDiff;
        platforms.forEach(platform => {
            platform.y += cameraDiff;
        });

        clouds.forEach(cloud => {
            const heightInFeet = totalHeight * 3.28084;
            
            if (heightInFeet >= CLOUD_FADE_END) {
                cloud.y = -1000;
                return;
            }

            cloud.y += cameraDiff * (1 + cloud.layer * 0.2);
            
            if (cloud.y > canvas.height + 100) {
                const cloudDensity = getCloudDensity(heightInFeet);
                
                if (cloudDensity > 0 && Math.random() < cloudDensity) {
                    cloud.y = -cloud.height;
                    cloud.x = Math.random() * canvas.width;
                    
                    const baseWidth = Math.random() * 120 + 60;
                    const baseHeight = Math.random() * 60 + 30;
                    cloud.width = baseWidth * cloudDensity;
                    cloud.height = baseHeight * cloudDensity;
                    
                    const greyShade = Math.floor(Math.random() * 20) + 80;
                    cloud.color = `rgba(${greyShade}%, ${greyShade}%, ${greyShade}%, ${cloudDensity * 0.8})`;
                } else {
                    cloud.y = -1000; 
                }
            }
        });

        platforms = platforms.filter(platform => platform.y < canvas.height + 100);
        while (platforms.length < 7) {
            platforms.push({
                x: Math.random() * (canvas.width - platformWidth),
                y: platforms[platforms.length - 1].y - platformGap,
                width: platformWidth,
                height: platformHeight
            });
        }

        stars.forEach(star => {
            star.y += cameraDiff;
            
            if (star.y > canvas.height + star.size) {
                star.y = -star.size;
                star.x = Math.random() * canvas.width;
            } else if (star.y < -star.size) {
                star.y = canvas.height + star.size;
                star.x = Math.random() * canvas.width;
            }
        });
    }

    platforms.forEach(platform => {
        if (player.velocityY > 0 && 
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height > platform.y &&
            player.y + player.height < platform.y + platform.height + player.velocityY
        ) {
            player.y = platform.y - player.height;
            player.velocityY = player.jumpForce;
            
            playBounceSound();

            const platformId = `${platform.x},${platform.y}`;
            if (!touchedPlatforms.has(platformId)) {
                score++;
                touchedPlatforms.add(platformId);

                if (score % 10 === 0) {
                    playDingSound();
                }
            }
        }
    });

    // Game over check - if player falls below screen
    if (player.y > canvas.height) {
        gameOver = true;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('endlessHighScore', highScore.toString());
        }
        draw();
        return;
    }

    shootingStars.forEach(star => star.update());
    shootingStars = shootingStars.filter(star => star.active);

    draw();
    
    if (!gameOver) {
        gameLoop = requestAnimationFrame(update);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = getSkyGradient(totalHeight);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const heightInFeet = totalHeight * 3.28084;
    const starDensity = getStarDensity(heightInFeet);
    
    if (starDensity > 0) {
        const visibleStars = Math.floor(stars.length * starDensity);
        const currentTime = Date.now();
        
        ctx.globalCompositeOperation = 'lighter';
        
        for (let i = 0; i < visibleStars; i++) {
            stars[i].update(currentTime);
            stars[i].draw(ctx);
        }
     
        ctx.globalCompositeOperation = 'source-over';
    }

    const cloudDensity = getCloudDensity(heightInFeet);
    
    for (let layer = 0; layer < 3; layer++) {
        clouds.filter(cloud => cloud.layer === layer).forEach(cloud => {
            if (cloud.y < canvas.height + 100 && cloud.y > -cloud.height) {
                drawCloud(cloud);
            }
        });
    }

    ctx.fillStyle = 'rgba(74, 189, 74, 0.8)';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });
    
    drawPlayerGlow(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#2196F3';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`High Score: ${highScore}`, 10, 60);
    ctx.fillText(`Height: ${Math.floor(totalHeight * 3.28084).toLocaleString()} ft`, 10, 90);
    ctx.shadowBlur = 0;

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px Arial';
        
        if (countingDown) {
            ctx.fillText(`${countdown}`, canvas.width/2, canvas.height/2);
        } else {
            ctx.fillText('PAUSED', canvas.width/2, canvas.height/2 - 30);
            ctx.font = 'bold 20px Arial';
            ctx.fillText('Press P to resume', canvas.width/2, canvas.height/2 + 20);
        }
    }

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px Arial';
        ctx.fillText('Game Over!', canvas.width/2, canvas.height/2 - 40);
        
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`Final Score: ${score}`, canvas.width/2, canvas.height/2 + 10);
        ctx.fillText(`High Score: ${highScore}`, canvas.width/2, canvas.height/2 + 40);
        ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 80);
    }

    if (heightInFeet > STARS_START) {
        ctx.globalCompositeOperation = 'lighter';
        shootingStars.forEach(star => star.draw(ctx));
        ctx.globalCompositeOperation = 'source-over';
    }
}

function stopGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
}

// Add key handler for R and P
document.addEventListener('keydown', function(e) {
    if (e.key.toLowerCase() === 'r' && gameOver) {
        initGame();
    } else if (e.key.toLowerCase() === 'p' && !gameOver) {
        togglePause();
    } else {
        handleKeyDown(e);
    }
});

function togglePause() {
    if (gameOver) return;
    
    if (!isPaused) {
        isPaused = true;
    } else {
        countingDown = true;
        countdown = 3;
        lastTime = Date.now();
    }
}

function exitGame() {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    activeKeys.clear();
    
    touchedPlatforms.clear();
    
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    stopShootingStarTimer();
}

// star generation function
function generateInitialStars() {
    const maxStars = 200;
    for (let i = 0; i < maxStars; i++) {
        stars.push(new Star(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 2 + 0.5  
        ));
    }
}

// star density calculation
function getStarDensity(heightInFeet) {
    if (heightInFeet < STARS_START) {
        return 0;
    } else if (heightInFeet > STARS_FULL) {
        return 1;
    }
    return (heightInFeet - STARS_START) / (STARS_FULL - STARS_START);
}

//generating shooting stars
function startShootingStarTimer() {
    shootingStarTimer = setInterval(() => {
        const heightInFeet = totalHeight * 3.28084;
        if (heightInFeet > STARS_START) { 
            if (Math.random() < SHOOTING_STAR_FREQUENCY) {
                if (shootingStars.length < 10) { // Allow up to 10 shooting stars
                    shootingStars.push(new ShootingStar());
                }
            }
        }
    }, 1000); 
}

function stopShootingStarTimer() {
    clearInterval(shootingStarTimer);
}

// draw the player's square glow effect
function drawPlayerGlow(x, y, width, height) {
    const glowSize = 5; // Adjust the size of the glow to be smaller (e.g., 5 pixels)

    // Set shadow properties for the glow effect
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)'; // Color of the glow
    ctx.shadowBlur = glowSize; 
    ctx.shadowOffsetX = 0; 
    ctx.shadowOffsetY = 0; 

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; 
    ctx.fillRect(x - glowSize, y - glowSize, width + glowSize * 2, height + glowSize * 2); 

    ctx.shadowColor = 'transparent'; 
}

function applySettings() {
    const musicVolume = document.getElementById('music-volume').value / 100;
    const bounceVolume = document.getElementById('bounce-volume').value / 100;
    const dingVolume = document.getElementById('ding-volume').value / 100;

    bgMusic.volume = musicVolume;
    bounceSound.volume = bounceVolume;
    dingSound.volume = dingVolume;

    localStorage.setItem('musicVolume', musicVolume);
    localStorage.setItem('bounceVolume', bounceVolume);
    localStorage.setItem('dingVolume', dingVolume);
}

// reset settings to default
function resetSettings() {
    document.getElementById('music-volume').value = 50; // Default 50%
    document.getElementById('bounce-volume').value = 25; // Default 25%
    document.getElementById('ding-volume').value = 100; // Default 100%
    applySettings(); 
}

function showSettingsMenu() {
    const savedMusicVolume = localStorage.getItem('musicVolume');
    const savedBounceVolume = localStorage.getItem('bounceVolume');
    const savedDingVolume = localStorage.getItem('dingVolume');

    if (savedMusicVolume !== null) {
        document.getElementById('music-volume').value = savedMusicVolume * 100; 
    } else {
        document.getElementById('music-volume').value = 50; 
    }

    if (savedBounceVolume !== null) {
        document.getElementById('bounce-volume').value = savedBounceVolume * 100;
    } else {
        document.getElementById('bounce-volume').value = 25; 
    }

    if (savedDingVolume !== null) {
        document.getElementById('ding-volume').value = savedDingVolume * 100; 
    } else {
        document.getElementById('ding-volume').value = 100; 
    }

    applySettings(); 
    showScreen('settings-menu');
}

document.getElementById('music-volume').addEventListener('input', applySettings);
document.getElementById('bounce-volume').addEventListener('input', applySettings);
document.getElementById('ding-volume').addEventListener('input', applySettings);