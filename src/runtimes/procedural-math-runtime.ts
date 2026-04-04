import type { ThemeDefinition, ThemeRenderContext, ThemeRuntime } from "../themes";

class ProceduralMathRuntime implements ThemeRuntime {
  private readonly context: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private bassMemory = 0;
  private midsMemory = 0;
  private highsMemory = 0;
  private signatureA = 0.37;
  private signatureB = 1.13;
  private signatureC = 2.41;
  private seedPhase = 0;
  private seedSpread = 1;
  private seedWarp = 1;
  private seedTilt = 0;
  private seedDensity = 1;
  private structureVariant = 0;
  private sparseMode = 0.82;

  private getBandEnergy(frequencyData: Uint8Array | undefined, startRatio: number, endRatio: number, fallback: number): number {
    if (!frequencyData || frequencyData.length === 0) {
      return fallback;
    }

    const start = Math.max(0, Math.floor(frequencyData.length * startRatio));
    const end = Math.max(start + 1, Math.floor(frequencyData.length * endRatio));
    let total = 0;

    for (let index = start; index < end; index += 1) {
      total += frequencyData[index] / 255;
    }

    return total / Math.max(1, end - start);
  }

  private getHighPeakIndex(frequencyData: Uint8Array | undefined): number {
    if (!frequencyData || frequencyData.length === 0) {
      return 0;
    }

    const start = Math.floor(frequencyData.length * 0.45);
    let bestIndex = start;
    let bestValue = -1;

    for (let index = start; index < frequencyData.length; index += 1) {
      if (frequencyData[index] > bestValue) {
        bestValue = frequencyData[index];
        bestIndex = index;
      }
    }

    return bestIndex - start;
  }

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly theme: ThemeDefinition
  ) {
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("2D canvas context unavailable");
    }

    this.context = context;
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render({ profile, time, pointer, waveformData, frequencyData, isLive }: ThemeRenderContext): void {
    this.updateSignature(profile);
    const lowEnergy = this.getBandEnergy(frequencyData, 0, 0.16, profile.bass);
    const midEnergy = this.getBandEnergy(frequencyData, 0.16, 0.45, profile.mids);
    const highEnergy = this.getBandEnergy(frequencyData, 0.45, 1, profile.highs);
    const highPeakIndex = this.getHighPeakIndex(frequencyData);

    this.context.clearRect(0, 0, this.width, this.height);
    this.drawBackground(profile, pointer, lowEnergy, midEnergy, highEnergy);

    if (this.structureVariant === 0) {
      this.drawCathedralContours(profile, time, waveformData, isLive, highEnergy, highPeakIndex);
    } else if (this.structureVariant === 1) {
      this.drawShardStorm(profile, time, highEnergy, highPeakIndex);
    } else if (this.structureVariant === 2) {
      this.drawWaveGrid(profile, time, waveformData, isLive, highEnergy, highPeakIndex);
    } else {
      this.drawOrbitField(profile, time, frequencyData, isLive, highEnergy, highPeakIndex);
    }

    this.drawVignette();
  }

  setSeed(seed: number): void {
    const normalized = Math.abs(seed) % 100000;
    this.signatureA = 0.24 + (normalized % 97) / 37;
    this.signatureB = 0.72 + (normalized % 193) / 61;
    this.signatureC = 1.14 + (normalized % 389) / 83;
    this.seedPhase = (normalized % 360) * (Math.PI / 180);
    this.seedSpread = 0.85 + (normalized % 29) / 40;
    this.seedWarp = 0.82 + (normalized % 43) / 30;
    this.seedTilt = ((normalized % 23) - 11) / 200;
    this.seedDensity = 0.8 + (normalized % 31) / 26;
    this.structureVariant = normalized % 4;
    this.sparseMode = 0.62 + (normalized % 17) / 40;
    this.bassMemory = 0;
    this.midsMemory = 0;
    this.highsMemory = 0;
  }

  dispose(): void {}

  private updateSignature(profile: ThemeRenderContext["profile"]): void {
    this.bassMemory = this.bassMemory * 0.94 + profile.bass * 0.06;
    this.midsMemory = this.midsMemory * 0.95 + profile.mids * 0.05;
    this.highsMemory = this.highsMemory * 0.96 + profile.highs * 0.04;

    this.signatureA += 0.0035 + this.bassMemory * 0.014;
    this.signatureB += 0.0028 + this.midsMemory * 0.011;
    this.signatureC += 0.0022 + this.highsMemory * 0.01;
  }

  private drawBackground(
    profile: ThemeRenderContext["profile"],
    pointer: ThemeRenderContext["pointer"],
    lowEnergy: number,
    midEnergy: number,
    highEnergy: number
  ): void {
    const gradient = this.context.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, this.hexToRgba(this.theme.palette.fog, 1));
    gradient.addColorStop(0.45, this.hexToRgba(this.theme.palette.core, 1));
    gradient.addColorStop(1, this.hexToRgba(this.theme.palette.backLight, 0.18 + lowEnergy * 0.34));

    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, this.width, this.height);

    const haze = this.context.createRadialGradient(
      this.width * (0.5 + pointer.x * 0.35),
      this.height * (0.42 - pointer.y * 0.28),
      this.width * 0.02,
      this.width * (0.5 + pointer.x * 0.35),
      this.height * (0.42 - pointer.y * 0.28),
      this.width * (0.24 + lowEnergy * 0.22 + midEnergy * 0.08)
    );
    haze.addColorStop(0, this.hexToRgba(this.theme.palette.backLight, 0.08 + lowEnergy * 0.22));
    haze.addColorStop(0.5, this.hexToRgba(this.theme.palette.ringB, 0.04 + midEnergy * 0.1));
    haze.addColorStop(1, this.hexToRgba(this.theme.palette.fog, 0));

    this.context.fillStyle = haze;
    this.context.fillRect(0, 0, this.width, this.height);

    const floorGlow = this.context.createLinearGradient(0, this.height * 0.6, 0, this.height);
    floorGlow.addColorStop(0, this.hexToRgba(this.theme.palette.fog, 0));
    floorGlow.addColorStop(1, this.hexToRgba(this.theme.palette.frontLight, 0.06 + lowEnergy * 0.18 + profile.bass * 0.08));
    this.context.fillStyle = floorGlow;
    this.context.fillRect(0, this.height * 0.56, this.width, this.height * 0.44);
  }

  private drawInterferenceBands(profile: ThemeRenderContext["profile"], time: number, aggressive = false): void {
    const bandCount = aggressive ? 11 : 7;

    for (let band = 0; band < bandCount; band += 1) {
      this.context.beginPath();
      this.context.strokeStyle = this.hexToRgba(
        band % 2 === 0 ? this.theme.palette.lineA : this.theme.palette.lineB,
        (aggressive ? 0.06 : 0.025) + profile.level * (aggressive ? 0.08 : 0.04)
      );
      this.context.lineWidth = 1 + band * 0.08;

      const pointCount = 160;
      for (let point = 0; point <= pointCount; point += 1) {
        const ratio = point / pointCount;
        const x = ratio * this.width;
        const normalizedX = ratio * 2 - 1;
        const yBase = this.height * (0.18 + (band / bandCount) * 0.64);
        const termA = Math.sin(normalizedX * (5 + band * 0.2) * this.seedDensity + time * 0.0004 + this.seedPhase);
        const termB = Math.cos(normalizedX * normalizedX * (12 + this.signatureA * 0.04) - time * 0.00022 * this.seedSpread);
        const termC = Math.sin((normalizedX + this.seedTilt) * (9 + this.signatureC * 0.03) + band * 0.4);
        const amplitude = this.height * ((aggressive ? 0.012 : 0.006) + profile.highs * 0.012 + band * 0.0005) * this.sparseMode;
        const y = yBase + (termA + termB * 0.7 + termC * 0.55) * amplitude;

        if (point === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }

      this.context.stroke();
    }
  }

  private drawCathedralContours(
    profile: ThemeRenderContext["profile"],
    time: number,
    waveformData?: Uint8Array,
    isLive = false,
    highEnergy = 0,
    highPeakIndex = 0
  ): void {
    this.drawContourField(profile, time, waveformData, isLive, true);

    const archCount = 4 + Math.floor(highPeakIndex % 4);
    const centerX = this.width * 0.5;
    const baseY = this.height * 0.86;

    for (let arch = 0; arch < archCount; arch += 1) {
      const width = this.width * (0.1 + arch * 0.085) * this.sparseMode * (0.9 + highEnergy * 0.4);
      const height = this.height * (0.1 + arch * 0.065) * (0.8 + this.seedSpread * 0.15 + highEnergy * 0.2);
      const phase = time * 0.00025 + arch * 0.3 + this.seedPhase;

      this.context.beginPath();
      this.context.strokeStyle = this.hexToRgba(
        arch % 2 === 0 ? this.theme.palette.ringA : this.theme.palette.lineB,
          0.025 + highEnergy * 0.12
      );
      this.context.lineWidth = 1.1 + arch * 0.2;

      const steps = 180;
      for (let step = 0; step <= steps; step += 1) {
        const ratio = step / steps;
        const angle = Math.PI * ratio;
        const waveIndex = waveformData ? Math.floor(ratio * (waveformData.length - 1)) : 0;
        const wave = isLive && waveformData ? ((waveformData[waveIndex] ?? 128) - 128) / 128 : Math.sin(ratio * (6 + highPeakIndex * 0.01) + phase) * profile.level;
        const x = centerX + Math.cos(angle) * width;
        const y = baseY - Math.sin(angle) * height - wave * this.height * (0.015 + highEnergy * 0.03) - Math.sin(angle * (3 + this.seedWarp + highPeakIndex * 0.004) + phase) * (8 + highEnergy * 16);

        if (step === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }

      this.context.stroke();
    }
  }

  private drawContourField(
    profile: ThemeRenderContext["profile"],
    time: number,
    waveformData?: Uint8Array,
    isLive = false,
    verticalBias = false
  ): void {
    const lineCount = verticalBias ? 12 : 14;
    const centerY = this.height * 0.55;

    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const yOffset = (lineIndex - lineCount / 2) * this.height * (verticalBias ? 0.03 : 0.024) * this.sparseMode;
      this.context.beginPath();
      this.context.strokeStyle = lineIndex % 3 === 0
        ? this.hexToRgba(this.theme.palette.lineA, 0.04 + profile.level * 0.08)
        : this.hexToRgba(this.theme.palette.lineB, 0.025 + profile.highs * 0.05);
      this.context.lineWidth = 0.8 + lineIndex * 0.04;

      const pointCount = verticalBias ? 120 : 150;
      for (let point = 0; point <= pointCount; point += 1) {
        const ratio = point / pointCount;
        const x = verticalBias
          ? this.width * 0.16 + ratio * this.width * 0.68 + Math.sin(lineIndex * 0.8 + this.seedPhase) * this.width * 0.05
          : ratio * this.width;
        const waveformIndex = waveformData ? Math.floor(ratio * (waveformData.length - 1)) : 0;
        const wave = isLive && waveformData
          ? ((waveformData[waveformIndex] ?? 128) - 128) / 128
          : Math.sin(ratio * 11 + time * 0.0007 * this.signatureB + lineIndex * 0.18) * profile.level;
        const curveA = Math.sin(ratio * Math.PI * (2.2 + this.signatureA * 0.03 * this.seedWarp) + time * 0.00045 + lineIndex * 0.22 + this.seedPhase);
        const curveB = Math.cos(ratio * Math.PI * (4.8 + this.signatureB * 0.02 * this.seedSpread) - time * 0.0003 + lineIndex * 0.11 - this.seedPhase * 0.5);
        const y = centerY + yOffset + curveA * this.height * 0.018 * this.sparseMode + curveB * this.height * 0.012 * this.sparseMode + wave * this.height * (verticalBias ? 0.09 : 0.035 + this.midsMemory * 0.04);

        if (point === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }

      this.context.stroke();
    }
  }

  private drawRoseSystem(profile: ThemeRenderContext["profile"], time: number, pointer: ThemeRenderContext["pointer"], broken = false): void {
    const centerX = this.width * (0.5 + pointer.x * 0.08);
    const centerY = this.height * (0.48 - pointer.y * 0.05);
    const baseRadius = Math.min(this.width, this.height) * (broken ? 0.11 : 0.14) * this.sparseMode;
    const layers = broken ? [
      { petals: 4, hue: this.theme.palette.frontLight, alpha: 0.12, radius: 0.9 },
      { petals: 11, hue: this.theme.palette.ringB, alpha: 0.08, radius: 1.35 },
    ] : [
      { petals: 5, hue: this.theme.palette.ringA, alpha: 0.18, radius: 1 },
      { petals: 7, hue: this.theme.palette.ringB, alpha: 0.1, radius: 1.28 },
      { petals: 9, hue: this.theme.palette.frontLight, alpha: 0.08, radius: 1.52 },
    ];

    layers.forEach((layer, index) => {
      this.context.beginPath();
      this.context.strokeStyle = this.hexToRgba(layer.hue, layer.alpha + profile.level * 0.1);
      this.context.lineWidth = 1.4 + index * 0.6;

      const stepCount = 520;
      for (let step = 0; step <= stepCount; step += 1) {
        const t = (step / stepCount) * Math.PI * 2;
        const rose = Math.sin(t * (layer.petals + this.signatureA * 0.015 * this.seedWarp));
        const lissajous = Math.cos(t * (2 + index * this.seedSpread) + this.signatureB * 0.2 + time * 0.00045 + this.seedPhase);
        const harmonic = Math.sin(t * (3.5 + this.signatureC * 0.01 * this.seedSpread) - time * 0.0003 * (index + 1));
        const radius = baseRadius * layer.radius * this.seedSpread * (0.72 + rose * (broken ? 0.24 : 0.36) + lissajous * 0.14 + harmonic * (broken ? 0.2 : 0.1) + profile.bass * 0.16);
        const x = centerX + Math.cos(t + time * 0.0001 * index + this.seedPhase * 0.3) * radius;
        const y = centerY + Math.sin(t * (1.02 + index * 0.05 * this.seedWarp) - time * 0.00012) * radius * (0.82 + this.highsMemory * 0.15);

        if (step === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }

      this.context.stroke();
    });
  }

  private drawShardStorm(profile: ThemeRenderContext["profile"], time: number, highEnergy: number, highPeakIndex: number): void {
    this.drawHypotrochoidShards(profile, time, true);

    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5;
    const rayCount = 18 + (highPeakIndex % 24);

    for (let ray = 0; ray < rayCount; ray += 1) {
      const angle = (ray / rayCount) * Math.PI * 2 + this.seedPhase;
      const inner = 40 + Math.sin(ray * 0.9 + time * 0.0007) * 30;
      const outer = Math.min(this.width, this.height) * (0.14 + (ray % 5) * 0.09 + highEnergy * 0.08) * this.seedSpread;
      const bend = Math.sin(angle * (4 + this.seedWarp + highPeakIndex * 0.01) + time * 0.0004) * (0.12 + highEnergy * 0.25);

      this.context.beginPath();
      this.context.strokeStyle = this.hexToRgba(
        ray % 2 === 0 ? this.theme.palette.frontLight : this.theme.palette.tunnel,
          0.04 + highEnergy * 0.16
      );
      this.context.lineWidth = 0.8 + (ray % 4) * 0.35;
      this.context.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
      this.context.lineTo(centerX + Math.cos(angle + bend) * outer, centerY + Math.sin(angle - bend) * outer);
      this.context.stroke();
    }
  }

  private drawHypotrochoidShards(profile: ThemeRenderContext["profile"], time: number, large = false): void {
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5;
    const shardCount = large ? 2 : 4;

    for (let shard = 0; shard < shardCount; shard += 1) {
      this.context.beginPath();
      this.context.strokeStyle = this.hexToRgba(
        shard % 2 === 0 ? this.theme.palette.frontLight : this.theme.palette.ringB,
        0.06 + profile.mids * 0.12
      );
      this.context.lineWidth = 1.2 + shard * 0.5;

      const R = (large ? 170 : 120) + shard * 34 * this.seedSpread;
      const r = (large ? 46 : 28) + shard * 11 + this.seedDensity * 6;
      const d = (large ? 110 : 74) + shard * 18 + this.bassMemory * 30;
      const steps = 460;

      for (let step = 0; step <= steps; step += 1) {
        const t = (step / steps) * Math.PI * 2 * (5 + shard) + time * 0.00035 * (shard + 1);
        const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t + this.seedPhase);
        const y = (R - r) * Math.sin(t * (1 + this.seedTilt)) - d * Math.sin(((R - r) / r) * t);
        const warpX = x * (large ? 0.72 : 0.56) + Math.sin(t * 3 + this.signatureB) * 18 * this.seedWarp;
        const warpY = y * (large ? 0.62 : 0.4) + Math.cos(t * 2 + this.signatureC) * 22 * this.seedSpread;

        if (step === 0) {
          this.context.moveTo(centerX + warpX, centerY + warpY);
        } else {
          this.context.lineTo(centerX + warpX, centerY + warpY);
        }
      }

      this.context.stroke();
    }
  }

  private drawWaveGrid(
    profile: ThemeRenderContext["profile"],
    time: number,
    waveformData?: Uint8Array,
    isLive = false,
    highEnergy = 0,
    highPeakIndex = 0
  ): void {
    const columns = 6 + (highPeakIndex % 7);
    const rows = 4 + Math.floor(highEnergy * 5);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const centerX = this.width * (0.12 + (column / (columns - 1)) * 0.76);
        const centerY = this.height * (0.18 + (row / (rows - 1)) * 0.64);
        const size = Math.min(this.width, this.height) * (0.02 + highEnergy * 0.03) * this.sparseMode;
        const ratio = (row * columns + column) / (rows * columns - 1);
        const waveIndex = waveformData ? Math.floor(ratio * (waveformData.length - 1)) : 0;
        const wave = isLive && waveformData ? ((waveformData[waveIndex] ?? 128) - 128) / 128 : Math.sin(ratio * 18 + time * 0.0008 + this.seedPhase) * profile.level;
        const rotation = wave * (0.8 + highEnergy * 2.4) + Math.sin(time * 0.00035 + row + column + highPeakIndex * 0.01) * 0.2;

        this.context.save();
        this.context.translate(centerX, centerY);
        this.context.rotate(rotation);
        this.context.strokeStyle = this.hexToRgba(
          (row + column) % 2 === 0 ? this.theme.palette.lineA : this.theme.palette.lineB,
          0.05 + highEnergy * 0.14
        );
        this.context.lineWidth = 1.2;
        this.context.strokeRect(-size, -size, size * 2, size * 2);
        this.context.restore();
      }
    }

    this.drawInterferenceBands(profile, time, false);
  }

  private drawOrbitNodes(
    profile: ThemeRenderContext["profile"],
    time: number,
    frequencyData?: Uint8Array,
    isLive = false,
    sparse = false
  ): void {
    const nodeCount = sparse ? 18 : 28;
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5;

    for (let index = 0; index < nodeCount; index += 1) {
      const angle = (index / nodeCount) * Math.PI * 2 + time * 0.00028 * (0.7 + this.signatureA * 0.01) + this.seedPhase;
      const bucket = frequencyData ? Math.floor((index / nodeCount) * frequencyData.length) : 0;
      const audioValue = isLive && frequencyData ? (frequencyData[bucket] ?? 0) / 255 : profile.level;
      const radius = Math.min(this.width, this.height) * (0.12 + ((index % 7) / 7) * 0.24 * this.seedSpread) * this.sparseMode + audioValue * 28;
      const wobble = Math.sin(angle * (3 + this.seedWarp * 0.3) + this.signatureC + time * 0.0004) * (18 + this.bassMemory * 24);
      const x = centerX + Math.cos(angle + this.signatureB * 0.2) * (radius + wobble);
      const y = centerY + Math.sin(angle * (1.2 + this.seedWarp * 0.08) - this.signatureA * 0.15) * (radius * 0.58 + wobble * 0.4);
      const size = (sparse ? 2.5 : 1.5) + audioValue * (sparse ? 7 : 5) + (index % 3);

      this.context.beginPath();
      this.context.fillStyle = this.hexToRgba(index % 2 === 0 ? this.theme.palette.tunnel : this.theme.palette.rimLight, 0.12 + audioValue * 0.35);
      this.context.arc(x, y, size, 0, Math.PI * 2);
      this.context.fill();
    }
  }

  private drawOrbitField(
    profile: ThemeRenderContext["profile"],
    time: number,
    frequencyData?: Uint8Array,
    isLive = false,
    highEnergy = 0,
    highPeakIndex = 0
  ): void {
    this.drawOrbitNodes(profile, time, frequencyData, isLive, true);

    const arms = 3 + (highPeakIndex % 5);
    const points = 140;
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5;

    for (let arm = 0; arm < arms; arm += 1) {
      this.context.beginPath();
      this.context.strokeStyle = this.hexToRgba(
        arm % 2 === 0 ? this.theme.palette.ringA : this.theme.palette.ringB,
        0.05 + profile.level * 0.08
      );
      this.context.lineWidth = 1.1;

      for (let point = 0; point <= points; point += 1) {
        const ratio = point / points;
        const angle = ratio * Math.PI * (3 + this.seedWarp + highPeakIndex * 0.01) + arm * ((Math.PI * 2) / arms) + time * 0.00028;
        const radius = ratio * Math.min(this.width, this.height) * (0.22 + highEnergy * 0.24);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle * (1.05 + this.seedTilt + highEnergy * 0.2)) * radius * 0.72;

        if (point === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }

      this.context.stroke();
    }
  }

  private drawPolarLattice(
    profile: ThemeRenderContext["profile"],
    time: number,
    pointer: ThemeRenderContext["pointer"]
  ): void {
    const centerX = this.width * (0.5 + pointer.x * 0.04);
    const centerY = this.height * (0.5 - pointer.y * 0.03);
    const rings = 4;

    for (let ring = 1; ring <= rings; ring += 1) {
      this.context.beginPath();
      this.context.strokeStyle = this.hexToRgba(
        ring % 2 === 0 ? this.theme.palette.tunnel : this.theme.palette.ringA,
        0.035 + profile.level * 0.05
      );
      this.context.lineWidth = 0.9;

      const baseRadius = Math.min(this.width, this.height) * (0.08 + ring * 0.05) * this.sparseMode;
      const steps = 240;

      for (let step = 0; step <= steps; step += 1) {
        const angle = (step / steps) * Math.PI * 2;
        const radialWarp = Math.sin(angle * (4 + ring * this.seedDensity) + this.seedPhase + time * 0.0003) * baseRadius * 0.08;
        const lattice = Math.cos(angle * (7 + this.signatureA * 0.02) - time * 0.00024 * this.seedWarp) * baseRadius * 0.06;
        const radius = baseRadius + radialWarp + lattice + profile.highs * baseRadius * 0.03;
        const x = centerX + Math.cos(angle + this.seedTilt * ring) * radius;
        const y = centerY + Math.sin(angle * (1 + this.seedTilt) - this.seedPhase * 0.15) * radius * 0.76;

        if (step === 0) {
          this.context.moveTo(x, y);
        } else {
          this.context.lineTo(x, y);
        }
      }

      this.context.stroke();
    }
  }

  private drawVignette(): void {
    const vignette = this.context.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.15,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.72
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.66)");
    this.context.fillStyle = vignette;
    this.context.fillRect(0, 0, this.width, this.height);
  }

  private hexToRgba(hex: number, alpha: number): string {
    const red = (hex >> 16) & 255;
    const green = (hex >> 8) & 255;
    const blue = hex & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}

export function createProceduralMathRuntime(canvas: HTMLCanvasElement, theme: ThemeDefinition): ThemeRuntime {
  const runtime = new ProceduralMathRuntime(canvas, theme);
  runtime.setSeed(0);
  return runtime;
}
