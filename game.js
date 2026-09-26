const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

// Tela cheia
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Configs
const FRAME_SIZE = 192;
const SCALE = 1;
const HITBOX_RADIUS = 30;
const TILE_SIZE = 64;

// Imagens
const images = {
    player: new Image(), mage: new Image(), enemy: new Image(), tnt_goblin: new Image(), barrel_goblin: new Image(),
    ground: new Image(), water: new Image(), foam: new Image(), tree: new Image(),
    meat: new Image(), gold: new Image(), gold_mine: new Image(), sheep: new Image(),
    dynamite: new Image(), explosion: new Image(),
    elevation: new Image(), deco1: new Image(), deco2: new Image(), deco3: new Image()
};

let imagesLoaded = 0;
const totalImages = Object.keys(images).length;
Object.keys(images).forEach(key => {
    images[key].onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) initGame();
    };
});

images.player.src = 'game_assets/player.png';
images.mage.src = 'game_assets/mage.png';
images.enemy.src = 'game_assets/enemy.png';
images.tnt_goblin.src = 'game_assets/tnt_goblin.png';
images.barrel_goblin.src = 'game_assets/barrel_goblin.png';
images.ground.src = 'game_assets/ground.png';
images.water.src = 'game_assets/water.png';
images.foam.src = 'game_assets/foam.png';
images.tree.src = 'game_assets/tree.png';
images.meat.src = 'game_assets/meat.png';
images.gold.src = 'game_assets/gold.png';
images.gold_mine.src = 'game_assets/gold_mine.png';
images.sheep.src = 'game_assets/sheep.png';
images.dynamite.src = 'game_assets/dynamite.png';
images.explosion.src = 'game_assets/explosion.png';
images.elevation.src = 'game_assets/elevation.png';
images.deco1.src = 'game_assets/deco1.png';
images.deco2.src = 'game_assets/deco2.png';
images.deco3.src = 'game_assets/deco3.png';

const keys = { w: false, a: false, s: false, d: false, e: false };
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'e'].includes(k)) keys[k] = true;
});
window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'e'].includes(k)) keys[k] = false;
});

canvas.addEventListener('mousedown', () => {
    if (player && !player.dead && !player.attacking) player.attack();
});

// Controles Mobile / Touch
let joyDX = 0, joyDY = 0, joyActive = false, joyBaseX = 0, joyBaseY = 0;
let joyPointerId = null;
const joyZone = document.getElementById('joystick-zone');
const joyKnob = document.getElementById('joystick-knob');
const btnAttack = document.getElementById('btn-attack');
const btnHeal = document.getElementById('btn-heal');

if (joyZone) {
    function updateJoy(e) {
        if (!joyActive || e.pointerId !== joyPointerId) return;
        let dx = e.clientX - joyBaseX;
        let dy = e.clientY - joyBaseY;
        let dist = Math.hypot(dx, dy);
        let maxDist = 40;
        if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
        joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        joyDX = dx / maxDist; joyDY = dy / maxDist;
    }
    joyZone.addEventListener('pointerdown', (e) => {
        joyActive = true; joyPointerId = e.pointerId;
        const rect = joyZone.getBoundingClientRect();
        joyBaseX = rect.left + rect.width / 2; joyBaseY = rect.top + rect.height / 2;
        joyZone.setPointerCapture(e.pointerId);
        updateJoy(e);
        e.preventDefault();
    });
    joyZone.addEventListener('pointermove', (e) => { updateJoy(e); e.preventDefault(); });
    joyZone.addEventListener('pointerup', (e) => {
        if (e.pointerId === joyPointerId) {
            joyActive = false; joyDX = 0; joyDY = 0;
            joyKnob.style.transform = `translate(-50%, -50%)`;
            joyZone.releasePointerCapture(e.pointerId);
        }
        e.preventDefault();
    });
    joyZone.addEventListener('pointercancel', (e) => {
        if (e.pointerId === joyPointerId) {
            joyActive = false; joyDX = 0; joyDY = 0;
            joyKnob.style.transform = `translate(-50%, -50%)`;
        }
    });
}
if (btnAttack) {
    btnAttack.addEventListener('pointerdown', (e) => {
        if (player && !player.dead && !player.attacking) player.attack();
        e.preventDefault();
    });
}
if (btnHeal) {
    btnHeal.addEventListener('pointerdown', (e) => {
        keys.e = true;
        setTimeout(() => keys.e = false, 100);
        e.preventDefault();
    });
}

