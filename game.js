const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WORLD_WIDTH = 3000;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==================== HỆ THỐNG ÂM THANH ====================
let audioCtx = null;
let isMuted = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

let bgmInterval = null;
function startBGM(type = 'menu') {
    stopBGM();
    if (isMuted) return;
    let tempo = type === 'menu' ? 600 : 400;
    let notes = type === 'menu' ? [220, 261.63, 329.63, 392.00] : [146.83, 196.00, 220.00, 293.66];
    
    bgmInterval = setInterval(() => {
        if (!audioCtx || isMuted) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type === 'menu' ? 'sine' : 'triangle';
            let freq = notes[Math.floor(Math.random() * notes.length)];
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.9);
        } catch(e) {}
    }, tempo);
}

function stopBGM() {
    if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
}

function playShootSound() {
    if (isMuted) return;
    initAudio();
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(350, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.18);
    } catch(e) {}
}

function playHitSound() {
    if (isMuted) return;
    initAudio();
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.12);
    } catch(e) {}
}

function toggleMute() {
    isMuted = !isMuted;
    document.getElementById('mute-btn').innerText = isMuted ? '🔇' : '🔊';
    if (isMuted) stopBGM();
    else startBGM(gameState === 'MENU' ? 'menu' : 'battle');
}

// ==================== TRẠNG THÁI GAME & ĐỊA HÌNH ====================
let gameMode = 'pvp';
let gameState = 'MENU';
let isPaused = false;
let practiceDiff = 'medium';
let p1Name = 'Cao Bồi Vàng';
let p2Name = 'Cao Bồi Đỏ';

function getTerrainHeight(x) {
    return canvas.height * 0.65 + Math.sin(x * 0.002) * 120 + Math.cos(x * 0.005) * 60;
}

let p1 = { x: 300, hp: 100, color: '#ffca28', facing: 1, aimAngle: 0, pullPower: 0, skills: { fire: 0, teleport: 0 }, activeSkill: null, hurtTimer: 0 };
let p2 = { x: WORLD_WIDTH - 300, hp: 100, color: '#f44336', facing: -1, aimAngle: 0, pullPower: 0, skills: { clone: 0, double: 0 }, activeSkill: null, hurtTimer: 0 };

let target = { x: 0, y: 0, radius: 30, speed: 2, dir: 1 };
let cactuses = [];
let arrows = [];
let smokeParticles = [];

let currentTurn = 1;
let cameraX = 0;
let targetCameraX = 0;
let cameraMode = 'PLAYER';
let trackedArrow = null;

let isDragging = false;
let mouseStartX = 0, mouseStartY = 0, currentMouseX = 0, currentMouseY = 0;

function setGameMode(mode) {
    gameMode = mode;
    document.getElementById('mode-pvp').classList.toggle('active', mode === 'pvp');
    document.getElementById('mode-practice').classList.toggle('active', mode === 'practice');
    document.getElementById('difficulty-selector').classList.toggle('hidden', mode === 'pvp');
    document.getElementById('p2-name-label').style.display = mode === 'practice' ? 'none' : 'block';
    document.getElementById('p2-name').style.display = mode === 'practice' ? 'none' : 'block';
    document.getElementById('p2-hud').style.display = mode === 'practice' ? 'none' : 'block';
    initAudio();
    startBGM('menu');
}

function toggleGuide(show) {
    document.getElementById('guide-modal').classList.toggle('hidden', !show);
}

function togglePause() {
    isPaused = !isPaused;
}

function goHome() {
    gameState = 'MENU';
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    startBGM('menu');
}

window.addEventListener('keydown', e => {
    initAudio();
    if (gameState !== 'PLAYING' || cameraMode === 'ARROW') return;

    if (currentTurn === 1) {
        if (e.code === 'KeyZ') useSkill('p1', 'fire');
        if (e.code === 'KeyX') useSkill('p1', 'teleport');
    } else if (currentTurn === 2 && gameMode === 'pvp') {
        if (e.code === 'KeyK') useSkill('p2', 'clone');
        if (e.code === 'KeyL') useSkill('p2', 'double');
    }
});

