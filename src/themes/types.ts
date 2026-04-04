import type { PointerState, Profile } from "../types";
import type { PaletteFamilyId, StructureVariantId } from "../runtimes/procedural-constants";

export type ThemeRenderContext = {
  profile: Profile;
  time: number;
  pointer: PointerState;
  frequencyData?: Uint8Array;
  waveformData?: Uint8Array;
  isLive: boolean;
};

export type ThemeRuntime = {
  resize: () => void;
  render: (context: ThemeRenderContext) => void;
  setSeed: (seed: number) => void;
  getState: () => { paletteFamily?: string; palettePhase?: number; structure?: string };
  dispose: () => void;
};

export type ThemeRuntimeContext = {
  canvas: HTMLCanvasElement;
};

export type ThemeOverrides = {
  palette?: Partial<ThemeDefinition["palette"]>;
  tuning?: Partial<ThemeDefinition["tuning"]>;
  runtime?: Partial<ThemeDefinition["runtime"]>;
};

export type ThemeMode = {
  id: string;
  label: string;
  overrides?: ThemeOverrides;
};

export type ThemeCategoryId = "indie-emo" | "dream-gaze" | "club-kaleido";

export type ThemeCategory = {
  id: ThemeCategoryId;
  label: string;
};

export type ThemeDefinition = {
  id: string;
  label: string;
  category: ThemeCategoryId;
  modes: ThemeMode[];
  createRuntime: (context: ThemeRuntimeContext, theme: ThemeDefinition) => ThemeRuntime;
  runtime: {
    allowedPaletteFamilies: PaletteFamilyId[];
    allowedStructures: StructureVariantId[];
    phaseDurationMs: number;
  };
  palette: {
    fog: number;
    ambient: number;
    frontLight: number;
    backLight: number;
    rimLight: number;
    core: number;
    coreEmissive: number;
    shell: number;
    ringA: number;
    ringB: number;
    ribbon: number;
    tunnel: number;
    lineA: number;
    lineB: number;
  };
  tuning: {
    fogDensity: number;
    clearHueBase: number;
    clearHueShift: number;
    clearSaturation: number;
    clearLightnessBase: number;
    clearLightnessBloom: number;
    frontLightBase: number;
    frontLightBloom: number;
    frontLightLevel: number;
    backLightBase: number;
    backLightBloom: number;
    backLightHighs: number;
    rimLightBase: number;
    rimLightBloom: number;
    rimLightHighs: number;
    coreEmissiveBase: number;
    coreEmissiveBloom: number;
    coreEmissiveLevel: number;
    coreSaturation: number;
    coreLightnessBase: number;
    coreLightnessLevel: number;
    ringOpacityBase: number;
    ringOpacityLevel: number;
    barOpacityBase: number;
    barOpacityLevel: number;
    barSaturation: number;
    barLightnessBase: number;
    barLightnessLevel: number;
    ribbonOpacityBase: number;
    ribbonOpacityLevel: number;
    ribbonSaturation: number;
    ribbonLightnessBase: number;
    ribbonLightnessLevel: number;
    tunnelOpacityBase: number;
    tunnelOpacityLevel: number;
    tunnelSaturation: number;
    tunnelLightness: number;
    lineOpacityBase: number;
    lineOpacityLevel: number;
    motionSpeed: number;
    motionAmount: number;
  };
};
