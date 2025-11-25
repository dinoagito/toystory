const ASSETS = {
    bgMusic: "audios/bg-music.mp3",
    shootSound: "audios/shoot.mp3",
    playerImg: "images/buzzship.png",
    enemyImg: "images/villain.png",
    explosion: "images/explosion.gif",
    playerBulletImg: "images/missile-unscreen.gif",
    enemyBulletImg: "images/enemy-missile-unscreen.gif",
    mothershipImg: "images/boss.png",
};

const CONFIG = {
    fpsInterval: 1000 / 60,
    BASE_WIDTH: 800,
    playerSpeed: 3,
    playerWidth: 100,
    playerHeight: 70,
    playerStartLives: 3,
    bulletSpeed: 5,
    enemyBulletSpeed: 4,
    enemyCols: 7,
    enemyRowsPerLevel: [2, 3, 4],
    enemyWidth: 70,
    enemyHeight: 50,
    enemySpacingX: 90,
    enemySpacingY: 60,
    enemyStartX: 10,
    enemyStartY: 80,
    enemyMoveSpeedBase: 0.9,
    enemyDropOnEdge: 20,
    enemyShootIntervalMs: 1200,
    mothershipHP: 25,
    mothershipSizeFactor: 3.5,
    mothershipShootIntervalMs: 10,
    mothershipBurstCount: 1,
    mothershipBurstSize: 200,
    mothershipBurstGapMs: 5000,
    maxPlayerBullets: 3,
    bombCount: 1,
    bombKillPercentage: 0.7
};

const State = {
    gameArea: null,
    hudInfo: null,
    width: window.innerWidth,
    height: window.innerHeight,
    player: null,
    bullets: [],
    enemies: [],
    enemyBullets: [],
    mothership: null,
    lastMothershipShootTime: 0,
    mothershipShotsFired: 0,
    mothershipInCooldown: false,
    score: 0,
    lives: CONFIG.playerStartLives,
    level: 1,
    running: false,
    paused: false,
    lastEnemyShootTime: 0,
    bombsLeft: CONFIG.bombCount,
    keys: {}
};

class GameObject {
    constructor(imagePath, x, y, baseW, baseH, gameArea) { 
        this.baseW = baseW;
        this.baseH = baseH;
        this.gameArea = gameArea;
        this.scaleFactor = 1;
        this.w = baseW;
        this.h = baseH;
        this.el = document.createElement("img");
        this.el.src = imagePath;
        this.el.style.position = "absolute";
        this.el.style.pointerEvents = "none";
        gameArea.appendChild(this.el);
        this.x = x;
        this.y = y;
        this.alive = true;
    }

    updateScale(scaleFactor) {
        this.scaleFactor = scaleFactor;
        this.w = this.baseW * scaleFactor;
        this.h = this.baseH * scaleFactor;
    }

    draw() {
        this.el.style.left = this.x + "px";
        this.el.style.top = this.y + "px";
        this.el.style.width = this.w + "px";
        this.el.style.height = this.h + "px";
    }

    remove() {
        try { this.el.remove(); } catch (e) {}   
    }

    /** Returns the collision bounding box. */
    getRect() {
        return { 
            left: this.x,
            top: this.y,
            right: this.x + this.w,
            bottom: this.y + this.h 
        };
    }
}

class Player extends GameObject { 
    constructor(gameArea) { 
        const baseW = CONFIG.playerWidth; 
        const baseH = CONFIG.playerHeight;
        const startX = 30;
        const startY = (State.height - baseH) / 2; 

        super(ASSETS.playerImg, startX, startY, baseW, baseH, gameArea); 
        this.baseXOffset = startX; 
        this.isInvincible = false; 
    }

