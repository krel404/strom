let flowField = [];
let flowField2 = [];
let flowField3 = [];
let particles = [];
let obstacles = [];
let cols, rows;
let resolution = 20;
let showFlowField = false;
let noiseScale = 0.01;
let particleCount = 500;
let currentPalette = 0;
let mouseInfluence = 100;
let vortexStrength = 2;
let obstacleMode = true;
let maxSpeed = 2;
let flowLayers = 1;
let particleSize = 3;

// Audio variables
let audioContext;
let analyser;
let audioBuffer;
let sourceNode;
let freqData;
let isAudioReactive = false;
let bassLevel = 0;
let midLevel = 0;
let trebleLevel = 0;
let beatThreshold = 0.8;
let lastBeatTime = 0;
let bpm = 120;
let audioTimeScale = 1;

const palettes = {
    tropical: {
        particle: [64, 224, 208],
        deep: [25, 25, 112],
        accent: [255, 223, 186]
    },
    arctic: {
        particle: [176, 224, 230],
        deep: [25, 25, 112],
        accent: [255, 255, 255]
    },
    volcanic: {
        particle: [255, 99, 71],
        deep: [0, 0, 0],
        accent: [255, 140, 0]
    },
    synth: {
        particle: [255, 0, 255],
        deep: [20, 0, 40],
        accent: [0, 255, 255]
    },
    neon: {
        particle: [0, 255, 127],
        deep: [10, 10, 30],
        accent: [255, 255, 0]
    },
    sunset: {
        particle: [255, 165, 0],
        deep: [139, 0, 139],
        accent: [255, 20, 147]
    },
    forest: {
        particle: [34, 139, 34],
        deep: [0, 100, 0],
        accent: [173, 255, 47]
    },
    monochrome: {
        particle: [220, 220, 220],
        deep: [30, 30, 30],
        accent: [255, 255, 255]
    },
    ocean: {
        particle: [0, 191, 255],
        deep: [0, 0, 139],
        accent: [135, 206, 250]
    },
    fire: {
        particle: [255, 69, 0],
        deep: [139, 0, 0],
        accent: [255, 215, 0]
    },
    lavender: {
        particle: [186, 85, 211],
        deep: [75, 0, 130],
        accent: [221, 160, 221]
    },
    mint: {
        particle: [0, 255, 159],
        deep: [0, 139, 139],
        accent: [127, 255, 212]
    },
    amber: {
        particle: [255, 191, 0],
        deep: [101, 67, 33],
        accent: [255, 140, 0]
    },
    cosmic: {
        particle: [138, 43, 226],
        deep: [25, 25, 112],
        accent: [72, 61, 139]
    },
    rose: {
        particle: [255, 105, 180],
        deep: [139, 69, 19],
        accent: [255, 182, 193]
    }
};

const paletteNames = Object.keys(palettes);

function setup() {
    createCanvas(1200, 800);
    cols = floor(width / resolution);
    rows = floor(height / resolution);
    
    initializeFlowField();
    updateFlowFieldWithMouse(); // Initialize all layers properly
    initializeParticles();
    setupAudio();
}

function draw() {
    if (isAudioReactive) {
        updateAudioAnalysis();
    }
    
    let palette = palettes[paletteNames[currentPalette]];
    background(palette.deep[0], palette.deep[1], palette.deep[2], 30);
    
    updateFlowFieldWithMouse();
    
    if (showFlowField) {
        drawFlowField();
    }
    
    drawObstacles();
    updateAndDrawParticles();
    
    if (isAudioReactive) {
        drawAudioVisuals();
    }
}

function initializeFlowField() {
    flowField = [];
    flowField2 = [];
    flowField3 = [];
    
    for (let y = 0; y < rows; y++) {
        flowField[y] = [];
        flowField2[y] = [];
        flowField3[y] = [];
        
        for (let x = 0; x < cols; x++) {
            flowField[y][x] = createVector(0, 0);
            flowField2[y][x] = createVector(0, 0);
            flowField3[y][x] = createVector(0, 0);
        }
    }
}

function initializeParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

class Particle {
    constructor() {
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.maxSpeed = maxSpeed;
        this.age = 0;
        this.maxAge = random(200, 500);
    }
    
    update() {
        // Get combined flow field forces
        let x = floor(this.pos.x / resolution);
        let y = floor(this.pos.y / resolution);
        
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
            let force = flowField[y][x].copy();
            
            // Add additional layers if enabled
            if (flowLayers >= 2) {
                force.add(flowField2[y][x]);
            }
            if (flowLayers >= 3) {
                force.add(flowField3[y][x]);
            }
            
            this.acc.add(force);
        }
        
        // Add mouse influence (attractor effect)
        let mouseDistance = dist(this.pos.x, this.pos.y, mouseX, mouseY);
        if (mouseDistance < mouseInfluence && mouseDistance > 5) {
            let attractorForce = createVector(mouseX - this.pos.x, mouseY - this.pos.y);
            attractorForce.normalize();
            attractorForce.mult(vortexStrength / mouseDistance);
            this.acc.add(attractorForce);
        }
        