// Seeded Random
function seededRandom(x, y) {
    let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

// Lógica de Procedural e Biomas
function getTileType(c, r) {
    let val = seededRandom(c, r);
    if (val < 0.05) return 'tree';
    
    if (val > 0.99) {
        // Regra de espaçamento: Checa raio 4 (muito mais espaço) para evitar minas grudadas
        let isLocalMax = true;
        for (let dc = -4; dc <= 4; dc++) {
            for (let dr = -4; dr <= 4; dr++) {
                if (dc === 0 && dr === 0) continue;
                let nVal = seededRandom(c + dc, r + dr);
                if (nVal > 0.99 && nVal > val) {
                    isLocalMax = false; break;
                }
            }
            if (!isLocalMax) break;
        }
        if (isLocalMax) return 'mine';
    }
    
    if (val >= 0.05 && val < 0.08) return 'deco1';
    if (val >= 0.08 && val < 0.12) return 'deco2';
    if (val >= 0.12 && val < 0.15) return 'deco3';
    return 'empty';
}

// Colisão Unificada e Robusta (Slide System)
function checkCollision(nx, ny) {
    let ec = Math.floor(nx/TILE_SIZE);
    let er = Math.floor(ny/TILE_SIZE);
    for(let dc=-2; dc<=2; dc++){ // Raio maior para não travar na borda de minas grandes!
        for(let dr=-2; dr<=2; dr++){
            let c = ec + dc; let r = er + dr;
            let type = getTileType(c, r);
            let wx = c * TILE_SIZE + TILE_SIZE/2;
            let wy = r * TILE_SIZE + TILE_SIZE/2;
            
            if (type === 'tree') {
                if (Math.hypot(nx - wx, ny - (wy + 40)) < 25) return true;
            } else if (type === 'mine') {
                // Colisão retangular exata para a mina!
                if (Math.abs(nx - wx) < 70 && ny > wy - 10 && ny < wy + 40) return true;
            }
        }
    }
    return false;
}

// Helper para movimentar entidades
function moveEntity(ent, mx, my, delta) {
    let collidedX = checkCollision(ent.x + mx * delta, ent.y);
    let collidedY = checkCollision(ent.x, ent.y + my * delta);
    
    if (!collidedX) ent.x += mx * delta;
    if (!collidedY) ent.y += my * delta;
    
    return collidedX || collidedY; // true se bateu em algo
}

let score = 0;
let playerGold = 0;
let screenShake = 0;
let playerDamage = 34;
let camera = { x: 0, y: 0 };
let deltaFactor = 1;

let enemies = [];
let items = [];
let projectiles = [];
let explosions = [];
let sheeps = [];
let player = null;

function createExplosion(x, y, damage, radius) {
    explosions.push({ x, y, frame: 0, timer: 0 });
    screenShake = 15;
    
    if (!player.dead && Math.hypot(player.x - x, player.y - y) < radius) {
        player.takeDamage(damage, (player.x - x)/radius * 15, (player.y - y)/radius * 15);
    }
    enemies.forEach(e => {
        if (!e.dead && Math.hypot(e.x - x, e.y - y) < radius) {
            e.takeDamage(damage, (e.x - x)/radius * 15, (e.y - y)/radius * 15);
        }
    });
    sheeps.forEach(s => {
        if (!s.dead && Math.hypot(s.x - x, s.y - y) < radius) {
            s.takeDamage(damage, (s.x - x)/radius * 15, (s.y - y)/radius * 15);
        }
    });
}

class Entity {
    constructor(x, y, speed, imageType) {
        this.x = x; this.y = y; this.speed = speed; this.imageType = imageType;
        this.state = 'idle'; this.frame = 0; this.frameTimer = 0;
        this.flip = false; this.attacking = false; this.dead = false;
        this.hp = 100; this.maxHp = 100; this.vx = 0; this.vy = 0; this.flashTimer = 0;
    }
    get animationData() {
        if (this.state === 'attack') return { row: 2, frames: 6, speed: 5 };
        if (this.state === 'run') return { row: 1, frames: 6, speed: 5 };
        return { row: 0, frames: 6, speed: 8 }; 
    }
    takeDamage(amount, kx = 0, ky = 0) {
        if(this.dead) return;
        this.hp -= amount; this.flashTimer = 10; this.vx = kx; this.vy = ky;
        if (this.hp <= 0) this.die();
    }
    die() { this.dead = true; }
    updatePhysics() {
        this.x += this.vx * deltaFactor; 
        this.y += this.vy * deltaFactor;
        this.vx *= Math.pow(0.8, deltaFactor); 
        this.vy *= Math.pow(0.8, deltaFactor);
        
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaFactor;
            if(this.flashTimer < 0) this.flashTimer = 0;
        }
    }
    updateAnimation() {
        const anim = this.animationData;
        this.frameTimer += deltaFactor;
        if (this.frameTimer >= anim.speed) {
            this.frameTimer = 0; this.frame++;
            if (this.frame >= anim.frames) {
                if (this.state === 'attack') { this.attacking = false; this.state = 'idle'; if(this.onAttackComplete) this.onAttackComplete(); }
                this.frame = 0;
            }
        }
    }
    draw(ctx) {
        if (this.dead) return;
        const img = images[this.imageType];
        const anim = this.animationData;
        
        let fSize = FRAME_SIZE;
        if (this.imageType === 'sheep' || this.imageType === 'barrel_goblin' || this.imageType === 'mage') fSize = 128;

        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.flip) ctx.scale(-1, 1);
        if (this.flashTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) ctx.globalAlpha = 0.5;
        
        const offsetY = fSize === 128 ? -fSize/2 : -fSize/2;
        ctx.drawImage(img, this.frame * fSize, anim.row * fSize, fSize, fSize, -fSize/2, offsetY, fSize, fSize);
        ctx.restore();

        if (this.hp < this.maxHp && this.imageType !== 'sheep') {
            ctx.fillStyle = 'black'; ctx.fillRect(this.x - 20, this.y - 45, 40, 6);
            ctx.fillStyle = (this.imageType === 'player' || this.imageType === 'mage') ? 'lime' : 'red';
            ctx.fillRect(this.x - 20, this.y - 45, 40 * (this.hp / this.maxHp), 6);
        }
    }
}

