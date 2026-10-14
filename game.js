const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const GRAVITY = 0.25;
const MAP_WIDTH = 1600; 

let gameMode = '1v1'; 
let practiceDiff = 'EASY'; 
let gameState = 'MENU'; 
let currentTurn = 1; 

// HỆ THỐNG CAMERA & ZOOM
let camera = { 
    x: MAP_WIDTH / 2, 
    y: 250, 
    targetX: MAP_WIDTH / 2, 
    targetY: 250,
    zoom: 1.0,
    targetZoom: 1.0
};
let isCameraLocked = false; 

let introTimer = 0;
let countdownVal = 3;
let floatingTexts = [];
let stuckArrows = [];

let practiceScore = 0;
let practiceTimeLeft = 30;
let practiceTimerInterval = null;
let highScore = localStorage.getItem('archery_highscore') || 0;

let masterVolume = 0.5; 
let isMuted = false;

const endButtons = {
    restart: { x: 0, y: 0, w: 140, h: 42 },
    home: { x: 0, y: 0, w: 140, h: 42 }
};

const pauseBtnPos = { x: 0, y: 15, w: 90, h: 35 };
const pauseMenuBtns = {
    resume: { x: 0, y: 0, w: 160, h: 40 },
    restart: { x: 0, y: 0, w: 160, h: 40 },
    home: { x: 0, y: 0, w: 160, h: 40 },
    volume: { x: 0, y: 0, w: 160, h: 40 }
};

// ==================== HỆ THỐNG ÂM THANH ====================
let audioCtx = null;
let bgmInterval = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        startBGM();
    }
}

function getVol(val) {
    return isMuted ? 0 : val * masterVolume;
}