function showToast(text) {
    const toast = document.getElementById('skill-toast');
    toast.innerText = text;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 1500);
}

function createSmoke(x, y) {
    for (let i = 0; i < 20; i++) {
        smokeParticles.push({
            x: x + (Math.random() * 40 - 20),
            y: y + (Math.random() * 40 - 20),
            radius: Math.random() * 15 + 10,
            alpha: 1
        });
    }
}

function initCactuses() {
    cactuses = [];
    for (let i = 400; i < WORLD_WIDTH - 400; i += 350) {
        cactuses.push({ x: i + Math.random() * 100 });
    }
}

function startGame() {
    initAudio();
    p1Name = document.getElementById('p1-name').value || 'Cao Bồi Vàng';
    p2Name = document.getElementById('p2-name').value || 'Cao Bồi Đỏ';
    practiceDiff = document.getElementById('practice-diff').value;

    document.getElementById('p1-hud-name').innerText = p1Name;
    document.getElementById('p2-hud-name').innerText = p2Name;

    p1.x = 300; p1.hp = 100; p1.facing = 1; p1.skills.fire = 0; p1.skills.teleport = 0; p1.activeSkill = null; p1.pullPower = 0;
    p2.x = WORLD_WIDTH - 300; p2.hp = 100; p2.facing = -1; p2.skills.clone = 0; p2.skills.double = 0; p2.activeSkill = null; p2.pullPower = 0;

    if (practiceDiff === 'easy') { target.radius = 40; target.speed = 1.5; }
    else if (practiceDiff === 'medium') { target.radius = 30; target.speed = 2.5; }
    else { target.radius = 20; target.speed = 4; }

    target.x = WORLD_WIDTH / 2;
    target.y = canvas.height / 2;

    initCactuses();
    arrows = [];
    smokeParticles = [];
    currentTurn = 1;
    isPaused = false;
    updateHUD();

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    startCountdown();
}

function startCountdown() {
    gameState = 'COUNTDOWN';
    stopBGM();
    const overlay = document.getElementById('countdown-overlay');
    overlay.classList.remove('hidden');
    
    let count = 3;
    overlay.innerText = count;
    
    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            overlay.innerText = count;
        } else if (count === 0) {
            overlay.innerText = 'BẮT ĐẦU!';
        } else {
            clearInterval(timer);
            overlay.classList.add('hidden');
            gameState = 'PLAYING';
            startBGM('battle');
        }
    }, 1000);
}

function updateHUD() {
    document.getElementById('p1-hp').style.width = p1.hp + '%';
    document.getElementById('p2-hp').style.width = p2.hp + '%';

    document.getElementById('p1-cd-fire').innerText = p1.skills.fire;
    document.getElementById('p1-cd-tele').innerText = p1.skills.teleport;
    document.getElementById('p2-cd-clone').innerText = p2.skills.clone;
    document.getElementById('p2-cd-double').innerText = p2.skills.double;

    let turnText = currentTurn === 1 ? `LƯỢT: ${p1Name.toUpperCase()}` : `LƯỢT: ${p2Name.toUpperCase()}`;
    if (gameMode === 'practice') turnText = `LƯỢT: ${p1Name.toUpperCase()} (TẬP LUYỆN)`;
    document.getElementById('turn-indicator').innerText = turnText;
}

