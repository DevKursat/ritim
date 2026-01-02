/**
 * Ritim - Müzik Görselleştirici
 * Web Audio API + Canvas ile müzik görselleştirme
 */

// Tema Renkleri
const THEMES = {
    neon: {
        colors: ['#ff00ff', '#00ffff', '#ff00aa', '#00ff88'],
        bg: '#0a0a0f'
    },
    fire: {
        colors: ['#ff4500', '#ff6b35', '#ffd700', '#ff8c00'],
        bg: '#1a0a00'
    },
    ocean: {
        colors: ['#0077be', '#00d4aa', '#00bfff', '#20b2aa'],
        bg: '#001a1a'
    },
    galaxy: {
        colors: ['#4b0082', '#9400d3', '#8a2be2', '#da70d6'],
        bg: '#0a0015'
    },
    forest: {
        colors: ['#228b22', '#32cd32', '#00ff00', '#7cfc00'],
        bg: '#001a00'
    }
};

// Uygulama Durumu
let audioContext = null;
let analyser = null;
let dataArray = null;
let source = null;
let isListening = false;
let currentTheme = 'neon';
let currentMode = 'bars';
let animationId = null;

// DOM Elemanları
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const controls = document.getElementById('controls');
const startBtn = document.getElementById('startBtn');
const permissionScreen = document.getElementById('permissionScreen');
const permissionBtn = document.getElementById('permissionBtn');
const themeBtns = document.querySelectorAll('.theme-btn');
const modeBtns = document.querySelectorAll('.mode-btn');

// Canvas Boyutlandırma
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mikrofon Erişimi
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
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Başarılı - UI'ı göster
        permissionScreen.classList.add('hidden');
        controls.classList.add('visible');

        // Otomatik başlat
        startListening();

    } catch (err) {
        console.error('Mikrofon erişimi reddedildi:', err);
        permissionScreen.classList.add('error');
        document.querySelector('.permission-icon').textContent = '🔇';
        document.querySelector('.permission-content h1').textContent = 'İzin Gerekli';
        document.querySelector('.permission-content p').textContent = 'Mikrofon erişimi olmadan görselleştirme yapılamaz.';
        permissionBtn.textContent = '🔄 Tekrar Dene';
    }
}

// Dinlemeyi Başlat/Durdur
function startListening() {
    if (!analyser) return;

    isListening = true;
    startBtn.innerHTML = '<span class="icon">⏸️</span><span class="text">Durdur</span>';
    startBtn.classList.add('active');

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    animate();
}

function stopListening() {
    isListening = false;
    startBtn.innerHTML = '<span class="icon">🎤</span><span class="text">Başlat</span>';
    startBtn.classList.remove('active');

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Ekranı temizle
    ctx.fillStyle = THEMES[currentTheme].bg;
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
}

function toggleListening() {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

// Animasyon Döngüsü
function animate() {
    if (!isListening) return;

    animationId = requestAnimationFrame(animate);

    analyser.getByteFrequencyData(dataArray);

    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    // Arka plan (hafif fade efekti)
    ctx.fillStyle = THEMES[currentTheme].bg + 'dd';
    ctx.fillRect(0, 0, w, h);

    // Seçilen moda göre çiz
    switch (currentMode) {
        case 'bars':
            drawBars(w, h);
            break;
        case 'wave':
            drawWave(w, h);
            break;
        case 'circle':
            drawCircle(w, h);
            break;
        case 'particles':
            drawParticles(w, h);
            break;
    }
}

// Çubuk Görselleştirme
function drawBars(w, h) {
    const colors = THEMES[currentTheme].colors;
    const barCount = dataArray.length;
    const barWidth = w / barCount;
    const gap = 2;

    for (let i = 0; i < barCount; i++) {
        const value = dataArray[i];
        const barHeight = (value / 255) * h * 0.8;
        const x = i * barWidth;
        const y = h - barHeight;

        // Gradient
        const gradient = ctx.createLinearGradient(x, y, x, h);
        gradient.addColorStop(0, colors[i % colors.length]);
        gradient.addColorStop(1, colors[(i + 1) % colors.length] + '44');

        ctx.fillStyle = gradient;
        ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);

        // Üst parıltı
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + gap / 2, y, barWidth - gap, 3);
    }
}

// Dalga Görselleştirme
function drawWave(w, h) {
    const colors = THEMES[currentTheme].colors;
    const centerY = h / 2;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let i = 0; i < dataArray.length; i++) {
        const x = (i / dataArray.length) * w;
        const value = dataArray[i];
        const y = centerY + ((value - 128) / 128) * (h * 0.4);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    // Alt dalga (yansıma)
    for (let i = dataArray.length - 1; i >= 0; i--) {
        const x = (i / dataArray.length) * w;
        const value = dataArray[i];
        const y = centerY - ((value - 128) / 128) * (h * 0.4);
        ctx.lineTo(x, y);
    }

    ctx.closePath();

    // Gradient dolgu
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    colors.forEach((color, i) => {
        gradient.addColorStop(i / colors.length, color + '88');
    });

    ctx.fillStyle = gradient;
    ctx.fill();

    // Çizgi
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Daire Görselleştirme
function drawCircle(w, h) {
    const colors = THEMES[currentTheme].colors;
    const centerX = w / 2;
    const centerY = h / 2;
    const baseRadius = Math.min(w, h) * 0.2;

    for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i];
        const angle = (i / dataArray.length) * Math.PI * 2;
        const radius = baseRadius + (value / 255) * baseRadius * 1.5;

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const innerX = centerX + Math.cos(angle) * baseRadius * 0.5;
        const innerY = centerY + Math.sin(angle) * baseRadius * 0.5;

        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(x, y);

        ctx.strokeStyle = colors[i % colors.length];
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Uç noktada parlak nokta
        if (value > 150) {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
        }
    }

    // Merkez daire
    const avgValue = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const pulseRadius = baseRadius * 0.4 + (avgValue / 255) * 20;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[0] + '00');

    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
}

// Parçacık Sistemi
let particles = [];

function drawParticles(w, h) {
    const colors = THEMES[currentTheme].colors;
    const avgValue = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

    // Yeni parçacıklar ekle
    if (avgValue > 50) {
        for (let i = 0; i < Math.floor(avgValue / 30); i++) {
            particles.push({
                x: w / 2,
                y: h / 2,
                vx: (Math.random() - 0.5) * (avgValue / 10),
                vy: (Math.random() - 0.5) * (avgValue / 10),
                size: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1
            });
        }
    }

    // Parçacıkları güncelle ve çiz
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.size *= 0.98;

        if (p.life > 0) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
            ctx.fill();
            return true;
        }
        return false;
    });

    // Maksimum parçacık sayısını sınırla
    if (particles.length > 500) {
        particles = particles.slice(-500);
    }
}

// Tema Değiştir
function setTheme(theme) {
    currentTheme = theme;
    themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    document.body.style.background = THEMES[theme].bg;
}

// Mod Değiştir
function setMode(mode) {
    currentMode = mode;
    particles = []; // Parçacıkları temizle
    modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

// Event Listener'lar
permissionBtn.addEventListener('click', requestMicrophone);
startBtn.addEventListener('click', toggleListening);

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
});

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

// Dokunmatik cihazlarda ekrana dokunarak gizle/göster
let controlsVisible = true;
canvas.addEventListener('click', () => {
    if (isListening) {
        controlsVisible = !controlsVisible;
        controls.classList.toggle('visible', controlsVisible);
    }
});

// Başlangıç teması
setTheme('neon');
