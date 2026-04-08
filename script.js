// --- Configuration & State ---
let bgmVolume = 1.0;
let sfxVolume = 1.0;
let difficulty = 'normal'; 
let spawnTimer, shootTimer; 

// Detect Mobile Touch Device
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// --- DOM Elements & Resize handling ---
const c = document.getElementById("c");
const ctx = c.getContext("2d");
c.width = innerWidth; c.height = innerHeight;

window.addEventListener('resize', () => {
  c.width = innerWidth;
  c.height = innerHeight;
});

const menus = {
  main: document.getElementById('main-menu'),
  settings: document.getElementById('settings-menu'),
  pause: document.getElementById('pause-menu'),
  gameOver: document.getElementById('game-over-screen'),
  hud: document.getElementById('hud'),
  shutdown: document.getElementById('shutdown-screen'),
  mobileControls: document.getElementById('mobile-controls')
};

// UI Handlers
document.getElementById('btn-settings-open').addEventListener('click', () => { menus.main.style.display = "none"; menus.settings.style.display = "flex"; });
document.getElementById('btn-settings-close').addEventListener('click', () => { menus.settings.style.display = "none"; menus.main.style.display = "flex"; });
document.getElementById('btn-exit').addEventListener('click', () => { menus.main.style.display = "none"; menus.shutdown.style.display = "flex"; });
document.getElementById('slider-bgm').addEventListener('input', (e) => { bgmVolume = e.target.value / 100; document.getElementById('bgm-val').innerText = e.target.value + "%"; });
document.getElementById('slider-sfx').addEventListener('input', (e) => { sfxVolume = e.target.value / 100; document.getElementById('sfx-val').innerText = e.target.value + "%"; });

function setDifficulty(level) {
  difficulty = level;
  document.getElementById('diff-easy').classList.remove('active-diff'); document.getElementById('diff-normal').classList.remove('active-diff'); document.getElementById('diff-hard').classList.remove('active-diff');
  document.getElementById('diff-' + level).classList.add('active-diff');
}

// --- Audio System ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmInterval;
let isBgmPlaying = false;

function startBGM() {
  if (isBgmPlaying) return;
  isBgmPlaying = true;
  const notes = [110, 110, 130, 146, 110, 110, 98, 82]; 
  let step = 0;
  
  bgmInterval = setInterval(() => {
    if (gameOver || isPaused || inMenu || bgmVolume === 0) return; 
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'square'; 
    osc.frequency.setValueAtTime(notes[step], audioCtx.currentTime);
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0.015 * bgmVolume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.15);
    step = (step + 1) % notes.length; 
  }, 150); 
}

function playSound(type) {
  if (sfxVolume <= 0) return; 
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode); gainNode.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  
  if (type === 'shoot') {
    osc.type = 'square'; osc.frequency.setValueAtTime(880, now); osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
    gainNode.gain.setValueAtTime(0.05 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.1); gainNode.gain.linearRampToValueAtTime(0, now + 0.15); 
    osc.start(now); osc.stop(now + 0.15);
  } else if (type === 'enemyShoot') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(55, now + 0.15);
    gainNode.gain.setValueAtTime(0.05 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.15); gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.start(now); osc.stop(now + 0.2);
  } else if (type === 'hit') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    gainNode.gain.setValueAtTime(0.2 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.2); gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
    osc.start(now); osc.stop(now + 0.25);
  } else if (type === 'explode') {
    osc.type = 'square'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
    gainNode.gain.setValueAtTime(0.1 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.3); gainNode.gain.linearRampToValueAtTime(0, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  } else if (type === 'levelup') {
    osc.type = 'square'; osc.frequency.setValueAtTime(440, now); osc.frequency.setValueAtTime(554, now + 0.1); osc.frequency.setValueAtTime(659, now + 0.2); 
    gainNode.gain.setValueAtTime(0.1 * sfxVolume, now); gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.start(now); osc.stop(now + 0.4);
  } else if (type === 'bossWarning') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.linearRampToValueAtTime(150, now + 0.5); osc.frequency.linearRampToValueAtTime(100, now + 1.0);
    gainNode.gain.setValueAtTime(0.1 * sfxVolume, now); gainNode.gain.linearRampToValueAtTime(0, now + 1.0);
    osc.start(now); osc.stop(now + 1.0);
  } else if (type === 'bossHit') {
    osc.type = 'square'; osc.frequency.setValueAtTime(80, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.1);
    gainNode.gain.setValueAtTime(0.2 * sfxVolume, now); gainNode.gain.exponentialRampToValueAtTime(0.01 * sfxVolume, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  }
}