function useSkill(playerKey, skillName) {
    let p = playerKey === 'p1' ? p1 : p2;
    if (p.skills[skillName] > 0) return;

    if (skillName === 'fire') {
        p.activeSkill = 'fire';
        showToast('🔥 MŨI TÊN RỰC LỬA!');
    } else if (skillName === 'teleport') {
        createSmoke(p.x, getTerrainHeight(p.x) - 30);
        p.x += p.facing * 350;
        p.x = Math.max(100, Math.min(WORLD_WIDTH - 100, p.x));
        createSmoke(p.x, getTerrainHeight(p.x) - 30);
        p.skills.teleport = 4;
        showToast('🌀 DỊCH CHUYỂN SƯƠNG MÙ!');
    } else if (skillName === 'clone') {
        p.activeSkill = 'clone';
        showToast('👥 PHÂN THÂN!');
    } else if (skillName === 'double') {
        p.activeSkill = 'double';
        showToast('🏹 X2 MŨI TÊN!');
    }
    updateHUD();
}

function reduceCooldowns() {
    for (let k in p1.skills) if (p1.skills[k] > 0) p1.skills[k]--;
    for (let k in p2.skills) if (p2.skills[k] > 0) p2.skills[k]--;
}

window.addEventListener('mousedown', e => {
    if (gameState !== 'PLAYING' || cameraMode === 'ARROW' || isPaused) return;
    isDragging = true;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    currentMouseX = e.clientX;
    currentMouseY = e.clientY;
});

window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    currentMouseX = e.clientX;
    currentMouseY = e.clientY;

    let activePlayer = currentTurn === 1 ? p1 : p2;
    let pullX = mouseStartX - currentMouseX; 
    let pullY = currentMouseY - mouseStartY; 

    let vx = pullX * 0.12;
    let vy = -pullY * 0.12;

    activePlayer.aimAngle = Math.atan2(vy, vx);
    activePlayer.pullPower = Math.min(25, Math.hypot(pullX, pullY) * 0.15);
    activePlayer.facing = vx >= 0 ? 1 : -1;
});

window.addEventListener('mouseup', e => {
    if (!isDragging) return;
    isDragging = false;

    let activePlayer = currentTurn === 1 ? p1 : p2;
    let pullX = mouseStartX - currentMouseX; 
    let pullY = currentMouseY - mouseStartY; 

    if (Math.hypot(pullX, pullY) < 8) return;

    let vx = pullX * 0.12;
    let vy = -pullY * 0.12;

    shootArrowWithVector(activePlayer, vx, vy, currentTurn === 1);
});

function shootArrowWithVector(player, vx, vy, isP1) {
    playShootSound();
    player.facing = vx >= 0 ? 1 : -1;
    let startX = player.x + (player.facing * 25);
    let startY = getTerrainHeight(player.x) - 45;

    let newArrow = {
        x: startX,
        y: startY,
        vx: vx,
        vy: vy,
        owner: isP1 ? 1 : 2,
        isFire: player.activeSkill === 'fire'
    };

    arrows.push(newArrow);
    trackedArrow = newArrow;
    cameraMode = 'ARROW';

    if (player.activeSkill === 'double') {
        setTimeout(() => {
            let secondArrow = {
                x: startX,
                y: startY,
                vx: vx * 1.05,
                vy: vy * 1.05,
                owner: isP1 ? 1 : 2,
                isFire: false
            };
            arrows.push(secondArrow);
        }, 200);
        player.skills.double = 4;
        player.activeSkill = null;
    }

    if (player.activeSkill === 'fire') { player.skills.fire = 4; player.activeSkill = null; }
    if (player.activeSkill === 'clone') { player.skills.clone = 4; player.activeSkill = null; }

    player.pullPower = 0;
    reduceCooldowns();
}

function nextTurn() {
    arrows = [];
    trackedArrow = null;
    
    if (gameMode === 'pvp') {
        currentTurn = currentTurn === 1 ? 2 : 1;
        targetCameraX = (currentTurn === 1 ? p1.x : p2.x) - canvas.width / 2;
    } else {
        targetCameraX = p1.x - canvas.width / 2;
    }
    cameraMode = 'PLAYER';
    updateHUD();
}

