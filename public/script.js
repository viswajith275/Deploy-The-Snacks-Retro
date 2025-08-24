// Game state and configuration
const Game = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 600,
    state: 'menu', // menu, playing, paused, gameOver
    score: 0,
    health: 3,
    maxHealth: 3,
    highScore: 0,
    deltaTime: 0,
    lastTime: 0,
    
    // Game objects
    dropLine: null,
    foodItems: [],
    tower: [],
    crow: null,
    particles: [],
    powerUp: {
        active: false,
        timer: 0,
        duration: 5000 // 5 seconds in milliseconds
    },
    
    // Game settings
    difficulty: {
        lineSpeed: 100, // pixels per second
        dropSpeed: 200,
        crowChance: 0.5, // Much higher crow spawn rate
        powerUpChance: 0.20
    },
    
    // Audio
    sounds: {
        background: null,
        drop: null,
        success: null,
        crow: null
    },
    
    // Input
    input: {
        isPressed: false,
        lastTap: 0,
        lastDrop: 0,
        dropCooldown: 1500 // 1.5 seconds between drops
    }
};

// Food types with visual properties
const FoodTypes = [
    { 
        name: 'burger', 
        emoji: '🍔', 
        color: '#D2691E', 
        width: 40, 
        height: 25,
        wobble: 0.5
    },
    { 
        name: 'pizza', 
        emoji: '🍕', 
        color: '#FF6347', 
        width: 35, 
        height: 20,
        wobble: 0.3
    },
    { 
        name: 'taco', 
        emoji: '🌮', 
        color: '#DEB887', 
        width: 30, 
        height: 22,
        wobble: 0.4
    },
    { 
        name: 'hotdog', 
        emoji: '🌭', 
        color: '#CD853F', 
        width: 45, 
        height: 18,
        wobble: 0.2
    },
    { 
        name: 'donut', 
        emoji: '🍩', 
        color: '#FFB6C1', 
        width: 25, 
        height: 25,
        wobble: 0.6
    },
    { 
        name: 'cupcake', 
        emoji: '🧁', 
        color: '#FFC0CB', 
        width: 30, 
        height: 28,
        wobble: 0.7
    }
];

const PowerUpType = { 
    name: 'rapidFire', 
    emoji: '⚡', 
    color: '#FFD700', 
    width: 35, 
    height: 20,
    wobble: 0.3
};

// Initialize the game
function init() {
    console.log('Initializing Deploy the Snacks...');
    
    // Get canvas and context
    Game.canvas = document.getElementById('gameCanvas');
    Game.ctx = Game.canvas.getContext('2d');
    
    // Set canvas size
    resizeCanvas();
    
    // Load high score
    Game.highScore = parseInt(localStorage.getItem('deploySnacksHighScore') || '0');
    updateHighScoreDisplay();
    
    // Initialize audio
    initAudio();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize game objects
    initGameObjects();
    
    // Start the game loop
    Game.lastTime = performance.now();
    gameLoop();
    
    console.log('Game initialized successfully!');
}

function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const maxWidth = Math.min(container.clientWidth - 40, 800);
    const maxHeight = Math.min(container.clientHeight - 40, 600);
    
    // Maintain aspect ratio
    const aspectRatio = 800 / 600;
    let canvasWidth = maxWidth;
    let canvasHeight = maxWidth / aspectRatio;
    
    if (canvasHeight > maxHeight) {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
    }
    
    Game.canvas.width = canvasWidth;
    Game.canvas.height = canvasHeight;
    Game.width = canvasWidth;
    Game.height = canvasHeight;
    
    // Update context settings
    Game.ctx.imageSmoothingEnabled = true;
    Game.ctx.textAlign = 'center';
    Game.ctx.textBaseline = 'middle';
}