// --- Game State Variables ---
let mouse = {x:c.width/2, y:c.height/2};
let firing = false;
let inMenu = true;
let isPaused = false;
let gameOver = false;

let player, bullets, enemies, enemyBullets, stars;
let health, score, currentLevel;

let bossActive = false;
let boss = null;

// Joystick State
let joystick = { active: false, dx: 0, dy: 0, touchId: null };

stars = [];
for (let i = 0; i < 150; i++) {
  stars.push({ x: Math.random() * c.width, y: Math.random() * c.height, size: Math.random() * 2 + 0.5, speed: Math.random() * 1.5 + 0.2 });
}

// --- Game Control Logic ---

function spawnBoss() {
  bossActive = true;
  clearInterval(spawnTimer);
  playSound('bossWarning');
  setTimeout(() => playSound('bossWarning'), 1000);
  let speedMod = difficulty === 'easy' ? 0.6 : (difficulty === 'normal' ? 1.0 : 1.5);
  boss = { x: c.width / 2, y: -150, targetY: 120, width: 160, height: 100, hp: 1000 + (currentLevel * 500), maxHp: 1000 + (currentLevel * 500), speed: (2 + (currentLevel * 0.5)) * speedMod, direction: 1, attackTimer: 0 };
}

function applyDifficultyTimers() {
  clearInterval(spawnTimer); clearInterval(shootTimer);
  let baseSpawn = difficulty === 'easy' ? 2000 : (difficulty === 'normal' ? 1500 : 1000);
  let baseFire = difficulty === 'easy' ? 4000 : (difficulty === 'normal' ? 3000 : 2000);
  let speedMod = difficulty === 'easy' ? 0.6 : (difficulty === 'normal' ? 1.0 : 1.5);
  let levelMultiplier = Math.max(0.4, 1 - (currentLevel * 0.15));

  spawnTimer = setInterval(()=>{
    if(gameOver || inMenu || isPaused || bossActive) return;
    let side = Math.floor(Math.random()*4);
    let x,y;
    if(side===0){ x=Math.random()*c.width; y=-30; }
    else if(side===1){ x=Math.random()*c.width; y=c.height+30; }
    else if(side===2){ x=-30; y=Math.random()*c.height; }
    else { x=c.width+30; y=Math.random()*c.height; }
    let enemySpeed = (0.5 + (Math.random() * 0.5)) * speedMod * (1 + (currentLevel * 0.2));
    enemies.push({x, y, speed: enemySpeed});
  }, baseSpawn * levelMultiplier);

  shootTimer = setInterval(()=>{
    if(gameOver || inMenu || isPaused) return;
    if (enemies.length > 0) {
      playSound('enemyShoot'); 
      enemies.forEach(e=>{
        let centerX = e.x + 15; let centerY = e.y + 15;
        let a = Math.atan2(player.y - centerY, player.x - centerX);
        let bulletSpeed = 2 * speedMod * (1 + (currentLevel * 0.1));
        enemyBullets.push({ x: centerX, y: centerY, dx: Math.cos(a)*bulletSpeed, dy: Math.sin(a)*bulletSpeed });
      });
    }
  }, baseFire * levelMultiplier);
}

function startGame(){
  player = {x:c.width/2, y:c.height/2, angle:0};
  bullets = []; enemies = []; enemyBullets = [];
  health = 100; score = 0; currentLevel = 0;
  bossActive = false; boss = null;
  
  inMenu = false; isPaused = false; gameOver = false;
  
  Object.values(menus).forEach(m => m.style.display = 'none');
  menus.hud.style.display = "flex";
  
  // Only show the mobile joystick/fire button on actual mobile devices
  if (isTouchDevice) {
    menus.mobileControls.style.display = "flex";
  }
  
  updateUI();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  startBGM(); 
  applyDifficultyTimers();
}

function triggerLevelUp() {
  currentLevel++; playSound('levelup'); applyDifficultyTimers(); updateUI();
}

function returnToMenu() {
  inMenu = true; isPaused = false;
  menus.pause.style.display = "none"; menus.hud.style.display = "none"; menus.mobileControls.style.display = "none"; menus.main.style.display = "flex";
  clearInterval(bgmInterval); isBgmPlaying = false;
}

