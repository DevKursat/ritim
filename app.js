/**
 * Ritim - Premium Müzik Görselleştirici
 * Web Audio API + Canvas + Ambient Effects
 */

// === TEMALAR ===
const THEMES = {
    cyber: {
        primary: '#a855f7',
        secondary: '#06b6d4',
        colors: ['#ff00ff', '#00ffff', '#a855f7', '#06b6d4'],
        bg: '#030014'
    },
    sunset: {
        primary: '#f97316',
        secondary: '#ec4899',
        colors: ['#ff6b35', '#f7931e', '#f43f5e', '#ec4899'],
        bg: '#0f0a07'
    },
    aurora: {
        primary: '#10b981',
        secondary: '#8b5cf6',
        colors: ['#00d4aa', '#10b981', '#8b5cf6', '#06b6d4'],
        bg: '#020f0a'
    },
    blood: {
        primary: '#dc2626',
        secondary: '#991b1b',
        colors: ['#ef4444', '#dc2626', '#b91c1c', '#7f1d1d'],
        bg: '#0a0202'
    },
    ice: {
        primary: '#0ea5e9',
        secondary: '#3b82f6',
        colors: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'],
        bg: '#020a14'
    },
    gold: {
        primary: '#f59e0b',
        secondary: '#d97706',
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#b45309'],
        bg: '#0a0700'
    }
};

// === DURUM ===
let audioContext = null;
let analyser = null;
let dataArray = null;
let source = null;
let isListening = false;
let currentTheme = 'cyber';
let currentMode = 'waves';
let sensitivity = 1.5;
let isPanelOpen = false;
let animationId = null;
let particles = [];

// === DOM ===
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const fab = document.getElementById('fab');
const settingsPanel = document.getElementById('settingsPanel');
const permissionScreen = document.getElementById('permissionScreen');
const startBtn = document.getElementById('startBtn');
const ambientGlow = document.getElementById('ambientGlow');
const themeBtns = document.querySelectorAll('.theme-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const sensitivitySlider = document.getElementById('sensitivitySlider');

// === CANVAS SETUP ===
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// === MİKROFON ===
async function requestMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.85;

        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Başarılı
        permissionScreen.classList.add('hidden');
        fab.classList.add('visible');

        setTimeout(() => {
            startVisualization();
        }, 300);

    } catch (err) {
        console.error('Mikrofon erişimi reddedildi:', err);
        startBtn.innerHTML = '<span class="btn-icon">🔄</span><span class="btn-text">Tekrar Dene</span>';
    }
}

// === GÖRSELLEŞTRME ===
function startVisualization() {
    isListening = true;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    animate();
}

function animate() {
    if (!isListening) return;
    animationId = requestAnimationFrame(animate);

    analyser.getByteFrequencyData(dataArray);

    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    // Temizle
    ctx.fillStyle = THEMES[currentTheme].bg;
    ctx.fillRect(0, 0, w, h);

    // Ortalama ses seviyesi
    const avgLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

    // Ambient glow güncelle
    updateAmbientGlow(avgLevel);

    // Çizim
    switch (currentMode) {
        case 'waves': drawWaves(w, h); break;
        case 'bars': drawBars(w, h); break;
        case 'circle': drawCircle(w, h); break;
        case 'matrix': drawMatrix(w, h); break;
    }
}

// === AMBIENT GLOW ===
function updateAmbientGlow(level) {
    const intensity = (level / 255) * sensitivity * 0.3;
    ambientGlow.style.opacity = 0.1 + intensity;
    ambientGlow.style.background = `radial-gradient(circle, ${THEMES[currentTheme].primary} 0%, transparent 50%)`;
}

// === VİZUALİZASYONLAR ===