function initAudio() {
    Game.sounds.background = document.getElementById('backgroundMusic');
    Game.sounds.drop = document.getElementById('dropSound');
    Game.sounds.success = document.getElementById('successSound');
    Game.sounds.crow = document.getElementById('crowSound');
    
    // Set volumes
    Game.sounds.background.volume = 0.3;
    Game.sounds.drop.volume = 0.5;
    Game.sounds.success.volume = 0.6;
    Game.sounds.crow.volume = 0.7;
    
    console.log('Audio initialized');
}

function playSound(soundName) {
    try {
        const sound = Game.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log(`Audio play prevented: ${e.message}`));
        }
    } catch (e) {
        console.log(`Error playing sound ${soundName}: ${e.message}`);
    }
}

function setupEventListeners() {
    // Menu buttons
    document.getElementById('playBtn').addEventListener('click', startGame);
    document.getElementById('howToPlayBtn').addEventListener('click', () => showMenu('howToPlayMenu'));
    document.getElementById('backFromHowToPlay').addEventListener('click', () => showMenu('mainMenu'));
    
    // Pause menu
    document.getElementById('pauseBtn').addEventListener('click', pauseGame);
    document.getElementById('resumeBtn').addEventListener('click', resumeGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('howToPlayFromPause').addEventListener('click', () => showMenu('howToPlayMenu'));
    document.getElementById('quitBtn').addEventListener('click', quitToMenu);
    
    // Game over menu
    document.getElementById('playAgainBtn').addEventListener('click', startGame);
    document.getElementById('backToMenuBtn').addEventListener('click', () => showMenu('mainMenu'));
    
    // Game canvas input
    Game.canvas.addEventListener('click', handleCanvasClick);
    Game.canvas.addEventListener('touchstart', handleCanvasTouch, { passive: false });
    
    // Keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    
    // Window resize
    window.addEventListener('resize', resizeCanvas);
    
    console.log('Event listeners setup complete');
}

function handleCanvasClick(e) {
    e.preventDefault();
    if (Game.state === 'playing') {
        const rect = Game.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (Game.width / rect.width);
        const y = (e.clientY - rect.top) * (Game.height / rect.height);
        handleGameInput(x, y);
    }
}

function handleCanvasTouch(e) {
    e.preventDefault();
    if (Game.state === 'playing' && e.touches.length > 0) {
        const rect = Game.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) * (Game.width / rect.width);
        const y = (touch.clientY - rect.top) * (Game.height / rect.height);
        handleGameInput(x, y);
    }
}

function handleKeyDown(e) {
    if (e.code === 'KeyP' && Game.state === 'playing') {
        pauseGame();
    } else if (e.code === 'Space' && Game.state === 'playing') {
        e.preventDefault();
        handleGameInput(Game.width / 2, Game.height / 2);
    }
}

function handleGameInput(x, y) {
    const now = performance.now();
    if (now - Game.input.lastTap < 300) return; // Prevent rapid clicking
    Game.input.lastTap = now;
    
    // Check if clicking on crow
    if (Game.crow && Game.crow.active) {
        const dx = x - Game.crow.x;
        const dy = y - Game.crow.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < Game.crow.radius) {
            hitCrow();
            return;
        }
    }
    
    // Check if enough time has passed since last drop (unless power-up is active)
    if (!Game.powerUp.active) {
        const timeSinceLastDrop = now - Game.input.lastDrop;
        if (timeSinceLastDrop < Game.input.dropCooldown) {
            const remainingCooldown = Math.ceil((Game.input.dropCooldown - timeSinceLastDrop) / 1000);
            console.log(`Drop on cooldown - wait ${remainingCooldown} more seconds`);
            return;
        }
    }
    
    // Drop food (allow multiple if power-up is active)
    if (Game.foodItems.length === 0 || Game.powerUp.active) {
        if (!Game.powerUp.active) {
            Game.input.lastDrop = now;
        }
        dropFood();
        const status = Game.powerUp.active ? 'RAPID FIRE MODE!' : `next drop in ${Game.input.dropCooldown/1000}s`;
        console.log(`Food drop initiated, ${status}`);
    } else {
        console.log(`Drop blocked - ${Game.foodItems.length} items still falling`);
    }
}