    update(playerSpeedScaled, maxHeight, maxWidth) { // Moves player based on input
        if (!this.alive) return; // Stop if player is dead

        if (State.keys["arrowup"] || State.keys["w"]) { 
            this.y = clamp(this.y - playerSpeedScaled, 0, maxHeight); 
        }
        if (State.keys["arrowdown"] || State.keys["s"]) { 
            this.y = clamp(this.y + playerSpeedScaled, 0, maxHeight); 
        }

        if (State.keys["arrowleft"] || State.keys["a"]) { 
            this.x = clamp(this.x - playerSpeedScaled, 0, maxWidth); 
        }
        if (State.keys["arrowright"] || State.keys["d"]) { 
            this.x = clamp(this.x + playerSpeedScaled, 0, maxWidth); 
        }
    }

    draw() { // Updates player element on screen
        const startX = this.baseXOffset * this.scaleFactor;
        this.x = clamp(this.x, startX, State.width - this.w); 
        this.el.style.left = this.x + "px";

        this.y = clamp(this.y, 0, State.height - this.h); 
        this.el.style.top = this.y + "px";
        
        this.el.style.width = this.w + "px"; 
        this.el.style.height = this.h + "px";
    }
}

class Bullet extends GameObject {
    constructor(x, y, isPlayer, gameArea) {
        // Player/Enemy bullets have different images and fixed small collision boxes
        const isPlayerImg = isPlayer ? ASSETS.playerBulletImg : ASSETS.enemyBulletImg;
        const collisionW = isPlayer ? 10 : 14; 
        const collisionH = isPlayer ? 18 : 24; 
        const visualW = isPlayer ? 80 : 60;
        const visualH = isPlayer ? 50 : 40;
        super(isPlayerImg, x, y, visualW, visualH, gameArea);
        this.isPlayer = isPlayer;
        this.collisionW = collisionW * this.scaleFactor;    
        this.collisionH = collisionH * this.scaleFactor; 
        this.el.style.left = x + "px"; 
        this.el.style.top = y + "px"; 
    }

    update() {
        const speed = this.isPlayer ? CONFIG.bulletSpeed : CONFIG.enemyBulletSpeed;
        const speedScaled = speed * this.scaleFactor;

        // Player bullets move right, Enemy bullets move left
        this.x += this.isPlayer ? speedScaled : -speedScaled;
    }

    draw() {
        this.el.style.width = this.w + "px";
        this.el.style.height = this.h + "px";
        this.el.style.left = this.x + "px";
        this.el.style.top = this.y + "px";
    }

    /** Overrides base getRect to use the small, scaled collision box. real “hit area” of the bullet */
    getRect() {
        return { 
            left: this.x, top: this.y, 
            right: this.x + this.collisionW, bottom: this.y + this.collisionH 
        };
    }
}

// Enemy class inherits from GameObject, meaning it gets all basic movement, drawing, and scaling functions
class Enemy extends GameObject {
    constructor(x, y, gameArea) {
        // Call the parent (GameObject) constructor to set sprite, position, size, and game area
        super(ASSETS.enemyImg, x, y, CONFIG.enemyWidth, CONFIG.enemyHeight, gameArea);
        this.baseX = x;
        this.baseY = y; 
        this.scoreValue = 10; 
    }
}

class Mothership extends GameObject {
    constructor(x, y, gameArea) {
        // Calculate mothership size based on player size (scaled)
        const baseW = CONFIG.playerWidth * CONFIG.mothershipSizeFactor;
        const baseH = CONFIG.playerHeight * CONFIG.mothershipSizeFactor * 0.7;
        // Call GameObject constructor → sets sprite, pos, width/height, scaling, etc.
        super(ASSETS.mothershipImg, x, y, baseW, baseH, gameArea);
        this.hp = CONFIG.mothershipHP;
        this.maxHp = CONFIG.mothershipHP;
        this.vy = 0;
        this.scoreValue = 100;

        // Create HP Bar UI element
        this.setupHPBar(x, y);
    }

    // Creates the red HP bar floating above the mothership
    setupHPBar(x, y) {
        this.hpEl = document.createElement('div');
        this.hpEl.className = 'mothership-hp-container';

        this.hpBar = document.createElement('div');
        this.hpBar.className = 'mothership-hp-bar';

        this.hpEl.appendChild(this.hpBar);
        this.gameArea.appendChild(this.hpEl);
    }

