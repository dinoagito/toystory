const ASSETS = {
    bgMusic: "audios/bg-music.mp3",
    shootSound: "audios/shoot.mp3",
    playerImg: "images/buzzship.png",
    enemyImg: "images/villain.png",
    explosion: "images/explosion.gif",
    playerBulletImg: "images/player-missile-unscreen.gif", 
    enemyBulletImg: "images/enemy-missile-unscreen.gif",
    mothershipImg: "images/boss.png",
};

const CONFIG = {
    fpsInterval: 1000 / 60,
    BASE_WIDTH: 800,
    playerSpeed: 5,
    playerWidth: 70,
    playerHeight: 60,
    playerStartLives: 3,
    bulletSpeed: 10, 
    enemyBulletSpeed: 6,
    enemyCols: 8,
    enemyMaxRows: 6,
    enemyWidth: 50,
    enemyHeight: 40,
    enemySpacingX: 65, 
    enemySpacingY: 55, 
    enemyStartX: 50, 
    enemyStartY: 50, 
    enemyMoveSpeedBase: 1.5,
    enemyShiftDown: 30, 
    enemyShootIntervalMs: 2000,
    
    // Mothership/Boss logic
    mothershipHP: 50,
    mothershipSizeFactor: 2.0,
    mothershipSpeed: 3.0, 
    mothershipRespawnDelay: 5000, 
    mothershipShootInterval: 5000, 
    
    maxPlayerBullets: 5,
    bombCooldown: 10000,
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
    mothershipDirection: 1, 
    mothershipDeathTime: 0, 
    lastMothershipShootTime: 0,
    
    score: 0,
    lives: CONFIG.playerStartLives,
    level: 1,
    running: false,
    paused: false,
    lastEnemyShootTime: 0,
    lastBombTime: 0,
    keys: {},
    
    enemyDirection: 1, 
    enemyWaveOffset: 0, 
    
    spawnQueue: [], 
    lastSpawnTime: 0,
    playerName: 'Pilot', 
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
        const startX = (State.width - baseW) / 2;
        const startY = State.height - baseH - 30;

        super(ASSETS.playerImg, startX, startY, baseW, baseH, gameArea);
        this.el.style.transform = ''; 
    }

    update(playerSpeedScaled, maxHeight, maxWidth) {
        if (!this.alive) return;
        if (State.keys["arrowleft"] || State.keys["a"]) {
            this.x = clamp(this.x - playerSpeedScaled, 0, maxWidth);
        }
        if (State.keys["arrowright"] || State.keys["d"]) {
            this.x = clamp(this.x + playerSpeedScaled, 0, maxWidth);
        }
    }

    draw() {
        this.x = clamp(this.x, 0, State.width - this.w);
        super.draw();
    }
}

class Bullet extends GameObject {
    constructor(x, y, isPlayer, gameArea) {
        const isPlayerImg = isPlayer ? ASSETS.playerBulletImg : ASSETS.enemyBulletImg;
        const collisionW = isPlayer ? 10 : 14;
        const collisionH = isPlayer ? 18 : 24;
        const visualW = isPlayer ? 30 : 30; 
        const visualH = isPlayer ? 50 : 50; 
        
        super(isPlayerImg, x, y, visualW, visualH, gameArea);
        this.isPlayer = isPlayer;
        this.collisionW = collisionW * this.scaleFactor;
        this.collisionH = collisionH * this.scaleFactor;
        this.el.style.transform = '';
    }

    update() {
        const speed = this.isPlayer ? CONFIG.bulletSpeed : CONFIG.enemyBulletSpeed;
        const speedScaled = speed * this.scaleFactor;
        this.y += this.isPlayer ? -speedScaled : speedScaled;
    }

    getRect() {
        return {
            left: this.x + (this.w - this.collisionW)/2, 
            top: this.y,
            right: this.x + (this.w + this.collisionW)/2, 
            bottom: this.y + this.h
        };
    }
}