function initGameObjects() {
    // Initialize drop line
    Game.dropLine = {
        x: Game.width / 2,
        y: 50,
        width: 80,
        direction: 1,
        speed: Game.difficulty.lineSpeed
    };
    
    // Clear arrays
    Game.foodItems = [];
    Game.tower = [];
    Game.particles = [];
    Game.crow = null;
    
    // Reset power-up
    Game.powerUp.active = false;
    Game.powerUp.timer = 0;
    
    // Reset input timers
    Game.input.lastDrop = 0;
    Game.input.lastTap = 0;
    
    console.log('Game objects initialized');
}

function startGame() {
    console.log('Starting new game...');
    
    // Reset game state
    Game.state = 'playing';
    Game.score = 0;
    Game.health = Game.maxHealth;
    
    // Reset difficulty
    Game.difficulty.lineSpeed = 100;
    Game.difficulty.dropSpeed = 200;
    
    // Initialize game objects
    initGameObjects();
    
    // Show game UI
    showMenu(null);
    document.getElementById('gameUI').classList.remove('hidden');
    
    // Update UI
    updateScore();
    updateHealth();
    
    // Start background music
    playSound('background');
    
    console.log('Game started successfully!');
}

function pauseGame() {
    if (Game.state === 'playing') {
        Game.state = 'paused';
        showMenu('pauseMenu');
        Game.sounds.background.pause();
        console.log('Game paused');
    }
}

function resumeGame() {
    if (Game.state === 'paused') {
        Game.state = 'playing';
        showMenu(null);
        playSound('background');
        Game.lastTime = performance.now(); // Reset delta time
        console.log('Game resumed');
    }
}

function restartGame() {
    console.log('Restarting game...');
    startGame();
}

function quitToMenu() {
    Game.state = 'menu';
    Game.sounds.background.pause();
    document.getElementById('gameUI').classList.add('hidden');
    showMenu('mainMenu');
    console.log('Returned to main menu');
}

function gameOver(isWin = false) {
    console.log(`Game over - ${isWin ? 'Win' : 'Lose'}`);
    
    Game.state = 'gameOver';
    Game.sounds.background.pause();
    
    // Update high score
    const isNewHighScore = Game.score > Game.highScore;
    if (isNewHighScore) {
        Game.highScore = Game.score;
        localStorage.setItem('deploySnacksHighScore', Game.highScore.toString());
        console.log(`New high score: ${Game.highScore}`);
    }
    
    // Update game over screen
    document.getElementById('gameOverTitle').textContent = isWin ? '🎉 You Win! 🎉' : '💔 Game Over 💔';
    document.getElementById('finalScore').textContent = Game.score;
    document.getElementById('finalHighScore').textContent = Game.highScore;
    document.getElementById('healthLost').textContent = Game.maxHealth - Game.health;
    
    const newHighScoreMsg = document.getElementById('newHighScoreMsg');
    if (isNewHighScore) {
        newHighScoreMsg.classList.remove('hidden');
    } else {
        newHighScoreMsg.classList.add('hidden');
    }
    
    // Hide game UI
    document.getElementById('gameUI').classList.add('hidden');
    
    // Show game over menu
    showMenu('gameOverMenu');
    
    updateHighScoreDisplay();
}

function showMenu(menuId) {
    // Hide all menus
    const menus = document.querySelectorAll('.menu-screen');
    menus.forEach(menu => menu.classList.remove('active'));
    
    // Show specified menu
    if (menuId) {
        document.getElementById(menuId).classList.add('active');
    }
}

function updateScore() {
    document.getElementById('currentScore').textContent = Game.score;
}

function updateHealth() {
    const hearts = '❤️'.repeat(Game.health) + '🤍'.repeat(Game.maxHealth - Game.health);
    document.getElementById('healthHearts').textContent = hearts;
}