    // movement logic for the mothership (boss)
    update(GAME_AREA_PADDING) {
        if (this.vy === 0) {
            this.vy = 0.9 * this.scaleFactor; // ensures the boss moves at a consistent proportional speed
        }

        this.y += this.vy; // apply movement
        // Reverse direction when touching top/bottom screen edges
        if (this.y <= GAME_AREA_PADDING || 
            this.y + this.h >= State.height - GAME_AREA_PADDING) {

            this.vy *= -1; // flip direction

            this.y = clamp(this.y, GAME_AREA_PADDING, State.height - this.h - GAME_AREA_PADDING
            );
        }
    }

    // Draws the mothership and updates HP bar visuals
    draw() {
        super.draw();
        const percentage = (this.hp / this.maxHp) * 100;
        this.hpBar.style.width = `${percentage}%`;
        // Update HP bar position above the mothership
        this.hpEl.style.width = this.w + "px";
        this.hpEl.style.left = this.x + "px";
        this.hpEl.style.top = (this.y - (20 * this.scaleFactor)) + "px"; 
    }
    // Remove mothership and its HP bar from the screen
    remove() {
        super.remove();
        try { 
            this.hpEl.remove();
        } catch (e) {}
    }
}

document.getElementById("menu-btn").addEventListener("click", () => {
    const bgMusic = document.getElementById("bg-music");
    if (bgMusic && !bgMusic.paused) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
   }
   window.location.href = "index.html"; 
});

let bgMusic;
let shootSound;
let scaleFactor = 1; 

const existingBgAudio = document.getElementById('bg-music');
if (existingBgAudio && typeof existingBgAudio.play === 'function') {
    bgMusic = existingBgAudio;
    try { bgMusic.loop = true; } catch (e) {}
    try { bgMusic.volume = 0.5; } catch (e) {}
} else {
    try {
        bgMusic = new Audio(ASSETS.bgMusic);
        bgMusic.loop = true;
        bgMusic.volume = 0.5;
    } catch (e) { bgMusic = null; }
}
try {
    shootSound = new Audio(ASSETS.shootSound);
    shootSound.volume = 0.7;
} catch (e) { shootSound = null; }

function calculateScaleFactor() {
    scaleFactor = State.width / CONFIG.BASE_WIDTH; 
    if (State.player) State.player.updateScale(scaleFactor);
    if (State.mothership) State.mothership.updateScale(scaleFactor);
    State.enemies.forEach(e => e.updateScale(scaleFactor));
    // note: bullets are short-lived; their size is set when created
}

function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
} // keeping a value within a range

// to check if two rectangles overlap (used for collision detection)
function rectsOverlap(a, b) {
    return !(
        a.left > b.right || 
        a.right < b.left ||
        a.top > b.bottom ||
        a.bottom < b.top
    );
} // returns true if rectangles overlap, false if they don’t

function playShootSound() {
    if (!shootSound) return; 

    try {
        shootSound.currentTime = 0; 
        shootSound.play(); 
    } catch (e) {
    }
}

// creates ui elements
function setupUI() {
    // remove any previous area
    const prev = document.getElementById("si-game-area");
    if (prev) prev.remove();
    // create a new game area
    const gameArea = document.createElement("div");
    gameArea.id = "si-game-area";
    gameArea.style.position = "fixed";
    gameArea.style.overflow = "hidden";
    gameArea.style.zIndex = "999"; // ensures it appears above most page elements
    
    document.body.appendChild(gameArea);
    State.gameArea = gameArea;
    State.width = gameArea.clientWidth; 
    State.height = gameArea.clientHeight;
    calculateScaleFactor(); // calculate scale based on new dimensions, to scale objects relative to the base width.
    document.body.appendChild(gameArea);

    const hud = document.getElementById("hud");
    if (hud) {
        State.hudInfo = hud;
        updateHUD();
    } else {
        // (Simplified HUD creation remains a fallback)
        const smallHud = document.createElement("div");
        smallHud.id = "hud";
        smallHud.style.position = "absolute";
        smallHud.style.left = "10px";
        smallHud.style.top = "10px";
        smallHud.style.color = "white";
        smallHud.style.fontSize = "16px";
        smallHud.style.zIndex = "1000";
        smallHud.style.fontFamily = "'Press Start 2P', monospace";
        smallHud.innerHTML = `<div id="score">Score: 0</div><div id="level">Level: 1</div><div id="lives">Lives: ${State.lives}</div><div id="power">Bomb: Ready (${State.bombsLeft})</div>`;
        document.body.appendChild(smallHud);
        State.hudInfo = smallHud;
    }
    State.gameArea = gameArea;
    State.width = gameArea.clientWidth; 
    State.height = gameArea.clientHeight;
    showOverlay("Press ENTER / Z / SPACE to start! \n\nCONTROLS:\n • Move: ←, →, ↑, ↓ or W, A, S, D  \n\• Fire: ENTER/Z/Space\n • Bomb: B");

}