class Enemy extends GameObject {
    constructor(x, y, gameArea) {
        super(ASSETS.enemyImg, x, y, CONFIG.enemyWidth, CONFIG.enemyHeight, gameArea);
        this.scoreValue = 10;
        this.el.style.transform = '';
        this.targetX = x;
        this.targetY = y;
        this.x = State.width / 2;
        this.y = -50;
        this.spawned = false; 
    }
    
    draw() {
        const wave = Math.sin(State.enemyWaveOffset) * (10 * this.scaleFactor);
        this.el.style.left = (this.x + wave) + "px";
        this.el.style.top = this.y + "px";
        this.el.style.width = this.w + "px";
        this.el.style.height = this.h + "px";
    }
    
    getRect() {
        const wave = Math.sin(State.enemyWaveOffset) * (10 * this.scaleFactor);
        return {
            left: this.x + wave,
            top: this.y,
            right: this.x + wave + this.w,
            bottom: this.y + this.h
        };
    }
}

class Mothership extends GameObject {
    constructor(gameArea) {
        const baseW = CONFIG.playerWidth * CONFIG.mothershipSizeFactor;
        const baseH = CONFIG.playerHeight * CONFIG.mothershipSizeFactor * 0.7;
        
        // FIX: Start Y lower (60) so the HP bar above it is visible (not cut off at top)
        const startY = 60 * scaleFactor;
        // Start centered for the boss fight
        const startX = (State.width - baseW) / 2; 

        super(ASSETS.mothershipImg, startX, startY, baseW, baseH, gameArea);
        this.hp = CONFIG.mothershipHP;
        this.maxHp = CONFIG.mothershipHP;
        this.vx = CONFIG.mothershipSpeed * scaleFactor; 
        this.scoreValue = 500;
        this.el.style.transform = ''; 
        this.setupHPBar();
    }

    setupHPBar() {
        this.hpEl = document.createElement('div');
        this.hpEl.className = 'mothership-hp-container';
        this.hpBar = document.createElement('div');
        this.hpBar.className = 'mothership-hp-bar';
        this.hpEl.appendChild(this.hpBar);
        this.gameArea.appendChild(this.hpEl);
        this.hpEl.style.zIndex = "10"; 
    }

    update(GAME_AREA_PADDING) {
        // FIX: Patrol Logic (Bounce left/right) instead of flying away
        this.x += this.vx * State.mothershipDirection;
        
        // Check boundaries and reverse direction
        if (this.x <= 0) {
            this.x = 0;
            State.mothershipDirection = 1;
        } else if (this.x + this.w >= State.width) {
            this.x = State.width - this.w;
            State.mothershipDirection = -1;
        }
    }

    draw() {
        super.draw();
        const percentage = (this.hp / this.maxHp) * 100;
        this.hpBar.style.width = `${percentage}%`;
        this.hpEl.style.width = this.w + "px";
        this.hpEl.style.left = this.x + "px";
        // Ensure HP bar follows the ship, positioned slightly above
        this.hpEl.style.top = (this.y - (20 * this.scaleFactor)) + "px";
    }

    remove() {
        super.remove();
        try { this.hpEl.remove(); } catch (e) {}
    }
}

function saveScore() {
    const playerName = State.playerName || 'Pilot'; 
    const newScoreEntry = {
        name: playerName,
        score: State.score,
    };
    const scoresJSON = localStorage.getItem('buzzBlastHighScores');
    let highScores = scoresJSON ? JSON.parse(scoresJSON) : [];
    
    // Check if player already exists and only keep their best score
    const existingPlayerIndex = highScores.findIndex(entry => entry.name.toLowerCase() === playerName.toLowerCase());
    if (existingPlayerIndex !== -1) {
        // Only update if the new score is better
        if (newScoreEntry.score > highScores[existingPlayerIndex].score) {
            highScores[existingPlayerIndex] = newScoreEntry;
        }
    } else {
        // Add new player
        highScores.push(newScoreEntry);
    }
    
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10); 
    localStorage.setItem('buzzBlastHighScores', JSON.stringify(highScores));
}

document.getElementById("menu-btn").addEventListener("click", () => {
    window.location.href = "index.html";
});