function togglePause() {
  if(inMenu || gameOver) return;
  isPaused = !isPaused;
  if (isPaused) {
    menus.pause.style.display = "flex"; if(audioCtx.state === 'running') audioCtx.suspend(); 
  } else {
    menus.pause.style.display = "none"; if(audioCtx.state === 'suspended') audioCtx.resume();
  }
}

function triggerGameOver() {
  gameOver = true;
  document.getElementById('final-score').innerText = score;
  menus.hud.style.display = "none"; menus.mobileControls.style.display = "none"; menus.gameOver.style.display = "flex";
  clearInterval(bgmInterval); isBgmPlaying = false; 
}

function updateUI() {
  document.getElementById('score-display').innerText = "SCORE: " + score;
  document.getElementById('level-display').innerText = "LEVEL: " + (currentLevel + 1);
  let displayHealth = Math.max(0, health);
  let hBar = document.getElementById('health-bar'); let hBox = document.querySelector('.health-box'); let hLabel = document.querySelector('.health-label');
  hBar.style.width = displayHealth + "%";

  if (health > 50) {
    hBar.style.background = "cyan"; hBar.style.boxShadow = "0 0 10px cyan"; hBox.style.borderColor = "cyan"; hLabel.style.color = "cyan"; hLabel.style.textShadow = "0 0 5px cyan";
  } else if (health > 25) {
    hBar.style.background = "yellow"; hBar.style.boxShadow = "0 0 10px yellow"; hBox.style.borderColor = "yellow"; hLabel.style.color = "yellow"; hLabel.style.textShadow = "0 0 5px yellow";
  } else {
    hBar.style.background = "red"; hBar.style.boxShadow = "0 0 10px red"; hBox.style.borderColor = "red"; hLabel.style.color = "red"; hLabel.style.textShadow = "0 0 5px red";
  }
}

// --- Menus & Core Inputs ---
document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-quit').addEventListener('click', returnToMenu);
window.addEventListener("keydown", (e) => { if (e.code === "Escape") togglePause(); });

// --- Desktop Mouse Controls ---
addEventListener("mousemove", e=>{ mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener("mousedown", (e)=> { if(e.target.id === "c") firing = true; });
window.addEventListener("mouseup", ()=> firing = false);

// --- Mobile Joystick & Fire Button Logic ---
const joyBase = document.getElementById('joystick-base');
const joyStick = document.getElementById('joystick-stick');
const fireBtn = document.getElementById('btn-fire');

joyBase.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (joystick.touchId !== null) return; // Prevent multiple touches on stick
  let touch = e.changedTouches[0];
  joystick.touchId = touch.identifier;
  updateJoystickVector(touch);
}, {passive: false});

joyBase.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === joystick.touchId) {
      updateJoystickVector(e.changedTouches[i]);
    }
  }
}, {passive: false});

const resetJoystick = (e) => {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === joystick.touchId) {
      joystick.touchId = null;
      joystick.active = false;
      joystick.dx = 0;
      joystick.dy = 0;
      joyStick.style.transform = `translate(0px, 0px)`;
    }
  }
};

joyBase.addEventListener('touchend', resetJoystick, {passive: false});
joyBase.addEventListener('touchcancel', resetJoystick, {passive: false});

function updateJoystickVector(touch) {
  joystick.active = true;
  let rect = joyBase.getBoundingClientRect();
  let centerX = rect.left + rect.width / 2;
  let centerY = rect.top + rect.height / 2;
  
  let dx = touch.clientX - centerX;
  let dy = touch.clientY - centerY;
  
  let distance = Math.sqrt(dx*dx + dy*dy);
  let maxDist = rect.width / 2 - 30; // Maximum travel distance for the visual stick
  
  // Constrain visual stick to inside the circle
  if (distance > maxDist) {
    dx = (dx / distance) * maxDist;
    dy = (dy / distance) * maxDist;
  }
  
  joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
  
  // Set movement vectors between -1.0 and 1.0
  joystick.dx = dx / maxDist;
  joystick.dy = dy / maxDist;
}

// Mobile Fire Button
fireBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  firing = true;
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, {passive: false});

fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); firing = false; }, {passive: false});
fireBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); firing = false; }, {passive: false});