let overlayEl = null;
function showOverlay(text) {
    let overlay = document.getElementById("game-overlay");
    if (!overlay) {
        // (Overlay creation logic remains the same)
        overlay = document.createElement("div");
        overlay.id = "game-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.background = "rgba(0, 0, 0, 0.7)";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.justifyContent = "center";
        overlay.style.alignItems = "center";
        overlay.style.color = "#00ffff";
        overlay.style.fontFamily = "'Consolas', 'Courier New', monospace";
        overlay.style.fontSize = "22px";
        overlay.style.textAlign = "center";
        overlay.style.lineHeight = "1.6";
        overlay.style.textShadow = "0 0 10px rgba(0,255,255,0.8)";
        overlay.style.zIndex = "99999"; 
        overlay.style.padding = "20px";
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = text.replace(/\n/g, "<br>");
    overlay.style.opacity = "1";
    overlay.style.display = "flex";
}

function hideOverlay() {
    const overlay = document.getElementById("game-overlay");
    if (overlay) {
        overlay.style.display = "none";
        overlay.style.opacity = "0";
    }
}

function createPlayer() {
    // Remove old player object and its DOM element
    if (State.player) State.player.remove();
    State.player = new Player(State.gameArea);
    State.player.updateScale(scaleFactor); 
    State.player.draw(); 
}

function createEnemiesForLevel(level) {
    State.enemies.forEach(e => e.remove());
    State.enemies = [];
    // Remove mothership (if it exists)
    if (State.mothership) State.mothership.remove();
    State.mothership = null;
    enemyDirection = 1; // 1 = moving down, -1 = moving up (for enemy movement logic)
    const rows = CONFIG.enemyRowsPerLevel[level - 1] || 
                 CONFIG.enemyRowsPerLevel[CONFIG.enemyRowsPerLevel.length - 1]; 
    const cols = CONFIG.enemyCols;
    // Spacing between enemies (scaled based on screen size)
    const spacingX = CONFIG.enemySpacingY * scaleFactor;
    const spacingY = CONFIG.enemySpacingX * scaleFactor; 
    const baseEnemyStartX = CONFIG.BASE_WIDTH - CONFIG.enemyStartX - (rows * CONFIG.enemySpacingY); 
    const baseEnemyStartY = CONFIG.enemyStartY;
    // Nested loops to create the enemy grid
    for (let r = 0; r < rows; r++) { // for each row
        for (let c = 0; c < cols; c++) { // for each column
            // to calculate X and Y positions for this enemy
            const baseX = baseEnemyStartX + r * CONFIG.enemySpacingY;
            const baseY = baseEnemyStartY + c * CONFIG.enemySpacingX;
            const enemy = new Enemy(baseX * scaleFactor, baseY * scaleFactor, State.gameArea);
            enemy.updateScale(scaleFactor);
            enemy.draw();
            State.enemies.push(enemy); // // adding enemy to State.enemies array for game logic
        }
    }

    if (level === 3) {
        const msBaseW = CONFIG.playerWidth * CONFIG.mothershipSizeFactor;
        const msBaseH = CONFIG.playerHeight * CONFIG.mothershipSizeFactor * 0.7;
        // Start X near the right edge of the screen, leaving 30px margin
        const startX = State.width - (msBaseW * scaleFactor) - (30 * scaleFactor);
        // Center vertically
        const startY = (State.height - (msBaseH * scaleFactor)) / 2;
        // Create mothership object
        State.mothership = new Mothership(startX, startY, State.gameArea);
        State.mothership.updateScale(scaleFactor);
        State.mothership.draw();
    }
}

// to create a bullet fired by the player
function spawnPlayerBullet() {
    if (State.bullets.length >= CONFIG.maxPlayerBullets) return; // prevent shooting more bullets than the max allowed
    if (!State.player) return;
    const bOffset = 5 * scaleFactor; 
    // calculate bullet starting X position: right edge of player + offset
    const x = State.player.x + State.player.w + bOffset;
    // calculate bullet starting Y position: center bullet vertically on player
    // state.player.y + State.player.h/2 → center of player vertically
    // (18 * scaleFactor)/2 → half height of bullet to align center
    const y = State.player.y + State.player.h / 2 - (18 * scaleFactor) / 2;
    // Create a new Bullet object at (x, y); true = indicates player bullet
    const bullet = new Bullet(x, y, true, State.gameArea);
    bullet.updateScale(scaleFactor);
    // Draw bullet on the screen
    bullet.draw();
    State.bullets.push(bullet);
    playShootSound();
}

// Function to create a bullet fired by an enemy
function spawnEnemyBullet(fromX, fromY, collisionW = 10, collisionH = 18, imgW = 60, imgH = 40) {
    const bullet = new Bullet(fromX, fromY, false, State.gameArea);
    bullet.baseW = imgW;
    bullet.baseH = imgH;
    bullet.collisionW = collisionW;
    bullet.collisionH = collisionH;
    bullet.updateScale(scaleFactor);
    bullet.draw();
    // Add bullet to array of active enemy bullets
    State.enemyBullets.push(bullet);
    playShootSound();
}

function enemyShooting(now) {
    if (now - State.lastEnemyShootTime < CONFIG.enemyShootIntervalMs) return;
    State.lastEnemyShootTime = now;
    const alive = State.enemies.filter(e => e.alive);
    if (alive.length === 0) return;
    const bOffset = 5 * scaleFactor;
    const xOffset = 6 * scaleFactor; // calculates the bullet’s starting point by taking the enemy’s position, moving left by xOffset = 6 * scaleFactor, and centering vertically with bOffset = 5 * scaleFactor.
    const shooter = alive[Math.floor(Math.random() * alive.length)];
    // Fire horizontally (to the left) from the enemy's left side
    const sx = shooter.x - xOffset; 
    const sy = shooter.y + shooter.h / 2 - bOffset; 
    spawnEnemyBullet(sx, sy);
}

function mothershipShooting(now) {
    if (!State.mothership) return;

    if (State.mothershipInCooldown) {
        if (now - State.lastMothershipShootTime >= CONFIG.mothershipBurstGapMs) {
            State.mothershipInCooldown = false;
            State.mothershipShotsFired = 0; 
        } else {
            return; 
        }
    }

    if (now - State.lastMothershipShootTime < CONFIG.mothershipShootIntervalMs) {
        return; 
    }
    
    if (State.mothershipShotsFired >= CONFIG.mothershipBurstCount) {
        State.mothershipInCooldown = true;
        State.lastMothershipShootTime = now; 
        return; 
    }

    State.lastMothershipShootTime = now;
    
    const ms = State.mothership;
    const bOffset = 5 * scaleFactor;
    const xOffset = 6 * scaleFactor;

    // Fire a single missile from the vertical center
    const sx = ms.x - xOffset; 
    const sy = ms.y + ms.h * 0.5 - bOffset; 

    const msImgW = CONFIG.mothershipBurstSize || 60;
    const msImgH = Math.floor(msImgW * (40/60));
    const collW = 14; 
    const collH = 24;
    spawnEnemyBullet(sx, sy, collW, collH, msImgW, msImgH); 

    State.mothershipShotsFired++; 
}

function spawnExplosionAt(x, y, baseSize = 60) {
    const size = baseSize * scaleFactor; 
    const e = document.createElement("img");
    e.src = ASSETS.explosion;
    e.style.position = "absolute";
    e.style.left = (x - size / 2) + "px";
    e.style.top = (y - size / 2) + "px";
    e.style.width = size + "px";
    e.style.height = size + "px";
    e.style.pointerEvents = "none";
    e.style.zIndex = "9999";
    State.gameArea.appendChild(e);

    setTimeout(() => {
        e.remove();
    }, 500); 
}

function processCollisions() {
    // Player bullets vs Mothership/Enemies
    for (let i = State.bullets.length - 1; i >= 0; i--) {
        const b = State.bullets[i];
        const bRect = b.getRect();
        let hit = false;

        // Mothership collision
        if (State.mothership) {
            const ms = State.mothership;
            if (rectsOverlap(bRect, ms.getRect())) {
                ms.hp -= 1;
                spawnExplosionAt(b.x + b.collisionW / 2, b.y + b.collisionH / 2, 50);
                b.remove();
                State.bullets.splice(i, 1); 
                State.mothership.draw();

                if (ms.hp <= 0) {
                    spawnExplosionAt(ms.x + ms.w / 2, ms.y + ms.h / 2, 100);
                    ms.remove();
                    State.mothership = null;
                    State.score += ms.scoreValue;
                    updateHUD();
                }
                hit = true;
            }
        }
        if (hit) continue;

        // Enemy collision
        for (let j = 0; j < State.enemies.length; j++) { // backward loop 
            const en = State.enemies[j];
            if (!en.alive) continue;
            
            if (rectsOverlap(bRect, en.getRect())) {
                en.alive = false;
                en.remove();
                spawnExplosionAt(en.x + en.w / 2, en.y + en.h / 2, 36);
                b.remove();
                State.bullets.splice(i, 1);
                State.score += en.scoreValue;
                updateHUD();
                hit = true;
                break; 
            }
        }
    }

    // Enemy bullets vs Player
    if (State.player && State.player.alive) {
        const pRect = State.player.getRect();
        for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
            const eb = State.enemyBullets[i];
            
            if (rectsOverlap(eb.getRect(), pRect)) {
                spawnExplosionAt(State.player.x + State.player.w / 2, State.player.y + State.player.h / 2, 50);
                eb.remove();
                State.enemyBullets.splice(i, 1);
                handlePlayerHit();
            }
        }
    }

    if (State.player && State.player.alive) {
        for (const en of State.enemies) {
            if (!en.alive) continue;
            // Check if the enemy's left side is past the player's right edge
            if (en.x <= State.player.x + State.player.w) {
                handlePlayerHit(true);
                break;
            }
        }
    }
}

