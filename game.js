// game varibles
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
let activeKeys = new Set();
let touchedPlatforms = new Set(); // track platforms we've scored from
let lastTime = 0;
let stars = [];
const STARS_START = 30000;  // start seeing stars at 30,000 feet
const STARS_FULL = 70000;   // maximum star density at 70,000 feet
let shootingStars = [];

// platform properties
const platformWidth = 80;
const platformHeight = 15;
const platformGap = 100;

// cloud properties
const CLOUD_FADE_START = 20000;
const CLOUD_FADE_END = 60000;

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
        this.color = this.generateStarColor(); // Random star color
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
        const startFromTop = Math.random() > 0.5;
        if (startFromTop) {
            this.x = Math.random() * canvas.width;
            this.y = -20;
        } else {
            this.x = canvas.width + 20;
            this.y = Math.random() * (canvas.height / 2);
        }
    }

    reset() {
        // Angle between -30 and -60 degrees (converted to radians)
        this.angle = (-30 - Math.random() * 30) * Math.PI / 180;
        this.speed = 15 + Math.random() * 25;
        this.length = 100 + Math.random() * 150;
        this.opacity = 0;
        this.fadeInSpeed = 0.05;
        this.fadeOutSpeed = 0.02;
        this.active = true;
    }

    update() {
        if (!this.active) return;

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

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
        
        // Set up gradient for the tail
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

    // Generate platforms
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
    
    // If above CLOUD_FADE_END, return an off-screen cloud
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
        // Linear interpolation between 1 and 0
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

// Update sky gradient with smooth transitions
const skyColors = {
    ground: {
        top: '#87CEEB',
        bottom: '#B0E2FF'
    },
    middle: {
        top: '#4A90E2',
        bottom: '#76B4FF'
    },
    high: {
        top: '#1a1a4c',
        bottom: '#2d2d7a'
    },
    space: {
        top: '#0d0d2b',
        bottom: '#1a1a3c'
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
        ground: { start: 0, end: 3000 },
        middle: { start: 3000, end: 10000 },
        high: { start: 10000, end: 25000 },
        space: { start: 25000, end: 35000 }
    };
    
    let topColor, bottomColor;
    
    if (heightInFeet <= ranges.ground.end) {

        // Ground level
        topColor = skyColors.ground.top;
        bottomColor = skyColors.ground.bottom;
    } else if (heightInFeet <= ranges.middle.end) {

        // Ground to middle transition
        const factor = (heightInFeet - ranges.ground.end) / (ranges.middle.end - ranges.ground.end);
        topColor = interpolateColor(skyColors.ground.top, skyColors.middle.top, factor);
        bottomColor = interpolateColor(skyColors.ground.bottom, skyColors.middle.bottom, factor);
    } else if (heightInFeet <= ranges.high.end) {

        // Middle to high transition
        const factor = (heightInFeet - ranges.middle.end) / (ranges.high.end - ranges.middle.end);
        topColor = interpolateColor(skyColors.middle.top, skyColors.high.top, factor);
        bottomColor = interpolateColor(skyColors.middle.bottom, skyColors.high.bottom, factor);
    } else {

        // High to space transition
        const factor = Math.min((heightInFeet - ranges.high.end) / (ranges.space.end - ranges.high.end), 1);
        topColor = interpolateColor(skyColors.high.top, skyColors.space.top, factor);
        bottomColor = interpolateColor(skyColors.high.bottom, skyColors.space.bottom, factor);
    }
    
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    
    return gradient;
}

// Add stop game function if it doesn't exist
function stopGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
}