function playClickSound() {
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    gain.gain.setValueAtTime(getVol(0.1), audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
}

function playDrawSound() {
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(getVol(0.1), audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

function playShootSound() {
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.25);
    gain.gain.setValueAtTime(getVol(0.15), audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.25);
}

function playPainSound() {
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(getVol(0.35), audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

function playFootstepSound() {
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, audioCtx.currentTime + 0.06);
    gain.gain.setValueAtTime(getVol(0.12), audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.06);
}

function playSkillSound() {
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(getVol(0.2), audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function playHitSound(isHeadshot) {
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = isHeadshot ? 'square' : 'sine';
    osc.frequency.setValueAtTime(isHeadshot ? 300 : 160, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(getVol(0.25), audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function playWinJingle() {
    if (!audioCtx) return;
    let notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(getVol(0.2), audioCtx.currentTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.12 + 0.2);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.12);
        osc.stop(audioCtx.currentTime + idx * 0.12 + 0.2);
    });
}

function playBeepSound(isGo) {
    if (!audioCtx) return;
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, audioCtx.currentTime);
    gain.gain.setValueAtTime(getVol(0.15), audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function startBGM() {
    if (bgmInterval) return;
    let notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];
    let step = 0;
    bgmInterval = setInterval(() => {
        if (!audioCtx || gameState === 'MENU' || isMuted) return;
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[step % notes.length], audioCtx.currentTime);
        gain.gain.setValueAtTime(getVol(0.02), audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
        step++;
    }, 500);
}
// ===================================================================================

function openSettingsModal() {
    playClickSound();
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
    playClickSound();
    document.getElementById('settingsModal').classList.add('hidden');
}

function setVolumeLevel(level) {
    playClickSound();
    if (level === 0) isMuted = true;
    else { isMuted = false; masterVolume = level; }
    alert(`Đã đặt âm lượng: ${level === 0 ? 'Tắt' : (level === 1 ? '100%' : '50%')}`);
}

const keys = { w: false, a: false, s: false, d: false, arrowLeft: false, arrowRight: false, arrowUp: false, arrowDown: false };

window.addEventListener('keydown', (e) => {
    initAudio();
    if (e.key === '`' || e.key === '~') {
        if (gameState === 'PLAYING' || gameState === 'PAUSED') {
            playClickSound();
            gameState = (gameState === 'PLAYING') ? 'PAUSED' : 'PLAYING';
        }
        return;
    }

    if (e.key === 'a' || e.key === 'A') keys.a = true;
    if (e.key === 'd' || e.key === 'D') keys.d = true;
    if (e.key === 'ArrowLeft') { keys.arrowLeft = true; isCameraLocked = true; }
    if (e.key === 'ArrowRight') { keys.arrowRight = true; isCameraLocked = true; }
    if (e.key === 'ArrowUp') { keys.arrowUp = true; isCameraLocked = true; }
    if (e.key === 'ArrowDown') { keys.arrowDown = true; isCameraLocked = true; }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
    if (e.key === 'ArrowLeft') keys.arrowLeft = false;
    if (e.key === 'ArrowRight') keys.arrowRight = false;
    if (e.key === 'ArrowUp') keys.arrowUp = false;
    if (e.key === 'ArrowDown') keys.arrowDown = false;
});

function setMode(mode) {
    playClickSound();
    gameMode = mode;
    document.getElementById('btnPvP').classList.toggle('active', mode === '1v1');
    document.getElementById('btnPractice').classList.toggle('active', mode === 'PRACTICE');
    document.getElementById('practiceOptions').classList.toggle('hidden', mode !== 'PRACTICE');
    document.getElementById('p2Panel').classList.toggle('hidden', mode === 'PRACTICE');
}

const terrain = [];
const cactiList = [];

function generateTerrain() {
    terrain.length = 0;
    cactiList.length = 0;
    let seed = Math.random() * 100;
    let bumpiness = (gameMode === 'PRACTICE') ? 35 : 120;
    let detail = (gameMode === 'PRACTICE') ? 15 : 60;

    for (let x = 0; x <= MAP_WIDTH; x += 5) {
        let y = 380 + Math.sin(x * 0.005 + seed) * bumpiness + Math.cos(x * 0.02) * detail;
        terrain.push({ x: x, y: y });

        if (x % 120 === 0 && Math.random() > 0.4 && x > 100 && x < MAP_WIDTH - 100) {
            cactiList.push({ x: x, scale: 0.6 + Math.random() * 0.5 });
        }
    }
}
generateTerrain();

function getTerrainHeight(x) {
    if (x <= 0) return terrain[0].y;
    if (x >= MAP_WIDTH) return terrain[terrain.length - 1].y;
    let index = Math.floor(x / 5);
    if (index >= terrain.length - 1) index = terrain.length - 2;
    let p1 = terrain[index];
    let p2 = terrain[index + 1];
    let t = (x - p1.x) / (p2.x - p1.x);
    return p1.y + t * (p2.y - p1.y);
}

const archer1 = {
    targetX: 250, x: 250, y: 350, startX: 250,
    hp: 100, maxHp: 100, color: '#f39c12', name: 'Cao Bồi Vàng',
    facingDir: 1,
    isKnockedDown: false, knockdownTimer: 0, pendingDamage: 0,
    skill1Cd: 0, skill2Cd: 0, isBurningActive: false
};

const archer2 = {
    targetX: MAP_WIDTH - 250, x: MAP_WIDTH - 250, y: 350, startX: MAP_WIDTH - 250,
    hp: 100, maxHp: 100, color: '#e74c3c', name: 'Cao Bồi Đỏ',
    facingDir: -1,
    isKnockedDown: false, knockdownTimer: 0, pendingDamage: 0,
    skill1Cd: 0, skill2Cd: 0, clonesDuration: 0, doubleArrowDuration: 0
};

const targetDummy = { x: 800, y: 300, radius: 24 };

function resetPracticeTarget() {
    if (practiceDiff === 'EASY') {
        targetDummy.x = 650 + Math.random() * 200;
        targetDummy.radius = 28;
    } else if (practiceDiff === 'MEDIUM') {
        targetDummy.x = 900 + Math.random() * 250;
        targetDummy.radius = 22;
    } else if (practiceDiff === 'HARD') {
        targetDummy.x = 700 + Math.random() * 700;
        targetDummy.radius = 16;
    }
    targetDummy.y = getTerrainHeight(targetDummy.x) - targetDummy.radius;
}

let activeArrow = null;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragCurrent = { x: 0, y: 0 };

function useSkill(skillNum) {
    if (gameState !== 'PLAYING' || activeArrow || isDragging) return;

    if (currentTurn === 1) {
        if (skillNum === 1) {
            if (archer1.skill1Cd > 0) return;
            archer1.isBurningActive = true;
            archer1.skill1Cd = 6;
            playSkillSound();
            spawnDamageText(archer1.x, archer1.y, '🔥 KỸ NĂNG RỰC LỬA BẬT!', true);
        } else if (skillNum === 2) {
            if (archer1.skill2Cd > 0) return;
            let newX = 150 + Math.random() * (MAP_WIDTH - 300);
            archer1.x = newX;
            archer1.startX = newX;
            archer1.skill2Cd = 6;
            playSkillSound();
            spawnDamageText(archer1.x, archer1.y, '🌀 DỊCH CHUYỂN KHÔNG GIAN!', true);
        }
    } else if (currentTurn === 2 && gameMode === '1v1') {
        if (skillNum === 1) {
            if (archer2.skill1Cd > 0) return;
            archer2.clonesDuration = 2;
            archer2.skill1Cd = 6;
            playSkillSound();
            spawnDamageText(archer2.x, archer2.y, '👥 TẠO PHÂN THÂN (33.334%)!', true);
        } else if (skillNum === 2) {
            if (archer2.skill2Cd > 0) return;
            archer2.doubleArrowDuration = 4;
            archer2.skill2Cd = 6;
            playSkillSound();
            spawnDamageText(archer2.x, archer2.y, '🏹 X2 MŨI TÊN KÍCH HOẠT!', true);
        }
    }
}

function startGame() {
    playClickSound();
    initAudio();
    generateTerrain();

    archer1.name = document.getElementById('p1Name').value || 'P1';
    if (gameMode === '1v1') {
        archer2.name = document.getElementById('p2Name').value || 'P2';
    } else {
        archer2.name = 'Bia Tập';
        practiceDiff = document.getElementById('practiceDiff').value;
        practiceScore = 0;
        practiceTimeLeft = 30;
        resetPracticeTarget();

        clearInterval(practiceTimerInterval);
        practiceTimerInterval = setInterval(() => {
            if (gameState === 'PLAYING') {
                practiceTimeLeft--;
                if (practiceTimeLeft <= 0) {
                    clearInterval(practiceTimerInterval);
                    gameState = 'VICTORY';
                    playWinJingle();
                    if (practiceScore > highScore) {
                        highScore = practiceScore;
                        localStorage.setItem('archery_highscore', highScore);
                    }
                }
            }
        }, 1000);
    }

    document.getElementById('startScreen').style.display = 'none';
    
    archer1.hp = 100; archer2.hp = 100;
    archer1.x = archer1.targetX; archer2.x = archer2.targetX;
    archer1.startX = archer1.x; archer2.startX = archer2.x;
    archer1.facingDir = 1; archer2.facingDir = -1;
    archer1.isKnockedDown = false; archer2.isKnockedDown = false;
    archer1.pendingDamage = 0; archer2.pendingDamage = 0;
    archer1.skill1Cd = 0; archer1.skill2Cd = 0; archer1.isBurningActive = false;
    archer2.skill1Cd = 0; archer2.skill2Cd = 0; archer2.clonesDuration = 0; archer2.doubleArrowDuration = 0;

    floatingTexts = [];
    stuckArrows = [];
    activeArrow = null;
    isCameraLocked = false;
    gameState = 'INTRO_SLIDE';
    introTimer = 0;
    countdownVal = 3;
    currentTurn = 1;
}

function returnToHome() {
    playClickSound();
    clearInterval(practiceTimerInterval);
    gameState = 'MENU';
    document.getElementById('startScreen').style.display = 'flex';
}

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX - rect.left;
    let clientY = e.clientY - rect.top;

    let centerX = canvas.width / 2;
    if (gameState === 'PLAYING') {
        if (clientX >= centerX - 220 && clientX <= centerX - 130 && clientY >= 100 && clientY <= 135) {
            useSkill(1); return;
        }
        if (clientX >= centerX - 120 && clientX <= centerX - 30 && clientY >= 100 && clientY <= 135) {
            useSkill(2); return;
        }
    }

    pauseBtnPos.x = canvas.width - 110;
    if ((gameState === 'PLAYING' || gameState === 'PAUSED') &&
        clientX >= pauseBtnPos.x && clientX <= pauseBtnPos.x + pauseBtnPos.w &&
        clientY >= pauseBtnPos.y && clientY <= pauseBtnPos.y + pauseBtnPos.h) {
        playClickSound();
        gameState = (gameState === 'PLAYING') ? 'PAUSED' : 'PLAYING';
        return;
    }

    if (gameState === 'PAUSED') {
        let btns = pauseMenuBtns;
        if (clientX >= btns.resume.x && clientX <= btns.resume.x + btns.resume.w && clientY >= btns.resume.y && clientY <= btns.resume.y + btns.resume.h) {
            playClickSound(); gameState = 'PLAYING'; return;
        }
        if (clientX >= btns.restart.x && clientX <= btns.restart.x + btns.restart.w && clientY >= btns.restart.y && clientY <= btns.restart.y + btns.restart.h) {
            startGame(); return;
        }
        if (clientX >= btns.home.x && clientX <= btns.home.x + btns.home.w && clientY >= btns.home.y && clientY <= btns.home.y + btns.home.h) {
            returnToHome(); return;
        }
        if (clientX >= btns.volume.x && clientX <= btns.volume.x + btns.volume.w && clientY >= btns.volume.y && clientY <= btns.volume.y + btns.volume.h) {
            playClickSound();
            if (masterVolume === 0.5) masterVolume = 1.0;
            else if (masterVolume === 1.0) isMuted = true;
            else { isMuted = false; masterVolume = 0.5; }
            return;
        }
        return;
    }

    if (gameState === 'VICTORY') {
        let btnR = endButtons.restart;
        let btnH = endButtons.home;
        if (clientX >= btnR.x && clientX <= btnR.x + btnR.w && clientY >= btnR.y && clientY <= btnR.y + btnR.h) {
            startGame(); return;
        }
        if (clientX >= btnH.x && clientX <= btnH.x + btnH.w && clientY >= btnH.y && clientY <= btnH.y + btnH.h) {
            returnToHome(); return;
        }
        return;
    }

    if (gameState !== 'PLAYING' || activeArrow) return;

    let mouseX = (clientX - canvas.width / 2) / camera.zoom + camera.x;
    let mouseY = (clientY - canvas.height / 2) / camera.zoom + camera.y;

    let activeArcher = (currentTurn === 1) ? archer1 : archer2;
    if (!activeArcher.isKnockedDown && Math.hypot(mouseX - activeArcher.x, mouseY - (activeArcher.y - 25)) < 60) {
        isDragging = true;
        dragStart = { x: activeArcher.x, y: activeArcher.y - 25 };
        dragCurrent = { x: mouseX, y: mouseY };
        playDrawSound();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX - rect.left;
    let clientY = e.clientY - rect.top;
    let mouseX = (clientX - canvas.width / 2) / camera.zoom + camera.x;
    let mouseY = (clientY - canvas.height / 2) / camera.zoom + camera.y;
    dragCurrent = { x: mouseX, y: mouseY };
});

canvas.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;

    let activeArcher = (currentTurn === 1) ? archer1 : archer2;
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    const power = Math.min(Math.hypot(dx, dy) * 0.13, 17);
    const angle = Math.atan2(dy, dx);

    activeArrow = {
        x: activeArcher.x,
        y: activeArcher.y - 25,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power,
        angle: angle
    };
    playShootSound();
});

function spawnDamageText(x, y, text, isHeadshot) {
    floatingTexts.push({
        x: x, y: y - 40,
        text: text,
        color: isHeadshot ? '#ff3366' : '#ffcc00',
        size: isHeadshot ? 28 : 22,
        life: 45
    });
}

function updateArcherDamage(archer) {
    if (archer.pendingDamage > 0 && archer.hp > 0) {
        let drainSpeed = 0.5;
        let amount = Math.min(drainSpeed, archer.pendingDamage);
        archer.hp -= amount;
        archer.pendingDamage -= amount;

        if (archer.hp <= 0) {
            archer.hp = 0;
            archer.pendingDamage = 0;
            if (checkVictory(archer)) {
                playWinJingle();
            }
        }
    }
    if (archer.isKnockedDown) {
        archer.knockdownTimer--;
        if (archer.knockdownTimer <= 0 && archer.pendingDamage <= 0) {
            archer.isKnockedDown = false;
        }
    }
}

let footstepTimer = 0;

function updateGame() {
    if (gameState === 'PAUSED') return;

    archer1.y = getTerrainHeight(archer1.x);
    archer2.y = getTerrainHeight(archer2.x);

    updateArcherDamage(archer1);
    updateArcherDamage(archer2);

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y -= 1.2;
        ft.life--;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    if (gameState === 'INTRO_SLIDE') {
        introTimer++;
        camera.targetX = MAP_WIDTH / 2;
        camera.targetY = 250;
        camera.targetZoom = 1.0;

        if (introTimer > 120) {
            gameState = 'INTRO_COUNTDOWN';
            introTimer = 0;
            countdownVal = 3;
            playBeepSound(false);
        }
    } 
    else if (gameState === 'INTRO_COUNTDOWN') {
        introTimer++;
        if (introTimer % 45 === 0) {
            if (countdownVal > 0) {
                countdownVal--;
                playBeepSound(countdownVal === 0);
            } else {
                gameState = 'PLAYING';
            }
        }
    } 
    else if (gameState === 'PLAYING') {
        let panSpeed = 12;
        if (keys.arrowLeft || keys.arrowRight || keys.arrowUp || keys.arrowDown) {
            isCameraLocked = true; 
        }

        if (keys.arrowLeft) camera.targetX -= panSpeed;
        if (keys.arrowRight) camera.targetX += panSpeed;
        if (keys.arrowUp) camera.targetY -= panSpeed;
        if (keys.arrowDown) camera.targetY += panSpeed;

        camera.targetX = Math.max(200, Math.min(MAP_WIDTH - 200, camera.targetX));
        camera.targetY = Math.max(100, Math.min(600, camera.targetY));

        let activeArcher = (currentTurn === 1) ? archer1 : archer2;

        if (!activeArrow && !activeArcher.isKnockedDown && !isDragging && gameMode === '1v1') {
            let moveSpeed = 2;
            let maxDist = 100;
            let moved = false;

            if (keys.a && activeArcher.x > activeArcher.startX - maxDist) {
                activeArcher.x -= moveSpeed;
                activeArcher.facingDir = -1;
                moved = true;
            }
            if (keys.d && activeArcher.x < activeArcher.startX + maxDist) {
                activeArcher.x += moveSpeed;
                activeArcher.facingDir = 1;
                moved = true;
            }

            if (moved) {
                footstepTimer++;
                if (footstepTimer % 12 === 0) {
                    playFootstepSound();
                }
            }
        }

        if (activeArrow) {
            activeArrow.x += activeArrow.vx;
            activeArrow.vy += GRAVITY;
            activeArrow.y += activeArrow.vy;
            activeArrow.angle = Math.atan2(activeArrow.vy, activeArrow.vx);

            camera.targetX = activeArrow.x;
            camera.targetY = activeArrow.y;
            camera.targetZoom = 1.4;

            if (gameMode === '1v1') {
                let targetArcher = (currentTurn === 1) ? archer2 : archer1;
                let attacker = (currentTurn === 1) ? archer1 : archer2;

                let targetHitX = targetArcher.x;
                if (currentTurn === 1 && archer2.clonesDuration > 0) {
                    let hitRoll = Math.random() * 100;
                    if (hitRoll > 33.334) {
                        targetHitX = -9999; 
                    }
                }

                let headDist = Math.hypot(activeArrow.x - targetHitX, activeArrow.y - (targetArcher.y - 38));
                let bodyDist = Math.hypot(activeArrow.x - targetHitX, activeArrow.y - (targetArcher.y - 20));

                if (headDist < 16 || bodyDist < 25) {
                    let baseDmg = (headDist < 16) ? 30 : 25;
                    let hitText = (headDist < 16) ? `-${baseDmg} HEADSHOT!` : `-${baseDmg}`;

                    if (currentTurn === 1 && attacker.isBurningActive) {
                        baseDmg += 20;
                        hitText += ' +🔥 RỰC LỬA!';
                        attacker.isBurningActive = false;
                    }

                    targetArcher.isKnockedDown = true;
                    targetArcher.knockdownTimer = 60;
                    targetArcher.pendingDamage += baseDmg;
                    spawnDamageText(targetArcher.x, targetArcher.y, hitText, headDist < 16);
                    playHitSound(headDist < 16);
                    playPainSound();

                    stuckArrows.push({ 
                        target: targetArcher, 
                        offsetX: activeArrow.x - targetArcher.x, 
                        offsetY: activeArrow.y - targetArcher.y, 
                        angle: activeArrow.angle 
                    });

                    activeArrow = null;
                    switchTurn();
                    return;
                }
            } else if (gameMode === 'PRACTICE') {
                let targetDist = Math.hypot(activeArrow.x - targetDummy.x, activeArrow.y - targetDummy.y);
                if (targetDist < targetDummy.radius) {
                    practiceScore++;
                    spawnDamageText(targetDummy.x, targetDummy.y, '+1 ĐIỂM!', true);
                    playHitSound(true);
                    activeArrow = null;
                    resetPracticeTarget();
                    return;
                }
            }

            let groundY = getTerrainHeight(activeArrow ? activeArrow.x : 0);
            if (activeArrow && (activeArrow.y >= groundY || activeArrow.x < 0 || activeArrow.x > MAP_WIDTH)) {
                activeArrow = null;
                if (gameMode === '1v1') switchTurn();
            }
        } 
        else if (!isCameraLocked) {
            camera.targetX = activeArcher.x;
            camera.targetY = activeArcher.y - 40;
            camera.targetZoom = 1.3; 
        }
    }

    camera.x += (camera.targetX - camera.x) * 0.08;
    camera.y += (camera.targetY - camera.y) * 0.08;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.08;
}

function switchTurn() {
    let attacker = (currentTurn === 2) ? archer2 : archer1;
    if (currentTurn === 2 && attacker.doubleArrowDuration > 0 && !attacker.hasShotSecondTime) {
        attacker.hasShotSecondTime = true;
        currentTurn = 2;
        return;
    }
    if (currentTurn === 2) {
        archer2.hasShotSecondTime = false;
    }

    currentTurn = currentTurn === 1 ? 2 : 1;
    archer1.startX = archer1.x;
    archer2.startX = archer2.x;

    if (archer1.skill1Cd > 0) archer1.skill1Cd--;
    if (archer1.skill2Cd > 0) archer1.skill2Cd--;
    if (archer2.skill1Cd > 0) archer2.skill1Cd--;
    if (archer2.skill2Cd > 0) archer2.skill2Cd--;

    if (archer2.clonesDuration > 0) archer2.clonesDuration--;
    if (archer2.doubleArrowDuration > 0) archer2.doubleArrowDuration--;
}

function checkVictory(targetArcher) {
    if (targetArcher.hp <= 0) {
        targetArcher.hp = 0;
        gameState = 'VICTORY';
        return true;
    }
    return false;
}

function drawBackground() {
    let bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#2b1055');
    bg.addColorStop(0.4, '#75225b');
    bg.addColorStop(0.7, '#b54531');
    bg.addColorStop(1, '#d97631');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 200, 100, 0.4)';
    ctx.beginPath();
    ctx.arc(MAP_WIDTH / 2, 280, 120, 0, Math.PI * 2);
    ctx.fill();
}

function drawTerrain() {
    ctx.fillStyle = '#8c3a27';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 2);
    for (let p of terrain) {
        ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(MAP_WIDTH, canvas.height * 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#d97631';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < terrain.length; i++) {
        if (i === 0) ctx.moveTo(terrain[i].x, terrain[i].y);
        else ctx.lineTo(terrain[i].x, terrain[i].y);
    }
    ctx.stroke();

    for (let c of cactiList) {
        let cy = getTerrainHeight(c.x);
        drawCactus(c.x, cy, c.scale);
    }
}

function drawCactus(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#1e4620';
    ctx.strokeStyle = '#0e2b10';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-6, -45, 12, 45, 6);
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-6, -25); ctx.lineTo(-18, -25); ctx.lineTo(-18, -38);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, -18); ctx.lineTo(18, -18); ctx.lineTo(18, -32);
    ctx.stroke();

    ctx.restore();
}

