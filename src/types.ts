export type Profile = {
  bass: number;
  mids: number;
  highs: number;
  level: number;
};

export type PointerState = {
  x: number;
  y: number;
};

export type SceneControls = {
  getBloom: () => number;
};