        // Check obstacles
        for (let obstacle of obstacles) {
            let obstacleDistance = dist(this.pos.x, this.pos.y, obstacle.x, obstacle.y);
            if (obstacleDistance < obstacle.radius + 20) {
                let repelForce = createVector(this.pos.x - obstacle.x, this.pos.y - obstacle.y);
                repelForce.normalize();
                repelForce.mult(3 / obstacleDistance);
                this.acc.add(repelForce);
            }
        }
        
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);
        
        this.age++;
        
        // Wrap around edges
        if (this.pos.x < 0) this.pos.x = width;
        if (this.pos.x > width) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = height;
        if (this.pos.y > height) this.pos.y = 0;
    }
    
    display() {
        let palette = palettes[paletteNames[currentPalette]];
        let alpha = map(this.vel.mag(), 0, this.maxSpeed, 50, 200);
        fill(palette.particle[0], palette.particle[1], palette.particle[2], alpha);
        noStroke();
        circle(this.pos.x, this.pos.y, particleSize);
    }
    
    isDead() {
        return this.age > this.maxAge;
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].display();
        
        if (particles[i].isDead()) {
            particles.splice(i, 1);
            particles.push(new Particle());
        }
    }
}

function drawFlowField() {
    stroke(255, 100);
    strokeWeight(1);
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let vector = flowField[y][x];
            let px = x * resolution + resolution / 2;
            let py = y * resolution + resolution / 2;
            
            line(px, py, 
                 px + vector.x * resolution, 
                 py + vector.y * resolution);
        }
    }
}

function updateFlowFieldWithMouse() {
    // Audio-reactive time scaling
    let timeOffset = frameCount * 0.001 * audioTimeScale;
    
    // Bass-driven base turbulence
    let bassTurbulence = isAudioReactive ? noiseScale * (1 + bassLevel * 2) : noiseScale;
    
    // Base flow field (Layer 1)
    let yoff = timeOffset;
    for (let y = 0; y < rows; y++) {
        let xoff = timeOffset;
        for (let x = 0; x < cols; x++) {
            let angle = noise(xoff, yoff, timeOffset) * TWO_PI * 2;
            // Audio-reactive intensity
            if (isAudioReactive) {
                angle += midLevel * PI;
            }
            let vector = p5.Vector.fromAngle(angle);
            vector.mult(0.5 * (isAudioReactive ? (1 + trebleLevel * 0.5) : 1));
            flowField[y][x] = vector;
            xoff += bassTurbulence;
        }
        yoff += bassTurbulence;
    }
    
    // Layer 2 - Different scale and speed (more pronounced)
    if (flowLayers >= 2) {
        yoff = timeOffset * 0.7;
        for (let y = 0; y < rows; y++) {
            let xoff = timeOffset * 0.7;
            for (let x = 0; x < cols; x++) {
                let angle = noise(xoff * 3, yoff * 3, timeOffset * 3) * TWO_PI * 4;
                let vector = p5.Vector.fromAngle(angle);
                vector.mult(0.8); // Much stronger
                flowField2[y][x] = vector;
                xoff += noiseScale * 3;
            }
            yoff += noiseScale * 3;
        }
    }
    
    // Layer 3 - Extremely chaotic layer for dramatic effect
    if (flowLayers >= 3) {
        yoff = timeOffset * 2.5;
        for (let y = 0; y < rows; y++) {
            let xoff = timeOffset * 2.5;
            for (let x = 0; x < cols; x++) {
                // Multiple noise sources for extreme chaos
                let angle1 = noise(xoff * 0.1, yoff * 0.1, timeOffset * 0.1) * TWO_PI * 8;
                let angle2 = noise(xoff * 5, yoff * 5, timeOffset * 5) * TWO_PI * 12;
                let angle = angle1 + angle2; // Combine large and small scale chaos
                
                let vector = p5.Vector.fromAngle(angle);
                vector.mult(1.2); // Very strong influence
                flowField3[y][x] = vector;
                xoff += noiseScale * 0.1;
            }
            yoff += noiseScale * 0.1;
        }
    }
}

function drawObstacles() {
    // Obstacles are now fully invisible - only their physics effects remain
}

function drawMouseInfluence() {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        noFill();
        stroke(255, 80);
        strokeWeight(1);
        circle(mouseX, mouseY, mouseInfluence * 2);
        
        // Draw vortex indication
        stroke(255, 120);
        strokeWeight(2);
        let numLines = 8;
        for (let i = 0; i < numLines; i++) {
            let angle = (TWO_PI / numLines) * i + frameCount * 0.05;
            let x1 = mouseX + cos(angle) * 15;
            let y1 = mouseY + sin(angle) * 15;
            let x2 = mouseX + cos(angle) * 25;
            let y2 = mouseY + sin(angle) * 25;
            line(x1, y1, x2, y2);
        }
    }
}

function mousePressed() {
    obstacles.push({
        x: mouseX,
        y: mouseY,
        radius: random(20, 50)
    });
}