function updateHighScoreDisplay() {
    document.getElementById('highScoreDisplay').textContent = Game.highScore;
}

// Main game loop
function gameLoop(currentTime) {
    // Calculate delta time
    Game.deltaTime = (currentTime - Game.lastTime) / 1000;
    Game.lastTime = currentTime;
    
    // Limit delta time to prevent large jumps
    Game.deltaTime = Math.min(Game.deltaTime, 1/30);
    
    if (Game.state === 'playing') {
        update(Game.deltaTime);
        render();
    }
    
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Update drop line
    updateDropLine(deltaTime);
    
    // Update food items
    updateFoodItems(deltaTime);
    
    // Update particles
    updateParticles(deltaTime);
    
    // Update crow
    updateCrow(deltaTime);
    
    // Update power-up timer
    updatePowerUp(deltaTime);
    
    // Check for game end conditions
    checkGameEnd();
    
    // Increase difficulty based on tower height
    updateDifficulty();
    
    // Spawn crow randomly
    spawnCrowRandomly();
}

function updateDropLine(deltaTime) {
    const line = Game.dropLine;
    
    // Move the line
    line.x += line.direction * line.speed * deltaTime;
    
    // Bounce off walls
    const halfWidth = line.width / 2;
    if (line.x - halfWidth <= 0) {
        line.x = halfWidth;
        line.direction = 1;
    } else if (line.x + halfWidth >= Game.width) {
        line.x = Game.width - halfWidth;
        line.direction = -1;
    }
}

function updateFoodItems(deltaTime) {
    for (let i = Game.foodItems.length - 1; i >= 0; i--) {
        const food = Game.foodItems[i];
        
        // Apply gravity
        food.y += food.fallSpeed * deltaTime;
        
        // Update wobble animation
        food.wobbleTime += deltaTime * 3;
        
        // Check collision with tower or ground
        if (checkFoodCollision(food)) {
            // Food landed successfully
            Game.foodItems.splice(i, 1);
            
            if (food.isPowerUp) {
                console.log('POWER-UP COLLECTED! Activating rapid fire mode!');
                activatePowerUp();
                createPowerUpParticles(food.x, food.y);
                Game.score += 50; // Bonus points for power-ups
                updateScore();
                playSound('success');
            } else {
                createSuccessParticles(food.x, food.y, food.color);
                Game.score += 10;
                updateScore();
                playSound('success');
            }
            
        } else if (food.y > Game.height + 50) {
            // Food fell off screen
            console.log(`${food.isPowerUp ? 'RAPID FIRE' : 'Food'} ${food.type} fell off screen at x:${Math.round(food.x)}`);
            Game.foodItems.splice(i, 1);
            loseHealth();
        }
    }
}