let bgMusic, shootSound;
let scaleFactor = 1;

try {
    bgMusic = new Audio(ASSETS.bgMusic);
    bgMusic.loop = true;
    bgMusic.volume = 0.5;
} catch (e) { bgMusic = null; }

try {
    shootSound = new Audio(ASSETS.shootSound);
    shootSound.volume = 0.7;
} catch (e) { shootSound = null; }

function calculateScaleFactor() {
    scaleFactor = State.width / CONFIG.BASE_WIDTH;
    if (State.player) State.player.updateScale(scaleFactor);
    if (State.mothership) State.mothership.updateScale(scaleFactor);
    State.enemies.forEach(e => e.updateScale(scaleFactor));
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function rectsOverlap(a, b) {
    return !(a.left > b.right || a.right < b.left || a.top > b.bottom || a.bottom < b.top);
}

function playShootSound() {
    if (shootSound) {
        shootSound.currentTime = 0;
        shootSound.play().catch(()=>{});
    }
}

function setupUI() {
    const prev = document.getElementById("si-game-area");
    if (prev) prev.remove();
    const gameArea = document.createElement("div");
    gameArea.id = "si-game-area";
    gameArea.style.position = "fixed";
    gameArea.style.overflow = "hidden";
    gameArea.style.zIndex = "999";
    document.body.appendChild(gameArea);

    const gameAreaEl = document.getElementById("si-game-area");
    State.gameArea = gameAreaEl;
    State.width = gameAreaEl.clientWidth;
    State.height = gameAreaEl.clientHeight;
    calculateScaleFactor();
    
    State.playerName = sessionStorage.getItem('playerName') || 'Pilot'; 

    const hud = document.getElementById("hud");
    if (hud) {
        State.hudInfo = hud;
        updateHUD();
    } else {
        const smallHud = document.createElement("div");
        smallHud.id = "hud";
        smallHud.style.position = "absolute";
        smallHud.style.left = "10px";
        smallHud.style.top = "10px";
        smallHud.style.color = "white";
        smallHud.style.fontSize = "16px";
        smallHud.style.zIndex = "1000";
        smallHud.style.fontFamily = "'Press Start 2P', monospace";
        smallHud.innerHTML = ""; 
        document.body.appendChild(smallHud);
        State.hudInfo = smallHud;
        updateHUD();
    }
    showOverlay("Press ENTER / Z / SPACE to start! \n\nCONTROLS:\n • Move: ←, → or A, D \n • Fire: ENTER/Z/Space\n • Bomb: B");
}

let overlayEl = null;
function showOverlay(text) {
    let overlay = document.getElementById("game-overlay");
    if (!overlay) {
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
        overlay.style.fontFamily = "'Press Start 2P', monospace";
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
    if (State.player) State.player.remove();
    State.player = new Player(State.gameArea);
    State.player.updateScale(scaleFactor);
    State.player.draw();
}

function manageMothershipLogic(now) {
    // 1. Check Spawn
    if (!State.mothership) {
        // First spawn check or Respawn check
        if (State.mothershipDeathTime === 0) State.mothershipDeathTime = now; 
        
        if (now - State.mothershipDeathTime > CONFIG.mothershipRespawnDelay) {
            State.mothership = new Mothership(State.gameArea);
            State.mothership.updateScale(scaleFactor);
            State.mothership.draw();
            State.mothershipDirection = 1; 
            State.lastMothershipShootTime = now; 
        }
    } 
    // 2. Logic for Alive Mothership
    else {
        // Shooting Logic: 5 seconds interval
        if (now - State.lastMothershipShootTime > CONFIG.mothershipShootInterval) {
            mothershipShooting();
            State.lastMothershipShootTime = now;
        }
        
        // Movement Logic
        const GAME_AREA_PADDING = 10;
        State.mothership.update(GAME_AREA_PADDING);
        State.mothership.draw();
        
        // No removal check here anymore because it bounces
    }
}

function prepareEnemiesForWave(level) {
    State.spawnQueue = []; 
    State.enemyDirection = 1; 

    const totalEnemies = 15 + (level * 3);
    
    for (let i = 0; i < totalEnemies; i++) {
        const x = Math.random() * (State.width - CONFIG.enemyWidth * scaleFactor);
        const y = Math.random() * (State.height * 0.4);
        State.spawnQueue.push({x, y});
    }
}

function processSpawnQueue(now) {
    if (State.spawnQueue.length === 0) return;

    if (now - State.lastSpawnTime > 200) {
        const data = State.spawnQueue.shift(); 
        const enemy = new Enemy(data.x, data.y, State.gameArea);
        enemy.updateScale(scaleFactor);
        enemy.draw();
        State.enemies.push(enemy);
        State.lastSpawnTime = now;
    }
}

function spawnPlayerBullet() {
    if (State.bullets.length >= CONFIG.maxPlayerBullets) return;
    if (!State.player) return;
    const bOffset = 5 * scaleFactor;
    const x = State.player.x + State.player.w / 2 - (15 * scaleFactor); 
    const y = State.player.y - bOffset;
    const bullet = new Bullet(x, y, true, State.gameArea);
    bullet.updateScale(scaleFactor);
    bullet.draw();
    State.bullets.push(bullet);
    playShootSound();
}

function spawnEnemyBullet(fromX, fromY, collisionW = 14, collisionH = 24, imgW = 30, imgH = 50) {
    const bullet = new Bullet(fromX, fromY, false, State.gameArea);
    bullet.baseW = imgW;
    bullet.baseH = imgH;
    bullet.collisionW = collisionW;
    bullet.collisionH = collisionH;
    bullet.updateScale(scaleFactor);
    bullet.draw();
    State.enemyBullets.push(bullet);
    playShootSound();
}

function enemyShooting(now) {
    if (now - State.lastEnemyShootTime < CONFIG.enemyShootIntervalMs) return;
    State.lastEnemyShootTime = now;
    const alive = State.enemies.filter(e => e.alive && e.spawned); 
    if (alive.length === 0) return;

    const shooter = alive[Math.floor(Math.random() * alive.length)];
    const collW = 14 * scaleFactor;
    const sx = shooter.x + shooter.w / 2 - collW / 2;
    const sy = shooter.y + shooter.h; 
    spawnEnemyBullet(sx, sy);
}

function mothershipShooting() {
    if (!State.mothership) return;
    const ms = State.mothership;
    
    // BIG MISSILE
    const collW = 40 * scaleFactor;
    const collH = 60 * scaleFactor;
    const imgW = 60 * scaleFactor;
    const imgH = 100 * scaleFactor;

    const sx = ms.x + ms.w / 2 - (imgW/2);
    const sy = ms.y + ms.h;
    spawnEnemyBullet(sx, sy, collW, collH, imgW/scaleFactor, imgH/scaleFactor);
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
    setTimeout(() => { e.remove(); }, 500);
}

function processCollisions() {
    for (let i = State.bullets.length - 1; i >= 0; i--) {
        const b = State.bullets[i];
        const bRect = b.getRect();
        let hit = false;

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
                    State.mothershipDeathTime = performance.now(); 
                    updateHUD();
                }
                hit = true;
            }
        }
        if (hit) continue;

        for (let j = 0; j < State.enemies.length; j++) {
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

    if (State.player) {
        const pRect = State.player.getRect();
        for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
            const eb = State.enemyBullets[i];
            if (rectsOverlap(eb.getRect(), pRect)) {
                spawnExplosionAt(State.player.x + State.player.w / 2, State.player.y + State.player.h / 2, 50);
                eb.remove();
                State.enemyBullets.splice(i, 1);
                handlePlayerHit();
            } else if (eb.y > State.height) { 
                eb.remove();
                State.enemyBullets.splice(i, 1);
            }
        }
    }
}

