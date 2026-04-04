import "./styles.css";

import { AudioEngine } from "./audio";
import { VisualizerScene } from "./scene";
import { getTheme, getThemesByCategory, resolveThemeMode, themeCategories, type ThemeCategoryId } from "./themes";
import type { PointerState } from "./types";

function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

const canvas = getRequiredElement<HTMLCanvasElement>("#visualizer");
const fullscreenButton = getRequiredElement<HTMLButtonElement>("#fullscreenButton");
const micButton = getRequiredElement<HTMLButtonElement>("#micButton");
const demoButton = getRequiredElement<HTMLButtonElement>("#demoButton");
const fileInput = getRequiredElement<HTMLInputElement>("#fileInput");
const player = getRequiredElement<HTMLAudioElement>("#player");
const statusText = getRequiredElement<HTMLParagraphElement>("#status");
const themeMetaText = getRequiredElement<HTMLParagraphElement>("#themeMeta");
const themeCategoryInput = getRequiredElement<HTMLSelectElement>("#themeCategory");
const themeInput = getRequiredElement<HTMLSelectElement>("#theme");
const themeModeInput = getRequiredElement<HTMLSelectElement>("#themeMode");

const pointer: PointerState = { x: 0, y: 0 };

const setStatus = (message: string): void => {
  statusText.textContent = message;
};

const audioEngine = new AudioEngine(player, setStatus);
const scene = new VisualizerScene(canvas);
let currentSeed = 0;
let lastThemeMeta = "";

function hashSeed(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function applySongSeed(seedSource: string): void {
  currentSeed = hashSeed(seedSource);
  scene.setSeed(currentSeed);
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Fullscreen failed: ${message}`);
  }
}

function syncFullscreenButton(): void {
  const active = Boolean(document.fullscreenElement);
  fullscreenButton.textContent = active ? "Exit fullscreen" : "Fullscreen";
  document.body.classList.toggle("fullscreen-mode", active);
}

function applySelectedTheme(): void {
  const baseTheme = getTheme(themeInput.value);
  const resolvedTheme = resolveThemeMode(baseTheme, themeModeInput.value);
  scene.applyTheme(resolvedTheme);
  scene.setSeed(currentSeed);
  setStatus(`Theme ready: ${baseTheme.label} / ${themeModeInput.selectedOptions[0]?.textContent ?? "default"}.`);
}

function renderThemeModes(themeId: string, selectedModeId?: string): void {
  const theme = getTheme(themeId);
  const nextModeId = selectedModeId && theme.modes.some((mode) => mode.id === selectedModeId)
    ? selectedModeId
    : theme.modes[0]?.id;

  themeModeInput.innerHTML = "";

  theme.modes.forEach((mode) => {
    const option = document.createElement("option");
    option.value = mode.id;
    option.textContent = mode.label;
    option.selected = mode.id === nextModeId;
    themeModeInput.append(option);
  });

  applySelectedTheme();
}

function renderThemeOptions(categoryId: string, selectedThemeId?: string): void {
  const categoryThemes = getThemesByCategory(categoryId as ThemeCategoryId);
  const nextThemeId = selectedThemeId && categoryThemes.some((theme) => theme.id === selectedThemeId)
    ? selectedThemeId
    : categoryThemes[0]?.id;

  themeInput.innerHTML = "";

  categoryThemes.forEach((theme) => {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.label;
    option.selected = theme.id === nextThemeId;
    themeInput.append(option);
  });

  if (nextThemeId) {
    renderThemeModes(nextThemeId);
  }
}

themeCategories.forEach((category) => {
  const option = document.createElement("option");
  option.value = category.id;
  option.textContent = category.label;
  themeCategoryInput.append(option);
});

themeCategoryInput.value = themeCategories[0].id;
renderThemeOptions(themeCategoryInput.value, "midnight-math");

function render(time: number): void {
  const profile = audioEngine.getProfile(time);
  scene.render({
    profile,
    time,
    pointer,
    frequencyData: audioEngine.getFrequencyData(),
    waveformData: audioEngine.getWaveformData(),
    isLive: audioEngine.isAudioReady() && !audioEngine.isDemoMode(),
  });

  const runtimeState = scene.getState();
  const meta = `${runtimeState.structure ?? "-"} / ${runtimeState.paletteFamily ?? "-"} / phase ${runtimeState.palettePhase ?? 1}`;
  if (meta !== lastThemeMeta) {
    themeMetaText.textContent = meta;
    lastThemeMeta = meta;
  }

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
  applySongSeed(`mic:${Date.now()}`);
  void audioEngine.useMicrophone();
});

fullscreenButton.addEventListener("click", () => {
  void toggleFullscreen();
});

demoButton.addEventListener("click", () => {
  applySongSeed("demo:pulse");
  audioEngine.setDemoMode();
});

fileInput.addEventListener("change", (event) => {
  const [file] = (event.currentTarget as HTMLInputElement).files ?? [];
  if (file) {
    applySongSeed(`file:${file.name}:${file.size}:${file.lastModified}`);
  }
  audioEngine.useAudioFile(file);
});

themeCategoryInput.addEventListener("change", () => {
  renderThemeOptions(themeCategoryInput.value);
});

themeInput.addEventListener("change", () => {
  renderThemeModes(themeInput.value);
});

themeModeInput.addEventListener("change", () => {
  applySelectedTheme();
});

player.addEventListener("play", () => {
  audioEngine.handlePlayerPlay();
});

player.addEventListener("pause", () => {
  audioEngine.handlePlayerPause();
});

document.addEventListener("fullscreenchange", () => {
  syncFullscreenButton();
});

scene.resize();
syncFullscreenButton();
requestAnimationFrame(render);
