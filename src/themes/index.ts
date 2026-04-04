import { glitterTearsTheme } from "./glitter-tears";
import { midnightMathTheme } from "./midnight-math";
import { shatterStrobeTheme } from "./shatter-strobe";
import type { ThemeCategory, ThemeCategoryId, ThemeDefinition } from "./types";

export type { ThemeCategory, ThemeCategoryId, ThemeDefinition, ThemeMode, ThemeOverrides, ThemeRenderContext, ThemeRuntime, ThemeRuntimeContext } from "./types";

export const themeCategories: ThemeCategory[] = [
  { id: "indie-emo", label: "Indie Emo" },
  { id: "dream-gaze", label: "Dream Gaze" },
  { id: "club-kaleido", label: "Club Kaleido" },
];

export const themes: ThemeDefinition[] = [midnightMathTheme, glitterTearsTheme, shatterStrobeTheme];

export function getThemesByCategory(categoryId: ThemeCategoryId): ThemeDefinition[] {
  return themes.filter((theme) => theme.category === categoryId);
}

export function getTheme(themeId: string): ThemeDefinition {
  const theme = themes.find((entry) => entry.id === themeId);

  if (!theme) {
    throw new Error(`Unknown theme: ${themeId}`);
  }

  return theme;
}

export function resolveThemeMode(theme: ThemeDefinition, modeId?: string): ThemeDefinition {
  const mode = theme.modes.find((entry) => entry.id === modeId) ?? theme.modes[0];

  if (!mode) {
    return theme;
  }

  const resolved: ThemeDefinition = {
    ...theme,
    runtime: {
      ...theme.runtime,
      ...mode.overrides?.runtime,
    },
    palette: {
      ...theme.palette,
      ...mode.overrides?.palette,
    },
    tuning: {
      ...theme.tuning,
      ...mode.overrides?.tuning,
    },
    createRuntime: (context, runtimeTheme) => theme.createRuntime(context, runtimeTheme),
  };

  return resolved;
}