function handlePlayerHit() {
    if (!State.player) return;
    State.lives -= 1;
    updateHUD();
    State.player.el.style.visibility = "hidden";

    State.bullets.forEach(b => b.remove());
    State.enemyBullets.forEach(b => b.remove());
    State.bullets = [];
    State.enemyBullets = [];

    if (State.lives <= 0) {
        saveScore(); 
        showOverlay("GAME OVER — Press ENTER to play again");
        State.running = false;
        return;
    }

    State.paused = true;
    showOverlay("Respawning...");
    setTimeout(() => {
        if (State.player) {
            State.player.el.style.visibility = "visible";
            State.player.x = (State.width - State.player.w) / 2;
        }
        State.paused = false;
        hideOverlay();
    }, 900);
}

function updateHUD() {
    if (!State.hudInfo) return;
    let nameEl = document.getElementById("player-name-display");
    let scoreEl = document.getElementById("score");
    let livesEl = document.getElementById("lives");
    let powerEl = document.getElementById("power");

    if (!scoreEl || !livesEl || !powerEl) {
        State.hudInfo.innerHTML = `<div id="player-name-display">Name: ${State.playerName}</div><div id="score">Score: ${State.score}</div><div id="lives">Lives: ${State.lives}</div><div id="power">Bomb: Ready</div>`;
        return;
    }
    
    if (!nameEl) {
        nameEl = document.createElement("div");
        nameEl.id = "player-name-display";
        scoreEl.parentNode.insertBefore(nameEl, scoreEl);
    }
    nameEl.textContent = `Name: ${State.playerName}`;
    scoreEl.textContent = `Score: ${State.score}`;
    livesEl.textContent = `Lives: ${State.lives}`;
    
    const timeSinceLastBomb = performance.now() - State.lastBombTime;
    const bombReady = timeSinceLastBomb >= CONFIG.bombCooldown;
    powerEl.textContent = bombReady ? 'Bomb: Ready' : `Bomb: ${Math.ceil((CONFIG.bombCooldown - timeSinceLastBomb) / 1000)}s`;
    
    if (bombReady) {
        powerEl.classList.remove('used'); powerEl.classList.add('ready');
    } else {
        powerEl.classList.remove('ready'); powerEl.classList.add('used');
    }
}

