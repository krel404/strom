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

// Gradient field variables
let gradientMode = 0; // 0 = palette colors, 1 = speed gradient, 2 = direction gradient
let gradientIntensity = 0.5;

// Topography variables
let topographyIntensity = 0;


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
    createCanvas(windowWidth, windowHeight);
    cols = floor(width / resolution);
    rows = floor(height / resolution);
    
    // Randomize starting palette
    currentPalette = floor(random(paletteNames.length));
    
    // Randomize all slider settings
    randomizeSettings();
    
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
        this.trail = [];
        this.baseTrailLength = 15;
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
        
        // Add current position to trail
        this.trail.push(createVector(this.pos.x, this.pos.y));
        
        // Calculate dynamic trail length based on speed
        let speedRatio = this.vel.mag() / this.maxSpeed;
        let dynamicTrailLength = this.baseTrailLength + (speedRatio * 25); // Fast particles get up to 40 trail points
        
        // Keep trail at dynamic length
        if (this.trail.length > dynamicTrailLength) {
            this.trail.splice(0, this.trail.length - dynamicTrailLength);
        }
        
        // Wrap around edges
        if (this.pos.x < 0) this.pos.x = width;
        if (this.pos.x > width) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = height;
        if (this.pos.y > height) this.pos.y = 0;
    }
    
    display() {
        let palette = palettes[paletteNames[currentPalette]];
        let particleColor = this.getGradientColor(palette);
        
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            let trailPos = this.trail[i];
            let trailAlpha = map(i, 0, this.trail.length - 1, 10, 200);
            let trailSize = map(i, 0, this.trail.length - 1, particleSize * 0.2, particleSize);
            
            fill(particleColor.r, particleColor.g, particleColor.b, trailAlpha);
            noStroke();
            circle(trailPos.x, trailPos.y, trailSize);
        }
        
        // Draw main particle (brightest)
        let alpha = map(this.vel.mag(), 0, this.maxSpeed, 100, 255);
        fill(particleColor.r, particleColor.g, particleColor.b, alpha);
        noStroke();
        circle(this.pos.x, this.pos.y, particleSize);
    }
    
    getGradientColor(palette) {
        let baseColor = {
            r: palette.particle[0],
            g: palette.particle[1], 
            b: palette.particle[2]
        };
        
        // Apply topography effect if enabled
        if (topographyIntensity > 0) {
            baseColor = this.applyTopography(baseColor, palette);
        }
        
        if (gradientMode === 0) {
            // Standard palette colors
            return baseColor;
        } else if (gradientMode === 1) {
            // Speed-based gradient
            let speedRatio = this.vel.mag() / this.maxSpeed;
            let accentColor = {
                r: palette.accent[0],
                g: palette.accent[1], 
                b: palette.accent[2]
            };
            
            // Interpolate between base and accent based on speed
            let mixAmount = speedRatio * gradientIntensity;
            return {
                r: lerp(baseColor.r, accentColor.r, mixAmount),
                g: lerp(baseColor.g, accentColor.g, mixAmount),
                b: lerp(baseColor.b, accentColor.b, mixAmount)
            };
        } else if (gradientMode === 2) {
            // Direction-based gradient - subtle zen approach
            let angle = atan2(this.vel.y, this.vel.x);
            let hue = map(angle, -PI, PI, 0, 360);
            
            // Subtle but more noticeable saturation for zen feel
            let saturation = 35 + (25 * gradientIntensity); // Range: 35-60%
            let brightness = 75 + (15 * gradientIntensity);  // Range: 75-90%
            
            // Blend with palette base color for cohesion
            let hsvColor = this.hsvToRgb(hue, saturation, brightness);
            
            // Mix HSV result with palette base (60% base, 40% gradient)
            let mixRatio = 0.4 * gradientIntensity;
            return {
                r: lerp(baseColor.r, hsvColor.r, mixRatio),
                g: lerp(baseColor.g, hsvColor.g, mixRatio),
                b: lerp(baseColor.b, hsvColor.b, mixRatio)
            };
        }
    }
    
    applyTopography(baseColor, palette) {
        // Create elevation map using multiple noise layers
        let elevation = 0;
        let scale1 = 0.003; // Large features
        let scale2 = 0.01;  // Medium features  
        let scale3 = 0.03;  // Fine details
        
        elevation += noise(this.pos.x * scale1, this.pos.y * scale1) * 0.6;
        elevation += noise(this.pos.x * scale2, this.pos.y * scale2) * 0.3;
        elevation += noise(this.pos.x * scale3, this.pos.y * scale3) * 0.1;
        
        // Map elevation to color zones (0-1 range)
        let lowColor = palette.deep;      // Valleys/water - darkest
        let midColor = palette.particle;  // Plains - base color
        let highColor = palette.accent;   // Mountains/peaks - lightest
        
        let resultColor;
        if (elevation < 0.4) {
            // Low elevation: blend between deep and particle
            let t = map(elevation, 0, 0.4, 0, 1);
            resultColor = {
                r: lerp(lowColor[0], midColor[0], t),
                g: lerp(lowColor[1], midColor[1], t),
                b: lerp(lowColor[2], midColor[2], t)
            };
        } else {
            // High elevation: blend between particle and accent
            let t = map(elevation, 0.4, 1, 0, 1);
            resultColor = {
                r: lerp(midColor[0], highColor[0], t),
                g: lerp(midColor[1], highColor[1], t),
                b: lerp(midColor[2], highColor[2], t)
            };
        }
        
        // Blend topography result with original base color
        return {
            r: lerp(baseColor.r, resultColor.r, topographyIntensity),
            g: lerp(baseColor.g, resultColor.g, topographyIntensity),
            b: lerp(baseColor.b, resultColor.b, topographyIntensity)
        };
    }
    
    hsvToRgb(h, s, v) {
        h = h / 360;
        s = s / 100;
        v = v / 100;
        
        let r, g, b;
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);
        
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
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


function randomizeSettings() {
    // Randomize turbulence (0.005 - 0.05)
    noiseScale = random(0.005, 0.05);
    
    // Randomize speed (0.5 - 4.0)
    maxSpeed = random(0.5, 4.0);
    // Update existing particles
    for (let particle of particles) {
        particle.maxSpeed = maxSpeed;
    }
    
    // Randomize particle count (100 - 1500)
    let newParticleCount = floor(random(100, 1501));
    if (newParticleCount > particleCount) {
        // Add particles
        for (let i = particleCount; i < newParticleCount; i++) {
            particles.push(new Particle());
        }
    } else if (newParticleCount < particleCount) {
        // Remove particles
        particles.splice(newParticleCount);
    }
    particleCount = newParticleCount;
    
    // Randomize attractor strength (0 - 5.0)
    vortexStrength = random(0, 5.0);
    
    // Randomize flow layers (1 - 3)
    flowLayers = floor(random(1, 4));
    
    // Randomize particle size (1 - 10)
    particleSize = random(1, 10);
    
    // Randomize gradient mode (0 - 2)
    gradientMode = floor(random(0, 3));
    
    // Randomize gradient intensity (0 - 1)
    gradientIntensity = random(0, 1);
    
    // Randomize topography intensity (0 - 1)
    topographyIntensity = random(0, 1);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    cols = floor(width / resolution);
    rows = floor(height / resolution);
    initializeFlowField();
    updateFlowFieldWithMouse();
}