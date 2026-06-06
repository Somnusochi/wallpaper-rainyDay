# wallpaper-rainyDay

A dynamic, realistic rainy window theme for Wallpaper Engine, powered by Vue 3 and WebGL.

https://github.com/Somnusochi/wallpaper-rainyDay/raw/main/demo.mp4

## Features

- **Realistic Water Drops**: Simulates physical rain drops on glass using WebGL. Includes drop deformation, refraction, specular highlights, and shadow rendering.
- **Physics Engine**: Custom simulator handling gravity, wind, and drop collision/merging.
- **Dynamic Backgrounds**: Supports both static Images and Video backgrounds (`mp4`, `webm`, etc.).
- **Interactive Configuration**: Fully customizable via a floating control panel, interacting directly with Wallpaper Engine properties:
  - Visuals: Water drop color, background blur, opacity, crop alignment.
  - Drops: Radius sizes, drop generation frequency, screen limits.
  - Physics: Gravity scale, wind direction, rain update speed.
- **TypeScript & Rspack**: Built for high performance with modern web toolchains.

## Setup

Install the dependencies using pnpm:

```bash
pnpm install
```

## Get Started

Start the dev server:

```bash
pnpm run dev
```

Build the app for production:

```bash
pnpm run build
```