// --- Player Shooting Interval ---
setInterval(()=>{
  if(gameOver || inMenu || isPaused || !firing) return;
  playSound('shoot'); 
  let a = Math.atan2(mouse.y-player.y, mouse.x-player.x);
  
  if (currentLevel === 0) {
    bullets.push({ x: player.x, y: player.y, dx: Math.cos(a)*8, dy: Math.sin(a)*8 });
  } 
  else if (currentLevel === 1) {
    let perp = a + Math.PI/2;
    let ox = Math.cos(perp)*5; let oy = Math.sin(perp)*5;
    bullets.push({ x: player.x+ox, y: player.y+oy, dx: Math.cos(a)*8, dy: Math.sin(a)*8 });
    bullets.push({ x: player.x-ox, y: player.y-oy, dx: Math.cos(a)*8, dy: Math.sin(a)*8 });
  }
  else if (currentLevel === 2) {
    bullets.push({ x: player.x, y: player.y, dx: Math.cos(a)*8, dy: Math.sin(a)*8 }); 
    bullets.push({ x: player.x, y: player.y, dx: Math.cos(a-0.2)*8, dy: Math.sin(a-0.2)*8 }); 
    bullets.push({ x: player.x, y: player.y, dx: Math.cos(a+0.2)*8, dy: Math.sin(a+0.2)*8 }); 
  }
  else {
    for(let offset = -0.4; offset <= 0.4; offset += 0.2) {
      bullets.push({ x: player.x, y: player.y, dx: Math.cos(a+offset)*8, dy: Math.sin(a+offset)*8 });
    }
  }
},120);

// --- Game Loop ---
function update(){
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > c.height) { s.y = 0; s.x = Math.random() * c.width; }
  });

  if(gameOver || inMenu || isPaused) return;

  // PLAYER MOVEMENT (Desktop vs Mobile)
  if (joystick.active) {
    let speed = 6; // Max move speed on mobile
    player.x += joystick.dx * speed;
    player.y += joystick.dy * speed;
    
    // Rotate ship to face joystick direction
    if (joystick.dx !== 0 || joystick.dy !== 0) {
      player.angle = Math.atan2(joystick.dy, joystick.dx);
      // Hack to keep shooting mechanics aligned with joystick rotation
      mouse.x = player.x + Math.cos(player.angle) * 100;
      mouse.y = player.y + Math.sin(player.angle) * 100;
    }
  } else if (!isTouchDevice) {
    // Desktop Mouse Follow
    player.x += (mouse.x-player.x)*0.1;
    player.y += (mouse.y-player.y)*0.1;
    player.angle = Math.atan2(mouse.y-player.y, mouse.x-player.x);
  }

  // Prevent ship from flying off-screen
  player.x = Math.max(15, Math.min(c.width - 15, player.x));
  player.y = Math.max(15, Math.min(c.height - 15, player.y));

  // Entity Updates
  bullets = bullets.filter(b=>{ b.x+=b.dx; b.y+=b.dy; return b.x>0 && b.x<c.width && b.y>0 && b.y<c.height; });

  enemyBullets = enemyBullets.filter(b=>{
    b.x+=b.dx; b.y+=b.dy;
    if( b.x > player.x-15 && b.x < player.x+15 && b.y > player.y-15 && b.y < player.y+15 ){
      health -= 10; playSound('hit'); updateUI(); return false; 
    }
    return b.x>0 && b.x<c.width && b.y>0 && b.y<c.height;
  });

  if (bossActive && boss) {
    if (boss.y < boss.targetY) {
      boss.y += 2; 
    } else {
      boss.x += boss.speed * boss.direction;
      if (boss.x + boss.width/2 > c.width - 20 || boss.x - boss.width/2 < 20) {
        boss.direction *= -1;
      }

      boss.attackTimer++;
      let attackRate = Math.max(30, 80 - (currentLevel * 10)); 
      if (boss.attackTimer > attackRate) {
        boss.attackTimer = 0; playSound('enemyShoot');
        let a = Math.atan2(player.y - boss.y, player.x - boss.x);
        let bs = 3 + currentLevel * 0.5;
        enemyBullets.push({ x: boss.x, y: boss.y, dx: Math.cos(a)*bs, dy: Math.sin(a)*bs });
        enemyBullets.push({ x: boss.x, y: boss.y, dx: Math.cos(a-0.3)*bs, dy: Math.sin(a-0.3)*bs });
        enemyBullets.push({ x: boss.x, y: boss.y, dx: Math.cos(a+0.3)*bs, dy: Math.sin(a+0.3)*bs });
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      let b = bullets[i];
      if (b.x > boss.x - boss.width/2 && b.x < boss.x + boss.width/2 &&
          b.y > boss.y - boss.height/2 && b.y < boss.y + boss.height/2) {
        boss.hp -= 10; playSound('bossHit'); bullets.splice(i, 1);
        if (boss.hp <= 0) {
          bossActive = false; score += 250; playSound('explode'); triggerLevelUp(); boss = null; break;
        }
      }
    }

    if (bossActive && boss) {
      if (player.x > boss.x - boss.width/2 && player.x < boss.x + boss.width/2 &&
          player.y > boss.y - boss.height/2 && player.y < boss.y + boss.height/2) {
          health -= 2; updateUI();
      }
    }
  }

  enemies = enemies.filter(e=>{
    let a = Math.atan2(player.y-e.y, player.x-e.x);
    e.x += Math.cos(a)*e.speed;
    e.y += Math.sin(a)*e.speed;

    for(let i = bullets.length - 1; i >= 0; i--){
      let b = bullets[i];
      if( b.x>e.x && b.x<e.x+30 && b.y>e.y && b.y<e.y+30 ){
        score += 10; playSound('explode'); 
        if (score >= (currentLevel + 1) * 500 && !bossActive) spawnBoss();
        else updateUI(); 
        bullets.splice(i, 1); return false;
      }
    }
    return true;
  });

  if(health <= 0) triggerGameOver(); 
}

