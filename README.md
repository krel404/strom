# Ström

A mesmerizing generative art experience featuring flow fields, particle systems, and dynamic visual effects.

## ✨ Features

- **Flow Field Visualization** - Multi-layer Perlin noise-based flow fields with adjustable complexity
- **Dynamic Particle System** - Hundreds of particles with physics-based movement and speed-responsive trails
- **Interactive Elements** - Mouse attraction effects and invisible obstacle placement
- **Color Palettes** - 15 carefully curated color schemes from tropical to cosmic themes
- **Visual Effects**:
  - Speed-based gradient coloring
  - Direction-based rainbow gradients  
  - Topographical elevation mapping
  - Dynamic trail systems
- **Randomization** - Each refresh generates unique settings for endless variety

## 🎮 Controls

- **Mouse**: Move to attract particles
- **Click**: Place invisible obstacles that repel particles
- **C Key**: Clear all obstacles
- **CMD + R**: Refresh for new randomized settings

## 🎨 Navigation

- **Reroll**: Complete randomization of all parameters for fresh art
- **Save**: Download current canvas as PNG

## 🚀 Live Demo

[View Ström](https://your-deployment-url.com)

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/krel404/strom.git
cd strom

# Open in browser (requires local server for file loading)
# Using Python:
python -m http.server 8000

# Using Node.js:
npx serve .

# Then open http://localhost:8000
```

## 🎯 Technologies

- **p5.js** - Creative coding framework
- **Perlin Noise** - Natural flow field generation
- **HTML5 Canvas** - Real-time rendering
- **Pure JavaScript** - No build process required

## 🎨 Art Techniques

- **Flow Fields**: Multi-scale Perlin noise creates organic movement patterns
- **Particle Physics**: Velocity, acceleration, and force-based interactions
- **Trail Systems**: Dynamic length based on particle speed
- **Color Theory**: HSV color space for smooth gradients
- **Topographic Mapping**: Elevation-based coloring using layered noise

## 📱 Responsive Design

Ström adapts to any screen size with full-window canvas rendering and responsive controls.

## 🔧 Customization

The codebase is designed for easy customization:
- Modify `palettes` object to add new color schemes
- Adjust noise scales and flow field parameters
- Customize particle behavior and physics
- Add new visual effects and interactions

## 📄 License

MIT License - Feel free to use and modify for your own projects.

---

**Ström** - *Swedish for "stream" or "current"* - captures the flowing, organic nature of this generative art experience.