function checkFoodCollision(food) {
    const foodBottom = food.y + food.height / 2;
    const foodTop = food.y - food.height / 2;
    const foodLeft = food.x - food.width / 2;
    const foodRight = food.x + food.width / 2;
    
    // Platform boundaries
    const platformY = Game.height - 30;
    const platformLeft = Game.width / 2 - 60;
    const platformRight = Game.width / 2 + 60;
    
    // Check collision with ground platform first
    if (foodBottom >= platformY) {
        // Check if food is within platform horizontal bounds
        if (foodRight > platformLeft && foodLeft < platformRight) {
            // Land on the platform
            food.y = platformY - food.height / 2;
            
            // Keep food within platform bounds
            if (food.x - food.width / 2 < platformLeft) {
                food.x = platformLeft + food.width / 2;
            }
            if (food.x + food.width / 2 > platformRight) {
                food.x = platformRight - food.width / 2;
            }
            
            console.log(`Food landed on platform at x:${Math.round(food.x)}, y:${Math.round(food.y)}`);
            return true;
        }
    }
    
    // Check collision with existing tower pieces
    for (let i = Game.tower.length - 1; i >= 0; i--) {
        const towerPiece = Game.tower[i];
        const pieceTop = towerPiece.y - towerPiece.height / 2;
        const pieceBottom = towerPiece.y + towerPiece.height / 2;
        const pieceLeft = towerPiece.x - towerPiece.width / 2;
        const pieceRight = towerPiece.x + towerPiece.width / 2;
        
        // Check if food is landing on top of this piece
        if (foodBottom >= pieceTop && foodTop <= pieceTop + 5) {
            // Check horizontal overlap
            const horizontalOverlap = Math.min(foodRight, pieceRight) - Math.max(foodLeft, pieceLeft);
            const minOverlap = Game.powerUp.active ? 
                Math.min(food.width, towerPiece.width) * 0.3 : 
                Math.min(food.width, towerPiece.width) * 0.5;
            
            if (horizontalOverlap > minOverlap) {
                // Land on top of this piece
                food.y = pieceTop - food.height / 2;
                
                // Apply sticky bun centering effect
                if (Game.powerUp.active) {
                    const centerPull = 0.5;
                    food.x += (towerPiece.x - food.x) * centerPull;
                }
                
                // Keep within reasonable bounds
                const maxOffset = (towerPiece.width + food.width) / 3;
                if (Math.abs(food.x - towerPiece.x) > maxOffset && !Game.powerUp.active) {
                    // Adjust position to be more stable
                    if (food.x > towerPiece.x) {
                        food.x = towerPiece.x + maxOffset;
                    } else {
                        food.x = towerPiece.x - maxOffset;
                    }
                }
                
                console.log(`Food stacked on piece ${i} at height ${Math.round(food.y)}`);
                return true;
            }
        }
    }
    
    return false;
}

/*function addToTower(food) {
    Game.tower.push({
        x: food.x,
        y: food.y,
        width: food.width,
        height: food.height,
        type: food.type,
        color: food.color,
        emoji: food.emoji,
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.5 + Math.random() * 0.5
    });
    
    // Use up one sticky bun charge
    if (Game.powerUp.active) {
        Game.powerUp.remaining--;
        if (Game.powerUp.remaining <= 0) {
            deactivatePowerUp();
        }
    }
}
*/
function updateCrow(deltaTime) {
    if (!Game.crow || !Game.crow.active) return;
    
    const crow = Game.crow;
    
    // Update position
    crow.x += crow.vx * deltaTime;
    crow.y += crow.vy * deltaTime;
    
    // Update wing animation
    crow.wingTime += deltaTime * 8;
    
    // Update timer
    crow.timer -= deltaTime;
    
    if (crow.timer <= 0) {
        // Crow escaped - shake tower and lose health
        shakeTower();
        loseHealth();
        Game.crow.active = false;
        hideCrowAlert();
        playSound('crow');
    }
    
    // Remove crow if it flies off screen
    if (crow.x < -100 || crow.x > Game.width + 100) {
        Game.crow.active = false;
        hideCrowAlert();
    }
}

function spawnCrowRandomly() {
    if (Game.crow && Game.crow.active) return;
    
    // Spawn crow every 10-15 seconds on average
    if (Math.random() < 0.008) {
        spawnCrow();
    }
}

function spawnCrow() {
    const fromLeft = Math.random() < 0.5;
    
    Game.crow = {
        x: fromLeft ? -50 : Game.width + 50,
        y: 100 + Math.random() * 200,
        vx: fromLeft ? 100 : -100,
        vy: 20 * (Math.random() - 0.5),
        radius: 30,
        wingTime: 0,
        timer: 3, // 3 seconds to tap
        active: true
    };
    
    showCrowAlert();
    console.log('Crow spawned!');
}

function hitCrow() {
    if (Game.crow && Game.crow.active) {
        Game.crow.active = false;
        hideCrowAlert();
        
        // Gain health
        if (Game.health < Game.maxHealth) {
            Game.health++;
            updateHealth();
        }
        
        // Make crow fly away quickly
        Game.crow.vx *= 3;
        Game.crow.vy = -200;
        
        playSound('success');
        console.log('Crow hit! Health gained.');
    }
}