function handlePlayerHit(enemyReached = false) {
    if (!State.player) return;

    State.lives -= 1;
    updateHUD();
    State.player.el.style.visibility = "hidden";

    // Clear bullets
    State.bullets.forEach(b => b.remove());
    State.enemyBullets.forEach(b => b.remove());
    State.bullets = [];
    State.enemyBullets = [];

    if (State.lives <= 0) {
        showOverlay("GAME OVER — Press ENTER or Z to play again"); 
        State.running = false;
        return;
    }

    // Respawn after short delay
    State.paused = true;
    showOverlay("Respawning...");
    setTimeout(() => {
        if (State.player) {
            // Reset player position to start (left-center)
            const startXOffset = 30 * scaleFactor;
            State.player.x = startXOffset; 
            State.player.y = (State.height - State.player.h) / 2;
            State.player.el.style.visibility = "visible";
            State.player.draw();
        }
        State.paused = false;
        hideOverlay();
    }, 900);
}

function updateHUD() {
    if (!State.hudInfo) return;
    let scoreEl = document.getElementById("score");
    let levelEl = document.getElementById("level");
    let livesEl = document.getElementById("lives");
    let powerEl = document.getElementById("power");
    if (!scoreEl || !levelEl || !livesEl || !powerEl) {
        State.hudInfo.innerHTML = `<div id="score">Score: ${State.score}</div><div id="level">Level: ${State.level}</div><div id="lives">Lives: ${State.lives}</div><div id="power">Bombs: ${State.bombsLeft}</div>`;
        return;
    }
    scoreEl.textContent = `Score: ${State.score}`;
    levelEl.textContent = `Level: ${State.level}`;
    livesEl.textContent = `Lives: ${State.lives}`;
    powerEl.textContent = `Bomb: ${State.bombsLeft > 0 ? 'Ready (' + State.bombsLeft + ')' : 'Used'}`;
}