function draw(){
  ctx.fillStyle="black"; ctx.fillRect(0,0,c.width,c.height);

  ctx.fillStyle="white";
  stars.forEach(s => { ctx.globalAlpha = s.speed / 2; ctx.fillRect(s.x, s.y, s.size, s.size); });
  ctx.globalAlpha = 1.0; 

  if (inMenu) return;

  ctx.shadowBlur = 10; ctx.shadowColor = "lime"; ctx.fillStyle = "lime";
  bullets.forEach(b=>{
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.dy, b.dx));
    ctx.fillRect(-8, -2, 16, 4); ctx.restore();
  });

  ctx.shadowColor = "yellow"; ctx.fillStyle = "yellow";
  enemyBullets.forEach(b=>{ ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); });
  ctx.shadowBlur = 0; 

  enemies.forEach(e=>{
    ctx.save(); ctx.translate(e.x + 15, e.y + 15);
    ctx.rotate(Math.atan2(player.y - (e.y+15), player.x - (e.x+15))); 
    ctx.shadowBlur = 15; ctx.shadowColor = "red"; ctx.fillStyle = "#8B0000"; ctx.strokeStyle = "red"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(0, 15); ctx.lineTo(-15, 0); ctx.lineTo(0, -15); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  });

  if (bossActive && boss) {
    ctx.save(); ctx.translate(boss.x, boss.y);
    ctx.shadowBlur = 20; ctx.shadowColor = "magenta"; ctx.fillStyle = "#1a001a"; ctx.strokeStyle = "magenta"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, boss.height/2); ctx.lineTo(boss.width/2, 0); ctx.lineTo(boss.width/2 - 20, -boss.height/2); 
    ctx.lineTo(-boss.width/2 + 20, -boss.height/2); ctx.lineTo(-boss.width/2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0, 10, 15, 0, Math.PI*2); ctx.fill();
    let hpPercent = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; ctx.fillRect(-boss.width/2, -boss.height/2 - 25, boss.width, 8);
    ctx.fillStyle = "lime"; ctx.shadowBlur = 10; ctx.shadowColor = "lime"; ctx.fillRect(-boss.width/2, -boss.height/2 - 25, boss.width * hpPercent, 8);
    ctx.restore();

    if (boss.y < boss.targetY && !isPaused) {
      ctx.save(); ctx.fillStyle = "red"; ctx.shadowBlur = 15; ctx.shadowColor = "red"; ctx.font = "bold 40px Orbitron"; ctx.textAlign = "center";
      if (c.width < 600) ctx.font = "bold 24px Orbitron";
      ctx.fillText("WARNING: SECTOR BOSS", c.width/2, c.height/2); ctx.restore();
    }
  }

  if(!gameOver) {
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
    ctx.shadowBlur = 15; ctx.shadowColor = "cyan"; ctx.fillStyle = "cyan";
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-15, 15); ctx.lineTo(-5, 0); ctx.lineTo(-15, -15); ctx.closePath(); ctx.fill();
    if (!isPaused && Math.random() > 0.2) { 
      ctx.fillStyle = "orange"; ctx.shadowColor = "orange";
      ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-15, 5); ctx.lineTo(-15 - Math.random() * 15, 0); ctx.lineTo(-15, -5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

function loop(){ update(); draw(); requestAnimationFrame(loop); }
loop();