function shakeTower() {
    // Add shake effect to tower pieces
    Game.tower.forEach(piece => {
        piece.shakeTime = 0.5;
        piece.shakeIntensity = 5;
    });
}

function updatePowerUp(deltaTime) {
    if (Game.powerUp.active) {
        Game.powerUp.timer -= deltaTime * 1000; // Convert to milliseconds
        if (Game.powerUp.timer <= 0) {
            deactivatePowerUp();
        }
    }
}

function activatePowerUp() {
    Game.powerUp.active = true;
    Game.powerUp.timer = Game.powerUp.duration; // 3 seconds
    
    document.getElementById('powerUpIndicator').classList.remove('hidden');
    
    console.log('Rapid Fire power-up activated - spam click for 3 seconds!');
}

function deactivatePowerUp() {
    Game.powerUp.active = false;
    Game.powerUp.timer = 0;
    
    document.getElementById('powerUpIndicator').classList.add('hidden');
    
    console.log('Rapid Fire power-up deactivated');
}

function showCrowAlert() {
    document.getElementById('crowAlert').classList.remove('hidden');
}

function hideCrowAlert() {
    document.getElementById('crowAlert').classList.add('hidden');
}

function dropFood() {
    const isPowerUp = Math.random() < Game.difficulty.powerUpChance;
    const foodType = isPowerUp ? PowerUpType : FoodTypes[Math.floor(Math.random() * FoodTypes.length)];
    
    const food = {
        x: Game.dropLine.x,
        y: Game.dropLine.y + 20,
        width: foodType.width,
        height: foodType.height,
        type: foodType.name,
        color: foodType.color,
        emoji: foodType.emoji,
        fallSpeed: Game.difficulty.dropSpeed,
        wobbleTime: 0,
        wobbleAmount: foodType.wobble || 0.5,
        isPowerUp: isPowerUp
    };
    
    Game.foodItems.push(food);
    playSound('drop');
    
    console.log(`Dropped ${isPowerUp ? 'RAPID FIRE ⚡' : 'food'}: ${foodType.name} at x:${Math.round(food.x)}`);
}

function loseHealth() {
    Game.health--;
    updateHealth();
    
    console.log(`Health lost! Remaining: ${Game.health}`);
    
    if (Game.health <= 0) {
        gameOver(false);
    }
}

function checkGameEnd() {
    // Check win condition - tower reaches top
    if (Game.tower.length > 0) {
        const topPiece = Game.tower.reduce((highest, piece) => 
            piece.y < highest.y ? piece : highest
        );
        
        if (topPiece.y - topPiece.height / 2 <= 50) {
            gameOver(true);
        }
    }
}

function updateDifficulty() {
    const progress = Game.score / 200; // Assume 20 pieces to reach top
    
    Game.difficulty.lineSpeed = 100 + progress * 100;
    Game.difficulty.dropSpeed = 200 + progress * 50;
    Game.difficulty.crowChance = 0.002 + progress * 0.003;
    
    Game.dropLine.speed = Game.difficulty.lineSpeed;
}

// Rendering functions
function render() {
    // Clear canvas
    Game.ctx.clearRect(0, 0, Game.width, Game.height);
    
    // Draw background
    drawBackground();
    
    // Draw drop line
    drawDropLine();
    
    // Draw tower
    drawTower();
    
    // Draw falling food
    drawFoodItems();
    
    // Draw particles
    drawParticles();
    
    // Draw crow
    drawCrow();
    
    // Draw drop cooldown indicator
    drawDropCooldown();
}