function useBomb() {
    if (State.bombsLeft <= 0) return;
    State.bombsLeft--;
    updateHUD();

    const aliveEnemies = State.enemies.filter(e => e.alive);
    const numToKill = Math.ceil(aliveEnemies.length * CONFIG.bombKillPercentage);

    const shuffled = aliveEnemies.sort(() => 0.5 - Math.random());
    const enemiesToDie = shuffled.slice(0, numToKill);

    enemiesToDie.forEach(en => {
        en.alive = false;
        en.remove();
        spawnExplosionAt(en.x + en.w / 2, en.y + en.h / 2, 70); 
        State.score += en.scoreValue;
    });
    
    // Mothership is not affected by the bomb but shows an explosion for visual effect
    if (State.mothership) {
        spawnExplosionAt(State.mothership.x + State.mothership.w / 2, State.mothership.y + State.mothership.h / 2, 100);
    }
    
    State.enemies = State.enemies.filter(e => e.alive);
}

let enemyDirection = 1; // 1 = down, -1 = up
const GAME_AREA_PADDING = 10; 

function moveMothershipTick() { 
    if (!State.mothership) return;

    // Movement handled in Mothership.update()
    State.mothership.update(GAME_AREA_PADDING);
    State.mothership.draw(); // Update position visually
}