function useBomb(now) {
    const timeSinceLastBomb = now - State.lastBombTime;
    if (timeSinceLastBomb < CONFIG.bombCooldown) return;
    
    State.lastBombTime = now;
    updateHUD();
    
    const aliveEnemies = State.enemies.filter(e => e.alive);
    const numToKill = Math.ceil(aliveEnemies.length * CONFIG.bombKillPercentage);
    const shuffled = aliveEnemies.sort(() => 0.5 - Math.random());
    const enemiesToDie = shuffled.slice(0, numToKill);

    enemiesToDie.forEach(en => {
        en.alive = false; en.remove();
        spawnExplosionAt(en.x + en.w / 2, en.y + en.h / 2, 70);
        State.score += en.scoreValue;
    });

    if (State.mothership) {
        spawnExplosionAt(State.mothership.x + State.mothership.w / 2, State.mothership.y + State.mothership.h / 2, 100);
    }
    State.enemies = State.enemies.filter(e => e.alive);
}

const GAME_AREA_PADDING = 10;

function moveEnemiesTick() {
    const alive = State.enemies.filter(e => e.alive);
    if (alive.length === 0) return;

    State.enemyWaveOffset += 0.05;

    const speed = (CONFIG.enemyMoveSpeedBase + 0.1 * (State.level - 1)) * scaleFactor;
    const shiftDistance = CONFIG.enemyShiftDown * scaleFactor;
    
    alive.forEach(e => {
        if (!e.spawned) {
            if (e.y < e.targetY) {
                e.y += 5 * scaleFactor;
            } else {
                e.y = e.targetY;
                e.spawned = true;
            }
        }
    });

    const formation = alive.filter(e => e.spawned);
    if (formation.length > 0) {
        let minX = Infinity, maxX = -Infinity;
        formation.forEach(e => {
            const wave = Math.sin(State.enemyWaveOffset) * (10 * e.scaleFactor);
            minX = Math.min(minX, e.x + wave);
            maxX = Math.max(maxX, e.x + wave + e.w);
        });

        if ((State.enemyDirection === 1 && maxX + speed >= State.width - GAME_AREA_PADDING) ||
            (State.enemyDirection === -1 && minX - speed <= GAME_AREA_PADDING)) {
            State.enemyDirection *= -1;
            formation.forEach(e => { e.y += shiftDistance; e.targetY += shiftDistance; });
        } else {
            formation.forEach(e => { e.x += speed * State.enemyDirection; e.targetX += speed * State.enemyDirection; });
        }
    }
    
    alive.forEach(e => e.draw());
}

