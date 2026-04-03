import * as THREE from "three";

import type { PointerState, Profile, SceneControls } from "../types";
import type { ThemeDefinition, ThemeRenderContext, ThemeRuntime } from "../themes";

class SharedSpectrumRuntime implements ThemeRuntime {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly frontLight: THREE.PointLight;
  private readonly backLight: THREE.PointLight;
  private readonly rimLight: THREE.PointLight;
  private readonly world: THREE.Group;
  private readonly coreGroup: THREE.Group;
  private readonly coreMaterial: THREE.MeshPhysicalMaterial;
  private readonly shellMaterial: THREE.MeshBasicMaterial;
  private readonly haloRings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly spectrumGroup: THREE.Group;
  private readonly bars: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly ribbonGeometry: THREE.PlaneGeometry;
  private readonly ribbonMaterial: THREE.MeshBasicMaterial;
  private readonly ribbon: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly tunnelGeometry: THREE.BufferGeometry;
  private readonly tunnelSeeds: Float32Array;
  private readonly tunnelMaterial: THREE.PointsMaterial;
  private readonly waveformLines: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>[] = [];
  private readonly tunnelCount = 2200;
  private readonly ambientLight: THREE.AmbientLight;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly controls: SceneControls,
    private readonly theme: ThemeDefinition
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(theme.palette.fog, theme.tuning.fogDensity);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 0.6, 7.5);

    this.ambientLight = new THREE.AmbientLight(theme.palette.ambient, 0.35);
    this.scene.add(this.ambientLight);

    this.frontLight = new THREE.PointLight(theme.palette.frontLight, 5.5, 28, 2);
    this.frontLight.position.set(0, 1.5, 3.2);
    this.scene.add(this.frontLight);

    this.backLight = new THREE.PointLight(theme.palette.backLight, 4.5, 34, 2);
    this.backLight.position.set(0, -0.8, -6.2);
    this.scene.add(this.backLight);

    this.rimLight = new THREE.PointLight(theme.palette.rimLight, 1.8, 20, 2);
    this.rimLight.position.set(-2.2, 0.5, 5.4);
    this.scene.add(this.rimLight);

    this.world = new THREE.Group();
    this.scene.add(this.world);

    this.coreGroup = new THREE.Group();
    this.world.add(this.coreGroup);

    this.coreMaterial = new THREE.MeshPhysicalMaterial({
      color: theme.palette.core,
      emissive: theme.palette.coreEmissive,
      emissiveIntensity: 0.34,
      roughness: 0.42,
      metalness: 0.12,
      clearcoat: 1,
      transparent: true,
      opacity: 0.9,
    });

    const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, 18), this.coreMaterial);
    this.coreGroup.add(coreMesh);

    this.shellMaterial = new THREE.MeshBasicMaterial({
      color: theme.palette.shell,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    const shellMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 2), this.shellMaterial);
    this.coreGroup.add(shellMesh);

    for (let i = 0; i < 6; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.4 + i * 0.55, 0.02 + i * 0.005, 8, 120),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? theme.palette.ringA : theme.palette.ringB,
          transparent: true,
          opacity: 0.05 + i * 0.015,
        })
      );
      ring.rotation.x = Math.PI * (0.25 + i * 0.07);
      ring.rotation.y = i * 0.33;
      ring.position.z = -i * 1.2;
      this.haloRings.push(ring);
      this.world.add(ring);
    }

    this.spectrumGroup = new THREE.Group();
    this.world.add(this.spectrumGroup);

    const barGeometry = new THREE.BoxGeometry(0.12, 1, 0.12);
    for (let i = 0; i < 128; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(theme.palette.ringA),
        transparent: true,
        opacity: 0.28,
      });
      const bar = new THREE.Mesh(barGeometry, material);
      const angle = (i / 128) * Math.PI * 2;
      const radius = 4.2 + Math.sin(i * 0.33) * 0.55;
      bar.position.set(Math.cos(angle) * radius, -2.4, Math.sin(angle) * radius - 4);
      bar.lookAt(0, -2.4, -4);
      bar.scale.y = 0.18;
      this.bars.push(bar);
      this.spectrumGroup.add(bar);
    }

    this.ribbonGeometry = new THREE.PlaneGeometry(18, 14, 220, 120);
    this.ribbonMaterial = new THREE.MeshBasicMaterial({
      color: theme.palette.ribbon,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    });
    this.ribbon = new THREE.Mesh(this.ribbonGeometry, this.ribbonMaterial);
    this.ribbon.rotation.x = -Math.PI * 0.6;
    this.ribbon.position.set(0, -2.8, -5.2);
    this.world.add(this.ribbon);

    this.tunnelGeometry = new THREE.BufferGeometry();
    const tunnelPositions = new Float32Array(this.tunnelCount * 3);
    this.tunnelSeeds = new Float32Array(this.tunnelCount * 4);
    for (let i = 0; i < this.tunnelCount; i += 1) {
      const seedBase = i * 4;
      this.tunnelSeeds[seedBase] = Math.random() * Math.PI * 2;
      this.tunnelSeeds[seedBase + 1] = 1.8 + Math.random() * 8.5;
      this.tunnelSeeds[seedBase + 2] = -25 * Math.random();
      this.tunnelSeeds[seedBase + 3] = Math.random();
    }
    this.tunnelGeometry.setAttribute("position", new THREE.BufferAttribute(tunnelPositions, 3));

    this.tunnelMaterial = new THREE.PointsMaterial({
      size: 0.075,
      color: theme.palette.tunnel,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.world.add(new THREE.Points(this.tunnelGeometry, this.tunnelMaterial));

    for (let i = 0; i < 28; i += 1) {
      const positions = new Float32Array(240 * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({
        color: i % 3 === 0 ? theme.palette.lineA : theme.palette.lineB,
        transparent: true,
        opacity: 0.04 + i * 0.007,
      });
      const line = new THREE.Line(geometry, material);
      line.position.z = -i * 0.48;
      line.position.y = (i - 14) * 0.05;
      this.waveformLines.push(line);
      this.world.add(line);
    }
  }

  resize(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  render(context: ThemeRenderContext): void {
    const { profile, time, pointer, frequencyData, waveformData, isLive } = context;
    const { tuning } = this.theme;
    const bloom = this.controls.getBloom();

    this.renderer.setClearColor(
      new THREE.Color().setHSL(
        tuning.clearHueBase + profile.highs * tuning.clearHueShift,
        tuning.clearSaturation,
        tuning.clearLightnessBase + bloom * tuning.clearLightnessBloom
      ),
      1
    );
    this.frontLight.intensity = tuning.frontLightBase + bloom * tuning.frontLightBloom + profile.level * tuning.frontLightLevel;
    this.backLight.intensity = tuning.backLightBase + bloom * tuning.backLightBloom + profile.highs * tuning.backLightHighs;
    this.rimLight.intensity = tuning.rimLightBase + bloom * tuning.rimLightBloom + profile.highs * tuning.rimLightHighs;
    this.frontLight.position.x = pointer.x * 4;
    this.frontLight.position.y = 1.2 + pointer.y * 2;

    this.world.rotation.z = Math.sin(time * 0.0002) * 0.04;
    this.world.position.z = Math.sin(time * 0.00035) * 0.3;

    this.updateCore(profile, time, bloom);
    this.updateRings(profile, time);
    this.updateBars(profile, time, frequencyData, isLive);
    this.updateRibbon(profile, time, waveformData, isLive);
    this.updateTunnel(profile, time);
    this.updateWaveLines(profile, time, waveformData, isLive);
    this.updateCamera(profile, time, pointer);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material?.dispose();
      }
    });
  }

  private updateCore(profile: Profile, time: number, bloom: number): void {
    const { tuning } = this.theme;
    const pulse = 1 + profile.bass * 0.55 + Math.sin(time * 0.004) * 0.05;
    this.coreGroup.scale.setScalar(pulse);
    this.coreGroup.rotation.x = time * 0.00045 + profile.highs * 0.25;
    this.coreGroup.rotation.y = time * 0.0009 + profile.mids * 0.45;
    this.coreMaterial.emissiveIntensity = tuning.coreEmissiveBase + bloom * tuning.coreEmissiveBloom + profile.level * tuning.coreEmissiveLevel;
    this.coreMaterial.color.setHSL(0.88 - profile.highs * 0.08, tuning.coreSaturation, tuning.coreLightnessBase + profile.level * tuning.coreLightnessLevel);
    this.shellMaterial.opacity = 0.08 + bloom * 0.08 + profile.highs * 0.12;
  }

  private updateRings(profile: Profile, time: number): void {
    const { tuning } = this.theme;
    this.haloRings.forEach((ring, index) => {
      ring.rotation.z = time * (0.00016 + index * 0.00003) * (index % 2 === 0 ? 1 : -1);
      ring.rotation.y += 0.0008 + profile.highs * 0.01;
      ring.position.x = Math.sin(time * 0.0007 + index) * profile.mids * 1.4;
      ring.material.opacity = tuning.ringOpacityBase + profile.level * tuning.ringOpacityLevel + index * 0.006;
      ring.scale.setScalar(1 + profile.bass * 0.12 + Math.sin(time * 0.001 + index) * 0.03);
    });
  }

  private updateBars(profile: Profile, time: number, frequencyData?: Uint8Array, isLive = false): void {
    const { tuning } = this.theme;
    this.bars.forEach((bar, index) => {
      let value: number;
      if (isLive && frequencyData) {
        const bucket = Math.floor((index / this.bars.length) * frequencyData.length);
        value = frequencyData[bucket] / 255;
      } else {
        value = Math.max(0, 0.1 + Math.sin(time * 0.005 + index * 0.35) * 0.3 + profile.level * 0.8);
      }
      bar.scale.y = 0.18 + value * 7.5;
      bar.position.y = -2.8 + bar.scale.y * 0.45;
      bar.material.opacity = tuning.barOpacityBase + value * tuning.barOpacityLevel;
      bar.material.color.setHSL(0.92 - value * 0.12 - index / 1000, tuning.barSaturation, tuning.barLightnessBase + value * tuning.barLightnessLevel);
    });
    this.spectrumGroup.rotation.y = time * 0.0004 + profile.highs * 0.12;
  }

  private updateRibbon(profile: Profile, time: number, waveformData?: Uint8Array, isLive = false): void {
    const { tuning } = this.theme;
    const positions = this.ribbonGeometry.attributes.position.array as Float32Array;
    const columns = 221;
    for (let i = 0; i < positions.length; i += 3) {
      const vertex = i / 3;
      const xIndex = vertex % columns;
      const yIndex = Math.floor(vertex / columns);
      const x = positions[i];
      const y = positions[i + 1];
      const waveformIndex = waveformData ? Math.floor((xIndex / (columns - 1)) * (waveformData.length - 1)) : 0;
      const wave = isLive && waveformData ? (waveformData[waveformIndex] - 128) / 128 : Math.sin(time * 0.004 + x * 0.8 + yIndex * 0.15) * profile.level;
      const radial = Math.sin(y * 0.6 + time * 0.0016) * 0.35;
      positions[i + 2] = wave * (1.4 + profile.mids * 3.2) + radial + Math.sin(x * 0.35 - time * 0.0011) * profile.highs;
    }
    this.ribbonGeometry.attributes.position.needsUpdate = true;
    this.ribbon.rotation.z = Math.sin(time * 0.0004) * 0.16;
    this.ribbonMaterial.opacity = tuning.ribbonOpacityBase + profile.level * tuning.ribbonOpacityLevel;
    this.ribbonMaterial.color.setHSL(0.74 + profile.highs * 0.08, tuning.ribbonSaturation, tuning.ribbonLightnessBase + profile.level * tuning.ribbonLightnessLevel);
  }

  private updateTunnel(profile: Profile, time: number): void {
    const { tuning } = this.theme;
    const positions = this.tunnelGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.tunnelCount; i += 1) {
      const base = i * 3;
      const seedBase = i * 4;
      const angle = this.tunnelSeeds[seedBase] + time * (0.0002 + this.tunnelSeeds[seedBase + 3] * 0.0012);
      const radius = this.tunnelSeeds[seedBase + 1] * (0.55 + profile.level * 0.85 + Math.sin(time * 0.002 + i) * 0.05);
      const travel = (time * (0.012 + profile.bass * 0.08) + i * 0.04) % 32;
      const z = this.tunnelSeeds[seedBase + 2] + travel;
      positions[base] = Math.cos(angle) * radius + Math.sin(time * 0.001 + i) * profile.mids * 0.2;
      positions[base + 1] = Math.sin(angle) * radius * 0.7 + Math.cos(time * 0.0015 + i) * profile.highs * 0.22;
      positions[base + 2] = z;
    }
    this.tunnelGeometry.attributes.position.needsUpdate = true;
    this.tunnelMaterial.size = 0.035 + profile.highs * 0.08 + this.controls.getBloom() * 0.08;
    this.tunnelMaterial.opacity = tuning.tunnelOpacityBase + profile.level * tuning.tunnelOpacityLevel;
    this.tunnelMaterial.color.setHSL(0.86 - profile.highs * 0.08, tuning.tunnelSaturation, tuning.tunnelLightness);
  }

  private updateWaveLines(profile: Profile, time: number, waveformData?: Uint8Array, isLive = false): void {
    const { tuning } = this.theme;
    this.waveformLines.forEach((line, lineIndex) => {
      const positions = line.geometry.attributes.position.array as Float32Array;
      const points = positions.length / 3;
      for (let i = 0; i < points; i += 1) {
        const xNorm = i / (points - 1);
        const x = (xNorm - 0.5) * 15;
        const waveformIndex = waveformData ? Math.floor(xNorm * (waveformData.length - 1)) : 0;
        const wave = isLive && waveformData ? (waveformData[waveformIndex] - 128) / 128 : Math.sin(time * 0.005 + xNorm * 18 + lineIndex * 0.25) * profile.level;
        positions[i * 3] = x;
        positions[i * 3 + 1] = wave * (0.5 + lineIndex * 0.02) + Math.sin(time * 0.001 + xNorm * 8 + lineIndex) * 0.05;
        positions[i * 3 + 2] = Math.sin(xNorm * 8 + time * 0.0012 + lineIndex) * 0.2;
      }
      line.geometry.attributes.position.needsUpdate = true;
      line.rotation.z = Math.sin(time * 0.0004 + lineIndex) * 0.09;
      line.material.opacity = tuning.lineOpacityBase + profile.level * tuning.lineOpacityLevel + lineIndex * 0.002;
    });
  }

  private updateCamera(profile: Profile, time: number, pointer: PointerState): void {
    const driftX = pointer.x * 1.4;
    const driftY = pointer.y * 0.8;
    this.camera.position.x += (driftX - this.camera.position.x) * 0.03;
    this.camera.position.y += (0.6 + driftY - this.camera.position.y) * 0.03;
    this.camera.position.z = 7.2 - profile.bass * 1.6 + Math.sin(time * 0.0005) * 0.25;
    this.camera.lookAt(0, profile.mids * 0.12, -3.6);
  }
}

export function createSharedSpectrumRuntime(
  canvas: HTMLCanvasElement,
  controls: SceneControls,
  theme: ThemeDefinition
): ThemeRuntime {
  return new SharedSpectrumRuntime(canvas, controls, theme);
}