function moveEnemiesTick() {
    const alive = State.enemies.filter(e => e.alive);
    if (alive.length === 0) return; 

    const speed = (CONFIG.enemyMoveSpeedBase + 0.25 * (State.level - 1)) * scaleFactor;
    const shiftDistance = CONFIG.enemyDropOnEdge * scaleFactor;

    // compute bounds of alive enemies
    let minY = Infinity, maxY = -Infinity;
    alive.forEach(e => {
        minY = Math.min(minY, e.y);
        maxY = Math.max(maxY, e.y + e.h);
    });

    // Vertical edge reached (Top/Bottom)
    if ((enemyDirection === 1 && maxY + speed >= State.height - GAME_AREA_PADDING) ||
        (enemyDirection === -1 && minY - speed <= GAME_AREA_PADDING)) { 
        
        enemyDirection *= -1; // Flip to opposite direction
        
        // Shift left (towards player)
        alive.forEach(e => { 
            e.x -= shiftDistance; 
            e.draw(); // Update position visually
        });
    } else {
        // Move vertically
        alive.forEach(e => {
            e.y += speed * enemyDirection;
            e.draw(); // Update position visually
        });
    }
}

function startNextLevelTransition() {
    State.level++;
    if (State.level > 3) {
        showOverlay("YOU WON! Press ENTER or Z to play again"); 
        State.running = false;
        return;
    }
    
    State.paused = true;
    showOverlay(`Level ${State.level}`);
    // Clear old bullets
    State.bullets.forEach(b => b.remove());
    State.enemyBullets.forEach(b => b.remove());
    State.bullets = [];
    State.enemyBullets = [];
    
    setTimeout(() => {
        // Spawn new wave
        createEnemiesForLevel(State.level);
        updateHUD();

        setTimeout(() => {
            State.paused = false;
            hideOverlay();
        }, 200); 
    }, 1000); 
}

function checkLevelProgress() {
    const anyAliveEnemies = State.enemies.some(e => e.alive);
    const mothershipAlive = !!State.mothership;
    
    if (!anyAliveEnemies && !mothershipAlive) {
        startNextLevelTransition();
    }
}

