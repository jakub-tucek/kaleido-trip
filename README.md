# Kaleido Trip

A lightweight fullscreen browser visualizer for use as a dynamic background during music shows.

## Features

- Fullscreen Three.js visuals with a deforming core, spectrum towers, particle tunnel, ribbon mesh, and layered wave lines
- Reacts to either a live microphone feed or a local audio file
- Adjustable energy and bloom controls for tuning the stage look
- Local `three` dependency via `pnpm` and Vite

## Run

Install dependencies:

```bash
pnpm install
```

Run the dev server:

```bash
pnpm dev
```

Then open the local URL printed by Vite.

For microphone input, use a browser that allows `getUserMedia` on your chosen origin. Vite's localhost server is suitable for this.

## Deploy

GitHub Pages deployment is configured through `.github/workflows/deploy-pages.yml`.

1. In GitHub, open `Settings -> Pages`.
2. Set `Source` to `GitHub Actions`.
3. Push to `main` or run the `Deploy GitHub Pages` workflow manually.

The site will be published at `https://jakub-tucek.github.io/kaleido-trip/`.