function drawBackground() {
    const ctx = Game.ctx;
    
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, Game.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.7, '#98FB98');
    gradient.addColorStop(1, '#90EE90');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, Game.width, Game.height);
    
    // Simple clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const time = performance.now() * 0.0001;
    
    for (let i = 0; i < 3; i++) {
        const x = (i * 250 + time * 20) % (Game.width + 100) - 50;
        const y = 80 + i * 40;
        drawCloud(x, y, 60 + i * 20);
    }
    
    // Draw ground platform
    const platformY = Game.height - 30;
    const platformWidth = 120;
    const platformX = Game.width / 2 - platformWidth / 2;
    
    // Platform shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(platformX + 3, platformY + 3, platformWidth, 15);
    
    // Platform base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(platformX, platformY, platformWidth, 12);
    
    // Platform border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(platformX, platformY, platformWidth, 12);
    
    // Platform details
    ctx.fillStyle = '#A0522D';
    for (let i = 0; i < 3; i++) {
        const x = platformX + 15 + i * 30;
        ctx.fillRect(x, platformY + 2, 20, 8);
    }
    
    // Ground line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, Game.height - 15);
    ctx.lineTo(Game.width, Game.height - 15);
    ctx.stroke();
}

function drawCloud(x, y, size) {
    const ctx = Game.ctx;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5, y, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.75, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.25, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
}

function drawDropLine() {
    const ctx = Game.ctx;
    const line = Game.dropLine;
    
    // Line background
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(line.x - line.width / 2, line.y - 5, line.width, 10);
    
    // Line border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(line.x - line.width / 2, line.y - 5, line.width, 10);
    
    // Drop indicator
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(line.x, line.y + 15, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function drawTower() {
    Game.tower.forEach((piece, index) => {
        drawFoodPiece(piece, index * 0.1);
    });
}

function drawFoodItems() {
    Game.foodItems.forEach(food => {
        drawFoodPiece(food, food.wobbleTime);
    });
}

function drawFoodPiece(piece, time) {
    const ctx = Game.ctx;
    
    // Calculate wobble effect
    const wobble = Math.sin(time) * piece.wobbleAmount;
    const x = piece.x + wobble;
    const y = piece.y;
    
    // Apply shake effect if present
    let shakeX = 0, shakeY = 0;
    if (piece.shakeTime > 0) {
        piece.shakeTime -= Game.deltaTime;
        const intensity = piece.shakeIntensity * (piece.shakeTime / 0.5);
        shakeX = (Math.random() - 0.5) * intensity;
        shakeY = (Math.random() - 0.5) * intensity;
    }
    
    const finalX = x + shakeX;
    const finalY = y + shakeY;
    
    // Draw food background
    ctx.fillStyle = piece.color;
    ctx.fillRect(
        finalX - piece.width / 2,
        finalY - piece.height / 2,
        piece.width,
        piece.height
    );
    
    // Draw food border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(
        finalX - piece.width / 2,
        finalY - piece.height / 2,
        piece.width,
        piece.height
    );
    
    // Draw emoji
    ctx.font = `${piece.height * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(piece.emoji, finalX, finalY);
    
    // Special effect for power-ups
    if (piece.isPowerUp) {
        // Glowing border effect
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(
            finalX - piece.width / 2 - 5,
            finalY - piece.height / 2 - 5,
            piece.width + 10,
            piece.height + 10
        );
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        
        // Add sparkle text
        ctx.fillStyle = '#FFD700';
        ctx.font = '12px Arial';
        ctx.fillText('★POWER★', finalX, finalY - piece.height / 2 - 15);
    }
}

function drawCrow() {
    if (!Game.crow || !Game.crow.active) return;
    
    const ctx = Game.ctx;
    const crow = Game.crow;
    
    // Wing flap animation
    const wingOffset = Math.sin(crow.wingTime) * 10;
    
    // Draw crow body
    ctx.fillStyle = '#2C2C2C';
    ctx.beginPath();
    ctx.ellipse(crow.x, crow.y, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw wings
    ctx.fillStyle = '#1C1C1C';
    ctx.beginPath();
    ctx.ellipse(crow.x - 15, crow.y + wingOffset, 12, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(crow.x + 15, crow.y - wingOffset, 12, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw beak
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(crow.x + 20, crow.y);
    ctx.lineTo(crow.x + 35, crow.y - 3);
    ctx.lineTo(crow.x + 35, crow.y + 3);
    ctx.closePath();
    ctx.fill();
    
    // Draw eye
    ctx.fillStyle = '#FF4444';
    ctx.beginPath();
    ctx.arc(crow.x + 10, crow.y - 5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(crow.x, crow.y, 25, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
}

// Drop Cooldown Display
function drawDropCooldown() {
    const now = performance.now();
    const ctx = Game.ctx;
    
    if (Game.powerUp.active) {
        // Show rapid fire mode indicator
        const remaining = Math.ceil(Game.powerUp.timer / 1000);
        const progress = Game.powerUp.timer / Game.powerUp.duration;
        
        // Draw rapid fire bar
        const barWidth = 250;
        const barHeight = 12;
        const barX = Game.width / 2 - barWidth / 2;
        const barY = 100;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Progress (lightning colors)
        ctx.fillStyle = progress > 0.5 ? '#FFD700' : '#FF6B6B';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        // Border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Text
        ctx.fillStyle = '#333';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`⚡ RAPID FIRE ${remaining}s ⚡`, Game.width / 2, barY - 15);
        
    } else {
        const timeSinceLastDrop = now - Game.input.lastDrop;
        
        if (timeSinceLastDrop < Game.input.dropCooldown) {
            const progress = timeSinceLastDrop / Game.input.dropCooldown;
            const remaining = Math.ceil((Game.input.dropCooldown - timeSinceLastDrop) / 1000);
            
            // Draw cooldown bar
            const barWidth = 200;
            const barHeight = 8;
            const barX = Game.width / 2 - barWidth / 2;
            const barY = 100;
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Progress
            ctx.fillStyle = progress > 0.8 ? '#4ECDC4' : '#FF6B6B';
            ctx.fillRect(barX, barY, barWidth * progress, barHeight);
            
            // Border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            // Text
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Next drop in ${remaining}s`, Game.width / 2, barY - 10);
        }
    }
}