function startNextLevelTransition() {
    State.level++;
    prepareEnemiesForWave(State.level);
    updateHUD();
}

function checkLevelProgress() {
    if (State.spawnQueue.length === 0 && !State.enemies.some(e => e.alive)) {
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

    const playerSpeedScaled = CONFIG.playerSpeed * scaleFactor;
    if (State.player) {
        const maxWidth = State.width - State.player.w;
        State.player.update(playerSpeedScaled, 0, maxWidth);
        State.player.draw();
    }

    for (let i = State.bullets.length - 1; i >= 0; i--) {
        const b = State.bullets[i];
        b.update();
        if (b.y < -50) { b.remove(); State.bullets.splice(i, 1); continue; }
        b.draw();
    }
    for (let i = State.enemyBullets.length - 1; i >= 0; i--) {
        const eb = State.enemyBullets[i];
        eb.update();
        if (eb.y > State.height) { eb.remove(); State.enemyBullets.splice(i, 1); continue; }
        eb.draw();
    }

    processSpawnQueue(now); 
    moveEnemiesTick(); 
    manageMothershipLogic(now); 
    enemyShooting(now);
    
    processCollisions();
    checkLevelProgress();
    updateHUD();
}

document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (State.keys[k] && !['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'a', 'd', 'w', 's'].includes(k)) {
         if (k === " " || k === "enter" || k === "z") {} else { return; }
    }
    State.keys[k] = true;
    if (k === " " || k === "enter" || k === "z") {
        if (!State.running) { startGame(); return; }
        if (State.paused) return;
        spawnPlayerBullet();
    } else if (k === "b") {
        if (!State.running || State.paused) return;
        useBomb(performance.now());
    }
});

document.addEventListener("keyup", (e) => { State.keys[e.key.toLowerCase()] = false; });

function startGame() {
    if (State.running) return;
    if (State.level > 1 || State.lives <= 0) { restartGame(); }
    setupUI();
    hideOverlay();
    createPlayer();
    prepareEnemiesForWave(State.level); 
    State.mothershipDeathTime = performance.now(); 
    State.running = true;
    if (bgMusic) try { bgMusic.currentTime = 0; bgMusic.play().catch(()=>{}); } catch (e) {}
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    State.running = false;
    State.bullets.forEach(b => b.remove());
    State.enemyBullets.forEach(b => b.remove());
    State.enemies.forEach(en => en.remove());
    if (State.mothership) State.mothership.remove();
    if (State.player) State.player.remove();

    State.bullets = [];
    State.enemyBullets = [];
    State.enemies = [];
    State.spawnQueue = [];
    State.mothership = null;
    State.player = null;

    State.score = 0;
    State.lives = CONFIG.playerStartLives;
    State.level = 1;
    State.paused = false;
    State.lastBombTime = 0;
    State.enemyDirection = 1;
    State.enemyWaveOffset = 0;
    State.lastEnemyShootTime = 0;
    updateHUD();
}

function initializeGame() {
    setupUI();
    updateHUD();
}

window.addEventListener("resize", () => {
    State.gameArea = document.getElementById("si-game-area");
    if (State.gameArea) {
        State.width = State.gameArea.clientWidth;
        State.height = State.gameArea.clientHeight;
    } else {
        State.width = window.innerWidth * 0.9;
        State.height = window.innerHeight * 0.9;
    }
    calculateScaleFactor();
    if (State.player) State.player.draw();
    if (State.mothership) State.mothership.draw();
    State.enemies.forEach(e => e.draw());
    State.bullets.forEach(b => b.draw());
    State.enemyBullets.forEach(b => b.draw());
});

initializeGame();
