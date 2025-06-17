let flowField = [];
let particles = [];
let depositionGrid = [];
let asciiGrid = [];
let coastline = [];
let cols, rows;
let resolution = 20;
let showFlowField = false;
let noiseScale = 0.01;
let particleCount = 800;
let currentPalette = 0;

const landChars = ['#', '@', '%', '&', '*', '+', '=', 'X', 'O', 'o', '.', ',', ';', ':', '~', '^', 'v', '<', '>', '|', '/', '\\', '-', '_'];
const vegetationChars = ['T', 'Y', 'A', 'M', 'W', 'V', 'N', 'H', 'K', 'P', 'R', 'F', 'E', 'L', 'I', 'U', 'S', 'D', 'G', 'J', 'Q', 'B', 'C', 'Z'];
const shallowChars = ['~', '≈', '∼', '⌐', '¬', '°', '∙', '∘', '·', '•', '◦', '○', '◯', '◌', '◇', '◈', '◊', '◉', '◎', '●', '◍', '◐', '◑', '◒', '◓'];

const palettes = {
    tropical: {
        water: [0, 119, 190],
        sand: [255, 223, 186],
        shallow: [64, 224, 208],
        deep: [25, 25, 112],
        vegetation: [34, 139, 34]
    },
    arctic: {
        water: [70, 130, 180],
        sand: [248, 248, 255],
        shallow: [176, 224, 230],
        deep: [25, 25, 112],
        vegetation: [119, 136, 153]
    },
    volcanic: {
        water: [47, 79, 79],
        sand: [105, 105, 105],
        shallow: [112, 128, 144],
        deep: [0, 0, 0],
        vegetation: [85, 107, 47]
    }
};

const paletteNames = Object.keys(palettes);

function setup() {
    createCanvas(1200, 800);
    cols = floor(width / resolution);
    rows = floor(height / resolution);
    
    initializeDepositionGrid();
    initializeFlowField();
    initializeParticles();
}

function draw() {
    let palette = palettes[paletteNames[currentPalette]];
    background(palette.deep[0], palette.deep[1], palette.deep[2], 20);
    
    drawDepositionGrid();
    
    if (showFlowField) {
        drawFlowField();
    }
    
    updateAndDrawParticles();
}

function initializeFlowField() {
    flowField = [];
    let yoff = 0;
    
    for (let y = 0; y < rows; y++) {
        let xoff = 0;
        flowField[y] = [];
        
        for (let x = 0; x < cols; x++) {
            // Create swirling ocean currents using Perlin noise
            let angle = noise(xoff, yoff) * TWO_PI * 2;
            let vector = p5.Vector.fromAngle(angle);
            vector.mult(0.5);
            flowField[y][x] = vector;
            xoff += noiseScale;
        }
        yoff += noiseScale;
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
        this.maxSpeed = 2;
        this.age = 0;
        this.maxAge = random(200, 500);
        this.deposited = false;
        this.depositionStrength = random(3, 8);
    }
    
    update() {
        // Get flow field force
        let x = floor(this.pos.x / resolution);
        let y = floor(this.pos.y / resolution);
        
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
            let force = flowField[y][x];
            this.acc.add(force);
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
        
        // Check for deposition (slow areas become land)
        if (this.vel.mag() < 0.8 && !this.deposited && this.age > 20) {
            this.deposited = true;
            this.deposit();
        }
    }
    
    display() {
        if (!this.deposited) {
            // Flowing particles (sediment in water)
            let palette = palettes[paletteNames[currentPalette]];
            let alpha = map(this.vel.mag(), 0, this.maxSpeed, 50, 150);
            fill(palette.shallow[0], palette.shallow[1], palette.shallow[2], alpha);
            noStroke();
            circle(this.pos.x, this.pos.y, 3);
        }
    }
    
    deposit() {
        let gridX = floor(this.pos.x / resolution);
        let gridY = floor(this.pos.y / resolution);
        
        if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
            depositionGrid[gridY][gridX] += this.depositionStrength;
            
            // Add to neighboring cells for smoother islands
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    let nx = gridX + dx;
                    let ny = gridY + dy;
                    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                        let distance = sqrt(dx*dx + dy*dy);
                        let strength = this.depositionStrength * (1 - distance * 0.2);
                        depositionGrid[ny][nx] += max(0, strength);
                    }
                }
            }
        }
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
            particles.push(new Particle()); // Respawn
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

function initializeDepositionGrid() {
    depositionGrid = [];
    asciiGrid = [];
    for (let y = 0; y < rows; y++) {
        depositionGrid[y] = [];
        asciiGrid[y] = [];
        for (let x = 0; x < cols; x++) {
            depositionGrid[y][x] = 0;
            asciiGrid[y][x] = null;
        }
    }
}

function drawDepositionGrid() {
    let palette = palettes[paletteNames[currentPalette]];
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let amount = depositionGrid[y][x];
            if (amount > 0) {
                let px = x * resolution;
                let py = y * resolution;
                
                // Create elevation-based coloring
                let elevation = min(amount / 20, 1); // Normalize to 0-1
                
                if (elevation > 0.7) {
                    // High elevation - vegetation
                    fill(palette.vegetation[0], palette.vegetation[1], palette.vegetation[2], 255);
                } else if (elevation > 0.3) {
                    // Medium elevation - sandy land
                    fill(palette.sand[0], palette.sand[1], palette.sand[2], 255);
                } else {
                    // Low elevation - shallow water/beach
                    let alpha = map(elevation, 0, 0.3, 100, 200);
                    fill(palette.shallow[0], palette.shallow[1], palette.shallow[2], alpha);
                }
                
                // Generate ASCII character if not already assigned
                if (!asciiGrid[y][x]) {
                    if (elevation > 0.7) {
                        asciiGrid[y][x] = random(vegetationChars);
                    } else if (elevation > 0.3) {
                        asciiGrid[y][x] = random(landChars);
                    } else {
                        asciiGrid[y][x] = random(shallowChars);
                    }
                }
                
                // Draw ASCII character
                textAlign(CENTER, CENTER);
                let fontSize = map(elevation, 0, 1, 12, 24);
                textSize(fontSize);
                text(asciiGrid[y][x], px + resolution/2, py + resolution/2);
            }
        }
    }
}

// Control functions
function regenerate() {
    noiseScale = random(0.005, 0.02);
    initializeDepositionGrid();
    initializeFlowField();
    initializeParticles();
}

function toggleFlowField() {
    showFlowField = !showFlowField;
}

function cyclePalette() {
    currentPalette = (currentPalette + 1) % paletteNames.length;
}