function drawPracticeTarget() {
    if (gameMode !== 'PRACTICE') return;
    ctx.save();
    ctx.translate(targetDummy.x, targetDummy.y);
    const colors = ['#e74c3c', '#ffffff', '#e74c3c', '#ffffff', '#f1c40f'];
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(0, 0, targetDummy.radius * (1 - i * 0.2), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawArcher(archer, isCurrentTurn) {
    if (gameMode === 'PRACTICE' && archer === archer2) return;

    ctx.save();
    ctx.translate(archer.x, archer.y);

    let facingDir = archer.facingDir; 

    if (archer === archer2 && archer.clonesDuration > 0) {
        drawIdenticalClone(archer, -70);
        drawIdenticalClone(archer, 70);
    }

    if (archer.isKnockedDown) {
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 3.5;
        ctx.rotate(-facingDir * Math.PI / 2);
        ctx.beginPath(); ctx.arc(0, -38, 11, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(0, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-10, 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(10, 5); ctx.stroke();
        ctx.restore();
        return;
    }

    let tiltAngle = 0;
    if (gameState === 'PLAYING' && isCurrentTurn && isDragging) {
        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        let aimAngle = Math.atan2(dy, dx);
        tiltAngle = Math.max(-0.25, Math.min(0.25, (aimAngle - Math.PI) * 0.2));
    }
    ctx.rotate(tiltAngle);

    ctx.strokeStyle = archer.color;
    ctx.lineWidth = 3.5;

    ctx.beginPath(); ctx.arc(0, -38, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = archer.color;
    ctx.beginPath(); ctx.arc(facingDir * 4, -41, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#5c2c16';
    ctx.fillRect(-16, -50, 32, 4);
    ctx.fillRect(-9, -58, 18, 9);

    ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(0, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -23); ctx.lineTo(6, -23); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-8, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(8, 0); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(facingDir * 12, -20); ctx.stroke();

    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let startAngle = (facingDir === 1) ? -Math.PI / 2 : Math.PI / 2;
    let endAngle = (facingDir === 1) ? Math.PI / 2 : -Math.PI / 2;
    ctx.arc(facingDir * 12, -20, 18, startAngle, endAngle);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (gameState === 'PLAYING' && isCurrentTurn && isDragging) {
        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        let pullRatio = Math.min(Math.hypot(dx, dy) * 0.05, 1);
        let stringPullX = -facingDir * (8 + pullRatio * 12);

        ctx.moveTo(facingDir * 12, -38);
        ctx.lineTo(stringPullX, -22);
        ctx.lineTo(facingDir * 12, -2);
        ctx.stroke();

        ctx.strokeStyle = archer.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(stringPullX, -22); ctx.stroke();
    } else {
        ctx.moveTo(facingDir * 12, -38);
        ctx.lineTo(facingDir * 12 - facingDir * 4, -22);
        ctx.lineTo(facingDir * 12, -2);
        ctx.stroke();

        ctx.strokeStyle = archer.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(facingDir * 10, -22); ctx.stroke();
    }

    ctx.restore();
}

function drawIdenticalClone(archer, offsetX) {
    ctx.save();
    let cloneX = archer.x + offsetX;
    let cloneY = getTerrainHeight(cloneX) - archer.y;
    ctx.translate(offsetX, cloneY);
    
    let facingDir = archer.facingDir;
    ctx.strokeStyle = archer.color;
    ctx.lineWidth = 3.5;

    ctx.beginPath(); ctx.arc(0, -38, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = archer.color;
    ctx.beginPath(); ctx.arc(facingDir * 4, -41, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#5c2c16';
    ctx.fillRect(-16, -50, 32, 4);
    ctx.fillRect(-9, -58, 18, 9);

    ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(0, -8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -23); ctx.lineTo(6, -23); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(-8, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(8, 0); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(facingDir * 12, -20); ctx.stroke();

    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let startAngle = (facingDir === 1) ? -Math.PI / 2 : Math.PI / 2;
    let endAngle = (facingDir === 1) ? Math.PI / 2 : -Math.PI / 2;
    ctx.arc(facingDir * 12, -20, 18, startAngle, endAngle);
    ctx.stroke();

    ctx.restore();
}

function drawStuckArrows() {
    for (let arrow of stuckArrows) {
        ctx.save();
        let posX = arrow.target ? arrow.target.x + arrow.offsetX : arrow.x;
        let posY = arrow.target ? arrow.target.y + arrow.offsetY : arrow.y;

        ctx.translate(posX, posY);
        ctx.rotate(arrow.angle);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(8, 0); ctx.stroke();

        ctx.fillStyle = '#61dafb';
        ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(14, 0); ctx.lineTo(8, 3); ctx.fill();
        ctx.restore();
    }
}

function drawArrow() {
    if (!activeArrow) return;
    ctx.save();
    ctx.translate(activeArrow.x, activeArrow.y);
    ctx.rotate(activeArrow.angle);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(8, 0); ctx.stroke();

    ctx.fillStyle = '#61dafb';
    ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(14, 0); ctx.lineTo(8, 3); ctx.fill();

    ctx.restore();
}

function drawTrajectory() {
    if (gameState !== 'PLAYING' || !isDragging) return;

    let activeArcher = (currentTurn === 1) ? archer1 : archer2;

    ctx.strokeStyle = 'rgba(255, 200, 100, 0.7)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();

    let simX = activeArcher.x;
    let simY = activeArcher.y - 25;
    let dx = dragStart.x - dragCurrent.x;
    let dy = dragStart.y - dragCurrent.y;
    let power = Math.min(Math.hypot(dx, dy) * 0.13, 17);
    let angle = Math.atan2(dy, dx);
    let simVX = Math.cos(angle) * power;
    let simVY = Math.sin(angle) * power;

    for (let i = 0; i < 35; i++) {
        ctx.lineTo(simX, simY);
        simX += simVX;
        simVY += GRAVITY;
        simY += simVY;

        if (simY >= getTerrainHeight(simX)) break;
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawFloatingTexts() {
    for (let ft of floatingTexts) {
        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }
}

function drawUI() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    let centerX = canvas.width / 2;

    ctx.fillStyle = 'rgba(20, 10, 5, 0.85)';
    ctx.fillRect(centerX - 250, 15, 500, 75);
    ctx.strokeStyle = '#d97631';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 250, 15, 500, 75);

    if (gameMode === '1v1') {
        ctx.fillStyle = archer1.color;
        ctx.beginPath(); ctx.arc(centerX - 180, 47, 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

        let p1BarW = 90;
        let p1Percent = Math.max(archer1.hp / archer1.maxHp, 0);
        ctx.fillStyle = '#222'; ctx.fillRect(centerX - 150, 39, p1BarW, 16);
        ctx.fillStyle = archer1.color; ctx.fillRect(centerX - 150, 39, p1BarW * p1Percent, 16);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`${archer1.name}`, centerX - 150, 33);
        ctx.fillText(`${Math.ceil(archer1.hp)}/100`, centerX - 120, 51);

        ctx.fillStyle = '#ff3366'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('VS', centerX, 55);

        let distanceInMeters = Math.round(Math.abs(archer1.x - archer2.x) / 10);
        ctx.fillStyle = archer1.color; ctx.beginPath(); ctx.arc(centerX - 75, 73, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = archer2.color; ctx.beginPath(); ctx.arc(centerX + 75, 73, 8, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#444'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(centerX - 60, 73); ctx.lineTo(centerX + 60, 73); ctx.stroke();

        ctx.fillStyle = '#61dafb'; ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`${distanceInMeters}m`, centerX, 77);

        let p2BarW = 90;
        let p2Percent = Math.max(archer2.hp / archer2.maxHp, 0);
        ctx.fillStyle = '#222'; ctx.fillRect(centerX + 60, 39, p2BarW, 16);
        ctx.fillStyle = archer2.color; ctx.fillRect(centerX + 60, 39, p2BarW * p2Percent, 16);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`${archer2.name}`, centerX + 60, 33);
        ctx.fillText(`${Math.ceil(archer2.hp)}/100`, centerX + 90, 51);

        ctx.fillStyle = archer2.color;
        ctx.beginPath(); ctx.arc(centerX + 180, 47, 18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

        let activeArcher = (currentTurn === 1) ? archer1 : archer2;
        let s1Cd = activeArcher.skill1Cd;
        let s2Cd = activeArcher.skill2Cd;

        let skill1Name = (currentTurn === 1) ? '🔥 Rực Lửa' : '👥 Phân Thân';
        let skill2Name = (currentTurn === 1) ? '🌀 Dịch Chuyển' : '🏹 X2 Mũi Tên';

        ctx.fillStyle = s1Cd > 0 ? '#555' : '#e67e22';
        ctx.fillRect(centerX - 220, 100, 90, 32);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(centerX - 220, 100, 90, 32);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(s1Cd > 0 ? `SK1 (${s1Cd}v)` : skill1Name, centerX - 175, 120);

        ctx.fillStyle = s2Cd > 0 ? '#555' : '#8e44ad';
        ctx.fillRect(centerX - 120, 100, 90, 32);
        ctx.strokeStyle = '#fff'; ctx.strokeRect(centerX - 120, 100, 90, 32);
        ctx.fillStyle = '#fff';
        ctx.fillText(s2Cd > 0 ? `SK2 (${s2Cd}v)` : skill2Name, centerX - 75, 120);

    } else {
        ctx.fillStyle = '#61dafb';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🎯 ĐIỂM: ${practiceScore}`, centerX - 120, 55);

        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`⏱️ THỜI GIAN: ${practiceTimeLeft}s`, centerX + 120, 57);
    }

    pauseBtnPos.x = canvas.width - 110;
    ctx.fillStyle = '#2b1055';
    ctx.fillRect(pauseBtnPos.x, pauseBtnPos.y, pauseBtnPos.w, pauseBtnPos.h);
    ctx.strokeStyle = '#d97631'; ctx.lineWidth = 2;
    ctx.strokeRect(pauseBtnPos.x, pauseBtnPos.y, pauseBtnPos.w, pauseBtnPos.h);

    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('⏸️ PAUSE', pauseBtnPos.x + 45, pauseBtnPos.y + 22);

    ctx.textAlign = 'left';
    ctx.restore();
}

function gameLoop() {
    updateGame();

    drawBackground();

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    drawTerrain();
    drawPracticeTarget();
    drawArcher(archer1, currentTurn === 1);
    drawArcher(archer2, currentTurn === 2);
    drawStuckArrows();
    drawArrow();
    drawTrajectory();
    drawFloatingTexts();

    ctx.restore();

    if (gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'VICTORY') {
        drawUI();
    }

    if (gameState === 'INTRO_SLIDE') {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(11, 12, 16, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let slideProgress = Math.min(introTimer / 40, 1);
        let p1X = -150 + (canvas.width / 2 - 120) * slideProgress;
        ctx.fillStyle = archer1.color;
        ctx.beginPath(); ctx.arc(p1X, canvas.height / 2 - 20, 35, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

        let p1TypedName = archer1.name.substring(0, Math.floor((introTimer / 40) * archer1.name.length));
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(p1TypedName, p1X, canvas.height / 2 + 35);

        ctx.fillStyle = '#ff3366'; ctx.font = 'bold 45px sans-serif';
        ctx.fillText('VS', canvas.width / 2, canvas.height / 2 - 10);

        let p2X = canvas.width + 150 - (canvas.width / 2 - 120) * slideProgress;
        ctx.fillStyle = archer2.color;
        ctx.beginPath(); ctx.arc(p2X, canvas.height / 2 - 20, 35, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

        let p2TypedName = archer2.name.substring(0, Math.floor((introTimer / 40) * archer2.name.length));
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
        ctx.fillText(p2TypedName, p2X, canvas.height / 2 + 35);

        ctx.textAlign = 'left';
        ctx.restore();
    } 
    else if (gameState === 'INTRO_COUNTDOWN') {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(11, 12, 16, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#61dafb'; ctx.font = 'bold 85px sans-serif'; ctx.textAlign = 'center';
        let txt = (countdownVal > 0) ? countdownVal : 'GO!';
        ctx.fillText(txt, canvas.width / 2, canvas.height / 2 + 25);
        ctx.restore();
    }

    if (gameState === 'PAUSED') {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let centerX = canvas.width / 2;
        let centerY = canvas.height / 2 - 60;

        ctx.fillStyle = '#61dafb'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⏸️ GAME PAUSED', centerX, centerY);

        let btns = pauseMenuBtns;
        btns.resume = { x: centerX - 80, y: centerY + 30, w: 160, h: 40 };
        btns.restart = { x: centerX - 80, y: centerY + 80, w: 160, h: 40 };
        btns.home = { x: centerX - 80, y: centerY + 130, w: 160, h: 40 };
        btns.volume = { x: centerX - 80, y: centerY + 180, w: 160, h: 40 };

        ctx.fillStyle = '#d97631'; ctx.fillRect(btns.resume.x, btns.resume.y, btns.resume.w, btns.resume.h);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('▶️ TIẾP TỤC', centerX, btns.resume.y + 25);

        ctx.fillStyle = '#1f2833'; ctx.fillRect(btns.restart.x, btns.restart.y, btns.restart.w, btns.restart.h);
        ctx.strokeStyle = '#d97631'; ctx.lineWidth = 2; ctx.strokeRect(btns.restart.x, btns.restart.y, btns.restart.w, btns.restart.h);
        ctx.fillStyle = '#fff'; ctx.fillText('🔄 CHƠI LẠI', centerX, btns.restart.y + 25);

        ctx.fillStyle = '#1f2833'; ctx.fillRect(btns.home.x, btns.home.y, btns.home.w, btns.home.h);
        ctx.strokeRect(btns.home.x, btns.home.y, btns.home.w, btns.home.h);
        ctx.fillStyle = '#fff'; ctx.fillText('🏠 HOME', centerX, btns.home.y + 25);

        ctx.fillStyle = '#1f2833'; ctx.fillRect(btns.volume.x, btns.volume.y, btns.volume.w, btns.volume.h);
        ctx.strokeRect(btns.volume.x, btns.volume.y, btns.volume.w, btns.volume.h);
        ctx.fillStyle = '#fff';
        let volText = isMuted ? '🔇 MUTE' : (masterVolume === 1.0 ? '🔊 VOL: 100%' : '🔉 VOL: 50%');
        ctx.fillText(volText, centerX, btns.volume.y + 25);

        ctx.restore();
    }

    if (gameState === 'VICTORY') {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let centerX = canvas.width / 2;
        let centerY = canvas.height / 2;

        if (gameMode === '1v1') {
            let p1Won = archer1.hp > 0;
            ctx.fillStyle = p1Won ? '#f39c12' : '#e74c3c';
            ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(p1Won ? `${archer1.name} - WINNER!` : `${archer2.name} - WINNER!`, centerX, centerY - 60);

            ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 26px sans-serif';
            ctx.fillText(p1Won ? `${archer2.name} - LOSER` : `${archer1.name} - LOSER`, centerX, centerY - 10);
        } else {
            ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`HẾT GIỜ! TỔNG ĐIỂM: ${practiceScore}`, centerX, centerY - 60);

            ctx.fillStyle = '#61dafb'; ctx.font = 'bold 24px sans-serif';
            ctx.fillText(`🏆 KỶ LỤC CAO NHẤT: ${highScore} Điểm`, centerX, centerY - 10);
        }

        let btnY = centerY + 30;
        endButtons.restart = { x: centerX - 160, y: btnY, w: 140, h: 42 };
        ctx.fillStyle = '#d97631'; ctx.fillRect(endButtons.restart.x, endButtons.restart.y, endButtons.restart.w, endButtons.restart.h);
        ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2; ctx.strokeRect(endButtons.restart.x, endButtons.restart.y, endButtons.restart.w, endButtons.restart.h);

        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
        ctx.fillText('🔄 RESTART', centerX - 90, btnY + 27);

        endButtons.home = { x: centerX + 20, y: btnY, w: 140, h: 42 };
        ctx.fillStyle = '#1f2833'; ctx.fillRect(endButtons.home.x, endButtons.home.y, endButtons.home.w, endButtons.home.h);
        ctx.strokeStyle = '#d97631'; ctx.lineWidth = 2; ctx.strokeRect(endButtons.home.x, endButtons.home.y, endButtons.home.w, endButtons.home.h);

        ctx.fillStyle = '#fff';
        ctx.fillText('🏠 HOME', centerX + 90, btnY + 27);

        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

window.onload = function() {
    gameLoop();
};