class Player extends Entity {
    constructor(x, y, heroClass) {
        super(x, y, heroClass === 'mage' ? 3.5 : 3, heroClass === 'mage' ? 'mage' : 'player');
        this.heroClass = heroClass;
        this.maxHp = heroClass === 'mage' ? 70 : 100;
        this.hp = this.maxHp;
        this.shopTimer = 0;
    }
    update() {
        if (this.dead) return;
        this.updatePhysics();

        let dx = 0, dy = 0;
        if (keys.w) dy -= 1; if (keys.s) dy += 1;
        if (keys.a) dx -= 1; if (keys.d) dx += 1;
        
        if (joyDX !== 0 || joyDY !== 0) { dx = joyDX; dy = joyDY; }

        if (dx !== 0 || dy !== 0) {
            if (dx < 0) this.flip = true;
            if (dx > 0) this.flip = false;

            const dist = Math.hypot(dx, dy);
            moveEntity(this, (dx/dist)*this.speed, (dy/dist)*this.speed, deltaFactor);
            
            if (!this.attacking) this.state = 'run';
        } else {
            if (!this.attacking) this.state = 'idle';
        }

        if (keys.e && this.shopTimer <= 0 && playerGold >= 10 && this.hp < this.maxHp) {
            playerGold -= 10;
            this.hp = Math.min(this.maxHp, this.hp + 50);
            this.shopTimer = 30;
        }
        if (this.shopTimer > 0) this.shopTimer -= deltaFactor;

        for (let i = items.length - 1; i >= 0; i--) {
            let item = items[i];
            if (Math.hypot(this.x - item.x, this.y - item.y) < 50) {
                if (item.type === 'meat') this.hp = Math.min(this.maxHp, this.hp + 30);
                else if (item.type === 'gold') playerGold += 5;
                items.splice(i, 1);
            }
        }
        this.updateAnimation();
    }
    attack() {
        this.attacking = true; this.state = 'attack'; this.frame = 0;
        
        if (this.heroClass === 'mage') {
            setTimeout(() => {
                if(this.dead) return;
                let targetX = this.x + (!this.flip ? 300 : -300);
                let targetY = this.y;
                
                let nearest = null;
                let nearestDist = 250;
                enemies.forEach(e => {
                    let d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (!e.dead && d < nearestDist) {
                        let dirX = e.x - this.x;
                        if ((!this.flip && dirX > -20) || (this.flip && dirX < 20)) {
                            nearest = e; nearestDist = d;
                        }
                    }
                });
                
                let vx = !this.flip ? 1 : -1;
                let vy = 0;
                if (nearest) {
                    vx = (nearest.x - this.x) / nearestDist;
                    vy = (nearest.y - this.y) / nearestDist;
                }

                projectiles.push({
                    x: this.x + vx * 20, y: this.y + vy * 20 - 10,
                    vx: vx * 12, vy: vy * 12,
                    timer: 45,
                    type: 'magic'
                });
            }, 300);
        } else {
            setTimeout(() => {
                if(this.dead) return;
                enemies.concat(sheeps).forEach(e => {
                    if (!e.dead && Math.hypot(this.x - e.x, this.y - e.y) < HITBOX_RADIUS * 3.5) {
                        const dirX = e.x - this.x;
                        if ((!this.flip && dirX >= -20) || (this.flip && dirX <= 20)) {
                            e.takeDamage(playerDamage, (dirX/Math.abs(dirX||1)) * 15, 0);
                            screenShake = 3;
                        }
                    }
                });
                
                let ec = Math.floor(this.x/TILE_SIZE);
                let er = Math.floor(this.y/TILE_SIZE);
                for(let dc=-2; dc<=2; dc++){
                    for(let dr=-2; dr<=2; dr++){
                        let c = ec+dc; let r = er+dr;
                        if(getTileType(c, r) === 'mine') {
                            let wx = c * TILE_SIZE + TILE_SIZE/2;
                            let wy = r * TILE_SIZE + TILE_SIZE/2;
                            if(Math.hypot(this.x - wx, this.y - wy) < 100) {
                                const dirX = wx - this.x;
                                if ((!this.flip && dirX >= -20) || (this.flip && dirX <= 20)) {
                                    screenShake = 2;
                                    if(Math.random() < 0.6) dropItem(wx, wy + 30, 'gold');
                                }
                            }
                        }
                    }
                }
            }, 300);
        }
    }
    die() {
        super.die();
        document.querySelector('#ui h2').innerText = "GAME OVER";
        document.querySelector('#ui p').innerText = "Atualize a página para recomeçar!";
    }
}