function update() {
    if (gameState !== 'PLAYING' || isPaused) return;

    if (p1.hurtTimer > 0) p1.hurtTimer--;
    if (p2.hurtTimer > 0) p2.hurtTimer--;

    // Sương mù dịch chuyển
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        let s = smokeParticles[i];
        s.alpha -= 0.02;
        s.radius += 0.5;
        if (s.alpha <= 0) smokeParticles.splice(i, 1);
    }

    // Camera trượt
    if (cameraMode === 'ARROW' && trackedArrow) {
        targetCameraX = trackedArrow.x - canvas.width / 2;
    } else {
        let activePlayer = currentTurn === 1 ? p1 : p2;
        targetCameraX = activePlayer.x - canvas.width / 2;
    }

    cameraX += (targetCameraX - cameraX) * 0.1;
    cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, cameraX));

    // Cập nhật mũi tên
    for (let i = arrows.length - 1; i >= 0; i--) {
        let a = arrows[i];
        a.x += a.vx;
        a.y += a.vy;
        a.vy += 0.22;

        let groundY = getTerrainHeight(a.x);

        // Xử lý chạm đất -> Biến mất & chuyển lượt
        if (a.y >= groundY) {
            if (a === trackedArrow) {
                playHitSound();
                nextTurn();
            }
            continue;
        }

        // Va chạm P2
        if (a.owner === 1 && gameMode === 'pvp') {
            let p2Y = getTerrainHeight(p2.x);
            let dist = Math.hypot(a.x - p2.x, a.y - (p2Y - 35));
            if (dist < 35) {
                playHitSound();
                let dmg = a.isFire ? 45 : 25;
                p2.hp = Math.max(0, p2.hp - dmg);
                p2.hurtTimer = 15;
                updateHUD();
                if (p2.hp <= 0) endGame(p1Name);
                else nextTurn();
                continue;
            }
        }

        // Va chạm P1
        if (a.owner === 2) {
            let p1Y = getTerrainHeight(p1.x);
            let dist = Math.hypot(a.x - p1.x, a.y - (p1Y - 35));
            if (dist < 35) {
                playHitSound();
                p1.hp = Math.max(0, p1.hp - 25);
                p1.hurtTimer = 15;
                updateHUD();
                if (p1.hp <= 0) endGame(p2Name);
                else nextTurn();
                continue;
            }
        }

        // Va chạm bia (Practice)
        if (gameMode === 'practice') {
            let dist = Math.hypot(a.x - target.x, a.y - target.y);
            if (dist < target.radius) {
                playHitSound();
                nextTurn();
            }
        }
    }

    if (gameMode === 'practice') {
        target.y += target.speed * target.dir;
        if (target.y < 150 || target.y > canvas.height - 300) target.dir *= -1;
    }
}

function endGame(winnerName) {
    gameState = 'GAMEOVER';
    stopBGM();
    alert(`🎉 CHÚC MỪNG ${winnerName.toUpperCase()} ĐÃ CHIẾN THẮNG TRẬN ĐẤU MIỀN TÂY!`);
    goHome();
}

