import "./styles.css";

import { AudioEngine } from "./audio";
import { VisualizerScene } from "./scene";
import type { PointerState } from "./types";

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

const canvas = getRequiredElement<HTMLCanvasElement>("#visualizer");
const micButton = getRequiredElement<HTMLButtonElement>("#micButton");
const demoButton = getRequiredElement<HTMLButtonElement>("#demoButton");
const fileInput = getRequiredElement<HTMLInputElement>("#fileInput");
const player = getRequiredElement<HTMLAudioElement>("#player");
const statusText = getRequiredElement<HTMLParagraphElement>("#status");
const energyInput = getRequiredElement<HTMLInputElement>("#energy");
const bloomInput = getRequiredElement<HTMLInputElement>("#bloom");

const pointer: PointerState = { x: 0, y: 0 };

const setStatus = (message: string): void => {
  statusText.textContent = message;
};

const audioEngine = new AudioEngine(player, () => Number(energyInput.value), setStatus);
const scene = new VisualizerScene(canvas, { getBloom: () => Number(bloomInput.value) });

function render(time: number): void {
  const profile = audioEngine.getProfile(time);
  scene.render(
    profile,
    time,
    pointer,
    audioEngine.getFrequencyData(),
    audioEngine.getWaveformData(),
    audioEngine.isAudioReady() && !audioEngine.isDemoMode()
  );

  requestAnimationFrame(render);
}

window.addEventListener("resize", () => {
  scene.resize();
});

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX / window.innerWidth - 0.5;
  pointer.y = 0.5 - event.clientY / window.innerHeight;
});

micButton.addEventListener("click", () => {
  void audioEngine.useMicrophone();
});

demoButton.addEventListener("click", () => {
  audioEngine.setDemoMode();
});

fileInput.addEventListener("change", (event) => {
  const [file] = (event.currentTarget as HTMLInputElement).files ?? [];
  audioEngine.useAudioFile(file);
});

player.addEventListener("play", () => {
  audioEngine.handlePlayerPlay();
});

player.addEventListener("pause", () => {
  audioEngine.handlePlayerPause();
});

scene.resize();
requestAnimationFrame(render);