class Sheep extends Entity {
    constructor(x, y) {
        super(x, y, 1, 'sheep');
        this.maxHp = 20; this.hp = 20;
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.state = 'run';
    }
    get animationData() { return { row: 0, frames: 6, speed: 6 }; } 
    update() {
        this.updatePhysics();
        if (Math.random() < 0.02 * deltaFactor) this.wanderAngle = Math.random() * Math.PI * 2;
        
        let mx = Math.cos(this.wanderAngle) * this.speed;
        let my = Math.sin(this.wanderAngle) * this.speed;

        let hit = moveEntity(this, mx, my, deltaFactor);
        if(hit) this.wanderAngle = Math.random() * Math.PI * 2;

        this.flip = Math.cos(this.wanderAngle) < 0;
        this.updateAnimation();
    }
    die() {
        super.die();
        dropItem(this.x, this.y, 'meat');
    }
}

class Enemy extends Entity {
    constructor(x, y, type) {
        let img = 'enemy';
        if(type === 'ranged') img = 'tnt_goblin';
        if(type === 'kamikaze') img = 'barrel_goblin';
        super(x, y, type === 'kamikaze' ? 1.5 : 1, img);
        this.enemyType = type;
        this.attackCooldown = 0;
    }
    update() {
        if (this.dead) return;
        this.updatePhysics();
        if (this.attackCooldown > 0) this.attackCooldown -= deltaFactor;

        if (!this.attacking) {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            const dx = player.x - this.x;
            const dy = player.y - this.y;

            if (this.enemyType === 'melee') {
                if (dist < 50 && this.attackCooldown <= 0) this.attack();
                else if (dist < 800) {
                    this.state = 'run'; this.flip = dx < 0;
                    moveEntity(this, (dx/dist)*this.speed, (dy/dist)*this.speed, deltaFactor);
                } else this.state = 'idle';
            } 
            else if (this.enemyType === 'ranged') {
                if (dist < 250 && this.attackCooldown <= 0) this.attack();
                else if (dist < 150) { 
                    this.state = 'run'; this.flip = dx > 0;
                    moveEntity(this, (-dx/dist)*this.speed, (-dy/dist)*this.speed, deltaFactor);
                }
                else if (dist > 300 && dist < 800) { 
                    this.state = 'run'; this.flip = dx < 0;
                    moveEntity(this, (dx/dist)*this.speed, (dy/dist)*this.speed, deltaFactor);
                } else this.state = 'idle';
            }
            else if (this.enemyType === 'kamikaze') {
                if (dist < 60) this.die(); 
                else if (dist < 800) {
                    this.state = 'run'; this.flip = dx < 0;
                    moveEntity(this, (dx/dist)*this.speed, (dy/dist)*this.speed, deltaFactor);
                }
            }
        }
        this.updateAnimation();
    }
    attack() {
        this.attacking = true; this.state = 'attack'; this.frame = 0;
        if (this.enemyType === 'melee') {
            setTimeout(() => {
                if(this.dead || player.dead) return;
                if (Math.hypot(this.x - player.x, this.y - player.y) < 70) {
                    player.takeDamage(15, (player.x - this.x)/50 * 10, (player.y - this.y)/50 * 10);
                    screenShake = 8;
                }
            }, 400);
        } else if (this.enemyType === 'ranged') {
            setTimeout(() => {
                if(this.dead || player.dead) return;
                const dist = Math.hypot(player.x - this.x, player.y - this.y);
                projectiles.push({
                    x: this.x, y: this.y,
                    vx: (player.x - this.x) / 30, vy: (player.y - this.y) / 30,
                    timer: 30
                });
            }, 300);
        }
    }
    onAttackComplete() { this.attackCooldown = 90; }
    die() {
        super.die();
        if (this.enemyType === 'kamikaze') createExplosion(this.x, this.y, 40, 100);
        score++; scoreEl.innerText = score;
        if (Math.random() < 0.2) dropItem(this.x, this.y, 'meat');
        if (Math.random() < 0.3) dropItem(this.x, this.y, 'gold');
    }
}

