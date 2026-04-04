export const PALETTE_FAMILIES = [
  { id: "bruise", label: "Bruise", hueShift: 0, saturationScale: 1, lightnessOffset: 0 },
  { id: "ember", label: "Ember", hueShift: -0.18, saturationScale: 0.88, lightnessOffset: -0.05 },
  { id: "violet", label: "Violet", hueShift: 0.14, saturationScale: 1.12, lightnessOffset: 0.02 },
  { id: "teal", label: "Teal", hueShift: 0.32, saturationScale: 0.96, lightnessOffset: -0.02 },
  { id: "acid", label: "Acid", hueShift: -0.34, saturationScale: 1.18, lightnessOffset: 0.04 },
  { id: "whiteheat", label: "Whiteheat", hueShift: 0.46, saturationScale: 1.06, lightnessOffset: -0.08 },
] as const;

export type PaletteFamilyId = (typeof PALETTE_FAMILIES)[number]["id"];

export const STRUCTURE_VARIANTS = [
  { id: "cathedral", label: "Cathedral" },
  { id: "shard-storm", label: "Shard Storm" },
  { id: "wave-grid", label: "Wave Grid" },
  { id: "orbit-field", label: "Orbit Field" },
] as const;

export type StructureVariantId = (typeof STRUCTURE_VARIANTS)[number]["id"];
