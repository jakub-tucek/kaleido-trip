import type { Profile } from "./types";

function idleProfile(time: number): Profile {
  const pulse = 0.5 + Math.sin(time * 0.0015) * 0.5;
  const sway = 0.5 + Math.sin(time * 0.0007 + 1.4) * 0.5;
  const hiss = 0.5 + Math.sin(time * 0.0023 + 2.2) * 0.5;

  return {
    bass: 0.2 + pulse * 0.42,
    mids: 0.14 + sway * 0.28,
    highs: 0.12 + hiss * 0.22,
    level: 0.18 + pulse * 0.5,
  };
}

export class AudioEngine {
  private static readonly DEFAULT_GAIN = 1.35;

  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private sourceNode?: MediaStreamAudioSourceNode | MediaElementAudioSourceNode;
  private activeStream?: MediaStream;
  private playerSourceNode?: MediaElementAudioSourceNode;
  private currentObjectUrl?: string;
  private frequencyData?: Uint8Array;
  private waveformData?: Uint8Array;
  private audioReady = false;
  private demoMode = true;

  constructor(
    private readonly player: HTMLAudioElement,
    private readonly setStatus: (message: string) => void
  ) {}

  setDemoMode(): void {
    this.demoMode = true;
    this.disconnectSource();
    this.audioReady = false;
    this.player.pause();
    this.setStatus("Demo pulse is active. Use microphone or load a track for live reaction.");
  }

  async useMicrophone(): Promise<void> {
    try {
      this.ensureAudioContext();

      if (!navigator.mediaDevices?.getUserMedia) {
        this.setStatus("Microphone capture is unavailable here. Open on localhost or HTTPS.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.activeStream = stream;
      const micSource = this.audioContext!.createMediaStreamSource(stream);
      this.attachSource(micSource, false);
      this.player.pause();
      this.player.removeAttribute("src");
      this.player.load();
      this.setStatus("Microphone connected. Visualizer is reacting live.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setStatus(`Microphone access failed: ${message}`);
    }
  }

  useAudioFile(file: File | undefined): void {
    if (!file) {
      return;
    }

    this.ensureAudioContext();

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
    }

    this.currentObjectUrl = URL.createObjectURL(file);
    this.player.src = this.currentObjectUrl;

    if (!this.playerSourceNode) {
      this.playerSourceNode = this.audioContext!.createMediaElementSource(this.player);
    }

    this.attachSource(this.playerSourceNode, true);

    this.player.play().catch(() => {
      this.setStatus("Track loaded. Press play when the browser allows it.");
    });

    this.setStatus(`Loaded track: ${file.name}`);
  }

  handlePlayerPlay(): void {
    this.ensureAudioContext();
    this.demoMode = false;
    this.setStatus("Track playing.");
  }

  handlePlayerPause(): void {
    if (this.player.src) {
      this.setStatus("Track paused.");
    }
  }

  getProfile(time: number): Profile {
    if (!this.audioReady || this.demoMode || !this.analyser || !this.frequencyData || !this.waveformData) {
      return idleProfile(time);
    }

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.waveformData as Uint8Array<ArrayBuffer>);

    let bass = 0;
    let mids = 0;
    let highs = 0;

    for (let i = 0; i < this.frequencyData.length; i += 1) {
      const value = this.frequencyData[i] / 255;

      if (i < this.frequencyData.length * 0.08) {
        bass += value;
      } else if (i < this.frequencyData.length * 0.35) {
        mids += value;
      } else {
        highs += value;
      }
    }

    bass /= Math.max(1, this.frequencyData.length * 0.08);
    mids /= Math.max(1, this.frequencyData.length * 0.27);
    highs /= Math.max(1, this.frequencyData.length * 0.65);

    const gain = AudioEngine.DEFAULT_GAIN;
    const level = Math.min(1, (bass * 0.95 + mids * 0.7 + highs * 0.45) * gain);

    return {
      bass: Math.min(1, bass * gain),
      mids: Math.min(1, mids * gain),
      highs: Math.min(1, highs * gain),
      level,
    };
  }

  getWaveformData(): Uint8Array | undefined {
    return this.waveformData;
  }

  getFrequencyData(): Uint8Array | undefined {
    return this.frequencyData;
  }

  isDemoMode(): boolean {
    return this.demoMode;
  }

  isAudioReady(): boolean {
    return this.audioReady;
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new window.AudioContext();
    }

    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.82;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveformData = new Uint8Array(this.analyser.fftSize);
    }

    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
  }

  private disconnectSource(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = undefined;
    }

    if (this.activeStream) {
      this.activeStream.getTracks().forEach((track) => track.stop());
      this.activeStream = undefined;
    }
  }

  private attachSource(nextSource: MediaStreamAudioSourceNode | MediaElementAudioSourceNode, connectDestination: boolean): void {
    this.disconnectSource();
    this.sourceNode = nextSource;
    this.sourceNode.connect(this.analyser!);
    this.demoMode = false;

    if (connectDestination) {
      this.sourceNode.connect(this.audioContext!.destination);
    }

    this.audioReady = true;
  }
}
