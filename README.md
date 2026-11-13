# Techfest 3D: Into the Innovation Universe

A **3D interactive website concept for Techfest, IIT Bombay**. As you scroll, a camera flies through a space scene where each part of Techfest has its own interactive 3D object.

🔗 **Live demo:** https://vijayavani27-ai.github.io/techfest-3d-website/

Built for the **Techfest Campus Ambassador task "Build in 3D"**.

---

## ✨ Highlights

### 🎥 3D scroll animations
- **Scroll-driven camera flight**: the camera travels through 6 worlds placed in 3D space, with smooth easing
- **Camera banking**: the camera tilts in the direction you scroll
- **Warp-speed streaks**: light lines stretch across the screen when you scroll fast
- **Self-assembling cube**: 64 cubes fly in and lock into a perfect cube as you scroll to Workshops, then scatter again as you leave
- **Sky colour shifts**: the background and fog colours fade between a different palette for each section

### 🖱️ Interactive objects
| Section | 3D object | Interaction |
|---|---|---|
| Home | Morphing "Innovation Core" with orbit rings and particle dust | Hover makes it pulse, drag spins it, click opens info |
| Competitions | Chrome torus knot with sparks | Hover makes it glow, click opens info |
| Workshops | Self-assembling cube of 64 instanced blocks | Hover expands it, scroll assembles it |
| Lectures | Ringed planet with orbiting moons | Hover brightens the atmosphere |
| Exhibitions | Rotating carousel of 8 exhibit cards | Click any card for details |
| Launch | Glowing portal tunnel | Hover speeds up the swirl |

The camera also leans slightly toward the mouse, and a custom cursor shows a tooltip when you hover an object.

### 🎬 Dynamic transitions
- Text panels rotate and slide in 3D as you scroll past them
- The headline tilts in 3D as the mouse moves
- Section text fades in one line at a time
- Pop-up info cards flip in with a 3D animation
- A loading screen and an intro where the camera flies in from deep space

## 🛠 Tech stack
- **Three.js r160** (WebGL): meshes, InstancedMesh, particle systems, PMREM environment lighting, raycasting
- **Post-processing**: UnrealBloom glow (desktop)
- **Vanilla JS + CSS3**: scroll-linked 3D transforms, glassmorphism, responsive layout
- No build step. It's plain HTML, CSS and JS, and Three.js loads from a CDN.

## 📱 Responsive and accessible
- Phone layout puts the objects above the text, uses fewer particles and turns off bloom so it runs smoothly
- Respects `prefers-reduced-motion`
- If WebGL isn't available, a 2D version shows instead
- Keyboard-friendly navigation, ARIA labels, and Esc closes the pop-up cards

## 🚀 Run locally
The site uses ES modules, so serve it with any local server (opening the file directly won't work):

```bash
python -m http.server 5174
```

Then open http://localhost:5174.

## 📁 Structure
```
techfest-3d-website/
├── index.html   # sections, overlays, modal, import map
├── style.css    # theme, glass panels, transitions, responsive rules
├── main.js      # Three.js scene, 6 worlds, scroll + interaction logic
└── README.md
```

---
*Fan-made concept for a Campus Ambassador design task. Not the official Techfest website.*