function dropItem(x, y, type) {
    items.push({ x: x + (Math.random()*40-20), y: y + (Math.random()*40-20), type: type, timer: 600 });
}

function spawnEntity() {
    if (enemies.length < 30) {
        let angle = Math.random() * Math.PI * 2;
        let dist = (Math.max(canvas.width, canvas.height) / 2) + 100;
        let ex = player.x + Math.cos(angle) * dist;
        let ey = player.y + Math.sin(angle) * dist;
        
        let r = Math.random();
        let type = 'melee';
        if(r > 0.6) type = 'ranged';
        if(r > 0.85) type = 'kamikaze';
        enemies.push(new Enemy(ex, ey, type));
    }
    
    if (sheeps.length < 10) {
        let angle = Math.random() * Math.PI * 2;
        let dist = (Math.max(canvas.width, canvas.height) / 2) + 100;
        sheeps.push(new Sheep(player.x + Math.cos(angle) * dist, player.y + Math.sin(angle) * dist));
    }
}

let spawnTimer = 0;
let gameStarted = false;

function initGame() {
    // Apenas marca como pronto, o clique na tela inicial dispara startGame()
}

window.startGame = function(heroClass) {
    if (gameStarted) return;
    if (imagesLoaded < totalImages) {
        alert('As imagens ainda estão sendo carregadas, aguarde um segundo!');
        return;
    }
    document.getElementById('character-select').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    player = new Player(0, 0, heroClass);
    gameStarted = true;
    requestAnimationFrame(gameLoop);
};