function keyPressed() {
    if (key === 'c' || key === 'C') {
        obstacles = [];
    }
}

// Control functions
function regenerate() {
    noiseScale = random(0.005, 0.02);
    obstacles = [];
    initializeFlowField();
    updateFlowFieldWithMouse(); // Initialize all layers properly
    initializeParticles();
}

function toggleFlowField() {
    showFlowField = !showFlowField;
}

function cyclePalette() {
    currentPalette = (currentPalette + 1) % paletteNames.length;
}


function clearObstacles() {
    obstacles = [];
}

function toggleAudio() {
    const btn = document.getElementById('audioBtn');
    if (!isAudioReactive) {
        startAudioInput();
        btn.textContent = '🎵 Disable Audio';
        btn.style.background = '#555';
    } else {
        stopAudioInput();
        btn.textContent = '🎵 Enable Audio';
        btn.style.background = '#333';
    }
}


// Real-time control functions
function updateTurbulence(value) {
    noiseScale = parseFloat(value);
    document.getElementById('turbulenceValue').textContent = parseFloat(value).toFixed(3);
}

function updateSpeed(value) {
    maxSpeed = parseFloat(value);
    // Update existing particles
    for (let particle of particles) {
        particle.maxSpeed = maxSpeed;
    }
    document.getElementById('speedValue').textContent = parseFloat(value).toFixed(1);
}

function updateParticleCount(value) {
    let newCount = parseInt(value);
    if (newCount > particleCount) {
        // Add particles
        for (let i = particleCount; i < newCount; i++) {
            particles.push(new Particle());
        }
    } else if (newCount < particleCount) {
        // Remove particles
        particles.splice(newCount);
    }
    particleCount = newCount;
    document.getElementById('particleValue').textContent = newCount;
}

function updateVortexStrength(value) {
    vortexStrength = parseFloat(value);
    document.getElementById('vortexValue').textContent = parseFloat(value).toFixed(1);
}

function updateFlowLayers(value) {
    flowLayers = parseInt(value);
    document.getElementById('layersValue').textContent = value;
    console.log('Flow layers updated to:', flowLayers);
}

function updateParticleSize(value) {
    particleSize = parseFloat(value);
    document.getElementById('sizeValue').textContent = parseFloat(value).toFixed(0);
}

// Audio System Functions
function setupAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        freqData = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
        console.log('Web Audio API not supported');
    }
}

function startAudioInput() {
    if (!audioContext) return;
    
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            isAudioReactive = true;
            console.log('Audio reactive mode enabled');
        })
        .catch(err => {
            console.log('Microphone access denied', err);
        });
}

function stopAudioInput() {
    isAudioReactive = false;
    bassLevel = 0;
    midLevel = 0;
    trebleLevel = 0;
    audioTimeScale = 1;
}

function updateAudioAnalysis() {
    if (!analyser || !isAudioReactive) return;
    
    analyser.getByteFrequencyData(freqData);
    
    // Split into frequency ranges
    const bassRange = freqData.slice(0, 10);   // Low frequencies
    const midRange = freqData.slice(10, 40);   // Mid frequencies  
    const trebleRange = freqData.slice(40, 128); // High frequencies
    
    // Calculate average levels (0-1 range)
    bassLevel = bassRange.reduce((a, b) => a + b) / (bassRange.length * 255);
    midLevel = midRange.reduce((a, b) => a + b) / (midRange.length * 255);
    trebleLevel = trebleRange.reduce((a, b) => a + b) / (trebleRange.length * 255);
    
    // BPM-based time scaling (Lumines inspired)
    bpm = 60 + (bassLevel + midLevel) * 120; // Dynamic BPM 60-180
    audioTimeScale = map(bpm, 60, 180, 0.5, 2.0);
    
    // Beat detection for layer switching
    let totalLevel = (bassLevel + midLevel + trebleLevel) / 3;
    if (totalLevel > beatThreshold && millis() - lastBeatTime > 500) {
        // Auto-cycle flow layers on beats
        if (totalLevel > 0.9) {
            flowLayers = (flowLayers % 3) + 1;
            lastBeatTime = millis();
        }
        
        // Palette switching on strong beats
        if (totalLevel > 0.95) {
            currentPalette = (currentPalette + 1) % paletteNames.length;
        }
    }
}

function drawAudioVisuals() {
    if (!isAudioReactive) return;
    
    let palette = palettes[paletteNames[currentPalette]];
    
    // Audio level indicator
    fill(palette.accent[0], palette.accent[1], palette.accent[2], 150);
    noStroke();
    
    // Bass indicator (bottom left)
    rect(10, height - 20, bassLevel * 100, 10);
    
    // Mid indicator (middle left)
    rect(10, height - 40, midLevel * 100, 10);
    
    // Treble indicator (top left)
    rect(10, height - 60, trebleLevel * 100, 10);
    
    // BPM display
    fill(255, 200);
    textSize(12);
    textAlign(LEFT);
    text('BPM: ' + Math.round(bpm), 120, height - 35);
    text('Audio Mode', 120, height - 20);
}