let lastTime = performance.now();
function gameLoop(now) {
    if (!State.running) return;
    requestAnimationFrame(gameLoop);

    const elapsed = now - lastTime;
    if (elapsed < CONFIG.fpsInterval) return;
    lastTime = now;

    if (State.paused) return;

    // --- 1. Player Update and Draw ---
    const playerSpeedScaled = CONFIG.playerSpeed * scaleFactor;
    if (State.player) {
        const maxHeight = State.height - State.player.h;
        const maxWidth = State.width - State.player.w;
        State.player.update(playerSpeedScaled, maxHeight, maxWidth);
        State.player.draw();
    }

    // --- 2. Bullet Update and Draw ---
    for (let i = State.bullets.length - 1; i >= 0; i--) {
        const b = State.bullets[i];
        b.update();
        if (b.x > State.width) {
            b.remove();
            State.bullets.splice(i, 1);
            continue;
        }
        b.draw();
    }

    // --- 3. Enemy Bullet Update and Draw ---
    for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
        const eb = State.enemyBullets[i];
        eb.update();
        if (eb.x < -20) {
            eb.remove();
            State.enemyBullets.splice(i, 1);
            continue;
        }
        eb.draw();
    }

    // --- 4. Enemy Movement/Shooting ---
    moveEnemiesTick();
    if (State.level === 3) moveMothershipTick(); 
    enemyShooting(now);
    if (State.level === 3) mothershipShooting(now);

    // --- 5. Collision and Progress Check ---
    processCollisions();
    checkLevelProgress();
    updateHUD();
}

document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (State.keys[k] && !['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'a', 'd', 'w', 's'].includes(k)) return;
    
    State.keys[k] = true;

    if (k === " " || k === "enter" || k === "z") {
        if (!State.running) {
            startGame(); 
            return;
        }
        if (State.paused) return;
        spawnPlayerBullet();
    } else if (k === "b") {
        if (!State.running || State.paused) return;
        useBomb();
    } 
});

document.addEventListener("keyup", (e) => {
  State.keys[e.key.toLowerCase()] = false;
});

function startGame() {
    if (State.running) return; 

    if (State.level > 1 || State.lives <= 0) {
        restartGame(); 
        setupUI(); 
    } else {
        updateHUD();
    }

    hideOverlay();
    createPlayer();
    createEnemiesForLevel(State.level);
    State.running = true;

    if (bgMusic && typeof bgMusic.play === 'function') {
      try { bgMusic.currentTime = 0; bgMusic.play(); } catch (e) { /* play may be blocked */ }
    }

    requestAnimationFrame(gameLoop);
}

function restartGame() {
    State.running = false; 

    // Use object's remove method for cleanup
    State.bullets.forEach(b => b.remove());
    State.enemyBullets.forEach(b => b.remove());
    State.enemies.forEach(en => en.remove());
    if (State.mothership) State.mothership.remove();
    if (State.player) State.player.remove();

    State.bullets = [];
    State.enemyBullets = [];
    State.enemies = [];
    State.mothership = null;
    State.player = null;

    State.score = 0;
    State.lives = CONFIG.playerStartLives;
    State.level = 1;
    State.paused = false;
    State.bombsLeft = CONFIG.bombCount;
    enemyDirection = 1;
    State.lastEnemyShootTime = 0;
    State.lastMothershipShootTime = 0;
    updateHUD();
}

function initializeGame() {
    setupUI();
    updateHUD();
}

window.addEventListener("resize", () => {
    // Standard size calculation remains the same
    State.gameArea = document.getElementById("si-game-area");
    if (State.gameArea) {
        State.width = State.gameArea.clientWidth;
        State.height = State.gameArea.clientHeight;
    } else {
        State.width = window.innerWidth * 0.9;
        State.height = window.innerHeight * 0.9;
    }

    calculateScaleFactor(); 

    // Redraw all objects to apply new scaled positions and sizes
    if (State.player) State.player.draw();
    if (State.mothership) State.mothership.draw();
    State.enemies.forEach(e => e.draw());
    State.bullets.forEach(b => b.draw());
    State.enemyBullets.forEach(b => b.draw());
});

initializeGame();