// Dalgalar
function drawWaves(w, h) {
    const colors = THEMES[currentTheme].colors;
    const centerY = h / 2;

    // Birden fazla dalga katmanı
    for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();

        const offset = layer * 30;
        const alpha = 1 - layer * 0.3;

        for (let i = 0; i < dataArray.length; i++) {
            const x = (i / dataArray.length) * w;
            const value = dataArray[i] * sensitivity;
            const y = centerY + Math.sin(i * 0.05 + Date.now() * 0.002) * (value * 0.5) + offset;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        // Gradient stroke
        const gradient = ctx.createLinearGradient(0, centerY - 100, 0, centerY + 100);
        gradient.addColorStop(0, colors[0] + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, colors[1] + Math.floor(alpha * 255).toString(16).padStart(2, '0'));

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3 - layer;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Alt yansıma
        ctx.beginPath();
        for (let i = 0; i < dataArray.length; i++) {
            const x = (i / dataArray.length) * w;
            const value = dataArray[i] * sensitivity;
            const y = centerY - Math.sin(i * 0.05 + Date.now() * 0.002) * (value * 0.5) - offset;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = gradient;
        ctx.stroke();
    }

    // Merkez çizgi glow
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.strokeStyle = colors[0] + '33';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Çubuklar
function drawBars(w, h) {
    const colors = THEMES[currentTheme].colors;
    const barCount = 64;
    const gap = 4;
    const barWidth = (w - gap * barCount) / barCount;

    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * (dataArray.length / barCount));
        const value = dataArray[dataIndex] * sensitivity;
        const barHeight = (value / 255) * h * 0.7;

        const x = i * (barWidth + gap) + gap / 2;
        const y = h - barHeight;

        // Gradient bar
        const gradient = ctx.createLinearGradient(x, h, x, y);
        gradient.addColorStop(0, colors[i % colors.length] + '22');
        gradient.addColorStop(0.5, colors[i % colors.length]);
        gradient.addColorStop(1, colors[(i + 1) % colors.length]);

        // Rounded bar
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2, barWidth / 2, 0, 0]);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Glow
        ctx.shadowColor = colors[i % colors.length];
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Daire/Halka
function drawCircle(w, h) {
    const colors = THEMES[currentTheme].colors;
    const centerX = w / 2;
    const centerY = h / 2;
    const baseRadius = Math.min(w, h) * 0.25;

    // Dış halkalar
    for (let ring = 0; ring < 3; ring++) {
        const ringRadius = baseRadius + ring * 40;
        const ringAlpha = 1 - ring * 0.3;

        ctx.beginPath();
        for (let i = 0; i < dataArray.length; i++) {
            const angle = (i / dataArray.length) * Math.PI * 2 - Math.PI / 2;
            const value = dataArray[i] * sensitivity;
            const radius = ringRadius + (value / 255) * 80;

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.strokeStyle = colors[ring % colors.length] + Math.floor(ringAlpha * 200).toString(16).padStart(2, '0');
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Merkez daire
    const avgValue = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const pulseSize = baseRadius * 0.6 + (avgValue / 255) * sensitivity * 50;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseSize);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.5, colors[1] + '88');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
}

// Matrix
function drawMatrix(w, h) {
    const colors = THEMES[currentTheme].colors;
    const cols = 32;
    const rows = 20;
    const cellW = w / cols;
    const cellH = h / rows;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const dataIndex = Math.floor((col + row) * (dataArray.length / (cols + rows)));
            const value = dataArray[dataIndex % dataArray.length] * sensitivity;
            const size = (value / 255) * Math.min(cellW, cellH) * 0.8;

            if (size > 2) {
                const x = col * cellW + cellW / 2;
                const y = row * cellH + cellH / 2;

                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fillStyle = colors[(col + row) % colors.length] + Math.floor((value / 255) * 255).toString(16).padStart(2, '0');
                ctx.fill();
            }
        }
    }
}

// === TEMA ===
function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.style.setProperty('--primary', THEMES[theme].primary);
    document.documentElement.style.setProperty('--secondary', THEMES[theme].secondary);
    document.documentElement.style.setProperty('--bg', THEMES[theme].bg);

    themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

// === MOD ===
function setMode(mode) {
    currentMode = mode;
    modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

// === PANEL ===
function togglePanel() {
    isPanelOpen = !isPanelOpen;
    fab.classList.toggle('active', isPanelOpen);
    settingsPanel.classList.toggle('visible', isPanelOpen);
}

// === EVENT LISTENERS ===
startBtn.addEventListener('click', requestMicrophone);
fab.addEventListener('click', togglePanel);

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
});

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

sensitivitySlider.addEventListener('input', (e) => {
    sensitivity = parseFloat(e.target.value);
});

// Panel dışına tıklayınca kapat
document.addEventListener('click', (e) => {
    if (isPanelOpen && !settingsPanel.contains(e.target) && !fab.contains(e.target)) {
        togglePanel();
    }
});

// Canvas'a tıklayınca panel kapat
canvas.addEventListener('click', () => {
    if (isPanelOpen) togglePanel();
});

// Haptic feedback
function haptic() {
    if ('vibrate' in navigator) navigator.vibrate(10);
}

fab.addEventListener('click', haptic);
themeBtns.forEach(btn => btn.addEventListener('click', haptic));
modeBtns.forEach(btn => btn.addEventListener('click', haptic));

// Başlangıç teması
setTheme('cyber');
