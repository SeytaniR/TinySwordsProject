const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hpEl = document.getElementById('ui-hp-fill');
const goldEl = document.getElementById('ui-gold');
const woodEl = document.getElementById('ui-wood');
const scoreEl = document.getElementById('ui-score');

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'kk';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
}

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
    player: new Image(), mage: new Image(), enemy: new Image(), tnt_goblin: new Image(), barrel_goblin: new Image(), wolf: new Image(), orc: new Image(), bat: new Image(),
    ground: new Image(), water: new Image(), foam: new Image(), tree: new Image(),
    meat: new Image(), gold: new Image(), wood: new Image(), gold_mine: new Image(), sheep: new Image(),
    dynamite: new Image(), explosion: new Image(), fire: new Image(),
    goblin_house: new Image(), goblin_house_destroyed: new Image(), goblin_tower: new Image(), goblin_tower_destroyed: new Image(),
    tower: new Image(), tower_construction: new Image(), tower_destroyed: new Image(),
    castle: new Image(), castle_construction: new Image(), castle_destroyed: new Image(),
    house: new Image(), house_construction: new Image(), house_destroyed: new Image(),
    pawn: new Image(), ui_banner: new Image(), ui_button: new Image(), bridge: new Image(),
    elevation: new Image(), deco1: new Image(), deco2: new Image(), deco3: new Image(),
    construction_base: new Image()
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
images.wolf.src = 'game_assets/wolf.png';
images.orc.src = 'game_assets/orc.png';
images.bat.src = 'game_assets/bat.png';
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

images.wood.src = 'game_assets/wood.png';
images.fire.src = 'game_assets/fire.png';
images.goblin_house.src = 'game_assets/goblin_house.png';
images.goblin_house_destroyed.src = 'game_assets/goblin_house_destroyed.png';
images.goblin_tower.src = 'game_assets/goblin_tower.png';
images.goblin_tower_destroyed.src = 'game_assets/goblin_tower_destroyed.png';

images.tower.src = 'game_assets/tower.png';
images.tower_construction.src = 'game_assets/tower_construction.png';
images.tower_destroyed.src = 'game_assets/tower_destroyed.png';

images.castle.src = 'game_assets/castle.png';
images.castle_construction.src = 'game_assets/castle_construction.png';
images.castle_destroyed.src = 'game_assets/castle_destroyed.png';

images.house.src = 'game_assets/house.png';
images.house_construction.src = 'game_assets/house_construction.png';
images.house_destroyed.src = 'game_assets/house_destroyed.png';

images.pawn.src = 'game_assets/pawn.png';
images.construction_base.src = 'game_assets/construction_base.png';
images.ui_banner.src = 'game_assets/ui_banner.png';
images.ui_button.src = 'game_assets/ui_button.png';
images.bridge.src = 'game_assets/bridge.png';

const keys = { w: false, a: false, s: false, d: false, e: false };
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'e'].includes(k)) keys[k] = true;
    
    // Construção (agora apenas coloca o blueprint, os Pawns gastam o recurso)
    if (gameStarted && !player.dead) {
        if (k === '1') {
            buildings.push(new Building(player.x, player.y, 'tower', 'player'));
        }
        if (k === '2') {
            buildings.push(new Building(player.x, player.y, 'castle', 'player'));
        }
    }
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

let treeHP = {};
let choppedTrees = {};
let playerWood = 0;