// Vẽ nhân vật nghiêng người theo hướng ngắm & đầy đủ chi tiết
function drawCowboy(p, name, isP1) {
    ctx.save();
    let groundY = getTerrainHeight(p.x);
    let tilt = p.hurtTimer > 0 ? 0.6 : 0;

    ctx.translate(p.x, groundY);
    ctx.scale(p.facing, 1);

    // Chân Stickman đứng vững trên mặt đất
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(-12, -25);
    ctx.moveTo(8, 0); ctx.lineTo(12, -25);
    ctx.stroke();

    // Nửa thân trên nghiêng theo hướng ngắm ngắm
    ctx.save();
    ctx.translate(0, -25);
    let aimTilt = (isDragging && ((isP1 && currentTurn === 1) || (!isP1 && currentTurn === 2))) ? p.aimAngle * 0.3 : 0;
    ctx.rotate(aimTilt + tilt);

    // Thân
    ctx.fillStyle = p.color;
    ctx.fillRect(-14, -35, 28, 35);

    // Tay cầm cung
    ctx.strokeStyle = '#ffcc80';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -25); ctx.lineTo(18, -15);
    ctx.stroke();

    // Đầu
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, -47, 12, 0, Math.PI * 2);
    ctx.fill();

    // Mũ cao bồi
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-22, -61, 44, 6);
    ctx.fillRect(-12, -75, 24, 15);

    // Cung & Animation dây kéo cung
    let pull = p.pullPower * 0.6;
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(18 - pull * 0.2, -15, 22, -0.8, 0.8);
    ctx.stroke();

    // Dây cung kéo lùi khi drag
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18 - pull * 0.2 - 12, -32);
    ctx.lineTo(18 - pull, -15);
    ctx.lineTo(18 - pull * 0.2 - 12, 2);
    ctx.stroke();

    ctx.restore(); // Restore xoay ngắm

    // Tên
    ctx.save();
    ctx.scale(p.facing, 1);
    ctx.fillStyle = '#ffca28';
    ctx.font = 'bold 12px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(name, 0, 20);
    ctx.restore();

    ctx.restore();
}

function drawTrajectory(p) {
    if (!isDragging || ((p === p1 && currentTurn !== 1) || (p === p2 && currentTurn !== 2))) return;
    
    let pullX = mouseStartX - currentMouseX;
    let pullY = currentMouseY - mouseStartY;
    let vx = pullX * 0.12;
    let vy = -pullY * 0.12;
    if (Math.hypot(pullX, pullY) < 8) return;

    ctx.save();
    ctx.strokeStyle = p.activeSkill === 'fire' ? 'rgba(255, 87, 34, 0.85)' : 'rgba(255, 255, 255, 0.75)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    let facingTemp = vx >= 0 ? 1 : -1;
    let simX = p.x + (facingTemp * 25);
    let simY = getTerrainHeight(p.x) - 45;
    let simVx = vx;
    let simVy = vy;

    ctx.moveTo(simX, simY);
    for (let step = 0; step < 40; step++) {
        simX += simVx;
        simY += simVy;
        simVy += 0.22;
        if (simY >= getTerrainHeight(simX)) break;
        ctx.lineTo(simX, simY);
    }
    ctx.stroke();
    ctx.restore();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Địa hình đồi núi
    ctx.fillStyle = '#2b0c04';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= WORLD_WIDTH; x += 15) {
        ctx.lineTo(x, getTerrainHeight(x));
    }
    ctx.lineTo(WORLD_WIDTH, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 0; x <= WORLD_WIDTH; x += 15) {
        if (x === 0) ctx.moveTo(x, getTerrainHeight(x));
        else ctx.lineTo(x, getTerrainHeight(x));
    }
    ctx.stroke();

    // Xương rồng
    for (let c of cactuses) {
        let ch = getTerrainHeight(c.x);
        ctx.font = '3rem sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌵', c.x, ch);
    }

    // Sương mù
    for (let s of smokeParticles) {
        ctx.fillStyle = `rgba(200, 200, 200, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    if (gameState === 'PLAYING') {
        drawCowboy(p1, p1Name, true);
        drawTrajectory(p1);

        if (gameMode === 'pvp') {
            drawCowboy(p2, p2Name, false);
            drawTrajectory(p2);
        } else {
            // Bia ngắm
            ctx.fillStyle = '#b71c1c';
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius * 0.65, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#b71c1c';
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mũi tên đang bay
        for (let a of arrows) {
            ctx.strokeStyle = a.isFire ? '#ff5722' : '#fff';
            ctx.lineWidth = a.isFire ? 4 : 2.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            let angle = Math.atan2(a.vy, a.vx);
            ctx.lineTo(a.x - Math.cos(angle) * 18, a.y - Math.sin(angle) * 18);
            ctx.stroke();
        }
    }

    ctx.restore();
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
