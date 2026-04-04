import type { ThemeDefinition, ThemeRenderContext, ThemeRuntime } from "./themes";

export class VisualizerScene {
  private currentTheme?: ThemeDefinition;
  private currentRuntime?: ThemeRuntime;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  applyTheme(theme: ThemeDefinition): void {
    this.currentRuntime?.dispose();
    this.currentTheme = theme;
    this.currentRuntime = theme.createRuntime({ canvas: this.canvas }, theme);
    this.currentRuntime.resize();
  }

  resize(): void {
    this.currentRuntime?.resize();
  }

  setSeed(seed: number): void {
    this.currentRuntime?.setSeed(seed);
  }

  render(context: ThemeRenderContext): void {
    if (!this.currentRuntime || !this.currentTheme) {
      return;
    }

    this.currentRuntime.render(context);
  }
}
