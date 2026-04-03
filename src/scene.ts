import type { ThemeDefinition, ThemeRenderContext, ThemeRuntime } from "./themes";
import type { SceneControls } from "./types";

export class VisualizerScene {
  private currentTheme?: ThemeDefinition;
  private currentRuntime?: ThemeRuntime;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly controls: SceneControls
  ) {}

  applyTheme(theme: ThemeDefinition): void {
    this.currentRuntime?.dispose();
    this.currentTheme = theme;
    this.currentRuntime = theme.createRuntime({ canvas: this.canvas, controls: this.controls }, theme);
    this.currentRuntime.resize();
  }

  resize(): void {
    this.currentRuntime?.resize();
  }

  render(context: ThemeRenderContext): void {
    if (!this.currentRuntime || !this.currentTheme) {
      return;
    }

    this.currentRuntime.render(context);
  }
}
