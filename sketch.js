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

const palettes = {
    tropical: {
        particle: [64, 224, 208],
        deep: [25, 25, 112]
    },
    arctic: {
        particle: [176, 224, 230],
        deep: [25, 25, 112]
    },
    volcanic: {
        particle: [255, 99, 71],
        deep: [0, 0, 0]
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
}

function draw() {
    let palette = palettes[paletteNames[currentPalette]];
    background(palette.deep[0], palette.deep[1], palette.deep[2], 30);
    
    updateFlowFieldWithMouse();
    
    if (showFlowField) {
        drawFlowField();
    }
    
    drawObstacles();
    updateAndDrawParticles();
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
    let timeOffset = frameCount * 0.001;
    
    // Base flow field (Layer 1)
    let yoff = timeOffset;
    for (let y = 0; y < rows; y++) {
        let xoff = timeOffset;
        for (let x = 0; x < cols; x++) {
            let angle = noise(xoff, yoff, timeOffset) * TWO_PI * 2;
            let vector = p5.Vector.fromAngle(angle);
            vector.mult(0.5);
            flowField[y][x] = vector;
            xoff += noiseScale;
        }
        yoff += noiseScale;
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