function initGame() {

     // Get canvas and context
     canvas = document.getElementById('gameCanvas');
     ctx = canvas.getContext('2d');

    // Reset game variables
    gameOver = false;
    score = 0;
    totalHeight = 0;
    isPaused = false;

    // Initialize player
    player = {
        x: canvas.width / 2 - 20, // Center the player on the platform
        y: canvas.height - 100,
        width: 40,
        height: 40,
        velocityY: 0,
        velocityX: 0,
        speed: 5,
        jumpForce: -15,
        gravity: 0.5
    };

    generatePlatforms();

    // Initialize clouds
    clouds = [];
    for (let i = 0; i < 5; i++) {
        clouds.push(generateCloud());
    }

    // Initialize shooting stars
    shootingStars = [new ShootingStar()];

    // Start the game loop
    gameLoop = requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sky gradient
    ctx.fillStyle = getSkyGradient(totalHeight);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars with glow
    const heightInFeet = totalHeight * 3.28084;
    const starDensity = getStarDensity(heightInFeet);
    
    if (starDensity > 0) {
        const visibleStars = Math.floor(stars.length * starDensity);
        const currentTime = Date.now();
        
        // Enable glow effect
        ctx.globalCompositeOperation = 'lighter';
        
        for (let i = 0; i < visibleStars; i++) {
            stars[i].update(currentTime);
            stars[i].draw(ctx);
        }
        
        ctx.globalCompositeOperation = 'source-over';
    }

    // Draw shooting stars after regular stars but before clouds
    if (heightInFeet > STARS_START) {
        ctx.globalCompositeOperation = 'lighter';
        shootingStars.forEach(star => star.draw(ctx));
        ctx.globalCompositeOperation = 'source-over';
    }

    // Draw clouds
    const cloudDensity = getCloudDensity(heightInFeet);
    
    for (let layer = 0; layer < 3; layer++) {
        clouds.filter(cloud => cloud.layer === layer).forEach(cloud => {
            if (cloud.y < canvas.height + 100 && cloud.y > -cloud.height) {
                drawCloud(cloud);
            }
        });
    }

    // Draw platforms
    ctx.fillStyle = 'rgba(74, 189, 74, 0.8)';
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw player
    ctx.fillStyle = '#2196F3';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw UI
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`High Score: ${highScore}`, 10, 60);
    ctx.fillText(`Height: ${Math.floor(totalHeight * 3.28084).toLocaleString()} ft`, 10, 90);
    ctx.shadowBlur = 0;

    // Draw pause screen
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

    // Draw game over screen
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

     // Apply gravity
     player.velocityY += player.gravity;
    
    // Update player position based on active keys
    if (activeKeys.has('left')) {
        player.velocityX = -player.speed; // Move left
    } else if (activeKeys.has('right')) {
        player.velocityX = player.speed; // Move right
    } else {
        player.velocityX = 0; // Stop moving if no key is pressed
    }
     
     // Update player position
     player.x += player.velocityX;
     player.y += player.velocityY;
 
     // Check for platform collision
     let onPlatform = false; // Track if the player is on a platform
     platforms.forEach(platform => {
         if (player.velocityY > 0 && // Moving down
             player.x < platform.x + platform.width &&
             player.x + player.width > platform.x &&
             player.y + player.height > platform.y &&
             player.y + player.height < platform.y + platform.height + player.velocityY
         ) {
             player.y = platform.y - player.height; // Place player on top of the platform
             player.velocityY = 0; // Reset vertical velocity
             onPlatform = true; // Mark that the player is on a platform
         }
     });
    
     // Auto jump if on a platform
    if (onPlatform) {
        player.velocityY = player.jumpForce; // Apply jump force
    }

    // Calculate height in feet based on totalHeight
    const heightInFeet = totalHeight * 3.28084;

    // Calculate cameraDiff based on player's position
    let cameraDiff = 0;
    if (player.y < canvas.height / 2) {
        cameraDiff = canvas.height / 2 - player.y;
        totalHeight += cameraDiff; // Update totalHeight based on camera movement
    }

    // Move clouds based on cameraDiff
    clouds.forEach(cloud => {
        const cloudDensity = getCloudDensity(heightInFeet);
        if (heightInFeet >= CLOUD_FADE_END) {
            cloud.y = -1000; // Move clouds off screen if above 60,000 feet
            return;
        }

        cloud.y += cameraDiff * (1 + cloud.layer * 0.2);
        
        // Reset clouds that move below screen
        if (cloud.y > canvas.height + 100) {
            if (cloudDensity > 0 && Math.random() < cloudDensity) {
                cloud.y = -cloud.height;
                cloud.x = Math.random() * canvas.width;
                
                // Update cloud size based on new height
                const baseWidth = Math.random() * 120 + 60;
                const baseHeight = Math.random() * 60 + 30;
                cloud.width = baseWidth * cloudDensity;
                cloud.height = baseHeight * cloudDensity;
                
                const greyShade = Math.floor(Math.random() * 20) + 80;
                cloud.color = `rgba(${greyShade}%, ${greyShade}%, ${greyShade}%, ${cloudDensity * 0.8})`;
            } else {
                cloud.y = -1000; // Move cloud off screen
            }
        }
    });

    // Update shooting stars
    if (heightInFeet > STARS_START) {
        shootingStars.forEach(star => star.update());
        if (Math.random() < 0.005 && shootingStars.length < 2) {
            shootingStars.push(new ShootingStar());
        }
    }

    // Game over check
    if (player.y > canvas.height) {
        gameOver = true;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('endlessHighScore', highScore.toString());
        }
        draw(); // Make sure to draw final frame
        return; // Stop the game loop
    }

    draw();
    
    if (!gameOver) {
        gameLoop = requestAnimationFrame(update);
    }
}

// keyboard handlers
function handleKeyDown(e) {
    activeKeys.add(e.key);
}

function handleKeyUp(e) {
    activeKeys.delete(e.key);
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
        activeKeys.add('left'); // Add left key to active keys
    }
    if (e.key === 'ArrowRight') {
        activeKeys.add('right'); // Add right key to active keys
    }
});

document.addEventListener('keyup', function(e) {
    if (e.key === 'ArrowLeft') {
        activeKeys.delete('left'); // Remove left key from active keys
    }
    if (e.key === 'ArrowRight') {
        activeKeys.delete('right'); // Remove right key from active keys
    }
});

function exitGame() {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    
    // Clear active keys
    activeKeys.clear();
    
    // Clear touched platforms
    touchedPlatforms.clear();
    
    // Stop game loop
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
}

// Add keyboard event listeners
document.addEventListener('keydown', function(e) {
    if (e.key.toLowerCase() === 'r' && gameOver) {
        initGame();
    } else if (e.key.toLowerCase() === 'p' && !gameOver) {
        togglePause();
    } else {
        handleKeyDown(e);
    }
});

// Add pause toggle function
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

// Update star generation for better size variation
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

// Add star density calculation
function getStarDensity(heightInFeet) {
    if (heightInFeet < STARS_START) {
        return 0;
    } else if (heightInFeet > STARS_FULL) {
        return 1;
    }
    return (heightInFeet - STARS_START) / (STARS_FULL - STARS_START);
}