// Lógica de Procedural e Biomas
function getTileType(c, r) {
    let val = seededRandom(c, r);
    if (val < 0.05) {
        if (choppedTrees[`${c},${r}`]) return 'empty'; // árvore derrubada vira chão
        return 'tree';
    }
    
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

let buildings = [];
let pawns = [];

let enemies = [];
let items = [];
let projectiles = [];
let explosions = [];
let sheeps = [];
let player = null;
let pet = null;

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
        if (this.imageType === 'sheep' || this.imageType === 'barrel_goblin' || this.imageType === 'mage' || this.imageType === 'wolf' || this.imageType === 'orc' || this.imageType === 'bat') fSize = 128;

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
                else if (item.type === 'gold') { playerGold += 5; }
                else if (item.type === 'wood') { playerWood += 1; }
                items.splice(i, 1);
            }
        }
        
        // Auto-Ataque
        if (!this.attacking) {
            let autoAttack = false;
            let range = this.heroClass === 'mage' ? 250 : 120;
            // Procurar inimigo próximo
            for (let i = 0; i < enemies.length; i++) {
                let e = enemies[i];
                if (!e.dead && Math.hypot(this.x - e.x, this.y - e.y) < range) {
                    autoAttack = true;
                    this.flip = e.x < this.x;
                    break;
                }
            }
            if (!autoAttack) {
                // Procurar predio inimigo proximo
                for (let i = 0; i < buildings.length; i++) {
                    let b = buildings[i];
                    if (b.faction === 'enemy' && b.state !== 'destroyed' && Math.hypot(this.x - b.x, this.y - b.y) < range) {
                        autoAttack = true;
                        this.flip = b.x < this.x;
                        break;
                    }
                }
            }
            if (autoAttack) this.attack();
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
                enemies.concat(sheeps).concat(buildings.filter(b => b.faction === 'enemy')).forEach(e => {
                    if (!e.dead && e.state !== 'destroyed' && Math.hypot(this.x - e.x, this.y - e.y) < HITBOX_RADIUS * 3.5) {
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
                        let type = getTileType(c, r);
                        let wx = c * TILE_SIZE + TILE_SIZE/2;
                        let wy = r * TILE_SIZE + TILE_SIZE/2;
                        
                        if(type === 'mine') {
                            if(Math.hypot(this.x - wx, this.y - wy) < 100) {
                                const dirX = wx - this.x;
                                if ((!this.flip && dirX >= -20) || (this.flip && dirX <= 20)) {
                                    screenShake = 2;
                                    if(Math.random() < 0.6) dropItem(wx, wy + 30, 'gold');
                                }
                            }
                        } else if(type === 'tree') {
                            if(Math.hypot(this.x - wx, this.y - (wy + 40)) < 80) {
                                const dirX = wx - this.x;
                                if ((!this.flip && dirX >= -20) || (this.flip && dirX <= 20)) {
                                    screenShake = 1;
                                    let key = `${c},${r}`;
                                    if(!treeHP[key]) treeHP[key] = 3;
                                    treeHP[key]--;
                                    if(treeHP[key] <= 0) {
                                        choppedTrees[key] = true;
                                        for(let w=0; w<3; w++) {
                                            setTimeout(() => dropItem(wx + (Math.random()*40-20), wy + 20 + (Math.random()*40-20), 'wood'), w*100);
                                        }
                                    }
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

class Pet extends Entity {
    constructor(x, y) {
        super(x, y, 4, 'wolf'); 
        this.maxHp = 9999;
        this.hp = 9999; // Invencível
    }
    update() {
        this.updatePhysics();
        let nearestEnemy = null;
        let nearestDist = 300;
        
        enemies.forEach(e => {
            if (!e.dead) {
                let d = Math.hypot(this.x - e.x, this.y - e.y);
                if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
            }
        });
        
        let targetX = player.x;
        let targetY = player.y;
        let stopDist = 70;
        let isAttackingTarget = false;
        
        if (nearestEnemy) {
            targetX = nearestEnemy.x;
            targetY = nearestEnemy.y;
            stopDist = 40;
            isAttackingTarget = true;
        } else {
            let distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
            if (distToPlayer > 800) { this.x = player.x; this.y = player.y; }
        }
        
        let dx = targetX - this.x;
        let dy = targetY - this.y;
        let dist = Math.hypot(dx, dy);
        
        if (dist > stopDist) {
            if (dx < 0) this.flip = true;
            if (dx > 0) this.flip = false;
            moveEntity(this, (dx/dist)*this.speed, (dy/dist)*this.speed, deltaFactor);
            if (!this.attacking) this.state = 'run';
        } else {
            if (isAttackingTarget && !this.attacking && nearestEnemy) {
                this.attack(nearestEnemy);
            } else {
                if (!this.attacking) this.state = 'idle';
            }
        }
        this.updateAnimation();
    }
    attack(target) {
        this.attacking = true;
        this.state = 'attack';
        this.frame = 0;
        if (target.x < this.x) this.flip = true;
        else this.flip = false;
        
        setTimeout(() => {
            if (target && !target.dead && Math.hypot(this.x - target.x, this.y - target.y) < 80) {
                let dirX = target.x - this.x;
                target.takeDamage(10, (dirX/Math.abs(dirX||1)) * 8, 0); // Mordida empurra inimigo
            }
        }, 300);
    }
}

class Pawn extends Entity {
    constructor(x, y) {
        super(x, y, 1.5, 'pawn');
        this.targetBuilding = null;
        this.buildCooldown = 0;
    }
    
    update() {
        if (this.dead) return;
        this.updatePhysics();
        this.updateAnimation();
        this.buildCooldown -= deltaFactor;

        this.targetBuilding = null;
        let tDist = 1000;
        buildings.forEach(b => {
            if (b.faction === 'player' && b.state === 'blueprint') {
                let d = Math.hypot(b.x - this.x, b.y - this.y);
                if (d < tDist) { tDist = d; this.targetBuilding = b; }
            }
        });

        if (this.targetBuilding) {
            const dx = this.targetBuilding.x - this.x;
            const dy = this.targetBuilding.y - this.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 60) {
                if (!this.attacking) {
                    this.state = 'attack';
                    this.frame = 0;
                    this.attacking = true;
                    this.flip = dx < 0;
                    
                    setTimeout(() => {
                        this.attacking = false;
                        if (!this.targetBuilding || this.targetBuilding.state !== 'blueprint') return;
                        
                        let builtSomething = false;
                        if (playerWood > 0) { playerWood--; builtSomething = true; }
                        if (playerGold > 0) { playerGold--; builtSomething = true; }
                        
                        if (builtSomething) {
                            this.targetBuilding.buildProgress += 5; 
                        } else {
                            this.state = 'idle'; // Pobreza
                        }
                    }, 400); // Frame da martelada
                }
            } else {
                if (!this.attacking) {
                    this.state = 'run';
                    this.flip = dx < 0;
                    moveEntity(this, (dx/dist)*this.speed, (dy/dist)*this.speed, deltaFactor);
                }
            }
        } else {
            // Idle perto do player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 150 && !this.attacking) {
                this.state = 'run';
                this.flip = dx < 0;
                moveEntity(this, (dx/dist)*this.speed, (dy/dist)*this.speed, deltaFactor);
            } else if (!this.attacking) {
                this.state = 'idle';
            }
        }
    }
}

class Building {
    constructor(x, y, type, faction) {
        this.x = x; this.y = y; this.type = type; this.faction = faction;
        this.hp = 300; this.maxHp = 300;
        this.state = faction === 'player' ? 'blueprint' : 'active';
        this.timer = 0;
        this.buildProgress = 0; // Vai até 100 com as marteladas dos Pawns
        
        if (type === 'castle') { this.maxHp = 1000; this.hp = 1000; }
        else if (type === 'tower') { this.maxHp = 250; this.hp = 250; }
        else if (type === 'house') { this.maxHp = 150; this.hp = 150; }
        else if (type === 'goblin_house') { this.state = 'active'; this.maxHp = 200; this.hp = 200; }
        else if (type === 'goblin_tower') { this.state = 'active'; this.maxHp = 250; this.hp = 250; }
    }
    update() {
        if (this.state === 'destroyed') return;
        this.timer += deltaFactor;
        
        if (this.state === 'construction') {
            // Animacao de construcao ja comecou visualmente apos blueprint, mas agora e baseada no buildProgress
            if (this.buildProgress >= 100) {
                this.state = 'active';
            }
        }
        
        if (this.state === 'active') {
            if (this.type === 'tower' || this.type === 'goblin_tower') {
                if (this.timer > 90) { // Atira a cada 1.5s
                    this.timer = 0;
                    let target = null; let tDist = 500;
                    if (this.faction === 'player') {
                        enemies.forEach(e => {
                            if(!e.dead) {
                                let d = Math.hypot(e.x - this.x, e.y - this.y);
                                if(d<tDist){tDist=d; target=e;}
                            }
                        });
                    } else {
                        let d1 = Math.hypot(player.x - this.x, player.y - this.y);
                        if (!player.dead && d1 < tDist) { target = player; tDist = d1; }
                        if (pet) {
                            let d2 = Math.hypot(pet.x - this.x, pet.y - this.y);
                            if (d2 < tDist) target = pet;
                        }
                    }
                    if (target) {
                        let dx = target.x - this.x; let dy = target.y - this.y;
                        let dist = Math.hypot(dx,dy);
                        projectiles.push({
                            x: this.x, y: this.y - 60,
                            vx: (dx/dist)*10, vy: (dy/dist)*10,
                            timer: 60,
                            type: this.faction === 'player' ? 'arrow_friendly' : 'arrow_enemy'
                        });
                    }
                }
            }
            if (this.type === 'goblin_house') {
                if (this.timer > 400) { // A cada ~6 segundos spawna um goblin
                    this.timer = 0;
                    if (enemies.length < 40) enemies.push(new Enemy(this.x, this.y + 60, 'melee'));
                }
            }
        }
    }
    takeDamage(dmg) {
        if (this.state === 'destroyed') return;
        this.hp -= dmg;
        if (this.hp <= 0) {
            this.state = 'destroyed';
            for(let i=0; i<15; i++) {
                dropItem(this.x + Math.random()*100-50, this.y + Math.random()*100-50, this.faction === 'enemy' ? 'gold' : 'wood');
            }
        }
    }
    draw(ctx) {
        let img = null;
        if (this.state === 'blueprint') {
            img = images.construction_base;
        } else {
            if (this.type === 'castle') img = this.state === 'active' ? images.castle : (this.state === 'destroyed' ? images.castle_destroyed : images.castle_construction);
            else if (this.type === 'tower') img = this.state === 'active' ? images.tower : (this.state === 'destroyed' ? images.tower_destroyed : images.tower_construction);
            else if (this.type === 'house') img = this.state === 'active' ? images.house : (this.state === 'destroyed' ? images.house_destroyed : images.house_construction);
            else if (this.type === 'goblin_house') img = this.state === 'destroyed' ? images.goblin_house_destroyed : images.goblin_house;
            else if (this.type === 'goblin_tower') img = this.state === 'destroyed' ? images.goblin_tower_destroyed : images.goblin_tower;
        }
        
        if (img && img.width > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // Barra de HP para predios ativos ou destruidos
            if (this.state !== 'blueprint' && this.hp < this.maxHp && this.state !== 'destroyed') {
                ctx.fillStyle = 'black'; ctx.fillRect(-40, -img.height + 20, 80, 10);
                ctx.fillStyle = 'red'; ctx.fillRect(-39, -img.height + 21, 78 * (this.hp/this.maxHp), 8);
            }
            
            // Barra de Progresso de Construcao
            if (this.state === 'blueprint' || this.state === 'construction') {
                ctx.fillStyle = 'black'; ctx.fillRect(-40, -img.height + 10, 80, 8);
                ctx.fillStyle = '#0f0'; ctx.fillRect(-39, -img.height + 11, 78 * (this.buildProgress/100), 6);
            }

            // Centraliza o predio, alinha pelo topo/y
            ctx.drawImage(img, 0, 0, img.width, img.height, -img.width/2, -img.height + 64, img.width, img.height);
            ctx.restore();
        }
    }
}

class Enemy extends Entity {
    constructor(x, y, type) {
        let img = 'enemy';
        if(type === 'ranged') img = 'tnt_goblin';
        if(type === 'kamikaze') img = 'barrel_goblin';
        if(type === 'orc') img = 'orc';
        if(type === 'bat') img = 'bat';
        
        let speed = 1;
        if(type === 'kamikaze') speed = 1.5;
        if(type === 'orc') speed = 0.8;
        if(type === 'bat') speed = 2.2;
        
        super(x, y, speed, img);
        this.enemyType = type;
        
        if (type === 'orc') {
            this.maxHp = 150;
            this.hp = 150;
        } else if (type === 'bat') {
            this.maxHp = 30;
            this.hp = 30;
        }
        
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

            if (this.enemyType === 'melee' || this.enemyType === 'orc' || this.enemyType === 'bat') {
                let range = this.enemyType === 'orc' ? 70 : 50;
                if (dist < range && this.attackCooldown <= 0) this.attack();
                else if (dist < 800) {
                    this.state = 'run'; this.flip = dx < 0;
                    
                    if (this.enemyType === 'bat') {
                        // Morcegos voam por cima de arvores, nao usam moveEntity() que checa colisao
                        this.x += (dx/dist)*this.speed * deltaFactor;
                        this.y += (dy/dist)*this.speed * deltaFactor;
                    } else {
                        moveEntity(this, (dx/dist)*this.speed, (dy/dist)*this.speed, deltaFactor);
                    }
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
        if (this.enemyType === 'melee' || this.enemyType === 'orc' || this.enemyType === 'bat') {
            let dmg = this.enemyType === 'orc' ? 30 : (this.enemyType === 'bat' ? 5 : 15);
            let hitRange = this.enemyType === 'orc' ? 90 : (this.enemyType === 'bat' ? 60 : 70);
            let delay = this.enemyType === 'bat' ? 300 : 400; // O morcego ataca mais rápido (frame 4)
            setTimeout(() => {
                if(this.dead || player.dead) return;
                if (Math.hypot(this.x - player.x, this.y - player.y) < hitRange) {
                    player.takeDamage(dmg, (player.x - this.x)/50 * 10, (player.y - this.y)/50 * 10);
                    screenShake = this.enemyType === 'orc' ? 12 : (this.enemyType === 'bat' ? 4 : 8);
                }
            }, delay);
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
        score++;
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
        if(r > 0.4) type = 'bat';
        if(r > 0.6) type = 'ranged';
        if(r > 0.80) type = 'kamikaze';
        if(r > 0.90) type = 'orc'; // 10% de chance de nascer um Orc brutamontes!
        enemies.push(new Enemy(ex, ey, type));
    }
    
    // Spawnar acampamentos (maximo 4)
    if (buildings.filter(b => b.faction === 'enemy' && b.state !== 'destroyed').length < 4) {
        if (Math.random() < 0.1) { // 10% chance per spawn cycle
            let angle = Math.random() * Math.PI * 2;
            let dist = 900 + Math.random() * 400; // Bem longe
            let ex = player.x + Math.cos(angle) * dist;
            let ey = player.y + Math.sin(angle) * dist;
            let bType = Math.random() > 0.5 ? 'goblin_house' : 'goblin_tower';
            buildings.push(new Building(ex, ey, bType, 'enemy'));
        }
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
    document.getElementById('hud-top-left').style.display = 'flex';
    document.getElementById('hud-top-right').style.display = 'flex';
    document.getElementById('build-btn-container').style.display = 'block';
    document.getElementById('mobile-controls').style.display = 'block';
    player = new Player(0, 0, heroClass);
    pet = new Pet(0, 50);
    pawns.push(new Pawn(-80, 50));
    pawns.push(new Pawn(80, 50));
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
        let img = images.gold;
        if (item.type === 'meat') img = images.meat;
        else if (item.type === 'wood') img = images.wood;
        ctx.drawImage(img, 0, 0, 128, 128, item.x - 20, item.y - 20, 40, 40);
        item.timer -= deltaFactor;
    });

    const renderList = [];
    if (!player.dead) renderList.push(player);
    if (pet) renderList.push(pet);
    renderList.push(...enemies.filter(e => !e.dead));
    renderList.push(...sheeps.filter(s => !s.dead));
    renderList.push(...buildings);
    renderList.push(...pawns);

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
    if(pet) pet.update();
    buildings.forEach(b => b.update());
    pawns.forEach(p => p.update());
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
            
            enemies.concat(sheeps).concat(buildings.filter(b => b.faction === 'enemy')).forEach(e => {
                if (!p.dead && !e.dead && e.state !== 'destroyed' && Math.hypot(p.x - e.x, p.y - e.y) < 40) {
                    e.takeDamage(playerDamage, p.vx > 0 ? 15 : -15, p.vy > 0 ? 15 : -15);
                    p.dead = true;
                }
            });
            if (!p.dead) {
                let ec = Math.floor(p.x/TILE_SIZE);
                let er = Math.floor(p.y/TILE_SIZE);
                let type = getTileType(ec, er);
                let wx = ec * TILE_SIZE + TILE_SIZE/2;
                let wy = er * TILE_SIZE + TILE_SIZE/2;
                if (type === 'mine' && Math.hypot(p.x - wx, p.y - wy) < 60) {
                    p.dead = true;
                    if(Math.random() < 0.3) dropItem(wx, wy + 30, 'gold');
                } else if (type === 'tree' && Math.hypot(p.x - wx, p.y - (wy + 40)) < 40) {
                    p.dead = true;
                    let key = `${ec},${er}`;
                    if(!treeHP[key]) treeHP[key] = 3;
                    treeHP[key]--;
                    if(treeHP[key] <= 0) {
                        choppedTrees[key] = true;
                        for(let w=0; w<3; w++) {
                            setTimeout(() => dropItem(wx + (Math.random()*40-20), wy + 20 + (Math.random()*40-20), 'wood'), w*100);
                        }
                    }
                }
            }
            if (p.timer <= 0) p.dead = true;
        } else if (p.type === 'arrow_friendly' || p.type === 'arrow_enemy') {
            ctx.fillStyle = '#fff';
            ctx.fillRect(p.x - 3, p.y - 3, 6, 6); // simple square arrow for now
            
            if (p.type === 'arrow_friendly') {
                enemies.concat(sheeps).concat(buildings.filter(b => b.faction === 'enemy')).forEach(e => {
                    if (!p.dead && !e.dead && e.state !== 'destroyed' && Math.hypot(p.x - e.x, p.y - e.y) < 30) {
                        e.takeDamage(20, p.vx > 0 ? 10 : -10, p.vy > 0 ? 10 : -10);
                        p.dead = true;
                    }
                });
            } else {
                if (!p.dead && !player.dead && Math.hypot(p.x - player.x, p.y - player.y) < 30) {
                    player.takeDamage(10, p.vx > 0 ? 5 : -5, p.vy > 0 ? 5 : -5);
                    p.dead = true;
                }
                if (!p.dead && pet && Math.hypot(p.x - pet.x, p.y - pet.y) < 30) p.dead = true;
                
                buildings.filter(b => b.faction === 'player').forEach(e => {
                    if (!p.dead && e.state !== 'destroyed' && Math.hypot(p.x - e.x, p.y - e.y) < 40) {
                        e.takeDamage(10);
                        p.dead = true;
                    }
                });
            }
            if (p.timer <= 0) p.dead = true;
        } else {
            // Default to dynamite
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

    // Atualizar HUD
    if (hpEl) {
        let pct = Math.max(0, Math.floor((player.hp / player.maxHp) * 100));
        hpEl.style.width = pct + '%';
    }
    
    function updateRes(el, val) {
        if (!el) return;
        let strVal = formatNumber(val);
        if (el.innerText !== strVal) {
            el.innerText = strVal;
            el.classList.remove('pop-anim');
            void el.offsetWidth; // trigger reflow
            el.classList.add('pop-anim');
        }
    }
    updateRes(goldEl, playerGold);
    updateRes(woodEl, playerWood);
    updateRes(scoreEl, score);

    requestAnimationFrame(gameLoop);
}

window.placeBlueprint = function(type) {
    if (!gameStarted || player.dead) return;
    buildings.push(new Building(player.x, player.y, type, 'player'));
    document.getElementById('build-menu').style.display = 'none';
};
