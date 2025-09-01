# XR Formant

![IMG_5014](https://github.com/user-attachments/assets/c15ec8d0-99c3-4402-8189-f7693c8c4476)

This immersive XR tool invites spatial practitioners to explore how built environments are perceived through different physical and sensory conditions. By experiencing architectural spaces through diverse embodied perspectives, designers can question assumptions, assess accessibility, and deepen understanding of how design decisions shape user experiences across a spectrum of bodies.

Developed as part of the [ETH Zurich Design++ Summer School 2025](https://designplusplus.ethz.eth/education/summer-school/summerschool2025.html) - exploring how to design space through other bodies and embodied perspectives.

## Features

- **Visual Impairment Simulation**: Experience spaces through cataracts, age-related macular degeneration, retinopathy, and monocular vision
- **Vestibular Disorder Simulation**: Understand spatial perception challenges
- **XR Integration**: Immersive virtual and augmented reality support
- **Real-time Filtering**: Dynamic visual effects and accessibility overlays

## Development

### Prerequisites

- [Bun](https://bun.sh/) runtime

### Setup

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

The application will be available at `https://localhost:5173`

**Note**: HTTPS is required for XR functionality. Vite will guide you through the self-signed certificate setup process on first run. It's safe to accept the self-signed certificate in your browser since you generated it yourself.

## Technology Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [Three.js](https://threejs.org/) / [React Three Fiber](https://docs.pmndrs.dev/react-three-fiber/getting-started/introduction) for 3D rendering
- [Rapier](https://rapier.rs/) for physics and collision detection
- XR support for immersive experiences
- Real-time shader-based visual filters