let lastTime = 0;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = timestamp - lastTime;
    lastTime = timestamp;
    if (dt > 100) dt = 16.666;
    deltaFactor = dt / 16.666; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1 * deltaFactor;
    camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1 * deltaFactor;

    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= Math.pow(0.9, deltaFactor);
        if (screenShake < 0.5) screenShake = 0;
    }

    // Arredonda para evitar bordas brancas (sub-pixel rendering) e visualização das linhas da grade!
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    const startCol = Math.floor(camera.x / TILE_SIZE) - 1;
    const endCol = Math.floor((camera.x + canvas.width) / TILE_SIZE) + 1;
    const startRow = Math.floor(camera.y / TILE_SIZE) - 1;
    const endRow = Math.floor((camera.y + canvas.height) / TILE_SIZE) + 1;

    let visibleDecos = [];

    // Fundo + Props não-colidíveis (flat decorations)
    for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
            let wx = c * TILE_SIZE;
            let wy = r * TILE_SIZE;
            
            // Fundo base puramente grama para evitar quebra de textura sem autotile avançado
            ctx.drawImage(images.ground, 64, 64, TILE_SIZE, TILE_SIZE, wx, wy, TILE_SIZE, TILE_SIZE);
            
            let type = getTileType(c, r);
            
            // Decorações flat (desenhadas ANTES dos jogadores, como um decalque)
            if (type === 'deco1') ctx.drawImage(images.deco1, 0, 0, 64, 64, wx + 16, wy + 16, 32, 32);
            else if (type === 'deco2') ctx.drawImage(images.deco2, 0, 0, 64, 64, wx, wy, 64, 64);
            else if (type === 'deco3') ctx.drawImage(images.deco3, 0, 0, 64, 64, wx + 16, wy + 16, 32, 32);
            
            // Objetos 3D com colisão (enviados pro array de sort)
            let centerWX = wx + TILE_SIZE/2;
            let centerWY = wy + TILE_SIZE/2;
            if (type === 'tree') visibleDecos.push({type: 'tree', x: centerWX, y: centerWY});
            else if (type === 'mine') visibleDecos.push({type: 'mine', x: centerWX, y: centerWY});
        }
    }

    items.forEach(item => {
        let img = item.type === 'meat' ? images.meat : images.gold;
        ctx.drawImage(img, 0, 0, 128, 128, item.x - 20, item.y - 20, 40, 40);
        item.timer -= deltaFactor;
    });

    const renderList = [];
    if (!player.dead) renderList.push(player);
    renderList.push(...enemies.filter(e => !e.dead));
    renderList.push(...sheeps.filter(s => !s.dead));

    visibleDecos.forEach(d => {
        if(d.type === 'tree') {
            renderList.push({ 
                isEntity: false, 
                y: d.y + 40, 
                draw: (c) => {
                    let time = Date.now() / 1000;
                    let wind = Math.sin(time * 2 + d.x * 0.01 + d.y * 0.01) * 0.05;
                    c.save();
                    c.translate(d.x, d.y + 40);
                    c.rotate(wind);
                    c.drawImage(images.tree, 0, 0, 192, 192, -96, -184, 192, 192);
                    c.restore();
                } 
            });
        }
        if(d.type === 'mine') {
            renderList.push({ 
                isEntity: false, 
                y: d.y + 35, 
                draw: (c) => {
                    c.save();
                    c.globalCompositeOperation = 'lighter';
                    let pulse = Math.abs(Math.sin(Date.now() / 400));
                    let grad = c.createRadialGradient(d.x, d.y, 0, d.x, d.y, 40 + pulse * 20);
                    grad.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
                    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    c.fillStyle = grad;
                    c.beginPath();
                    c.arc(d.x, d.y, 60, 0, Math.PI * 2);
                    c.fill();
                    c.restore();
                    
                    c.drawImage(images.gold_mine, 0, 0, 192, 128, d.x - 96, d.y - 64, 192, 128);
                } 
            });
        }
    });

    renderList.sort((a, b) => a.y - b.y);

    if(!player.dead) player.update();
    enemies.forEach(e => e.update());
    sheeps.forEach(s => s.update());

    renderList.forEach(ent => ent.draw(ctx));

    projectiles.forEach(p => {
        p.x += p.vx * deltaFactor; 
        p.y += p.vy * deltaFactor; 
        p.timer -= deltaFactor;
        
        if (p.type === 'magic') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI*2);
            ctx.fillStyle = '#0ff';
            ctx.fill();
            
            enemies.concat(sheeps).forEach(e => {
                if (!p.dead && !e.dead && Math.hypot(p.x - e.x, p.y - e.y) < 40) {
                    e.takeDamage(playerDamage, p.vx > 0 ? 15 : -15, p.vy > 0 ? 15 : -15);
                    p.dead = true;
                }
            });
            if (p.timer <= 0) p.dead = true;
        } else {
            ctx.drawImage(images.dynamite, 0, 0, 64, 64, p.x - 15, p.y - 15, 30, 30);
            if (p.timer <= 0) { p.dead = true; createExplosion(p.x, p.y, 25, 60); }
        }
    });

    explosions.forEach(ex => {
        ex.timer += deltaFactor; 
        let frame = Math.floor(ex.timer / 3);
        if (frame < 9) ctx.drawImage(images.explosion, frame * 192, 0, 192, 192, ex.x - 96, ex.y - 96, 192, 192);
        else ex.dead = true;
    });

    spawnTimer += deltaFactor;
    if (spawnTimer >= 90 && !player.dead) { // ~1.5s
        spawnTimer = 0;
        spawnEntity();
    }

    const MAX_DIST = 2000;
    items = items.filter(i => i.timer > 0 && Math.hypot(i.x - player.x, i.y - player.y) < MAX_DIST);
    enemies = enemies.filter(e => !e.dead && Math.hypot(e.x - player.x, e.y - player.y) < MAX_DIST);
    sheeps = sheeps.filter(s => !s.dead && Math.hypot(s.x - player.x, s.y - player.y) < MAX_DIST);
    projectiles = projectiles.filter(p => !p.dead);
    explosions = explosions.filter(ex => !ex.dead);

    ctx.restore();

    // Fix bug text-rendering on bottom panel. Nao afeta o HTML fixed bottom
    requestAnimationFrame(gameLoop);
}