function showDropCooldownMessage(seconds) {
    // This could trigger a UI flash or animation
    // For now, we rely on the visual cooldown bar
}

// Particle System Functions
function createSuccessParticles(x, y, color) {
    const particleCount = 8 + Math.floor(Math.random() * 6); // 8-13 particles
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
        const speed = 100 + Math.random() * 100; // pixels per second
        
        Game.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 50, // slight upward bias
            color: color,
            size: 3 + Math.random() * 4,
            life: 1.0,
            maxLife: 1.0,
            gravity: 300,
            type: 'success'
        });
    }
}

function createPowerUpParticles(x, y) {
    const particleCount = 12 + Math.floor(Math.random() * 8); // 12-19 particles
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
        const speed = 120 + Math.random() * 80;
        
        Game.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 80, // more upward bias for power-ups
            color: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'][Math.floor(Math.random() * 5)],
            size: 4 + Math.random() * 5,
            life: 1.5,
            maxLife: 1.5,
            gravity: 200,
            type: 'powerup'
        });
    }
}

function updateParticles(deltaTime) {
    for (let i = Game.particles.length - 1; i >= 0; i--) {
        const particle = Game.particles[i];
        
        // Update position
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        
        // Apply gravity
        particle.vy += particle.gravity * deltaTime;
        
        // Reduce life
        particle.life -= deltaTime;
        
        // Remove dead particles
        if (particle.life <= 0) {
            Game.particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    const ctx = Game.ctx;
    
    Game.particles.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        const size = particle.size * (0.5 + alpha * 0.5); // shrink as they fade
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        if (particle.type === 'powerup') {
            // Special sparkle effect for power-up particles
            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 10;
            
            // Draw star shape
            drawStar(ctx, particle.x, particle.y, size);
        } else {
            // Regular circular particles for success
            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 5;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

function drawStar(ctx, x, y, size) {
    const spikes = 4;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fill();
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', init);

console.log('Deploy the Snacks script loaded successfully!');
